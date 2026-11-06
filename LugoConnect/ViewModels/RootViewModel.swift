import Combine
import Foundation

/// Crea los servicios una sola vez, los comparte con cada pantalla y deja el servidor listo
/// nada más abrir: al abrir la app ya aparecen el QR y el PIN.
@MainActor
final class RootViewModel: ObservableObject {
    @Published var selection: AppSection? = .home

    let connection: ConnectionViewModel
    let settings: SettingsViewModel

    init() {
        let store = SettingsStore()
        connection = ConnectionViewModel(store: store, network: NetworkStatusService())
        settings = SettingsViewModel(store: store)
        NotificationService.requestPermission()
        connection.start()
    }
}
