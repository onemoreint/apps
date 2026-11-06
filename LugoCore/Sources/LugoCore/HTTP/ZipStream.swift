import Foundation

/// CRC-32 por bloques, con tablas de 8 pasos para no frenar archivos grandes.
struct CRC32 {
    private static let tables: [[UInt32]] = {
        var tables = [[UInt32]](repeating: [UInt32](repeating: 0, count: 256), count: 8)
        for index in 0..<256 {
            var crc = UInt32(index)
            for _ in 0..<8 { crc = crc & 1 == 1 ? (crc >> 1) ^ 0xEDB8_8320 : crc >> 1 }
            tables[0][index] = crc
        }
        for index in 0..<256 {
            for table in 1..<8 {
                let previous = tables[table - 1][index]
                tables[table][index] = (previous >> 8) ^ tables[0][Int(previous & 0xFF)]
            }
        }
        return tables
    }()

    private(set) var value: UInt32 = 0

    mutating func update(_ pointer: UnsafeRawPointer, count: Int) {
        var crc = ~value
        var offset = 0
        Self.tables.withUnsafeBufferPointer { tables in
            let t0 = tables[0], t1 = tables[1], t2 = tables[2], t3 = tables[3]
            let t4 = tables[4], t5 = tables[5], t6 = tables[6], t7 = tables[7]
            let bytes = pointer.assumingMemoryBound(to: UInt8.self)
            while count - offset >= 8 {
                let b0 = bytes[offset] ^ UInt8(truncatingIfNeeded: crc)
                let b1 = bytes[offset + 1] ^ UInt8(truncatingIfNeeded: crc >> 8)
                let b2 = bytes[offset + 2] ^ UInt8(truncatingIfNeeded: crc >> 16)
                let b3 = bytes[offset + 3] ^ UInt8(truncatingIfNeeded: crc >> 24)
                crc = t7[Int(b0)] ^ t6[Int(b1)] ^ t5[Int(b2)] ^ t4[Int(b3)]
                    ^ t3[Int(bytes[offset + 4])] ^ t2[Int(bytes[offset + 5])]
                    ^ t1[Int(bytes[offset + 6])] ^ t0[Int(bytes[offset + 7])]
                offset += 8
            }
            while offset < count {
                crc = (crc >> 8) ^ t0[Int((crc ^ UInt32(bytes[offset])) & 0xFF)]
                offset += 1
            }
        }
        value = ~crc
    }
}

/// ZIP sin comprimir generado sobre la marcha, sin archivos temporales ni carga en memoria.
/// Sin comprimir el tamaño final se conoce de antemano, y el teléfono puede mostrar progreso.
/// Fotos y vídeos apenas se comprimen, así que comprimir solo gastaría tiempo.
struct ZipPlan {
    struct Entry {
        let name: String
        let nameBytes: [UInt8]
        let url: URL
        let size: Int64
        let modified: Date
    }

    let entries: [Entry]

    private static let limit32 = Int64(UInt32.max)

    /// Los nombres repetidos reciben "foto (1).jpg" para no perder ningún archivo.
    init(files: [(name: String, url: URL, size: Int64, modified: Date)]) {
        var used = Set<String>()
        entries = files.map { file in
            let name = FileNameValidator.uniqueName(for: file.name) { used.contains($0.lowercased()) }
            used.insert(name.lowercased())
            return Entry(
                name: name,
                nameBytes: Array(name.utf8),
                url: file.url,
                size: file.size,
                modified: file.modified
            )
        }
    }

    private static func needsZip64(size: Int64, offset: Int64) -> Bool {
        size >= limit32 || offset >= limit32
    }

    /// Tamaño exacto del ZIP, para enviar `Content-Length`.
    var totalSize: Int64 {
        var offset: Int64 = 0
        var directory: Int64 = 0
        var anyZip64 = false
        for entry in entries {
            let name = Int64(entry.nameBytes.count)
            let big = Self.needsZip64(size: entry.size, offset: offset)
            anyZip64 = anyZip64 || big
            let localExtra: Int64 = entry.size >= Self.limit32 ? 20 : 0
            let descriptor: Int64 = entry.size >= Self.limit32 ? 24 : 16
            let centralExtra: Int64 = (entry.size >= Self.limit32 ? 16 : 0) + (offset >= Self.limit32 ? 8 : 0)
            let centralExtraHeader: Int64 = centralExtra > 0 ? 4 : 0
            directory += 46 + name + centralExtraHeader + centralExtra
            offset += 30 + name + localExtra + entry.size + descriptor
        }
        let end64 = anyZip64 || offset >= Self.limit32 || directory >= Self.limit32 || entries.count >= 0xFFFF
        return offset + directory + (end64 ? 56 + 20 : 0) + 22
    }

    /// Escribe el ZIP en `sink`. Lanza un error si un archivo cambió de tamaño a medias,
    /// porque un ZIP con otro tamaño sería inválido.
    func write(
        sink: @escaping (UnsafeRawPointer, Int) throws -> Void,
        readFile: (URL, @escaping (UnsafeRawPointer, Int) throws -> Void) throws -> Int64
    ) throws {
        struct Central {
            let entry: Entry
            let crc: UInt32
            let offset: Int64
        }

        func emit(_ bytes: [UInt8]) throws {
            try bytes.withUnsafeBytes { raw in
                if let base = raw.baseAddress { try sink(base, raw.count) }
            }
        }

        var written: Int64 = 0
        var centrals: [Central] = []
        var anyZip64 = false

        for entry in entries {
            let offset = written
            let isBig = entry.size >= Self.limit32
            anyZip64 = anyZip64 || Self.needsZip64(size: entry.size, offset: offset)
            let (time, date) = Self.dosDateTime(entry.modified)

            var local = ByteWriter()
            local.u32(0x0403_4B50)
            local.u16(isBig ? 45 : 20)
            local.u16(0x0808) // Bit 3: tamaños al final. Bit 11: nombre en UTF-8.
            local.u16(0)
            local.u16(time)
            local.u16(date)
            local.u32(0)
            local.u32(isBig ? UInt32.max : 0)
            local.u32(isBig ? UInt32.max : 0)
            local.u16(UInt16(entry.nameBytes.count))
            local.u16(isBig ? 20 : 0)
            local.bytes(entry.nameBytes)
            if isBig {
                local.u16(0x0001)
                local.u16(16)
                local.u64(0)
                local.u64(0)
            }
            try emit(local.data)
            written += Int64(local.data.count)

            var crc = CRC32()
            let copied = try readFile(entry.url) { pointer, count in
                crc.update(pointer, count: count)
                try sink(pointer, count)
            }
            guard copied == entry.size else {
                throw HTTPError(status: 409, message: "\(entry.name) cambió durante el envío.")
            }
            written += copied

            var descriptor = ByteWriter()
            descriptor.u32(0x0807_4B50)
            descriptor.u32(crc.value)
            if isBig {
                descriptor.u64(UInt64(entry.size))
                descriptor.u64(UInt64(entry.size))
            } else {
                descriptor.u32(UInt32(entry.size))
                descriptor.u32(UInt32(entry.size))
            }
            try emit(descriptor.data)
            written += Int64(descriptor.data.count)
            centrals.append(Central(entry: entry, crc: crc.value, offset: offset))
        }

        let directoryOffset = written
        for central in centrals {
            let entry = central.entry
            let bigSize = entry.size >= Self.limit32
            let bigOffset = central.offset >= Self.limit32
            let extraLength = (bigSize ? 16 : 0) + (bigOffset ? 8 : 0)
            let (time, date) = Self.dosDateTime(entry.modified)

            var record = ByteWriter()
            record.u32(0x0201_4B50)
            record.u16(0x0314) // Creado en sistema Unix, versión 2.0.
            record.u16(bigSize || bigOffset ? 45 : 20)
            record.u16(0x0808)
            record.u16(0)
            record.u16(time)
            record.u16(date)
            record.u32(central.crc)
            record.u32(bigSize ? UInt32.max : UInt32(entry.size))
            record.u32(bigSize ? UInt32.max : UInt32(entry.size))
            record.u16(UInt16(entry.nameBytes.count))
            record.u16(UInt16(extraLength > 0 ? extraLength + 4 : 0))
            record.u16(0)
            record.u16(0)
            record.u16(0)
            record.u32(0o100644 << 16)
            record.u32(bigOffset ? UInt32.max : UInt32(central.offset))
            record.bytes(entry.nameBytes)
            if extraLength > 0 {
                record.u16(0x0001)
                record.u16(UInt16(extraLength))
                if bigSize {
                    record.u64(UInt64(entry.size))
                    record.u64(UInt64(entry.size))
                }
                if bigOffset { record.u64(UInt64(central.offset)) }
            }
            try emit(record.data)
            written += Int64(record.data.count)
        }

        let directorySize = written - directoryOffset
        let count = centrals.count
        let end64 = anyZip64 || directoryOffset >= Self.limit32 || directorySize >= Self.limit32 || count >= 0xFFFF

        var end = ByteWriter()
        if end64 {
            end.u32(0x0606_4B50)
            end.u64(44)
            end.u16(45)
            end.u16(45)
            end.u32(0)
            end.u32(0)
            end.u64(UInt64(count))
            end.u64(UInt64(count))
            end.u64(UInt64(directorySize))
            end.u64(UInt64(directoryOffset))
            end.u32(0x0706_4B50)
            end.u32(0)
            end.u64(UInt64(written))
            end.u32(1)
        }
        end.u32(0x0605_4B50)
        end.u16(0)
        end.u16(0)
        end.u16(UInt16(min(count, 0xFFFF)))
        end.u16(UInt16(min(count, 0xFFFF)))
        end.u32(directorySize >= Self.limit32 ? UInt32.max : UInt32(directorySize))
        end.u32(directoryOffset >= Self.limit32 ? UInt32.max : UInt32(directoryOffset))
        end.u16(0)
        try emit(end.data)
    }

    private static func dosDateTime(_ date: Date) -> (time: UInt16, date: UInt16) {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone.current
        let parts = calendar.dateComponents([.year, .month, .day, .hour, .minute, .second], from: date)
        let year = max((parts.year ?? 1980) - 1980, 0)
        let dosDate = (year << 9) | ((parts.month ?? 1) << 5) | (parts.day ?? 1)
        let dosTime = ((parts.hour ?? 0) << 11) | ((parts.minute ?? 0) << 5) | ((parts.second ?? 0) / 2)
        return (UInt16(truncatingIfNeeded: dosTime), UInt16(truncatingIfNeeded: dosDate))
    }
}

private struct ByteWriter {
    var data: [UInt8] = []

    mutating func u16(_ value: UInt16) {
        data.append(UInt8(truncatingIfNeeded: value))
        data.append(UInt8(truncatingIfNeeded: value >> 8))
    }

    mutating func u32(_ value: UInt32) {
        for shift in stride(from: 0, to: 32, by: 8) { data.append(UInt8(truncatingIfNeeded: value >> UInt32(shift))) }
    }

    mutating func u64(_ value: UInt64) {
        for shift in stride(from: 0, to: 64, by: 8) { data.append(UInt8(truncatingIfNeeded: value >> UInt64(shift))) }
    }

    mutating func bytes(_ value: [UInt8]) {
        data.append(contentsOf: value)
    }
}
