import Foundation
import XCTest
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
#if canImport(Darwin)
import Darwin
private let streamType = SOCK_STREAM
#else
import Glibc
private let streamType = Int32(SOCK_STREAM.rawValue)
#endif
@testable import LugoCore

/// Pruebas de extremo a extremo: servidor real, puerto real y peticiones HTTP reales.
final class ServerTests: XCTestCase {
    private var base: URL!
    private var destination: URL!
    private var shared: URL!
    private var server: LugoServer!
    private var port = 0
    private var token = ""

    override func setUpWithError() throws {
        let manager = FileManager.default
        base = manager.temporaryDirectory.appendingPathComponent("lugo-server-\(UUID().uuidString)")
        destination = base.appendingPathComponent("Destino")
        shared = base.appendingPathComponent("Compartida")
        try manager.createDirectory(at: destination, withIntermediateDirectories: true)
        try manager.createDirectory(at: shared.appendingPathComponent("sub"), withIntermediateDirectories: true)
        try Data("contenido del pdf".utf8).write(to: shared.appendingPathComponent("doc.pdf"))
        try Data("foto".utf8).write(to: shared.appendingPathComponent("sub/foto.jpg"))
        try Data("secreto".utf8).write(to: base.appendingPathComponent("secreto.txt"))
        try Data("oculto".utf8).write(to: shared.appendingPathComponent(".oculto"))
        try manager.createSymbolicLink(
            at: shared.appendingPathComponent("fuga.txt"),
            withDestinationURL: base.appendingPathComponent("secreto.txt")
        )

        server = LugoServer(options: .init(
            destination: destination,
            sharedRoots: [SharedRoot(id: "c", name: "Compartida", url: shared)]
        ))
        port = try server.start(port: 0)
        token = try pair()
    }

    override func tearDownWithError() throws {
        server.stop()
        try? FileManager.default.removeItem(at: base)
    }

    // MARK: - Ayudas

    private struct Reply {
        let status: Int
        let body: Data
        let headers: [String: String]

        var json: [String: Any] {
            (try? JSONSerialization.jsonObject(with: body) as? [String: Any]) ?? [:]
        }
    }

    private func call(
        _ path: String,
        method: String = "GET",
        body: Data? = nil,
        token: String? = nil,
        headers: [String: String] = [:]
    ) throws -> Reply {
        var request = URLRequest(url: URL(string: "http://127.0.0.1:\(port)\(path)")!)
        request.httpMethod = method
        request.httpBody = body
        request.timeoutInterval = 30
        if let token { request.setValue(token, forHTTPHeaderField: "X-Lugo-Token") }
        for (name, value) in headers { request.setValue(value, forHTTPHeaderField: name) }

        let done = DispatchSemaphore(value: 0)
        final class Box: @unchecked Sendable {
            var data: Data?
            var response: HTTPURLResponse?
            var error: Error?
        }
        let box = Box()
        URLSession.shared.dataTask(with: request) { data, response, error in
            box.data = data
            box.response = response as? HTTPURLResponse
            box.error = error
            done.signal()
        }.resume()
        done.wait()
        if let error = box.error { throw error }
        var lower: [String: String] = [:]
        for (key, value) in box.response?.allHeaderFields ?? [:] {
            if let key = key as? String, let value = value as? String { lower[key.lowercased()] = value }
        }
        return Reply(status: box.response?.statusCode ?? 0, body: box.data ?? Data(), headers: lower)
    }

    private func json(_ object: [String: Any]) throws -> Data {
        try JSONSerialization.data(withJSONObject: object)
    }

    private func pair() throws -> String {
        let reply = try call(
            "/api/pair",
            method: "POST",
            body: try json(["pin": server.pairing.currentPIN, "device": "HONOR 8XD"])
        )
        let id = try XCTUnwrap(reply.json["requestId"] as? String)
        try server.pairing.approve(requestID: XCTUnwrap(UUID(uuidString: id)))
        let status = try call("/api/pair/\(id)")
        return try XCTUnwrap(status.json["token"] as? String)
    }

    private func upload(_ name: String, _ content: Data) throws -> Reply {
        let encoded = name.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? name
        return try call("/api/upload?name=\(encoded)", method: "PUT", body: content, token: token)
    }

    /// Socket a mano, para cortar una subida a mitad de camino como lo haría un teléfono.
    private func connectRaw() throws -> Int32 {
        let descriptor = socket(AF_INET, streamType, 0)
        var address = sockaddr_in()
        address.sin_family = sa_family_t(AF_INET)
        address.sin_port = in_port_t(port).bigEndian
        address.sin_addr.s_addr = inet_addr("127.0.0.1")
        let result = withUnsafePointer(to: &address) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                connect(descriptor, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        XCTAssertEqual(result, 0)
        return descriptor
    }

    private func startPartialUpload(name: String, total: Int, sending: Int, key: String = "k") throws -> Int32 {
        let descriptor = try connectRaw()
        let head = "PUT /api/upload?name=\(name)&key=\(key) HTTP/1.1\r\nHost: 127.0.0.1:\(port)\r\n"
            + "X-Lugo-Token: \(token)\r\nContent-Length: \(total)\r\n\r\n"
        _ = head.withCString { send(descriptor, $0, strlen($0), 0) }
        let chunk = [UInt8](repeating: 7, count: sending)
        _ = chunk.withUnsafeBytes { send(descriptor, $0.baseAddress, $0.count, 0) }
        return descriptor
    }

    private func waitUntil(timeout: TimeInterval = 5, _ condition: () -> Bool) -> Bool {
        let limit = Date().addingTimeInterval(timeout)
        while Date() < limit {
            if condition() { return true }
            Thread.sleep(forTimeInterval: 0.02)
        }
        return condition()
    }

    private func destinationFiles() throws -> [String] {
        try FileManager.default.contentsOfDirectory(atPath: destination.path).sorted()
    }

    private func ticket(_ items: [[String: Any]]) throws -> String {
        let reply = try call("/api/tickets", method: "POST", body: try json(["items": items]), token: token)
        XCTAssertEqual(reply.status, 200)
        return try XCTUnwrap(reply.json["url"] as? String)
    }

    // MARK: - Acceso

    func testPageIsPublicButAPINeedsToken() throws {
        let page = try call("/")
        XCTAssertEqual(page.status, 200)
        XCTAssertNotNil(page.headers["content-security-policy"])
        for path in ["/api/status", "/api/folders", "/api/files?folder=c", "/api/outbox"] {
            XCTAssertEqual(try call(path).status, 401, path)
            XCTAssertEqual(try call(path, token: "falso").status, 401, path)
        }
        XCTAssertEqual(try call("/api/upload?name=a.txt", method: "PUT", body: Data("x".utf8)).status, 401)
        XCTAssertEqual(try destinationFiles(), [])
    }

    func testWrongPINAndRejection() throws {
        let bad = server.pairing.currentPIN == "000000" ? "111111" : "000000"
        let reply = try call("/api/pair", method: "POST", body: try json(["pin": bad, "device": "x"]))
        XCTAssertEqual(reply.status, 403)
        XCTAssertEqual(reply.json["attemptsLeft"] as? Int, 4)

        let good = try call("/api/pair", method: "POST", body: try json(["pin": server.pairing.currentPIN, "device": "x"]))
        let id = try XCTUnwrap(good.json["requestId"] as? String)
        XCTAssertEqual(try call("/api/pair/\(id)").json["status"] as? String, "pending")
        server.pairing.reject(requestID: try XCTUnwrap(UUID(uuidString: id)))
        let rejected = try call("/api/pair/\(id)").json
        XCTAssertEqual(rejected["status"] as? String, "rejected")
        XCTAssertNil(rejected["token"])
    }

    func testTokenIsDeliveredOnlyOnce() throws {
        let good = try call("/api/pair", method: "POST", body: try json(["pin": server.pairing.currentPIN, "device": "x"]))
        let id = try XCTUnwrap(good.json["requestId"] as? String)
        try server.pairing.approve(requestID: try XCTUnwrap(UUID(uuidString: id)))
        XCTAssertEqual(try call("/api/pair/\(id)").json["status"] as? String, "approved")
        XCTAssertEqual(try call("/api/pair/\(id)").json["status"] as? String, "unknown")
    }

    func testRejectsForeignHostAndOrigin() throws {
        XCTAssertEqual(try sendRaw("GET / HTTP/1.1\r\nHost: atacante.com\r\n\r\n").hasPrefix("HTTP/1.1 403"), true)
        XCTAssertEqual(
            try sendRaw("GET / HTTP/1.1\r\nHost: 127.0.0.1\r\nOrigin: http://atacante.com\r\n\r\n").hasPrefix("HTTP/1.1 403"),
            true
        )
        XCTAssertEqual(try sendRaw("BASURA\r\n\r\n").hasPrefix("HTTP/1.1 400"), true)
        XCTAssertEqual(
            try sendRaw("PUT /api/upload?name=a HTTP/1.1\r\nHost: 127.0.0.1\r\nX-Lugo-Token: \(token)\r\nTransfer-Encoding: chunked\r\n\r\n").hasPrefix("HTTP/1.1 411"),
            true
        )
    }

    private func sendRaw(_ text: String) throws -> String {
        let descriptor = try connectRaw()
        defer { close(descriptor) }
        _ = text.withCString { send(descriptor, $0, strlen($0), 0) }
        var buffer = [UInt8](repeating: 0, count: 4096)
        let count = recv(descriptor, &buffer, buffer.count, 0)
        return String(decoding: buffer[0..<max(count, 0)], as: UTF8.self)
    }

    func testStopClosesPortAndForgetsSessions() throws {
        server.stop()
        XCTAssertThrowsError(try call("/"))
        XCTAssertFalse(server.isRunning)
        port = try server.start(port: 0)
        XCTAssertEqual(try call("/api/status", token: token).status, 401)
    }

    // MARK: - Android → Mac

    func testUploadStoresExactBytesAndNeverOverwrites() throws {
        let content = Data((0..<3_000_000).map { UInt8($0 % 251) })
        let first = try upload("vídeo.mp4", content)
        XCTAssertEqual(first.status, 200)
        XCTAssertEqual(first.json["name"] as? String, "vídeo.mp4")
        XCTAssertEqual(try Data(contentsOf: destination.appendingPathComponent("vídeo.mp4")), content)

        let second = try upload("vídeo.mp4", Data("otro".utf8))
        XCTAssertEqual(second.json["name"] as? String, "vídeo (1).mp4")
        XCTAssertEqual(try Data(contentsOf: destination.appendingPathComponent("vídeo.mp4")), content)
        XCTAssertEqual(try destinationFiles().count, 2)

        let finished = server.tracker.snapshot().first { $0.fileName == "vídeo.mp4" }
        XCTAssertEqual(finished?.status, .completed)
        XCTAssertEqual(finished?.transferredBytes, Int64(content.count))
    }

    func testEmptyFile() throws {
        XCTAssertEqual(try upload("vacio.txt", Data()).status, 200)
        XCTAssertEqual(try Data(contentsOf: destination.appendingPathComponent("vacio.txt")).count, 0)
    }

    func testSimultaneousUploadsWithSameNameDoNotCollide() throws {
        let group = DispatchGroup()
        for index in 0..<8 {
            group.enter()
            let content = Data(repeating: UInt8(index), count: 200_000)
            DispatchQueue.global().async {
                _ = try? self.upload("igual.bin", content)
                group.leave()
            }
        }
        group.wait()
        let files = try destinationFiles()
        XCTAssertEqual(files.count, 8)
        var seen = Set<UInt8>()
        for name in files {
            let data = try Data(contentsOf: destination.appendingPathComponent(name))
            XCTAssertEqual(data.count, 200_000)
            XCTAssertTrue(data.allSatisfy { $0 == data[0] }, "archivo mezclado")
            seen.insert(data[0])
        }
        XCTAssertEqual(seen.count, 8)
    }

    func testMaliciousNamesNeverLeaveDestination() throws {
        for name in ["../fuera.txt", "..%2Ffuera.txt", "/etc/fuera.txt", "..", ".zshrc", "a%00b.txt"] {
            let reply = try call("/api/upload?name=\(name)", method: "PUT", body: Data("x".utf8), token: token)
            XCTAssertEqual(reply.status, 400, name)
        }
        XCTAssertEqual(try destinationFiles(), [])
        XCTAssertFalse(FileManager.default.fileExists(atPath: base.appendingPathComponent("fuera.txt").path))
    }

    func testPolicyBlocksExtensionAndSize() throws {
        XCTAssertEqual(try upload("instalar.command", Data("x".utf8)).status, 415)
        var policy = TransferPolicy.default
        policy.maxFileSizeBytes = 10
        server.update(options: .init(destination: destination, policy: policy))
        XCTAssertEqual(try upload("grande.bin", Data(count: 11)).status, 413)
        XCTAssertEqual(try upload("justo.bin", Data(count: 10)).status, 200)
        let check = try call(
            "/api/upload/check",
            method: "POST",
            body: try json(["name": "grande.bin", "size": 11]),
            token: token
        )
        XCTAssertEqual(check.status, 413)
    }

    func testInterruptedUploadLeavesNothingAndIsLogged() throws {
        let descriptor = try startPartialUpload(name: "corte.mp4", total: 5_000_000, sending: 100_000)
        XCTAssertTrue(waitUntil { self.server.tracker.snapshot().first?.transferredBytes ?? 0 > 0 })
        close(descriptor)
        XCTAssertTrue(waitUntil { self.server.tracker.snapshot().first?.status == .failed })
        XCTAssertEqual(try destinationFiles(), [])
    }

    func testCancelFromMacAndFromPhoneOnlyAffectsThatTransfer() throws {
        let fromMac = try startPartialUpload(name: "uno.mp4", total: 5_000_000, sending: 50_000, key: "a")
        let fromPhone = try startPartialUpload(name: "dos.mp4", total: 5_000_000, sending: 50_000, key: "b")
        defer {
            close(fromMac)
            close(fromPhone)
        }
        XCTAssertTrue(waitUntil { self.server.tracker.snapshot().count == 2 })
        let snapshot = server.tracker.snapshot()
        let uno = try XCTUnwrap(snapshot.first { $0.fileName == "uno.mp4" })

        XCTAssertEqual(try upload("otro.txt", Data("sigue".utf8)).status, 200)
        server.tracker.cancel(id: uno.id)
        XCTAssertTrue(waitUntil { self.server.tracker.snapshot().first { $0.id == uno.id }?.status == .cancelled })
        XCTAssertEqual(server.tracker.snapshot().first { $0.fileName == "dos.mp4" }?.status, .inProgress)

        let reply = try call("/api/upload/cancel", method: "POST", body: try json(["key": "b"]), token: token)
        XCTAssertEqual(reply.status, 200)
        XCTAssertTrue(waitUntil { self.server.tracker.snapshot().first { $0.fileName == "dos.mp4" }?.status == .cancelled })
        XCTAssertEqual(try destinationFiles(), ["otro.txt"])
    }

    func testAnotherSessionCannotCancelYourUpload() throws {
        let descriptor = try startPartialUpload(name: "mio.mp4", total: 5_000_000, sending: 50_000, key: "secreta")
        defer { close(descriptor) }
        XCTAssertTrue(waitUntil { self.server.tracker.snapshot().first?.transferredBytes ?? 0 > 0 })
        // Misma IP en la prueba, pero otra sesión: la clave se combina con el token.
        let other = try pair()
        XCTAssertNotEqual(other, token)
        _ = try call("/api/upload/cancel", method: "POST", body: try json(["key": "secreta"]), token: other)
        Thread.sleep(forTimeInterval: 0.2)
        XCTAssertEqual(server.tracker.snapshot().first?.status, .inProgress)
    }

    func testStalePartFilesAreCleanedOnStart() throws {
        server.stop()
        let stale = destination.appendingPathComponent(".viejo.lugo-part")
        try Data("x".utf8).write(to: stale)
        port = try server.start(port: 0)
        XCTAssertFalse(FileManager.default.fileExists(atPath: stale.path))
    }

    // MARK: - Mac → Android

    func testListingShowsOnlyAuthorizedVisibleContent() throws {
        let folders = try call("/api/folders", token: token).json["folders"] as? [[String: String]]
        XCTAssertEqual(folders?.first?["name"], "Compartida")

        let reply = try call("/api/files?folder=c&path=", token: token)
        let names = (reply.json["entries"] as? [[String: Any]])?.compactMap { $0["name"] as? String }
        XCTAssertEqual(names, ["sub", "doc.pdf"]) // Sin .oculto ni fuga.txt, y carpetas primero.

        XCTAssertEqual(try call("/api/files?folder=c&path=..", token: token).status, 403)
        XCTAssertEqual(try call("/api/files?folder=c&path=../..", token: token).status, 403)
        XCTAssertEqual(try call("/api/files?folder=c&path=/etc", token: token).status, 403)
        XCTAssertEqual(try call("/api/files?folder=otra&path=", token: token).status, 403)
    }

    func testCannotTicketFilesOutsideFolder() throws {
        for path in ["../secreto.txt", "fuga.txt", "sub/../../secreto.txt"] {
            let reply = try call(
                "/api/tickets",
                method: "POST",
                body: try json(["items": [["folder": "c", "path": path]]]),
                token: token
            )
            XCTAssertEqual(reply.status, 403, path)
        }
    }

    func testSingleDownloadAndRange() throws {
        let url = try ticket([["folder": "c", "path": "doc.pdf"]])
        let whole = try call(url)
        XCTAssertEqual(whole.status, 200)
        XCTAssertEqual(String(decoding: whole.body, as: UTF8.self), "contenido del pdf")
        XCTAssertTrue(whole.headers["content-disposition"]?.contains("doc.pdf") ?? false)

        let part = try call(url, headers: ["Range": "bytes=10-"])
        XCTAssertEqual(part.status, 206)
        XCTAssertEqual(String(decoding: part.body, as: UTF8.self), "del pdf")
        XCTAssertEqual(part.headers["content-range"], "bytes 10-16/17")

        XCTAssertEqual(try call(url, headers: ["Range": "bytes=99-"]).status, 416)

        let stale = try call(url, headers: ["Range": "bytes=10-", "If-Range": "\"otro\""])
        XCTAssertEqual(stale.status, 200)
    }

    func testTicketDiesWithSession() throws {
        let url = try ticket([["folder": "c", "path": "doc.pdf"]])
        XCTAssertEqual(try call(url).status, 200)
        server.pairing.activeSessions.filter { $0.token == token }.forEach { server.pairing.revoke(sessionID: $0.id) }
        XCTAssertEqual(try call(url).status, 401)
        XCTAssertEqual(try call("/dl/inventado/a.txt").status, 401)
    }

    func testOutboxDownload() throws {
        let file = base.appendingPathComponent("informe año.pdf")
        try Data("informe".utf8).write(to: file)
        server.outbox.add(urls: [file, base])
        let items = try XCTUnwrap(try call("/api/outbox", token: token).json["items"] as? [[String: Any]])
        XCTAssertEqual(items.count, 1)
        let id = try XCTUnwrap(items[0]["id"] as? String)

        let url = try ticket([["outbox": id]])
        let reply = try call(url)
        XCTAssertEqual(String(decoding: reply.body, as: UTF8.self), "informe")
        XCTAssertTrue(reply.headers["content-disposition"]?.contains("informe%20a%C3%B1o.pdf") ?? false)

        let record = server.tracker.snapshot().first
        XCTAssertEqual(record?.direction, .macToAndroid)
        XCTAssertEqual(record?.status, .completed)
    }

    func testZipIsValidAndHasExactLength() throws {
        let url = try ticket([
            ["folder": "c", "path": "doc.pdf"],
            ["folder": "c", "path": "sub/foto.jpg"]
        ])
        let reply = try call(url)
        XCTAssertEqual(reply.status, 200)
        XCTAssertEqual(reply.headers["content-length"], String(reply.body.count))

        let bytes = [UInt8](reply.body)
        func u16(_ at: Int) -> Int { Int(bytes[at]) | Int(bytes[at + 1]) << 8 }
        func u32(_ at: Int) -> Int { u16(at) | u16(at + 2) << 16 }
        let end = bytes.count - 22
        XCTAssertEqual(u32(end), 0x0605_4B50)
        XCTAssertEqual(u16(end + 10), 2)

        var position = u32(end + 16)
        var names: [String] = []
        for _ in 0..<2 {
            XCTAssertEqual(u32(position), 0x0201_4B50)
            let nameLength = u16(position + 28)
            let extra = u16(position + 30)
            let name = String(decoding: bytes[(position + 46)..<(position + 46 + nameLength)], as: UTF8.self)
            names.append(name)
            let size = u32(position + 24)
            let local = u32(position + 42)
            let dataStart = local + 30 + u16(local + 26) + u16(local + 28)
            let content = String(decoding: bytes[dataStart..<(dataStart + size)], as: UTF8.self)
            XCTAssertEqual(content, name == "doc.pdf" ? "contenido del pdf" : "foto")
            var crc = CRC32()
            bytes[dataStart..<(dataStart + size)].withUnsafeBytes { crc.update($0.baseAddress!, count: $0.count) }
            XCTAssertEqual(UInt32(u32(position + 16)), crc.value)
            position += 46 + nameLength + extra
        }
        XCTAssertEqual(names, ["doc.pdf", "foto.jpg"])
    }

    func testCRC32KnownValue() {
        var crc = CRC32()
        Array("123456789".utf8).withUnsafeBytes { crc.update($0.baseAddress!, count: $0.count) }
        XCTAssertEqual(crc.value, 0xCBF4_3926)
    }
}

final class HTTPParsingTests: XCTestCase {
    private func parse(_ text: String) throws -> HTTPRequest {
        try HTTPRequest.parse(head: Data(text.utf8))
    }

    func testParsesPathQueryAndHeaders() throws {
        let request = try parse("PUT /api/upload?name=a%C3%B1o+1.jpg&key=x HTTP/1.1\r\nHost: a\r\nContent-Length: 5")
        XCTAssertEqual(request.method, "PUT")
        XCTAssertEqual(request.segments, ["api", "upload"])
        XCTAssertEqual(request.query["name"], "año 1.jpg")
        XCTAssertEqual(request.contentLength, 5)
    }

    func testRejectsAmbiguousRequests() {
        for text in [
            "PUT / HTTP/1.1\r\nContent-Length: 5\r\nContent-Length: 6",
            "PUT / HTTP/1.1\r\nContent-Length: -1",
            "PUT / HTTP/1.1\r\nTransfer-Encoding: chunked",
            "GET sinbarra HTTP/1.1",
            "GET / FTP/1.0",
            "GET / HTTP/1.1\r\nSin dos puntos"
        ] {
            XCTAssertThrowsError(try parse(text), text)
        }
    }

    func testRange() throws {
        XCTAssertEqual(try ByteRange.parse(header: "bytes=0-4", fileSize: 10), ByteRange(start: 0, end: 4))
        XCTAssertEqual(try ByteRange.parse(header: "bytes=5-", fileSize: 10), ByteRange(start: 5, end: 9))
        XCTAssertEqual(try ByteRange.parse(header: "bytes=-3", fileSize: 10), ByteRange(start: 7, end: 9))
        XCTAssertEqual(try ByteRange.parse(header: "bytes=5-99", fileSize: 10), ByteRange(start: 5, end: 9))
        XCTAssertNil(try ByteRange.parse(header: nil, fileSize: 10))
        XCTAssertNil(try ByteRange.parse(header: "bytes=0-1,3-4", fileSize: 10))
        XCTAssertNil(try ByteRange.parse(header: "bytes=5-2", fileSize: 10))
        XCTAssertThrowsError(try ByteRange.parse(header: "bytes=10-", fileSize: 10))
    }

    func testAttachmentHeaderCannotInjectLines() {
        let header = HTTPText.attachmentHeader(fileName: "a\r\nSet-Cookie: x\".txt")
        XCTAssertFalse(header.contains("\r"))
        XCTAssertFalse(header.contains("\n"))
    }
}

final class TrackerAndHistoryTests: XCTestCase {
    func testProgressSpeedAndHistoryCallback() {
        final class Box: @unchecked Sendable {
            var records: [TransferRecord] = []
            var now = Date(timeIntervalSince1970: 1000)
        }
        let box = Box()
        let tracker = TransferTracker(now: { box.now })
        tracker.onFinish = { box.records.append($0) }

        let id = tracker.start(fileName: "v.mp4", totalBytes: 100_000_000, direction: .androidToMac)
        box.now = box.now.addingTimeInterval(1)
        XCTAssertTrue(tracker.add(bytes: 25_000_000, to: id))

        let running = tracker.snapshot()[0]
        XCTAssertEqual(running.progress, 0.25, accuracy: 0.001)
        XCTAssertEqual(running.bytesPerSecond, 25_000_000, accuracy: 1)
        XCTAssertEqual(running.secondsRemaining ?? 0, 3, accuracy: 0.01)
        XCTAssertTrue(tracker.hasActiveTransfers)

        tracker.finish(id: id, status: .completed, fileName: "v (1).mp4")
        XCTAssertEqual(box.records.first?.fileName, "v (1).mp4")
        XCTAssertFalse(tracker.hasActiveTransfers)
        tracker.finish(id: id, status: .failed)
        XCTAssertEqual(box.records.count, 1, "solo se registra una vez")
    }

    func testCancelCallsAbortAndWinsOverError() {
        final class Box: @unchecked Sendable { var aborted = false }
        let box = Box()
        let tracker = TransferTracker()
        let id = tracker.start(fileName: "a", totalBytes: 10, direction: .macToAndroid, abort: { box.aborted = true })
        tracker.cancel(id: id)
        XCTAssertTrue(box.aborted)
        XCTAssertFalse(tracker.add(bytes: 1, to: id))
        tracker.finish(id: id, status: .failed, detail: "corte")
        XCTAssertEqual(tracker.snapshot()[0].status, .cancelled)
    }

    func testHistoryPersistsTrimsAndClears() throws {
        let file = FileManager.default.temporaryDirectory
            .appendingPathComponent("lugo-\(UUID().uuidString)/h.json")
        defer { try? FileManager.default.removeItem(at: file.deletingLastPathComponent()) }

        let store = HistoryStore(fileURL: file, maxRecords: 2)
        for name in ["a", "b", "c"] {
            store.append(TransferRecord(fileName: name, sizeBytes: 1, direction: .androidToMac, status: .completed))
        }
        XCTAssertEqual(store.all.map(\.fileName), ["c", "b"])

        let reopened = HistoryStore(fileURL: file, maxRecords: 2)
        XCTAssertEqual(reopened.all.map(\.fileName), ["c", "b"])
        reopened.clear()
        XCTAssertTrue(HistoryStore(fileURL: file).all.isEmpty)
    }
}

final class PairingExtraTests: XCTestCase {
    func testPollingIsBoundToIP() throws {
        let manager = PairingManager()
        let request = try manager.submitPIN(manager.currentPIN, clientAddress: "192.168.1.2", deviceName: "A")
        XCTAssertEqual(manager.status(requestID: request.id, clientAddress: "192.168.1.3"), .unknown)
        XCTAssertEqual(manager.status(requestID: request.id, clientAddress: "192.168.1.2"), .pending)
        try manager.approve(requestID: request.id)
        XCTAssertEqual(manager.status(requestID: request.id, clientAddress: "192.168.1.3"), .unknown)
        guard case .approved = manager.status(requestID: request.id, clientAddress: "192.168.1.2") else {
            return XCTFail("debe recibir el token")
        }
    }

    func testRetryReplacesPendingRequest() throws {
        let manager = PairingManager()
        _ = try manager.submitPIN(manager.currentPIN, clientAddress: "192.168.1.2", deviceName: "A")
        _ = try manager.submitPIN(manager.currentPIN, clientAddress: "192.168.1.2", deviceName: "A")
        XCTAssertEqual(manager.pendingRequests.count, 1)
    }

    func testManyFailuresFromManyIPsRotatePIN() {
        let manager = PairingManager()
        let pin = manager.currentPIN
        let bad = pin == "000000" ? "111111" : "000000"
        for index in 0..<20 {
            _ = try? manager.submitPIN(bad, clientAddress: "192.168.1.\(index)", deviceName: "x")
        }
        XCTAssertNotEqual(manager.currentPIN, pin)
    }

    func testSessionLifetimeSetting() throws {
        final class Box: @unchecked Sendable { var now = Date(timeIntervalSince1970: 0) }
        let box = Box()
        let manager = PairingManager(now: { box.now })
        manager.setSessionLifetime(60)
        let request = try manager.submitPIN(manager.currentPIN, clientAddress: "10.0.0.2", deviceName: "A")
        let session = try manager.approve(requestID: request.id)
        box.now = box.now.addingTimeInterval(61)
        XCTAssertNil(manager.validate(token: session.token, clientAddress: "10.0.0.2"))
    }
}
