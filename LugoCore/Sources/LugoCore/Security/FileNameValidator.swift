import Foundation

public enum FileNameError: Error, Equatable, Sendable {
    case empty
    case containsPathSeparator
    case reservedName
    case forbiddenCharacter
    case tooLong
}

/// Valida los nombres que llegan desde el teléfono antes de tocar el disco.
public enum FileNameValidator {
    /// Límite de APFS: 255 bytes UTF-8 por nombre.
    public static let maxNameBytes = 255

    /// Devuelve el nombre listo para usar o lanza un error.
    /// Rechaza en vez de "limpiar" cualquier cosa que parezca una ruta: un nombre
    /// con separadores no es un nombre legítimo, es un intento de salir de la carpeta.
    public static func validate(_ rawName: String) throws -> String {
        let name = rawName.precomposedStringWithCanonicalMapping
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard !name.isEmpty else { throw FileNameError.empty }
        guard !name.contains("/"), !name.contains("\\") else {
            throw FileNameError.containsPathSeparator
        }
        guard !name.unicodeScalars.contains(where: isForbidden) else {
            throw FileNameError.forbiddenCharacter
        }
        // Un nombre formado solo por puntos ("." , "..", "...") nunca es válido.
        guard !name.allSatisfy({ $0 == "." }) else { throw FileNameError.reservedName }
        // Evita archivos ocultos como ".zshrc" o ".ssh".
        guard !name.hasPrefix(".") else { throw FileNameError.reservedName }
        guard name.utf8.count <= maxNameBytes else { throw FileNameError.tooLong }
        return name
    }

    /// Si `name` ya existe según `exists`, devuelve "foto (1).jpg", "foto (2).jpg"...
    /// Nunca sobrescribe un archivo. El límite de bytes se respeta acortando la base.
    public static func uniqueName(for name: String, exists: (String) -> Bool) -> String {
        guard exists(name) else { return name }

        let nsName = name as NSString
        let base = nsName.deletingPathExtension
        let ext = nsName.pathExtension
        let suffixExt = ext.isEmpty ? "" : ".\(ext)"

        var counter = 1
        while true {
            let marker = " (\(counter))"
            let available = maxNameBytes - marker.utf8.count - suffixExt.utf8.count
            let candidate = truncate(base, toBytes: max(available, 1)) + marker + suffixExt
            if !exists(candidate) { return candidate }
            counter += 1
        }
    }

    private static func isForbidden(_ scalar: Unicode.Scalar) -> Bool {
        // Caracteres de control, incluido NUL.
        if scalar.value < 0x20 || scalar.value == 0x7F { return true }
        // ":" lo interpreta Finder como separador.
        if scalar == ":" { return true }
        // Controles de dirección: permiten disfrazar "gpj.exe" como "exe.jpg".
        switch scalar.value {
        case 0x200E, 0x200F, 0x202A...0x202E, 0x2066...0x2069: return true
        default: return false
        }
    }

    private static func truncate(_ text: String, toBytes limit: Int) -> String {
        guard text.utf8.count > limit else { return text }
        var result = ""
        var used = 0
        // Corta por caracteres completos para no romper acentos ni emojis.
        for character in text {
            let size = String(character).utf8.count
            if used + size > limit { break }
            result.append(character)
            used += size
        }
        return result
    }
}
