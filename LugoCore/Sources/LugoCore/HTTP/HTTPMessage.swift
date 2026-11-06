import Foundation

/// Error que se convierte en una respuesta JSON con su código.
struct HTTPError: Error, Equatable {
    let status: Int
    let message: String
    var extra: [String: Int] = [:]
}

/// Cabecera de una petición ya validada. El cuerpo se lee aparte, por bloques.
struct HTTPRequest: Equatable {
    let method: String
    let path: String
    let query: [String: String]
    let headers: [String: String]

    /// Partes de la ruta ya decodificadas: "/api/pair/abc" → ["api", "pair", "abc"].
    var segments: [String] {
        path.split(separator: "/", omittingEmptySubsequences: true).map(String.init)
    }

    var contentLength: Int64? {
        headers["content-length"].flatMap { Int64($0) }
    }

    static let maxHeadBytes = 16 * 1024

    /// Interpreta la cabecera HTTP. Rechaza lo ambiguo en vez de intentar adivinarlo.
    static func parse(head: Data) throws -> HTTPRequest {
        guard let text = String(data: head, encoding: .utf8) else {
            throw HTTPError(status: 400, message: "Petición no válida.")
        }
        var lines = text.components(separatedBy: "\r\n")
        let requestLine = lines.removeFirst().split(separator: " ", omittingEmptySubsequences: false)
        guard requestLine.count == 3, requestLine[2].hasPrefix("HTTP/1.") else {
            throw HTTPError(status: 400, message: "Petición no válida.")
        }

        var headers: [String: String] = [:]
        for line in lines where !line.isEmpty {
            guard let colon = line.firstIndex(of: ":"), colon != line.startIndex else {
                throw HTTPError(status: 400, message: "Cabecera no válida.")
            }
            let name = line[..<colon].lowercased()
            guard !name.contains(" ") else {
                throw HTTPError(status: 400, message: "Cabecera no válida.")
            }
            let value = line[line.index(after: colon)...].trimmingCharacters(in: .whitespaces)
            if let existing = headers[name] {
                // Dos longitudes distintas son el truco clásico para colar peticiones.
                if name == "content-length", existing != value {
                    throw HTTPError(status: 400, message: "Cabecera duplicada.")
                }
                headers[name] = existing + ", " + value
            } else {
                headers[name] = value
            }
        }

        if headers["transfer-encoding"] != nil {
            throw HTTPError(status: 411, message: "Se necesita Content-Length.")
        }
        if let length = headers["content-length"] {
            guard let value = Int64(length), value >= 0 else {
                throw HTTPError(status: 400, message: "Longitud no válida.")
            }
        }

        let target = String(requestLine[1])
        let parts = target.split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false)
        guard let rawPath = parts.first, rawPath.hasPrefix("/"),
              let path = String(rawPath).removingPercentEncoding else {
            throw HTTPError(status: 400, message: "Ruta no válida.")
        }

        var query: [String: String] = [:]
        if parts.count == 2 {
            for pair in parts[1].split(separator: "&") {
                let item = pair.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false)
                let plusFree = { (value: Substring) in value.replacingOccurrences(of: "+", with: " ") }
                guard let key = plusFree(item[0]).removingPercentEncoding else { continue }
                let value = item.count == 2 ? plusFree(item[1]).removingPercentEncoding : ""
                if let value { query[key] = value }
            }
        }

        return HTTPRequest(
            method: String(requestLine[0]),
            path: path,
            query: query,
            headers: headers
        )
    }
}

/// Rango de bytes pedido por el navegador para reanudar una descarga.
struct ByteRange: Equatable {
    let start: Int64
    let end: Int64
    var length: Int64 { end - start + 1 }

    /// `nil` si no hay que aplicar rango; lanza 416 si no se puede satisfacer. Varios rangos
    /// a la vez se ignoran: entregar el archivo entero también es una respuesta válida.
    static func parse(header: String?, fileSize: Int64) throws -> ByteRange? {
        guard let header, header.lowercased().hasPrefix("bytes=") else { return nil }
        let spec = header.dropFirst("bytes=".count).trimmingCharacters(in: .whitespaces)
        guard !spec.contains(",") else { return nil }
        let parts = spec.split(separator: "-", maxSplits: 1, omittingEmptySubsequences: false)
        guard parts.count == 2 else { return nil }

        let unsatisfiable = HTTPError(status: 416, message: "Rango no disponible.")
        if parts[0].isEmpty {
            guard let suffix = Int64(parts[1]), suffix > 0 else { return nil }
            guard fileSize > 0 else { throw unsatisfiable }
            return ByteRange(start: max(fileSize - suffix, 0), end: fileSize - 1)
        }
        guard let start = Int64(parts[0]), start >= 0 else { return nil }
        guard start < fileSize else { throw unsatisfiable }
        if parts[1].isEmpty { return ByteRange(start: start, end: fileSize - 1) }
        guard let end = Int64(parts[1]), end >= start else { return nil }
        return ByteRange(start: start, end: min(end, fileSize - 1))
    }
}

enum HTTPText {
    static func reason(for status: Int) -> String {
        switch status {
        case 200: return "OK"
        case 204: return "No Content"
        case 206: return "Partial Content"
        case 400: return "Bad Request"
        case 401: return "Unauthorized"
        case 403: return "Forbidden"
        case 404: return "Not Found"
        case 405: return "Method Not Allowed"
        case 409: return "Conflict"
        case 410: return "Gone"
        case 411: return "Length Required"
        case 413: return "Payload Too Large"
        case 415: return "Unsupported Media Type"
        case 416: return "Range Not Satisfiable"
        case 429: return "Too Many Requests"
        case 503: return "Service Unavailable"
        case 507: return "Insufficient Storage"
        default: return "Error"
        }
    }

    /// `Content-Disposition` para descargas, con acentos y sin riesgo de inyectar cabeceras.
    static func attachmentHeader(fileName: String) -> String {
        let fallback = String(fileName.unicodeScalars.map { scalar -> Character in
            let isSafe = scalar.isASCII && scalar.value >= 0x20 && scalar != "\"" && scalar != "\\" && scalar.value != 0x7F
            return isSafe ? Character(scalar) : "_"
        })
        let allowed = CharacterSet.alphanumerics.intersection(CharacterSet(charactersIn: Unicode.Scalar(0)...Unicode.Scalar(127)))
            .union(CharacterSet(charactersIn: "-_.~"))
        let encoded = fileName.addingPercentEncoding(withAllowedCharacters: allowed) ?? fallback
        return "attachment; filename=\"\(fallback)\"; filename*=UTF-8''\(encoded)"
    }
}
