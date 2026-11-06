import Foundation

/// Reglas configurables que el servidor aplicará a cada archivo.
public struct TransferPolicy: Codable, Equatable, Sendable {
    /// Tamaño máximo por archivo, en bytes. `nil` significa sin límite.
    public var maxFileSizeBytes: Int64?
    /// Extensiones rechazadas, en minúsculas y sin punto.
    public var blockedExtensions: Set<String>

    /// Formatos que macOS ejecuta con doble clic. Los APK, ZIP y RAR se permiten
    /// porque el proyecto los pide y no se ejecutan en el Mac.
    public static let defaultBlockedExtensions: Set<String> = [
        "app", "command", "terminal", "tool", "workflow", "scpt", "pkg", "mpkg"
    ]

    public static let `default` = TransferPolicy(
        maxFileSizeBytes: nil,
        blockedExtensions: defaultBlockedExtensions
    )

    public init(maxFileSizeBytes: Int64?, blockedExtensions: Set<String>) {
        self.maxFileSizeBytes = maxFileSizeBytes
        self.blockedExtensions = Set(blockedExtensions.map { $0.lowercased() })
    }

    public func allows(sizeBytes: Int64) -> Bool {
        guard sizeBytes >= 0 else { return false }
        guard let maxFileSizeBytes else { return true }
        return sizeBytes <= maxFileSizeBytes
    }

    public func allows(fileName: String) -> Bool {
        let ext = (fileName as NSString).pathExtension.lowercased()
        return !blockedExtensions.contains(ext)
    }
}
