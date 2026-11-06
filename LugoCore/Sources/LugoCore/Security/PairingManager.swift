import Foundation

public enum PairingError: Error, Equatable, Sendable {
    case wrongPIN(attemptsLeft: Int)
    case lockedOut(until: Date)
    case pinExpired
    case unknownRequest
}

/// Datos de un teléfono que ya escribió bien el PIN y espera tu aprobación en el Mac.
public struct PairingRequest: Identifiable, Equatable, Sendable {
    public let id: UUID
    public let clientAddress: String
    public let deviceName: String
    public let date: Date
}

/// Lo que ve el teléfono mientras espera tu decisión.
public enum PairingStatus: Equatable, Sendable {
    case pending
    case approved(token: String)
    case rejected
    case unknown
}

/// Sesión aprobada. El token es lo que el navegador envía en cada petición.
public struct Session: Identifiable, Equatable, Sendable {
    public let id: UUID
    public let token: String
    public let clientAddress: String
    public let deviceName: String
    public var expiresAt: Date
    public var lastSeen: Date
}

/// Emparejamiento: PIN aleatorio, límite de intentos, aprobación explícita y sesiones
/// que caducan. Todo vive en memoria, así que al cerrar la app desaparecen PIN y tokens.
public final class PairingManager: @unchecked Sendable {
    public struct Configuration: Sendable {
        public var pinLength = 6
        public var pinLifetime: TimeInterval = 10 * 60
        public var maxAttempts = 5
        public var lockoutDuration: TimeInterval = 5 * 60
        public var sessionLifetime: TimeInterval = 60 * 60
        /// Fallos totales, de cualquier IP, tras los que el PIN cambia.
        public var maxGlobalFailures = 20
        public var requestLifetime: TimeInterval = 5 * 60
        public var maxPendingRequests = 5

        public init() {}
    }

    private struct AttemptState {
        var failures = 0
        var lockedUntil: Date?
    }

    /// Resultado guardado hasta que el teléfono lo recoge.
    private struct Decision {
        let clientAddress: String
        let status: PairingStatus
        let date: Date
    }

    private let lock = NSLock()
    private var configuration: Configuration
    private let now: @Sendable () -> Date

    private var pin = ""
    private var pinExpiry = Date.distantPast
    private var globalFailures = 0
    private var attempts: [String: AttemptState] = [:]
    private var pending: [UUID: PairingRequest] = [:]
    private var decisions: [UUID: Decision] = [:]
    private var sessions: [String: Session] = [:]

    public init(
        configuration: Configuration = Configuration(),
        now: @escaping @Sendable () -> Date = { Date() }
    ) {
        self.configuration = configuration
        self.now = now
        _ = rotatePIN()
    }

    /// PIN vigente, para mostrarlo en el Mac.
    public var currentPIN: String {
        lock.lock(); defer { lock.unlock() }
        if now() >= pinExpiry { generatePINLocked() }
        return pin
    }

    /// Duración de las sesiones nuevas y de las activas a partir de su próxima petición.
    public func setSessionLifetime(_ seconds: TimeInterval) {
        lock.lock(); defer { lock.unlock() }
        configuration.sessionLifetime = seconds
    }

    /// Genera un PIN nuevo. Las sesiones ya aprobadas siguen activas.
    @discardableResult
    public func rotatePIN() -> String {
        lock.lock(); defer { lock.unlock() }
        generatePINLocked()
        return pin
    }

    /// Paso 1: el teléfono envía el PIN. Si es correcto queda pendiente de aprobación;
    /// nunca recibe un token en este paso.
    public func submitPIN(
        _ candidate: String,
        clientAddress: String,
        deviceName: String
    ) throws -> PairingRequest {
        lock.lock(); defer { lock.unlock() }
        let date = now()
        var state = attempts[clientAddress] ?? AttemptState()

        if let until = state.lockedUntil {
            if date < until { throw PairingError.lockedOut(until: until) }
            state = AttemptState()
        }
        guard date < pinExpiry else { throw PairingError.pinExpired }

        guard Self.constantTimeEquals(candidate, pin) else {
            state.failures += 1
            globalFailures += 1
            // Cambiar de IP no permite seguir probando el mismo PIN indefinidamente.
            if globalFailures >= configuration.maxGlobalFailures { generatePINLocked() }

            if state.failures >= configuration.maxAttempts {
                let until = date.addingTimeInterval(configuration.lockoutDuration)
                state.lockedUntil = until
                attempts[clientAddress] = state
                throw PairingError.lockedOut(until: until)
            }
            attempts[clientAddress] = state
            throw PairingError.wrongPIN(attemptsLeft: configuration.maxAttempts - state.failures)
        }

        attempts[clientAddress] = nil
        expireRequestsLocked(at: date)

        // Reintentar desde el mismo teléfono sustituye su solicitud, no acumula avisos.
        for request in pending.values where request.clientAddress == clientAddress {
            pending[request.id] = nil
        }
        if pending.count >= configuration.maxPendingRequests,
           let oldest = pending.values.min(by: { $0.date < $1.date }) {
            pending[oldest.id] = nil
        }

        // El nombre viene del teléfono: se limpia porque se mostrará en el aviso del Mac.
        let cleanName = String(deviceName.unicodeScalars
            .filter { !CharacterSet.controlCharacters.contains($0) }
            .prefix(60)
            .map(Character.init))
        let request = PairingRequest(
            id: UUID(),
            clientAddress: clientAddress,
            deviceName: cleanName.isEmpty ? "Dispositivo Android" : cleanName,
            date: date
        )
        pending[request.id] = request
        return request
    }

    /// Solicitudes que esperan tu decisión en el Mac.
    public var pendingRequests: [PairingRequest] {
        lock.lock(); defer { lock.unlock() }
        expireRequestsLocked(at: now())
        return pending.values.sorted { $0.date < $1.date }
    }

    /// Paso 2: aceptas en el Mac y nace la sesión. El PIN cambia para que no se reutilice.
    @discardableResult
    public func approve(requestID: UUID) throws -> Session {
        lock.lock(); defer { lock.unlock() }
        guard let request = pending.removeValue(forKey: requestID) else {
            throw PairingError.unknownRequest
        }
        let date = now()
        let session = Session(
            id: UUID(),
            token: Self.randomToken(),
            clientAddress: request.clientAddress,
            deviceName: request.deviceName,
            expiresAt: date.addingTimeInterval(configuration.sessionLifetime),
            lastSeen: date
        )
        sessions[session.token] = session
        decisions[requestID] = Decision(
            clientAddress: request.clientAddress,
            status: .approved(token: session.token),
            date: date
        )
        generatePINLocked()
        return session
    }

    public func reject(requestID: UUID) {
        lock.lock(); defer { lock.unlock() }
        guard let request = pending.removeValue(forKey: requestID) else { return }
        decisions[requestID] = Decision(
            clientAddress: request.clientAddress,
            status: .rejected,
            date: now()
        )
    }

    /// El teléfono consulta su solicitud. Solo responde a la IP que la hizo, y el token
    /// se entrega una sola vez.
    public func status(requestID: UUID, clientAddress: String) -> PairingStatus {
        lock.lock(); defer { lock.unlock() }
        let date = now()
        expireRequestsLocked(at: date)
        if let request = pending[requestID] {
            return request.clientAddress == clientAddress ? .pending : .unknown
        }
        guard let decision = decisions[requestID],
              decision.clientAddress == clientAddress else { return .unknown }
        decisions[requestID] = nil
        return decision.status
    }

    /// Valida un token en cada petición. Exige la misma IP con la que se aprobó y,
    /// si es válido, prolonga la sesión porque hay actividad.
    public func validate(token: String, clientAddress: String) -> Session? {
        lock.lock(); defer { lock.unlock() }
        guard var session = sessions[token] else { return nil }
        let date = now()
        guard date < session.expiresAt else {
            sessions[token] = nil
            return nil
        }
        guard session.clientAddress == clientAddress else { return nil }
        session.expiresAt = date.addingTimeInterval(configuration.sessionLifetime)
        session.lastSeen = date
        sessions[token] = session
        return session
    }

    public var activeSessions: [Session] {
        lock.lock(); defer { lock.unlock() }
        let date = now()
        sessions = sessions.filter { date < $0.value.expiresAt }
        return sessions.values.sorted { $0.deviceName < $1.deviceName }
    }

    public func revoke(sessionID: UUID) {
        lock.lock(); defer { lock.unlock() }
        sessions = sessions.filter { $0.value.id != sessionID }
    }

    /// Se llama al detener el servidor: olvida todo.
    public func reset() {
        lock.lock(); defer { lock.unlock() }
        sessions.removeAll()
        pending.removeAll()
        decisions.removeAll()
        attempts.removeAll()
        generatePINLocked()
    }

    private func generatePINLocked() {
        var generator = SystemRandomNumberGenerator()
        pin = (0..<configuration.pinLength)
            .map { _ in String(Int.random(in: 0...9, using: &generator)) }
            .joined()
        pinExpiry = now().addingTimeInterval(configuration.pinLifetime)
        globalFailures = 0
    }

    private func expireRequestsLocked(at date: Date) {
        let limit = configuration.requestLifetime
        pending = pending.filter { date.timeIntervalSince($0.value.date) < limit }
        decisions = decisions.filter { date.timeIntervalSince($0.value.date) < limit }
    }

    /// 256 bits aleatorios en hexadecimal.
    private static func randomToken() -> String {
        var generator = SystemRandomNumberGenerator()
        return (0..<4)
            .map { _ -> String in
                let hex = String(generator.next() as UInt64, radix: 16)
                return String(repeating: "0", count: 16 - hex.count) + hex
            }
            .joined()
    }

    /// Compara sin salir antes de tiempo, para que la duración no revele dígitos.
    private static func constantTimeEquals(_ left: String, _ right: String) -> Bool {
        let leftBytes = Array(left.utf8)
        let rightBytes = Array(right.utf8)
        guard leftBytes.count == rightBytes.count else { return false }
        var difference: UInt8 = 0
        for index in leftBytes.indices {
            difference |= leftBytes[index] ^ rightBytes[index]
        }
        return difference == 0
    }
}
