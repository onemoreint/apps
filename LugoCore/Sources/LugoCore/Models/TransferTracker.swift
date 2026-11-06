import Foundation

/// Foto de una transferencia para mostrarla en la interfaz.
public struct TransferSnapshot: Identifiable, Equatable, Sendable {
    public let id: UUID
    public let fileName: String
    public let totalBytes: Int64
    public let transferredBytes: Int64
    public let direction: TransferDirection
    public let status: TransferStatus
    public let startDate: Date
    public let endDate: Date?
    public let bytesPerSecond: Double
    public let detail: String?

    public var fileExtension: String { (fileName as NSString).pathExtension.lowercased() }

    public var progress: Double {
        guard totalBytes > 0 else { return status == .completed ? 1 : 0 }
        return min(Double(transferredBytes) / Double(totalBytes), 1)
    }

    /// Segundos restantes, o `nil` si todavía no se puede estimar.
    public var secondsRemaining: Double? {
        guard status == .inProgress, bytesPerSecond > 1 else { return nil }
        return Double(max(totalBytes - transferredBytes, 0)) / bytesPerSecond
    }
}

/// Registro en vivo de las transferencias. Lo actualizan los hilos del servidor y lo lee
/// la interfaz varias veces por segundo.
public final class TransferTracker: @unchecked Sendable {
    private struct Entry {
        var fileName: String
        let total: Int64
        var transferred: Int64 = 0
        let direction: TransferDirection
        var status: TransferStatus = .inProgress
        let start: Date
        var end: Date?
        var speed: Double = 0
        var sampleDate: Date
        var sampleBytes: Int64 = 0
        var detail: String?
        var clientKey: String?
        var isCancelled = false
        var abort: (@Sendable () -> Void)?
    }

    private let lock = NSLock()
    private var entries: [UUID: Entry] = [:]
    private var order: [UUID] = []
    private let keepFinished: Int
    private let now: @Sendable () -> Date

    /// Se llama una vez cuando una transferencia termina, en el hilo del servidor.
    public var onFinish: (@Sendable (TransferRecord) -> Void)?

    public init(keepFinished: Int = 50, now: @escaping @Sendable () -> Date = { Date() }) {
        self.keepFinished = keepFinished
        self.now = now
    }

    public func start(
        fileName: String,
        totalBytes: Int64,
        direction: TransferDirection,
        clientKey: String? = nil,
        abort: (@Sendable () -> Void)? = nil
    ) -> UUID {
        lock.lock(); defer { lock.unlock() }
        let id = UUID()
        let date = now()
        var entry = Entry(
            fileName: fileName,
            total: totalBytes,
            direction: direction,
            start: date,
            sampleDate: date
        )
        entry.clientKey = clientKey
        entry.abort = abort
        entries[id] = entry
        order.append(id)
        trimLocked()
        return id
    }

    /// Suma bytes y devuelve `false` si la transferencia fue cancelada.
    @discardableResult
    public func add(bytes: Int, to id: UUID) -> Bool {
        lock.lock(); defer { lock.unlock() }
        guard var entry = entries[id] else { return false }
        entry.transferred += Int64(bytes)
        let date = now()
        let elapsed = date.timeIntervalSince(entry.sampleDate)
        if elapsed >= 0.5 {
            let instant = Double(entry.transferred - entry.sampleBytes) / elapsed
            entry.speed = entry.speed == 0 ? instant : entry.speed * 0.6 + instant * 0.4
            entry.sampleDate = date
            entry.sampleBytes = entry.transferred
        }
        let cancelled = entry.isCancelled
        entries[id] = entry
        return !cancelled
    }

    public func isCancelled(_ id: UUID) -> Bool {
        lock.lock(); defer { lock.unlock() }
        return entries[id]?.isCancelled ?? false
    }

    /// Cancela solo esa transferencia y corta su conexión.
    public func cancel(id: UUID) {
        lock.lock()
        guard var entry = entries[id], !entry.status.isFinal else {
            lock.unlock()
            return
        }
        entry.isCancelled = true
        let abort = entry.abort
        entries[id] = entry
        lock.unlock()
        abort?()
    }

    /// El teléfono cancela una subida usando la clave que él mismo generó.
    public func cancel(clientKey: String) {
        lock.lock()
        let target = entries.first { $0.value.clientKey == clientKey && !$0.value.status.isFinal }?.key
        lock.unlock()
        if let target { cancel(id: target) }
    }

    public func cancelAll() {
        lock.lock()
        let active = entries.filter { !$0.value.status.isFinal }.map(\.key)
        lock.unlock()
        active.forEach { cancel(id: $0) }
    }

    public func finish(
        id: UUID,
        status: TransferStatus,
        fileName: String? = nil,
        detail: String? = nil
    ) {
        lock.lock()
        guard var entry = entries[id], !entry.status.isFinal else {
            lock.unlock()
            return
        }
        // Una cancelación pedida gana a cualquier error que provoque el corte.
        entry.status = entry.isCancelled && status != .completed ? .cancelled : status
        entry.end = now()
        entry.speed = 0
        entry.detail = detail
        entry.abort = nil
        if let fileName { entry.fileName = fileName }
        entries[id] = entry
        let record = TransferRecord(
            date: entry.end ?? entry.start,
            fileName: entry.fileName,
            sizeBytes: entry.total,
            direction: entry.direction,
            status: entry.status
        )
        trimLocked()
        let callback = onFinish
        lock.unlock()
        callback?(record)
    }

    /// Lista completa, con la más reciente primero.
    public func snapshot() -> [TransferSnapshot] {
        lock.lock(); defer { lock.unlock() }
        return order.reversed().compactMap { id in
            guard let entry = entries[id] else { return nil }
            return TransferSnapshot(
                id: id,
                fileName: entry.fileName,
                totalBytes: entry.total,
                transferredBytes: entry.transferred,
                direction: entry.direction,
                status: entry.status,
                startDate: entry.start,
                endDate: entry.end,
                bytesPerSecond: entry.speed,
                detail: entry.detail
            )
        }
    }

    public var hasActiveTransfers: Bool {
        lock.lock(); defer { lock.unlock() }
        return entries.values.contains { !$0.status.isFinal }
    }

    /// Quita de la lista lo terminado. El historial no se toca.
    public func clearFinished() {
        lock.lock(); defer { lock.unlock() }
        for (id, entry) in entries where entry.status.isFinal { entries[id] = nil }
        order.removeAll { entries[$0] == nil }
    }

    private func trimLocked() {
        let finished = order.filter { entries[$0]?.status.isFinal == true }
        guard finished.count > keepFinished else { return }
        for id in finished.prefix(finished.count - keepFinished) { entries[id] = nil }
        order.removeAll { entries[$0] == nil }
    }
}
