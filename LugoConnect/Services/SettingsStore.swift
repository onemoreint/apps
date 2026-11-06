import Combine
import Foundation

/// Ajustes guardados en el Mac. No contiene contraseñas, PIN ni tokens.
@MainActor
final class SettingsStore: ObservableObject {
    static let portRange = 1024...65535
    static let sessionChoices = [15, 30, 60, 240]

    private enum Key {
        static let destination = "destinationFolder"
        static let shared = "sharedFolders"
        static let port = "serverPort"
        static let limitEnabled = "sizeLimitEnabled"
        static let limitGB = "sizeLimitGB"
        static let sessionMinutes = "sessionMinutes"
    }

    private let defaults: UserDefaults

    /// Carpeta donde se guarda lo que llega del teléfono.
    @Published var destination: FolderBookmark? {
        didSet { save(destination, forKey: Key.destination) }
    }

    /// Únicas carpetas que el teléfono podrá ver.
    @Published var sharedFolders: [FolderBookmark] {
        didSet { save(sharedFolders, forKey: Key.shared) }
    }

    @Published var port: Int {
        didSet {
            port = min(max(port, Self.portRange.lowerBound), Self.portRange.upperBound)
            defaults.set(port, forKey: Key.port)
        }
    }

    @Published var sizeLimitEnabled: Bool {
        didSet { defaults.set(sizeLimitEnabled, forKey: Key.limitEnabled) }
    }

    @Published var sizeLimitGB: Int {
        didSet {
            sizeLimitGB = max(sizeLimitGB, 1)
            defaults.set(sizeLimitGB, forKey: Key.limitGB)
        }
    }

    @Published var sessionMinutes: Int {
        didSet { defaults.set(sessionMinutes, forKey: Key.sessionMinutes) }
    }

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        destination = SettingsStore.load(FolderBookmark.self, forKey: Key.destination, in: defaults)
        sharedFolders = SettingsStore.load([FolderBookmark].self, forKey: Key.shared, in: defaults) ?? []

        let storedPort = defaults.integer(forKey: Key.port)
        port = SettingsStore.portRange.contains(storedPort) ? storedPort : 8642

        sizeLimitEnabled = defaults.bool(forKey: Key.limitEnabled)

        let storedLimit = defaults.integer(forKey: Key.limitGB)
        sizeLimitGB = storedLimit > 0 ? storedLimit : 10

        let storedMinutes = defaults.integer(forKey: Key.sessionMinutes)
        sessionMinutes = SettingsStore.sessionChoices.contains(storedMinutes) ? storedMinutes : 60
    }

    private func save<Value: Encodable>(_ value: Value?, forKey key: String) {
        guard let value, let data = try? JSONEncoder().encode(value) else {
            defaults.removeObject(forKey: key)
            return
        }
        defaults.set(data, forKey: key)
    }

    private static func load<Value: Decodable>(
        _ type: Value.Type,
        forKey key: String,
        in defaults: UserDefaults
    ) -> Value? {
        guard let data = defaults.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }
}
