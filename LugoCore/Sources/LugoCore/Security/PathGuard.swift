import Foundation
#if canImport(Darwin)
import Darwin
#else
import Glibc
#endif

public enum PathGuardError: Error, Equatable, Sendable {
    case invalidPath
    case outsideAuthorizedRoot
    case rootUnavailable
}

/// Protección contra Path Traversal.
///
/// Toda ruta pedida por el teléfono es relativa a una carpeta autorizada. La comprobación
/// se hace sobre la ruta real del disco, así que un enlace simbólico que apunte fuera de
/// la carpeta también se rechaza, y no solo los "../" escritos en la petición.
public struct PathGuard: Sendable {
    public let root: URL
    private let canonicalRoot: String

    public init(root: URL) throws {
        guard let canonical = Self.realPath(root.path) else {
            throw PathGuardError.rootUnavailable
        }
        self.root = root
        self.canonicalRoot = canonical
    }

    /// Resuelve `relativePath` dentro de la raíz. El destino puede no existir todavía,
    /// lo que permite usar este método para subidas.
    public func resolve(_ relativePath: String) throws -> URL {
        guard !relativePath.utf8.contains(0), !relativePath.contains("\\") else {
            throw PathGuardError.invalidPath
        }
        guard !relativePath.hasPrefix("/"), !relativePath.hasPrefix("~") else {
            throw PathGuardError.invalidPath
        }

        let components = relativePath.split(separator: "/", omittingEmptySubsequences: true)
        guard !components.contains("..") else { throw PathGuardError.outsideAuthorizedRoot }
        let clean = components.filter { $0 != "." }.map(String.init)

        // Busca el tramo más largo que ya existe y comprueba su ruta real.
        var existing = canonicalRoot
        var index = 0
        while index < clean.count {
            let next = existing + "/" + clean[index]
            guard let resolved = Self.realPath(next) else {
                if Self.isDanglingLink(next) { throw PathGuardError.outsideAuthorizedRoot }
                break
            }
            guard isInsideRoot(resolved) else { throw PathGuardError.outsideAuthorizedRoot }
            existing = resolved
            index += 1
        }

        let final = clean[index...].reduce(existing) { $0 + "/" + $1 }
        guard isInsideRoot(final) else { throw PathGuardError.outsideAuthorizedRoot }
        return URL(fileURLWithPath: final)
    }

    private func isInsideRoot(_ path: String) -> Bool {
        if path == canonicalRoot { return true }
        // La raíz "/" ya termina en barra; las demás necesitan añadirla para que
        // "/Users/ana/Fotos2" no se confunda con "/Users/ana/Fotos".
        let prefix = canonicalRoot.hasSuffix("/") ? canonicalRoot : canonicalRoot + "/"
        return path.hasPrefix(prefix)
    }

    private static func realPath(_ path: String) -> String? {
        guard let pointer = realpath(path, nil) else { return nil }
        defer { free(pointer) }
        return String(cString: pointer)
    }

    /// Un enlace roto hace fallar a `realpath`, pero escribir a través de él crearía
    /// un archivo donde apunte. Se trata como intento de salida.
    private static func isDanglingLink(_ path: String) -> Bool {
        var info = stat()
        return lstat(path, &info) == 0
    }
}
