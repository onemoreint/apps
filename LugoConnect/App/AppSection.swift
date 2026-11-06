import Foundation

/// Las seis secciones del menú lateral.
enum AppSection: String, CaseIterable, Identifiable {
    case home
    case connect
    case androidToMac
    case macToAndroid
    case history
    case settings

    var id: AppSection { self }

    var title: String {
        switch self {
        case .home: return "Inicio"
        case .connect: return "Conectar dispositivo"
        case .androidToMac: return "Android a Mac"
        case .macToAndroid: return "Mac a Android"
        case .history: return "Historial"
        case .settings: return "Configuración"
        }
    }

    var systemImage: String {
        switch self {
        case .home: return "house"
        case .connect: return "qrcode"
        case .androidToMac: return "square.and.arrow.down"
        case .macToAndroid: return "square.and.arrow.up"
        case .history: return "clock.arrow.circlepath"
        case .settings: return "gearshape"
        }
    }
}
