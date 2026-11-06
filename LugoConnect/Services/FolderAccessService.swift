import AppKit
import Foundation

/// Una carpeta que autorizaste. El marcador de seguridad permite volver a abrirla tras
/// reiniciar la app sin salir del sandbox; sin él, macOS retira el permiso al cerrar.
struct FolderBookmark: Codable, Identifiable, Equatable {
    let id: UUID
    let displayName: String
    let path: String
    let bookmarkData: Data
}

enum FolderAccessService {
    /// Destino mientras no elijas otro: Descargas/LUGO CONNECT.
    static func defaultDestination() -> URL {
        let downloads = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask)[0]
        return downloads.appendingPathComponent("LUGO CONNECT")
    }

    /// Abre el selector de macOS. Devuelve `nil` si cancelas.
    @MainActor
    static func pickFolder(prompt: String) -> URL? {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.canCreateDirectories = true
        panel.allowsMultipleSelection = false
        panel.prompt = prompt
        return panel.runModal() == .OK ? panel.url : nil
    }

    /// Selector de archivos para enviar al teléfono. macOS da permiso a estos archivos
    /// mientras la app siga abierta.
    @MainActor
    static func pickFiles() -> [URL] {
        let panel = NSOpenPanel()
        panel.canChooseFiles = true
        panel.canChooseDirectories = false
        panel.allowsMultipleSelection = true
        panel.prompt = "Enviar al teléfono"
        return panel.runModal() == .OK ? panel.urls : []
    }

    static func makeBookmark(for url: URL) throws -> FolderBookmark {
        let data = try url.bookmarkData(
            options: .withSecurityScope,
            includingResourceValuesForKeys: nil,
            relativeTo: nil
        )
        return FolderBookmark(
            id: UUID(),
            displayName: url.lastPathComponent,
            path: url.path,
            bookmarkData: data
        )
    }

    /// Recupera la URL de un marcador. Para usarla hay que pedir acceso aparte.
    static func resolve(_ bookmark: FolderBookmark) -> URL? {
        var isStale = false
        return try? URL(
            resolvingBookmarkData: bookmark.bookmarkData,
            options: .withSecurityScope,
            relativeTo: nil,
            bookmarkDataIsStale: &isStale
        )
    }

    /// Comprueba que la carpeta sigue existiendo y que el permiso sigue vigente.
    static func isAvailable(_ bookmark: FolderBookmark) -> Bool {
        guard let url = resolve(bookmark),
              url.startAccessingSecurityScopedResource() else { return false }
        defer { url.stopAccessingSecurityScopedResource() }

        var isDirectory: ObjCBool = false
        return FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory)
            && isDirectory.boolValue
    }
}
