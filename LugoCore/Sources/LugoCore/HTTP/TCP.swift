import Foundation
#if canImport(Darwin)
import Darwin
private let streamType = SOCK_STREAM
#else
import Glibc
private let streamType = Int32(SOCK_STREAM.rawValue)
#endif

public enum TCPError: Error, Equatable, Sendable {
    case cannotCreateSocket
    case portInUse(Int)
    case cannotListen
    case connectionClosed
    case timedOut
    case ioFailed
}

/// Conexión aceptada. Las lecturas y escrituras se bloquean en su propio hilo, así que un
/// teléfono lento frena solo su transferencia y nunca llena la memoria del Mac.
final class TCPConnection: @unchecked Sendable {
    private let descriptor: Int32
    private let lock = NSLock()
    private var isOpen = true
    let peerAddress: String

    init(descriptor: Int32, peerAddress: String, timeout: Int = 30) {
        self.descriptor = descriptor
        self.peerAddress = peerAddress
        setTimeout(seconds: timeout)
        #if canImport(Darwin)
        var enabled: Int32 = 1
        setsockopt(descriptor, SOL_SOCKET, SO_NOSIGPIPE, &enabled, socklen_t(MemoryLayout<Int32>.size))
        #endif
    }

    func setTimeout(seconds: Int) {
        var value = timeval(tv_sec: seconds, tv_usec: 0)
        let size = socklen_t(MemoryLayout<timeval>.size)
        setsockopt(descriptor, SOL_SOCKET, SO_RCVTIMEO, &value, size)
        setsockopt(descriptor, SOL_SOCKET, SO_SNDTIMEO, &value, size)
    }

    /// Devuelve los bytes leídos, o 0 si el otro extremo cerró.
    func receive(into buffer: UnsafeMutableRawPointer, count: Int) throws -> Int {
        while true {
            let result = recv(descriptor, buffer, count, 0)
            if result >= 0 { return result }
            switch errno {
            case EINTR: continue
            case EAGAIN, EWOULDBLOCK: throw TCPError.timedOut
            default: throw TCPError.connectionClosed
            }
        }
    }

    func sendAll(_ buffer: UnsafeRawPointer, count: Int) throws {
        var offset = 0
        while offset < count {
            #if canImport(Darwin)
            let flags: Int32 = 0
            #else
            let flags = Int32(MSG_NOSIGNAL)
            #endif
            let result = send(descriptor, buffer + offset, count - offset, flags)
            if result > 0 {
                offset += result
                continue
            }
            if result < 0, errno == EINTR { continue }
            if result < 0, errno == EAGAIN || errno == EWOULDBLOCK { throw TCPError.timedOut }
            throw TCPError.connectionClosed
        }
    }

    func sendData(_ data: Data) throws {
        try data.withUnsafeBytes { raw in
            guard let base = raw.baseAddress else { return }
            try sendAll(base, count: raw.count)
        }
    }

    /// Despierta a quien esté bloqueado en esta conexión. Se puede llamar desde otro hilo.
    func abort() {
        lock.lock(); defer { lock.unlock() }
        guard isOpen else { return }
        shutdown(descriptor, Int32(SHUT_RDWR))
    }

    func closeSocket() {
        lock.lock(); defer { lock.unlock() }
        guard isOpen else { return }
        isOpen = false
        close(descriptor)
    }
}

/// Socket de escucha IPv4. No abre puertos en el router ni se anuncia en Internet.
final class TCPListener: @unchecked Sendable {
    private let descriptor: Int32
    private let lock = NSLock()
    private var isStopped = false
    let port: Int

    /// Con `port` 0 el sistema elige uno libre.
    init(port requested: Int) throws {
        let socketDescriptor = socket(AF_INET, streamType, 0)
        guard socketDescriptor >= 0 else { throw TCPError.cannotCreateSocket }

        var reuse: Int32 = 1
        setsockopt(socketDescriptor, SOL_SOCKET, SO_REUSEADDR, &reuse, socklen_t(MemoryLayout<Int32>.size))

        var address = sockaddr_in()
        address.sin_family = sa_family_t(AF_INET)
        address.sin_port = in_port_t(requested).bigEndian
        address.sin_addr.s_addr = in_addr_t(0).bigEndian

        let bound = withUnsafePointer(to: &address) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                bind(socketDescriptor, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
            }
        }
        guard bound == 0 else {
            close(socketDescriptor)
            throw TCPError.portInUse(requested)
        }
        guard listen(socketDescriptor, 128) == 0 else {
            close(socketDescriptor)
            throw TCPError.cannotListen
        }

        var actual = sockaddr_in()
        var length = socklen_t(MemoryLayout<sockaddr_in>.size)
        withUnsafeMutablePointer(to: &actual) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                _ = getsockname(socketDescriptor, $0, &length)
            }
        }
        descriptor = socketDescriptor
        port = Int(in_port_t(bigEndian: actual.sin_port))
    }

    /// Espera conexiones hasta `stop()`. Revisa cada 200 ms si debe parar.
    func acceptLoop(handler: @escaping @Sendable (Int32, String) -> Void) {
        while true {
            lock.lock()
            let stopped = isStopped
            lock.unlock()
            if stopped { return }

            var waiter = pollfd(fd: descriptor, events: Int16(POLLIN), revents: 0)
            let ready = poll(&waiter, 1, 200)
            guard ready > 0 else { continue }

            var peer = sockaddr_in()
            var length = socklen_t(MemoryLayout<sockaddr_in>.size)
            let client = withUnsafeMutablePointer(to: &peer) { pointer in
                pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                    accept(descriptor, $0, &length)
                }
            }
            guard client >= 0 else { continue }

            var text = [CChar](repeating: 0, count: Int(INET_ADDRSTRLEN))
            var peerAddress = peer.sin_addr
            let converted = inet_ntop(AF_INET, &peerAddress, &text, socklen_t(INET_ADDRSTRLEN))
            handler(client, converted == nil ? "" : String(cString: text))
        }
    }

    func stop() {
        lock.lock(); defer { lock.unlock() }
        guard !isStopped else { return }
        isStopped = true
        close(descriptor)
    }
}
