import Foundation
#if canImport(Darwin)
import Darwin
#else
import Glibc
#endif

/// Carpeta del Mac que el teléfono puede explorar.
public struct SharedRoot: Equatable, Sendable {
    public let id: String
    public let name: String
    public let url: URL

    public init(id: String, name: String, url: URL) {
        self.id = id
        self.name = name
        self.url = url
    }
}

/// Servidor HTTP de la red local. Atiende cada conexión en su propio hilo con E/S bloqueante:
/// las transferencias van por bloques y el ritmo lo marca el lado más lento.
public final class LugoServer: @unchecked Sendable {
    /// Ajustes que pueden cambiar mientras el servidor funciona.
    public struct Options: Sendable {
        public var destination: URL?
        public var sharedRoots: [SharedRoot]
        public var policy: TransferPolicy

        public init(destination: URL?, sharedRoots: [SharedRoot] = [], policy: TransferPolicy = .default) {
            self.destination = destination
            self.sharedRoots = sharedRoots
            self.policy = policy
        }
    }

    private struct Ticket {
        enum Item {
            case outbox(UUID)
            case shared(folder: String, path: String)
        }

        let token: String
        let clientAddress: String
        let items: [Item]
        let expires: Date
        let zipName: String
    }

    private struct DownloadFile {
        let name: String
        let url: URL
        let size: Int64
        let modified: Date
    }

    public let pairing: PairingManager
    public let tracker: TransferTracker
    public let outbox: Outbox

    private let lock = NSLock()
    private var options: Options
    private var listener: TCPListener?
    private var connections: [ObjectIdentifier: TCPConnection] = [:]
    private var tickets: [String: Ticket] = [:]
    private let publishLock = NSLock()

    private static let maxConnections = 64
    private static let maxJSONBytes = 64 * 1024
    private static let bufferSize = 1024 * 1024
    private static let partSuffix = ".lugo-part"
    private static let reserveBytes: Int64 = 50 * 1_000_000

    public init(
        options: Options,
        pairing: PairingManager = PairingManager(),
        tracker: TransferTracker = TransferTracker(),
        outbox: Outbox = Outbox()
    ) {
        self.options = options
        self.pairing = pairing
        self.tracker = tracker
        self.outbox = outbox
    }

    public var port: Int? {
        lock.lock(); defer { lock.unlock() }
        return listener?.port
    }

    public var isRunning: Bool { port != nil }

    public func update(options newOptions: Options) {
        lock.lock(); defer { lock.unlock() }
        options = newOptions
    }

    /// Arranca en `port` o, si está ocupado, en uno de los nueve siguientes.
    /// Devuelve el puerto real. Con 0 el sistema elige uno libre.
    @discardableResult
    public func start(port: Int) throws -> Int {
        lock.lock(); defer { lock.unlock() }
        if let listener { return listener.port }
        signal(SIGPIPE, SIG_IGN)

        let candidates = port == 0 ? [0] : Array(port...min(port + 9, 65535))
        var created: TCPListener?
        for candidate in candidates {
            if let attempt = try? TCPListener(port: candidate) {
                created = attempt
                break
            }
        }
        guard let created else { throw TCPError.portInUse(port) }
        listener = created
        removeStalePartsLocked()

        let handler: @Sendable (Int32, String) -> Void = { [weak self] descriptor, peer in
            self?.handleNewConnection(descriptor: descriptor, peer: peer)
        }
        let thread = Thread { created.acceptLoop(handler: handler) }
        thread.name = "lugoconnect.accept"
        thread.start()
        return created.port
    }

    /// Cierra el puerto, corta las conexiones y olvida sesiones y PIN.
    public func stop() {
        lock.lock()
        let current = listener
        listener = nil
        let open = Array(connections.values)
        tickets.removeAll()
        lock.unlock()

        current?.stop()
        tracker.cancelAll()
        open.forEach { $0.abort() }
        pairing.reset()
    }

    // MARK: - Conexiones

    private func handleNewConnection(descriptor: Int32, peer: String) {
        let connection = TCPConnection(descriptor: descriptor, peerAddress: peer)

        // Solo la red local. Se corta antes de leer un solo byte.
        guard LocalNetwork.isLocalClient(peer) else {
            connection.closeSocket()
            return
        }

        lock.lock()
        let isFull = connections.count >= Self.maxConnections
        if !isFull { connections[ObjectIdentifier(connection)] = connection }
        lock.unlock()

        guard !isFull else {
            sendError(HTTPError(status: 503, message: "Demasiadas conexiones."), to: connection)
            connection.closeSocket()
            return
        }

        let thread = Thread { [weak self] in
            self?.serve(connection)
            connection.closeSocket()
            self?.forget(connection)
        }
        thread.name = "lugoconnect.connection"
        thread.start()
    }

    private func forget(_ connection: TCPConnection) {
        lock.lock(); defer { lock.unlock() }
        connections[ObjectIdentifier(connection)] = nil
    }

    private func serve(_ connection: TCPConnection) {
        var leftover = Data()
        do {
            connection.setTimeout(seconds: 15)
            let head = try readHead(from: connection, leftover: &leftover)
            let request = try HTTPRequest.parse(head: head)
            connection.setTimeout(seconds: 30)
            try checkOrigin(request)
            try route(request, connection, leftover: leftover)
        } catch let error as HTTPError {
            sendError(error, to: connection)
        } catch {
            // Conexión perdida: no hay a quién responder.
        }
    }

    private func readHead(from connection: TCPConnection, leftover: inout Data) throws -> Data {
        var data = Data()
        var buffer = [UInt8](repeating: 0, count: 4096)
        let marker = Data([13, 10, 13, 10])
        while true {
            if let range = data.range(of: marker) {
                leftover = data[range.upperBound...]
                return data[..<range.lowerBound]
            }
            guard data.count < HTTPRequest.maxHeadBytes else {
                throw HTTPError(status: 400, message: "Cabecera demasiado grande.")
            }
            let count = try buffer.withUnsafeMutableBytes { raw in
                try connection.receive(into: raw.baseAddress!, count: raw.count)
            }
            guard count > 0 else { throw TCPError.connectionClosed }
            data.append(contentsOf: buffer[0..<count])
        }
    }

    /// Frena ataques desde páginas web (DNS rebinding y peticiones entre sitios): el
    /// navegador debe estar hablando con una IP local y desde esta misma página.
    private func checkOrigin(_ request: HTTPRequest) throws {
        guard let host = request.headers["host"] else {
            throw HTTPError(status: 400, message: "Falta Host.")
        }
        let hostName = host.split(separator: ":").first.map(String.init) ?? host
        guard hostName == "localhost" || LocalNetwork.isLocalClient(hostName) else {
            throw HTTPError(status: 403, message: "Host no permitido.")
        }
        if let origin = request.headers["origin"], origin != "http://\(host)" {
            throw HTTPError(status: 403, message: "Origen no permitido.")
        }
    }

    // MARK: - Rutas

    private func route(_ request: HTTPRequest, _ connection: TCPConnection, leftover: Data) throws {
        let segments = request.segments
        switch (request.method, segments.first) {
        case ("GET", nil):
            try sendAsset(WebAssets.html, type: "text/html; charset=utf-8", to: connection)
        case ("GET", "app.js") where segments.count == 1:
            try sendAsset(WebAssets.script, type: "text/javascript; charset=utf-8", to: connection)
        case ("GET", "app.css") where segments.count == 1:
            try sendAsset(WebAssets.style, type: "text/css; charset=utf-8", to: connection)
        case ("GET", "icon.svg") where segments.count == 1:
            try sendAsset(WebAssets.icon, type: "image/svg+xml", to: connection)
        case ("GET", "dl") where segments.count >= 2:
            try handleDownload(ticketID: segments[1], request, connection)
        case (_, "api") where segments.count >= 2:
            try routeAPI(request, connection, leftover: leftover)
        case ("GET", _), ("POST", _), ("PUT", _):
            throw HTTPError(status: 404, message: "No encontrado.")
        default:
            throw HTTPError(status: 405, message: "Método no permitido.")
        }
    }

    private func routeAPI(_ request: HTTPRequest, _ connection: TCPConnection, leftover: Data) throws {
        let segments = request.segments
        let endpoint = segments[1]
        let peer = connection.peerAddress

        // Únicas rutas sin token: las del propio emparejamiento.
        if endpoint == "pair" {
            switch (request.method, segments.count) {
            case ("POST", 2):
                let body = try readJSON(request, connection, leftover: leftover)
                try handlePair(body, peer: peer, connection)
            case ("GET", 3):
                try handlePairStatus(id: segments[2], peer: peer, connection)
            default:
                throw HTTPError(status: 405, message: "Método no permitido.")
            }
            return
        }

        guard let token = request.headers["x-lugo-token"],
              let session = pairing.validate(token: token, clientAddress: peer) else {
            throw HTTPError(status: 401, message: "Sesión no válida. Vuelve a conectar.")
        }

        switch (request.method, endpoint) {
        case ("GET", "status"):
            let settings = currentOptions()
            try sendJSON([
                "device": session.deviceName,
                "destination": settings.destination?.lastPathComponent ?? "",
                "maxFileSize": settings.policy.maxFileSizeBytes ?? 0,
                "outboxCount": outbox.all.count
            ], to: connection)
        case ("POST", "logout"):
            pairing.revoke(sessionID: session.id)
            try sendJSON(["ok": true], to: connection)
        case ("POST", "upload") where segments.count == 3 && segments[2] == "check":
            let body = try readJSON(request, connection, leftover: leftover)
            let name = try checkUpload(
                rawName: body["name"] as? String ?? "",
                size: (body["size"] as? NSNumber)?.int64Value ?? -1
            )
            try sendJSON(["ok": true, "name": name], to: connection)
        case ("POST", "upload") where segments.count == 3 && segments[2] == "cancel":
            let body = try readJSON(request, connection, leftover: leftover)
            if let key = body["key"] as? String { tracker.cancel(clientKey: session.token + key) }
            try sendJSON(["ok": true], to: connection)
        case ("PUT", "upload"):
            try handleUpload(request, connection, leftover: leftover, session: session)
        case ("GET", "folders"):
            let folders = currentOptions().sharedRoots.map { ["id": $0.id, "name": $0.name] }
            try sendJSON(["folders": folders], to: connection)
        case ("GET", "files"):
            try handleList(request, connection)
        case ("GET", "outbox"):
            let items = outbox.all.map { item -> [String: Any] in
                ["id": item.id.uuidString, "name": item.name, "size": item.sizeBytes]
            }
            try sendJSON(["items": items], to: connection)
        case ("POST", "tickets"):
            let body = try readJSON(request, connection, leftover: leftover)
            try handleTicket(body, token: token, peer: peer, connection)
        default:
            throw HTTPError(status: 404, message: "No encontrado.")
        }
    }

    private func currentOptions() -> Options {
        lock.lock(); defer { lock.unlock() }
        return options
    }

    // MARK: - Emparejamiento

    private func handlePair(_ body: [String: Any], peer: String, _ connection: TCPConnection) throws {
        let pin = body["pin"] as? String ?? ""
        let device = body["device"] as? String ?? ""
        do {
            let request = try pairing.submitPIN(pin, clientAddress: peer, deviceName: device)
            try sendJSON(["requestId": request.id.uuidString], to: connection)
        } catch PairingError.wrongPIN(let attemptsLeft) {
            throw HTTPError(status: 403, message: "PIN incorrecto.", extra: ["attemptsLeft": attemptsLeft])
        } catch PairingError.lockedOut(let until) {
            let seconds = max(Int(until.timeIntervalSinceNow.rounded(.up)), 1)
            throw HTTPError(status: 429, message: "Demasiados intentos.", extra: ["retryAfter": seconds])
        } catch PairingError.pinExpired {
            throw HTTPError(status: 410, message: "El PIN caducó. Mira el nuevo en tu Mac.")
        }
    }

    private func handlePairStatus(id: String, peer: String, _ connection: TCPConnection) throws {
        guard let requestID = UUID(uuidString: id) else {
            throw HTTPError(status: 404, message: "Solicitud desconocida.")
        }
        switch pairing.status(requestID: requestID, clientAddress: peer) {
        case .pending:
            try sendJSON(["status": "pending"], to: connection)
        case .approved(let token):
            try sendJSON(["status": "approved", "token": token], to: connection)
        case .rejected:
            try sendJSON(["status": "rejected"], to: connection)
        case .unknown:
            try sendJSON(["status": "unknown"], to: connection)
        }
    }

    // MARK: - Android → Mac

    /// Comprueba nombre, extensión, tamaño y espacio. Devuelve el nombre validado.
    private func checkUpload(rawName: String, size: Int64) throws -> String {
        let settings = currentOptions()
        guard let destination = settings.destination else {
            throw HTTPError(status: 409, message: "El Mac no tiene carpeta de destino.")
        }
        let name: String
        do {
            name = try FileNameValidator.validate(rawName)
        } catch {
            throw HTTPError(status: 400, message: "Nombre de archivo no permitido.")
        }
        guard settings.policy.allows(fileName: name) else {
            throw HTTPError(status: 415, message: "Ese tipo de archivo está bloqueado en el Mac.")
        }
        guard settings.policy.allows(sizeBytes: size) else {
            throw HTTPError(status: 413, message: "El archivo supera el límite configurado en el Mac.")
        }
        if let free = Self.freeBytes(at: destination), free < size + Self.reserveBytes {
            throw HTTPError(status: 507, message: "El Mac no tiene espacio suficiente.")
        }
        return name
    }

    private func handleUpload(
        _ request: HTTPRequest,
        _ connection: TCPConnection,
        leftover: Data,
        session: Session
    ) throws {
        guard let length = request.contentLength else {
            throw HTTPError(status: 411, message: "Se necesita Content-Length.")
        }
        let name = try checkUpload(rawName: request.query["name"] ?? "", size: length)
        guard let destination = currentOptions().destination else {
            throw HTTPError(status: 409, message: "El Mac no tiene carpeta de destino.")
        }
        try? FileManager.default.createDirectory(at: destination, withIntermediateDirectories: true)

        // Se escribe en un archivo aparte y solo se publica completo: una transferencia
        // interrumpida nunca deja un archivo a medias con aspecto de bueno.
        let partURL = destination.appendingPathComponent(".\(UUID().uuidString)\(Self.partSuffix)")
        let file = open(partURL.path, O_WRONLY | O_CREAT | O_EXCL, 0o644)
        guard file >= 0 else {
            throw HTTPError(status: 507, message: "No se pudo escribir en la carpeta de destino.")
        }

        let clientKey = request.query["key"].map { session.token + $0 }
        let transfer = tracker.start(
            fileName: name,
            totalBytes: length,
            direction: .androidToMac,
            clientKey: clientKey,
            abort: { connection.abort() }
        )

        var isFileOpen = true
        func discard(_ status: TransferStatus, detail: String) {
            if isFileOpen { close(file); isFileOpen = false }
            unlink(partURL.path)
            tracker.finish(id: transfer, status: status, detail: detail)
        }

        do {
            var remaining = length
            func store(_ pointer: UnsafeRawPointer, _ count: Int) throws {
                var offset = 0
                while offset < count {
                    let written = write(file, pointer + offset, count - offset)
                    if written < 0, errno == EINTR { continue }
                    guard written > 0 else {
                        throw HTTPError(status: 507, message: "No se pudo guardar: disco lleno o sin permiso.")
                    }
                    offset += written
                }
                remaining -= Int64(count)
                if !tracker.add(bytes: count, to: transfer) { throw TCPError.connectionClosed }
            }

            let initial = leftover.prefix(Int(min(Int64(leftover.count), remaining)))
            if !initial.isEmpty {
                try initial.withUnsafeBytes { try store($0.baseAddress!, $0.count) }
            }

            let buffer = UnsafeMutableRawPointer.allocate(byteCount: Self.bufferSize, alignment: 16)
            defer { buffer.deallocate() }
            while remaining > 0 {
                let wanted = Int(min(remaining, Int64(Self.bufferSize)))
                let count = try connection.receive(into: buffer, count: wanted)
                guard count > 0 else { throw TCPError.connectionClosed }
                try store(buffer, count)
            }

            close(file)
            isFileOpen = false
            let finalName = try publish(partURL: partURL, in: destination, name: name)
            tracker.finish(id: transfer, status: .completed, fileName: finalName)
            try? sendJSON(["ok": true, "name": finalName, "size": length], to: connection)
        } catch let error as HTTPError {
            discard(.failed, detail: error.message)
            throw error
        } catch {
            discard(.failed, detail: "Conexión interrumpida")
        }
    }

    /// Da nombre definitivo sin sobrescribir nunca un archivo existente. `link` falla si el
    /// nombre ya existe, lo que evita que dos subidas simultáneas se pisen.
    private func publish(partURL: URL, in destination: URL, name: String) throws -> String {
        publishLock.lock(); defer { publishLock.unlock() }
        let manager = FileManager.default
        var candidate = FileNameValidator.uniqueName(for: name) {
            manager.fileExists(atPath: destination.appendingPathComponent($0).path)
        }
        for _ in 0..<5 {
            let target = destination.appendingPathComponent(candidate).path
            if link(partURL.path, target) == 0 {
                unlink(partURL.path)
                return candidate
            }
            if errno != EEXIST {
                // Discos que no admiten enlaces, como exFAT.
                if !manager.fileExists(atPath: target), rename(partURL.path, target) == 0 { return candidate }
                break
            }
            candidate = FileNameValidator.uniqueName(for: name) {
                manager.fileExists(atPath: destination.appendingPathComponent($0).path)
            }
        }
        throw HTTPError(status: 507, message: "No se pudo guardar el archivo.")
    }

    private static func freeBytes(at url: URL) -> Int64? {
        var info = statvfs()
        guard statvfs(url.path, &info) == 0 else { return nil }
        return Int64(info.f_bavail) * Int64(info.f_frsize)
    }

    /// Restos de una ejecución anterior que se cerró de golpe.
    private func removeStalePartsLocked() {
        guard let destination = options.destination,
              let names = try? FileManager.default.contentsOfDirectory(atPath: destination.path) else { return }
        for name in names where name.hasPrefix(".") && name.hasSuffix(Self.partSuffix) {
            unlink(destination.appendingPathComponent(name).path)
        }
    }

    // MARK: - Explorar carpetas autorizadas

    private func sharedRoot(id: String) throws -> SharedRoot {
        guard let root = currentOptions().sharedRoots.first(where: { $0.id == id }) else {
            throw HTTPError(status: 403, message: "Carpeta no autorizada.")
        }
        return root
    }

    private func resolveShared(folder: String, path: String) throws -> (PathGuard, URL) {
        let root = try sharedRoot(id: folder)
        do {
            let guardian = try PathGuard(root: root.url)
            let url = try guardian.resolve(path)
            return (guardian, url)
        } catch {
            throw HTTPError(status: 403, message: "Ruta no autorizada.")
        }
    }

    private func handleList(_ request: HTTPRequest, _ connection: TCPConnection) throws {
        let folder = request.query["folder"] ?? ""
        let path = request.query["path"] ?? ""
        let (guardian, url) = try resolveShared(folder: folder, path: path)
        guard let names = try? FileManager.default.contentsOfDirectory(atPath: url.path) else {
            throw HTTPError(status: 404, message: "No se pudo abrir esa carpeta.")
        }

        var entries: [[String: Any]] = []
        for name in names where !name.hasPrefix(".") {
            let relative = path.isEmpty ? name : path + "/" + name
            // Un enlace que apunta fuera de la carpeta simplemente no aparece.
            guard let resolved = try? guardian.resolve(relative) else { continue }
            var info = stat()
            guard stat(resolved.path, &info) == 0 else { continue }
            let kind = info.st_mode & S_IFMT
            guard kind == S_IFDIR || kind == S_IFREG else { continue }
            entries.append([
                "name": name,
                "isDir": kind == S_IFDIR,
                "size": Int64(info.st_size)
            ])
        }
        entries.sort { left, right in
            let leftDir = left["isDir"] as? Bool ?? false
            let rightDir = right["isDir"] as? Bool ?? false
            if leftDir != rightDir { return leftDir }
            let leftName = left["name"] as? String ?? ""
            let rightName = right["name"] as? String ?? ""
            return leftName.localizedCaseInsensitiveCompare(rightName) == .orderedAscending
        }
        try sendJSON(["path": path, "entries": entries], to: connection)
    }

    // MARK: - Mac → Android

    /// Las descargas las hace el propio navegador, que no puede enviar cabeceras. Se le da
    /// un enlace temporal en vez de poner el token de sesión en una URL.
    private func handleTicket(
        _ body: [String: Any],
        token: String,
        peer: String,
        _ connection: TCPConnection
    ) throws {
        guard let rawItems = body["items"] as? [[String: Any]], !rawItems.isEmpty, rawItems.count <= 5000 else {
            throw HTTPError(status: 400, message: "No hay archivos seleccionados.")
        }
        var items: [Ticket.Item] = []
        for raw in rawItems {
            if let text = raw["outbox"] as? String, let id = UUID(uuidString: text) {
                items.append(.outbox(id))
            } else if let folder = raw["folder"] as? String, let path = raw["path"] as? String {
                items.append(.shared(folder: folder, path: path))
            } else {
                throw HTTPError(status: 400, message: "Selección no válida.")
            }
        }

        let ticket = Ticket(
            token: token,
            clientAddress: peer,
            items: items,
            expires: Date().addingTimeInterval(60 * 60),
            zipName: "LUGO-CONNECT-\(items.count)-archivos.zip"
        )
        // Se resuelve ya para avisar enseguida si algún archivo no está disponible.
        let files = try resolveFiles(ticket)
        let id = UUID().uuidString + UUID().uuidString

        lock.lock()
        let date = Date()
        tickets = tickets.filter { $0.value.expires > date }
        tickets[id] = ticket
        lock.unlock()

        let name = files.count == 1 ? files[0].name : ticket.zipName
        let encoded = name.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed.subtracting(CharacterSet(charactersIn: "/?#"))) ?? "archivo"
        try sendJSON(["url": "/dl/\(id)/\(encoded)", "name": name], to: connection)
    }

    private func resolveFiles(_ ticket: Ticket) throws -> [DownloadFile] {
        try ticket.items.map { item in
            let url: URL
            switch item {
            case .outbox(let id):
                guard let entry = outbox.item(id: id) else {
                    throw HTTPError(status: 404, message: "Ese archivo ya no está disponible.")
                }
                url = entry.url
            case .shared(let folder, let path):
                url = try resolveShared(folder: folder, path: path).1
            }
            var info = stat()
            guard stat(url.path, &info) == 0, info.st_mode & S_IFMT == S_IFREG else {
                throw HTTPError(status: 404, message: "Ese archivo ya no está disponible.")
            }
            return DownloadFile(
                name: url.lastPathComponent,
                url: url,
                size: Int64(info.st_size),
                modified: Date(timeIntervalSince1970: Self.modificationSeconds(info))
            )
        }
    }

    private static func modificationSeconds(_ info: stat) -> TimeInterval {
        #if canImport(Darwin)
        return TimeInterval(info.st_mtimespec.tv_sec)
        #else
        return TimeInterval(info.st_mtim.tv_sec)
        #endif
    }

    private func handleDownload(ticketID: String, _ request: HTTPRequest, _ connection: TCPConnection) throws {
        lock.lock()
        let ticket = tickets[ticketID]
        lock.unlock()

        guard let ticket, ticket.expires > Date(), ticket.clientAddress == connection.peerAddress,
              pairing.validate(token: ticket.token, clientAddress: connection.peerAddress) != nil else {
            throw HTTPError(status: 401, message: "Enlace caducado. Vuelve a pedir la descarga.")
        }

        let files = try resolveFiles(ticket)
        if files.count == 1 {
            try sendFile(files[0], request, connection)
        } else {
            try sendZip(files, name: ticket.zipName, connection)
        }
    }

    private func sendFile(_ file: DownloadFile, _ request: HTTPRequest, _ connection: TCPConnection) throws {
        let etag = "\"\(file.size)-\(Int(file.modified.timeIntervalSince1970))\""

        // Si el archivo cambió desde que empezó la descarga, se envía entero.
        var rangeHeader = request.headers["range"]
        if let condition = request.headers["if-range"], condition != etag { rangeHeader = nil }
        let range = try ByteRange.parse(header: rangeHeader, fileSize: file.size)

        let descriptor = open(file.url.path, O_RDONLY)
        guard descriptor >= 0 else {
            throw HTTPError(status: 404, message: "No se pudo abrir el archivo.")
        }
        defer { close(descriptor) }

        var headers = [
            "Content-Type": "application/octet-stream",
            "Content-Disposition": HTTPText.attachmentHeader(fileName: file.name),
            "Accept-Ranges": "bytes",
            "ETag": etag,
            "Content-Length": String(range?.length ?? file.size)
        ]
        if let range {
            headers["Content-Range"] = "bytes \(range.start)-\(range.end)/\(file.size)"
            lseek(descriptor, off_t(range.start), SEEK_SET)
        }
        try sendHead(status: range == nil ? 200 : 206, headers: headers, to: connection)

        let total = range?.length ?? file.size
        let transfer = tracker.start(
            fileName: file.name,
            totalBytes: total,
            direction: .macToAndroid,
            abort: { connection.abort() }
        )
        do {
            var remaining = total
            try Self.copy(descriptor: descriptor, limit: &remaining) { pointer, count in
                try connection.sendAll(pointer, count: count)
                if !tracker.add(bytes: count, to: transfer) { throw TCPError.connectionClosed }
            }
            tracker.finish(id: transfer, status: remaining == 0 ? .completed : .failed)
        } catch {
            tracker.finish(id: transfer, status: .failed, detail: "Conexión interrumpida")
        }
    }

    private func sendZip(_ files: [DownloadFile], name: String, _ connection: TCPConnection) throws {
        let plan = ZipPlan(files: files.map { ($0.name, $0.url, $0.size, $0.modified) })
        let total = plan.totalSize
        try sendHead(status: 200, headers: [
            "Content-Type": "application/zip",
            "Content-Disposition": HTTPText.attachmentHeader(fileName: name),
            "Content-Length": String(total)
        ], to: connection)

        let transfer = tracker.start(
            fileName: name,
            totalBytes: total,
            direction: .macToAndroid,
            abort: { connection.abort() }
        )
        do {
            try plan.write(
                sink: { pointer, count in
                    try connection.sendAll(pointer, count: count)
                    if !self.tracker.add(bytes: count, to: transfer) { throw TCPError.connectionClosed }
                },
                readFile: { url, consume in
                    let descriptor = open(url.path, O_RDONLY)
                    guard descriptor >= 0 else {
                        throw HTTPError(status: 404, message: "No se pudo abrir \(url.lastPathComponent).")
                    }
                    defer { close(descriptor) }
                    var remaining = Int64.max
                    var copied: Int64 = 0
                    try Self.copy(descriptor: descriptor, limit: &remaining) { pointer, count in
                        copied += Int64(count)
                        try consume(pointer, count)
                    }
                    return copied
                }
            )
            tracker.finish(id: transfer, status: .completed)
        } catch {
            tracker.finish(id: transfer, status: .failed, detail: "Conexión interrumpida")
        }
    }

    /// Copia por bloques de 1 MB. Sale al llegar a `limit` o al final del archivo.
    private static func copy(
        descriptor: Int32,
        limit: inout Int64,
        consume: (UnsafeRawPointer, Int) throws -> Void
    ) throws {
        let buffer = UnsafeMutableRawPointer.allocate(byteCount: bufferSize, alignment: 16)
        defer { buffer.deallocate() }
        while limit > 0 {
            let count = read(descriptor, buffer, Int(min(limit, Int64(bufferSize))))
            if count < 0, errno == EINTR { continue }
            guard count >= 0 else { throw TCPError.ioFailed }
            if count == 0 { return }
            limit -= Int64(count)
            try consume(buffer, count)
        }
    }

    // MARK: - Respuestas

    private func readJSON(_ request: HTTPRequest, _ connection: TCPConnection, leftover: Data) throws -> [String: Any] {
        guard let length = request.contentLength else {
            throw HTTPError(status: 411, message: "Se necesita Content-Length.")
        }
        guard length <= Int64(Self.maxJSONBytes) else {
            throw HTTPError(status: 413, message: "Petición demasiado grande.")
        }
        var data = Data(leftover.prefix(Int(length)))
        var buffer = [UInt8](repeating: 0, count: 4096)
        while Int64(data.count) < length {
            let count = try buffer.withUnsafeMutableBytes { raw in
                try connection.receive(into: raw.baseAddress!, count: raw.count)
            }
            guard count > 0 else { throw TCPError.connectionClosed }
            data.append(contentsOf: buffer[0..<count])
        }
        guard let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw HTTPError(status: 400, message: "Datos no válidos.")
        }
        return object
    }

    private func sendHead(status: Int, headers: [String: String], to connection: TCPConnection) throws {
        var text = "HTTP/1.1 \(status) \(HTTPText.reason(for: status))\r\n"
        let common = [
            "Connection": "close",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "no-referrer"
        ]
        for (name, value) in common.merging(headers, uniquingKeysWith: { _, new in new }) {
            text += "\(name): \(value)\r\n"
        }
        text += "\r\n"
        try connection.sendData(Data(text.utf8))
    }

    private func sendAsset(_ content: String, type: String, to connection: TCPConnection) throws {
        let data = Data(content.utf8)
        try sendHead(status: 200, headers: [
            "Content-Type": type,
            "Content-Length": String(data.count),
            "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
        ], to: connection)
        try connection.sendData(data)
    }

    private func sendJSON(_ object: [String: Any], status: Int = 200, to connection: TCPConnection) throws {
        let data = try JSONSerialization.data(withJSONObject: object)
        try sendHead(status: status, headers: [
            "Content-Type": "application/json; charset=utf-8",
            "Content-Length": String(data.count)
        ], to: connection)
        try connection.sendData(data)
    }

    private func sendError(_ error: HTTPError, to connection: TCPConnection) {
        var body: [String: Any] = ["error": error.message]
        for (key, value) in error.extra { body[key] = value }
        try? sendJSON(body, status: error.status, to: connection)
    }
}
