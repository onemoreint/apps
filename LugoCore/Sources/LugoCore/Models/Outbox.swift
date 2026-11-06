import Foundation

/// Archivo que elegiste en el Mac para enviarlo al teléfono.
public struct OutboxItem: Identifiable, Equatable, Sendable {
    public let id: UUID
    public let url: URL
    public let name: String
    public let sizeBytes: Int64
}

/// Bandeja de salida: lo que aparece en el teléfono como "Enviado desde tu Mac".
public final class Outbox: @unchecked Sendable {
    private let lock = NSLock()
    private var items: [OutboxItem] = []

    public init() {}

    public var all: [OutboxItem] {
        lock.lock(); defer { lock.unlock() }
        return items
    }

    /// Añade los archivos que existan y sean regulares. Las carpetas se ignoran.
    @discardableResult
    public func add(urls: [URL]) -> [OutboxItem] {
        lock.lock(); defer { lock.unlock() }
        var added: [OutboxItem] = []
        for url in urls where !items.contains(where: { $0.url == url }) {
            let attributes = try? FileManager.default.attributesOfItem(atPath: url.path)
            guard attributes?[.type] as? FileAttributeType == .typeRegular,
                  let size = attributes?[.size] as? NSNumber else { continue }
            let item = OutboxItem(
                id: UUID(),
                url: url,
                name: url.lastPathComponent.precomposedStringWithCanonicalMapping,
                sizeBytes: size.int64Value
            )
            items.append(item)
            added.append(item)
        }
        return added
    }

    public func remove(id: UUID) {
        lock.lock(); defer { lock.unlock() }
        items.removeAll { $0.id == id }
    }

    public func removeAll() {
        lock.lock(); defer { lock.unlock() }
        items.removeAll()
    }

    func item(id: UUID) -> OutboxItem? {
        lock.lock(); defer { lock.unlock() }
        return items.first { $0.id == id }
    }
}
