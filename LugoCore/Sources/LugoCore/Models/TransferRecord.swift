import Foundation

/// Sentido de una transferencia.
public enum TransferDirection: String, Codable, CaseIterable, Sendable {
    case androidToMac
    case macToAndroid

    public var label: String {
        switch self {
        case .androidToMac: return "Android → Mac"
        case .macToAndroid: return "Mac → Android"
        }
    }
}

/// Estado de una transferencia. Los tres últimos son finales.
public enum TransferStatus: String, Codable, CaseIterable, Sendable {
    case queued
    case inProgress
    case completed
    case cancelled
    case failed

    public var isFinal: Bool {
        switch self {
        case .completed, .cancelled, .failed: return true
        case .queued, .inProgress: return false
        }
    }

    public var label: String {
        switch self {
        case .queued: return "En cola"
        case .inProgress: return "Transfiriendo"
        case .completed: return "Completado"
        case .cancelled: return "Cancelado"
        case .failed: return "Error"
        }
    }
}

/// Una fila del historial local. Solo guarda lo que pide el módulo 5:
/// sin rutas completas ni datos personales.
public struct TransferRecord: Identifiable, Codable, Equatable, Sendable {
    public let id: UUID
    public let date: Date
    public let fileName: String
    public let sizeBytes: Int64
    public let direction: TransferDirection
    public let status: TransferStatus

    public init(
        id: UUID = UUID(),
        date: Date = Date(),
        fileName: String,
        sizeBytes: Int64,
        direction: TransferDirection,
        status: TransferStatus
    ) {
        self.id = id
        self.date = date
        self.fileName = fileName
        self.sizeBytes = sizeBytes
        self.direction = direction
        self.status = status
    }

    /// Extensión en minúsculas, o cadena vacía si no tiene.
    public var fileExtension: String {
        (fileName as NSString).pathExtension.lowercased()
    }
}
