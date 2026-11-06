// Servidor de prueba sin interfaz, para probar el servidor y la página desde la terminal.
// No forma parte de la app. Con --auto-approve acepta cualquier teléfono que dé el PIN.
import Foundation
import LugoCore

var port = 8642
var destination = FileManager.default.currentDirectoryPath
var shared: [String] = []
var autoApprove = false
var limit: Int64?

var arguments = Array(CommandLine.arguments.dropFirst())
while !arguments.isEmpty {
    let flag = arguments.removeFirst()
    switch flag {
    case "--port": port = Int(arguments.removeFirst()) ?? port
    case "--dest": destination = arguments.removeFirst()
    case "--share": shared.append(arguments.removeFirst())
    case "--limit": limit = Int64(arguments.removeFirst())
    case "--auto-approve": autoApprove = true
    default: print("Opción desconocida: \(flag)")
    }
}

let roots = shared.enumerated().map { index, path in
    SharedRoot(id: "f\(index)", name: URL(fileURLWithPath: path).lastPathComponent, url: URL(fileURLWithPath: path))
}
var policy = TransferPolicy.default
policy.maxFileSizeBytes = limit
let server = LugoServer(options: .init(
    destination: URL(fileURLWithPath: destination),
    sharedRoots: roots,
    policy: policy
))
server.tracker.onFinish = { record in
    print("FIN \(record.direction.rawValue) \(record.status.rawValue) \(record.fileName) \(record.sizeBytes)")
    fflush(stdout)
}

let actualPort = try server.start(port: port)
print("PUERTO \(actualPort)")
print("PIN \(server.pairing.currentPIN)")
fflush(stdout)

// Órdenes por entrada estándar, para las pruebas: "outbox <ruta>", "pin", "cancel", "rotate".
Thread.detachNewThread {
    while let line = readLine() {
        let parts = line.split(separator: " ", maxSplits: 1).map(String.init)
        switch parts.first {
        case "outbox" where parts.count == 2:
            server.outbox.add(urls: [URL(fileURLWithPath: parts[1])])
        case "pin":
            print("PIN \(server.pairing.currentPIN)")
        case "cancel":
            server.tracker.cancelAll()
        case "reject":
            server.pairing.pendingRequests.forEach { server.pairing.reject(requestID: $0.id) }
        case "approve":
            server.pairing.pendingRequests.forEach { _ = try? server.pairing.approve(requestID: $0.id) }
        default:
            break
        }
        fflush(stdout)
    }
}

while true {
    if autoApprove {
        for request in server.pairing.pendingRequests {
            _ = try? server.pairing.approve(requestID: request.id)
            print("APROBADO \(request.deviceName)")
            print("PIN \(server.pairing.currentPIN)")
            fflush(stdout)
        }
    }
    Thread.sleep(forTimeInterval: 0.2)
}
