import Combine
import Foundation

@MainActor
final class SettingsViewModel: ObservableObject {
    @Published var errorMessage: String?

    private let store: SettingsStore
    private var storeChanges: AnyCancellable?

    init(store: SettingsStore) {
        self.store = store
        storeChanges = store.objectWillChange.sink { [weak self] _ in
            self?.objectWillChange.send()
        }
    }

    var destination: FolderBookmark? { store.destination }
    var sharedFolders: [FolderBookmark] { store.sharedFolders }

    var port: Int {
        get { store.port }
        set { store.port = newValue }
    }

    var sizeLimitEnabled: Bool {
        get { store.sizeLimitEnabled }
        set { store.sizeLimitEnabled = newValue }
    }

    var sizeLimitGB: Int {
        get { store.sizeLimitGB }
        set { store.sizeLimitGB = newValue }
    }

    var sessionMinutes: Int {
        get { store.sessionMinutes }
        set { store.sessionMinutes = newValue }
    }

    func chooseDestination() {
        guard let url = FolderAccessService.pickFolder(prompt: "Usar esta carpeta") else { return }
        do {
            store.destination = try FolderAccessService.makeBookmark(for: url)
        } catch {
            errorMessage = "No se pudo guardar el permiso de la carpeta: \(error.localizedDescription)"
        }
    }

    func useDefaultDestination() {
        store.destination = nil
    }

    func addSharedFolder() {
        guard let url = FolderAccessService.pickFolder(prompt: "Compartir esta carpeta") else { return }
        guard !store.sharedFolders.contains(where: { $0.path == url.path }) else {
            errorMessage = "Esa carpeta ya está compartida."
            return
        }
        do {
            store.sharedFolders.append(try FolderAccessService.makeBookmark(for: url))
        } catch {
            errorMessage = "No se pudo guardar el permiso de la carpeta: \(error.localizedDescription)"
        }
    }

    func removeSharedFolder(_ folder: FolderBookmark) {
        store.sharedFolders.removeAll { $0.id == folder.id }
    }

    func isAvailable(_ folder: FolderBookmark) -> Bool {
        FolderAccessService.isAvailable(folder)
    }

    func sessionLabel(minutes: Int) -> String {
        minutes < 60 ? "\(minutes) minutos" : "\(minutes / 60) h"
    }
}
