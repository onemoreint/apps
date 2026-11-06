import Foundation

/// Historial local en un archivo JSON. Solo guarda fecha, nombre, tamaño, sentido y resultado.
public final class HistoryStore: @unchecked Sendable {
    private let lock = NSLock()
    private let fileURL: URL
    private let maxRecords: Int
    private var records: [TransferRecord]

    public init(fileURL: URL, maxRecords: Int = 2000) {
        self.fileURL = fileURL
        self.maxRecords = maxRecords
        if let data = try? Data(contentsOf: fileURL),
           let stored = try? Self.decoder.decode([TransferRecord].self, from: data) {
            records = stored
        } else {
            records = []
        }
    }

    /// Lista completa, con el más reciente primero.
    public var all: [TransferRecord] {
        lock.lock(); defer { lock.unlock() }
        return records
    }

    public func append(_ record: TransferRecord) {
        lock.lock(); defer { lock.unlock() }
        records.insert(record, at: 0)
        if records.count > maxRecords { records.removeLast(records.count - maxRecords) }
        saveLocked()
    }

    public func clear() {
        lock.lock(); defer { lock.unlock() }
        records.removeAll()
        saveLocked()
    }

    private func saveLocked() {
        guard let data = try? Self.encoder.encode(records) else { return }
        try? FileManager.default.createDirectory(
            at: fileURL.deletingLastPathComponent(),
            withIntermediateDirectories: true
        )
        try? data.write(to: fileURL, options: .atomic)
    }

    private static var encoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }

    private static var decoder: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}
