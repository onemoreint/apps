import AppKit
import Combine
import Foundation
import LugoCore

/// Dueño del servidor. Une la interfaz con el núcleo: arranca y detiene, refresca PIN,
/// dispositivos y transferencias, y aplica los ajustes en cuanto cambian.
@MainActor
final class ConnectionViewModel: ObservableObject {
    @Published private(set) var isRunning = false
    @Published private(set) var port: Int?
    @Published private(set) var pin = ""
    @Published private(set) var pendingRequests: [PairingRequest] = []
    @Published private(set) var sessions: [Session] = []
    @Published private(set) var transfers: [TransferSnapshot] = []
    @Published private(set) var history: [TransferRecord] = []
    @Published private(set) var outboxItems: [OutboxItem] = []
    @Published private(set) var localAddress: String?
    @Published var errorMessage: String?

    private let store: SettingsStore
    private let network: NetworkStatusService
    private let server: LugoServer
    private let historyStore: HistoryStore
    private var accessedFolders: [URL] = []
    private var requestedPort: Int?
    private var refreshTimer: Timer?
    private var subscriptions = Set<AnyCancellable>()
    private var sleepBlocker: NSObjectProtocol?
    private var notifiedRequests = Set<UUID>()
    private var wasTransferring = false
    private var finishedInBatch = 0
    private var failedInBatch = 0

    init(store: SettingsStore, network: NetworkStatusService) {
        self.store = store
        self.network = network
        server = LugoServer(options: .init(destination: nil))
        historyStore = HistoryStore(fileURL: Self.historyFileURL())
        history = historyStore.all

        let historyStore = historyStore
        server.tracker.onFinish = { record in
            historyStore.append(record)
        }

        network.$localAddress.assign(to: &$localAddress)

        // `objectWillChange` avisa antes del cambio; el salto a la cola principal hace que
        // los ajustes se lean ya con su valor nuevo.
        store.objectWillChange
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                Task { @MainActor [weak self] in self?.settingsChanged() }
            }
            .store(in: &subscriptions)

        // Al salir, el sistema cierra el puerto de todos modos. Esto además corta limpio.
        NotificationCenter.default
            .publisher(for: NSApplication.willTerminateNotification)
            .sink { [weak self] _ in
                Task { @MainActor [weak self] in self?.stop() }
            }
            .store(in: &subscriptions)
    }

    // MARK: - Dirección y estado

    /// Dirección que va en el QR.
    var connectionURL: String? {
        guard isRunning, let localAddress, let port else { return nil }
        return "http://\(localAddress):\(port)/"
    }

    /// Teléfonos con actividad en los últimos segundos. La página consulta cada 3 s.
    var connectedSessions: [Session] {
        sessions.filter { Date().timeIntervalSince($0.lastSeen) < 10 }
    }

    var statusTitle: String {
        if !isRunning { return "Servidor detenido" }
        if localAddress == nil { return "Sin red local" }
        let count = connectedSessions.count
        switch count {
        case 0: return "Esperando al teléfono"
        case 1: return "\(connectedSessions[0].deviceName) conectado"
        default: return "\(count) dispositivos conectados"
        }
    }

    var activeTransfers: [TransferSnapshot] { transfers.filter { !$0.status.isFinal } }

    func transfers(in direction: TransferDirection) -> [TransferSnapshot] {
        transfers.filter { $0.direction == direction }
    }

    var destinationURL: URL {
        store.destination.flatMap { FolderAccessService.resolve($0) } ?? FolderAccessService.defaultDestination()
    }

    var destinationName: String {
        store.destination?.displayName ?? "Descargas/LUGO CONNECT"
    }

    // MARK: - Servidor

    func start() {
        guard !isRunning else { return }
        applyOptions()
        do {
            requestedPort = store.port
            port = try server.start(port: store.port)
            isRunning = true
            errorMessage = nil
            startRefreshing()
            refresh()
        } catch {
            errorMessage = "No se pudo abrir ningún puerto entre \(store.port) y \(store.port + 9). "
                + "Prueba con otro en Configuración."
        }
    }

    func stop() {
        guard isRunning else { return }
        server.stop()
        isRunning = false
        port = nil
        refreshTimer?.invalidate()
        refreshTimer = nil
        endAccess()
        setSleepBlocked(false)
        refresh()
    }

    private func settingsChanged() {
        guard isRunning else { return }
        if requestedPort != store.port {
            stop()
            start()
        } else {
            applyOptions()
        }
    }

    private func applyOptions() {
        // Los permisos viejos se sueltan al final, para no dejar huecos a mitad de una subida.
        let previousFolders = accessedFolders
        accessedFolders = []
        defer { previousFolders.forEach { $0.stopAccessingSecurityScopedResource() } }

        let destination: URL
        if let bookmark = store.destination, let url = beginAccess(bookmark) {
            destination = url
        } else {
            destination = FolderAccessService.defaultDestination()
            try? FileManager.default.createDirectory(at: destination, withIntermediateDirectories: true)
        }

        let roots = store.sharedFolders.compactMap { bookmark -> SharedRoot? in
            guard let url = beginAccess(bookmark) else { return nil }
            return SharedRoot(id: bookmark.id.uuidString, name: bookmark.displayName, url: url)
        }

        var policy = TransferPolicy.default
        if store.sizeLimitEnabled {
            policy.maxFileSizeBytes = Int64(store.sizeLimitGB) * 1_000_000_000
        }
        server.update(options: .init(destination: destination, sharedRoots: roots, policy: policy))
        server.pairing.setSessionLifetime(TimeInterval(store.sessionMinutes * 60))
    }

    private func beginAccess(_ bookmark: FolderBookmark) -> URL? {
        guard let url = FolderAccessService.resolve(bookmark),
              url.startAccessingSecurityScopedResource() else { return nil }
        accessedFolders.append(url)
        return url
    }

    private func endAccess() {
        accessedFolders.forEach { $0.stopAccessingSecurityScopedResource() }
        accessedFolders.removeAll()
    }

    // MARK: - Dispositivos

    func approve(_ request: PairingRequest) {
        _ = try? server.pairing.approve(requestID: request.id)
        refresh()
    }

    func reject(_ request: PairingRequest) {
        server.pairing.reject(requestID: request.id)
        refresh()
    }

    func disconnect(_ session: Session) {
        server.pairing.revoke(sessionID: session.id)
        refresh()
    }

    func regeneratePIN() {
        server.pairing.rotatePIN()
        refresh()
    }

    // MARK: - Transferencias

    func cancel(_ transfer: TransferSnapshot) {
        server.tracker.cancel(id: transfer.id)
    }

    func clearFinishedTransfers() {
        server.tracker.clearFinished()
        refresh()
    }

    func addToOutbox() {
        let urls = FolderAccessService.pickFiles()
        guard !urls.isEmpty else { return }
        server.outbox.add(urls: urls)
        refresh()
    }

    func removeFromOutbox(_ item: OutboxItem) {
        server.outbox.remove(id: item.id)
        refresh()
    }

    func clearHistory() {
        historyStore.clear()
        refresh()
    }

    func openDestinationInFinder() {
        let url = destinationURL
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        NSWorkspace.shared.open(url)
    }

    func copyConnectionURL() {
        guard let connectionURL else { return }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(connectionURL, forType: .string)
    }

    // MARK: - Refresco

    private func startRefreshing() {
        refreshTimer?.invalidate()
        let timer = Timer(timeInterval: 0.25, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in self?.refresh() }
        }
        RunLoop.main.add(timer, forMode: .common)
        refreshTimer = timer
    }

    private func refresh() {
        let currentPIN = isRunning ? server.pairing.currentPIN : ""
        if pin != currentPIN { pin = currentPIN }

        let requests = server.pairing.pendingRequests
        if pendingRequests != requests {
            pendingRequests = requests
            announceNewRequests(requests)
        }

        let currentSessions = server.pairing.activeSessions
        if sessions != currentSessions { sessions = currentSessions }

        let snapshot = server.tracker.snapshot()
        if transfers != snapshot {
            updateBatch(previous: transfers, current: snapshot)
            transfers = snapshot
        }

        let currentOutbox = server.outbox.all
        if outboxItems != currentOutbox { outboxItems = currentOutbox }

        let records = historyStore.all
        if history != records { history = records }

        let isTransferring = server.tracker.hasActiveTransfers
        setSleepBlocked(isTransferring)
        if wasTransferring, !isTransferring { announceBatchFinished() }
        wasTransferring = isTransferring
    }

    private func updateBatch(previous: [TransferSnapshot], current: [TransferSnapshot]) {
        let before = Dictionary(uniqueKeysWithValues: previous.map { ($0.id, $0.status) })
        for item in current where item.status.isFinal && before[item.id]?.isFinal != true {
            switch item.status {
            case .completed: finishedInBatch += 1
            case .failed: failedInBatch += 1
            default: break
            }
        }
    }

    /// Un solo aviso por tanda, en vez de uno por cada foto.
    private func announceBatchFinished() {
        defer {
            finishedInBatch = 0
            failedInBatch = 0
        }
        if failedInBatch > 0 {
            NotificationService.post(
                title: "Transferencia con errores",
                body: "\(finishedInBatch) completados, \(failedInBatch) con error."
            )
        } else if finishedInBatch > 0 {
            NotificationService.post(
                title: "Transferencia completada",
                body: finishedInBatch == 1 ? "1 archivo transferido." : "\(finishedInBatch) archivos transferidos."
            )
        }
    }

    private func announceNewRequests(_ requests: [PairingRequest]) {
        let fresh = requests.filter { !notifiedRequests.contains($0.id) }
        guard !fresh.isEmpty else { return }
        fresh.forEach { notifiedRequests.insert($0.id) }
        NSApp.activate(ignoringOtherApps: true)
        NSApp.requestUserAttention(.criticalRequest)
    }

    /// Evita que el Mac se duerma a mitad de un vídeo de varios GB.
    private func setSleepBlocked(_ blocked: Bool) {
        if blocked, sleepBlocker == nil {
            sleepBlocker = ProcessInfo.processInfo.beginActivity(
                options: [.idleSystemSleepDisabled, .userInitiated],
                reason: "Transferencia de archivos en curso"
            )
        } else if !blocked, let activity = sleepBlocker {
            ProcessInfo.processInfo.endActivity(activity)
            sleepBlocker = nil
        }
    }

    private static func historyFileURL() -> URL {
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return support.appendingPathComponent("LUGO CONNECT/historial.json")
    }
}
