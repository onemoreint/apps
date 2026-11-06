import Combine
import Foundation
import LugoCore
import Network

/// Vigila la red y mantiene al día la IP local del Mac, sin tener que reiniciar la app
/// si cambias de Wi-Fi.
@MainActor
final class NetworkStatusService: ObservableObject {
    @Published private(set) var localAddress: String?
    @Published private(set) var usesWiFi = false

    private let monitor = NWPathMonitor()

    init() {
        localAddress = LocalNetwork.preferredAddress()
        monitor.pathUpdateHandler = { [weak self] path in
            let usesWiFi = path.usesInterfaceType(.wifi)
            Task { @MainActor [weak self] in
                self?.usesWiFi = usesWiFi
                self?.localAddress = LocalNetwork.preferredAddress()
            }
        }
        monitor.start(queue: DispatchQueue(label: "lugoconnect.network-monitor"))
    }

    deinit {
        monitor.cancel()
    }
}
