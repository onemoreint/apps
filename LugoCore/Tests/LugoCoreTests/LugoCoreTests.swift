import Foundation
import XCTest
@testable import LugoCore

final class FileNameValidatorTests: XCTestCase {
    func testAcceptsNormalNames() throws {
        XCTAssertEqual(try FileNameValidator.validate("foto vacaciones.jpg"), "foto vacaciones.jpg")
        XCTAssertEqual(try FileNameValidator.validate("  informe año 2026.pdf "), "informe año 2026.pdf")
        XCTAssertEqual(try FileNameValidator.validate("app-release.apk"), "app-release.apk")
    }

    func testRejectsPathsAndReservedNames() {
        for name in ["../secreto.txt", "a/b.txt", "..\\b.txt", "/etc/passwd"] {
            XCTAssertThrowsError(try FileNameValidator.validate(name)) {
                XCTAssertEqual($0 as? FileNameError, .containsPathSeparator, name)
            }
        }
        for name in [".", "..", "...", ".zshrc"] {
            XCTAssertThrowsError(try FileNameValidator.validate(name)) {
                XCTAssertEqual($0 as? FileNameError, .reservedName, name)
            }
        }
        XCTAssertThrowsError(try FileNameValidator.validate("   "))
    }

    func testRejectsHiddenCharacters() {
        for name in ["a\u{0}b.txt", "a\nb.txt", "gpj\u{202E}exe.jpg", "a:b.txt"] {
            XCTAssertThrowsError(try FileNameValidator.validate(name)) {
                XCTAssertEqual($0 as? FileNameError, .forbiddenCharacter)
            }
        }
    }

    func testRejectsTooLong() {
        XCTAssertThrowsError(try FileNameValidator.validate(String(repeating: "a", count: 256)))
        XCTAssertNoThrow(try FileNameValidator.validate(String(repeating: "a", count: 255)))
    }

    func testUniqueNameNeverOverwrites() {
        let taken: Set<String> = ["foto.jpg", "foto (1).jpg", "sinext"]
        XCTAssertEqual(FileNameValidator.uniqueName(for: "nuevo.jpg") { taken.contains($0) }, "nuevo.jpg")
        XCTAssertEqual(FileNameValidator.uniqueName(for: "foto.jpg") { taken.contains($0) }, "foto (2).jpg")
        XCTAssertEqual(FileNameValidator.uniqueName(for: "sinext") { taken.contains($0) }, "sinext (1)")
    }

    func testUniqueNameKeepsByteLimitWithAccents() {
        let long = String(repeating: "ñ", count: 125) + ".jpeg" // 255 bytes
        let result = FileNameValidator.uniqueName(for: long) { $0 == long }
        XCTAssertLessThanOrEqual(result.utf8.count, 255)
        XCTAssertTrue(result.hasSuffix(" (1).jpeg"))
    }
}

final class TransferPolicyTests: XCTestCase {
    func testDefaultAllowsProjectFormatsAndBlocksExecutables() {
        let policy = TransferPolicy.default
        for name in ["a.jpg", "b.MP4", "c.pdf", "d.docx", "e.xlsx", "f.zip", "g.rar", "h.apk", "i.mp3", "sin"] {
            XCTAssertTrue(policy.allows(fileName: name), name)
        }
        for name in ["x.command", "y.APP", "z.pkg"] {
            XCTAssertFalse(policy.allows(fileName: name), name)
        }
    }

    func testSizeLimit() {
        var policy = TransferPolicy.default
        XCTAssertTrue(policy.allows(sizeBytes: 50_000_000_000))
        XCTAssertFalse(policy.allows(sizeBytes: -1))
        policy.maxFileSizeBytes = 100
        XCTAssertTrue(policy.allows(sizeBytes: 100))
        XCTAssertFalse(policy.allows(sizeBytes: 101))
    }
}

final class PathGuardTests: XCTestCase {
    private var base: URL!
    private var root: URL!

    override func setUpWithError() throws {
        base = FileManager.default.temporaryDirectory
            .appendingPathComponent("lugo-\(UUID().uuidString)")
        root = base.appendingPathComponent("Autorizada")
        try FileManager.default.createDirectory(
            at: root.appendingPathComponent("sub"),
            withIntermediateDirectories: true
        )
        try FileManager.default.createDirectory(
            at: base.appendingPathComponent("Autorizada2"),
            withIntermediateDirectories: true
        )
        try Data("x".utf8).write(to: root.appendingPathComponent("sub/ok.txt"))
        try Data("secreto".utf8).write(to: base.appendingPathComponent("secreto.txt"))
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: base)
    }

    func testResolvesInsideRoot() throws {
        let guardian = try PathGuard(root: root)
        XCTAssertTrue(try guardian.resolve("sub/ok.txt").path.hasSuffix("/Autorizada/sub/ok.txt"))
        XCTAssertTrue(try guardian.resolve("./sub//ok.txt").path.hasSuffix("/Autorizada/sub/ok.txt"))
        XCTAssertTrue(try guardian.resolve("").path.hasSuffix("/Autorizada"))
    }

    func testAllowsNewFilesForUploads() throws {
        let guardian = try PathGuard(root: root)
        XCTAssertTrue(try guardian.resolve("nuevo.jpg").path.hasSuffix("/Autorizada/nuevo.jpg"))
        XCTAssertTrue(try guardian.resolve("sub/x/y.jpg").path.hasSuffix("/Autorizada/sub/x/y.jpg"))
    }

    func testBlocksTraversal() throws {
        let guardian = try PathGuard(root: root)
        for path in ["../secreto.txt", "sub/../../secreto.txt", "/etc/passwd", "~/x", "..\\secreto.txt", "a\u{0}b", "../Autorizada2/x"] {
            XCTAssertThrowsError(try guardian.resolve(path), path)
        }
    }

    func testBlocksSymlinkEscape() throws {
        let manager = FileManager.default
        try manager.createSymbolicLink(
            at: root.appendingPathComponent("enlace.txt"),
            withDestinationURL: base.appendingPathComponent("secreto.txt")
        )
        try manager.createSymbolicLink(
            at: root.appendingPathComponent("enlace-dir"),
            withDestinationURL: base
        )
        try manager.createSymbolicLink(
            at: root.appendingPathComponent("roto"),
            withDestinationURL: base.appendingPathComponent("no-existe")
        )
        let guardian = try PathGuard(root: root)
        for path in ["enlace.txt", "enlace-dir/secreto.txt", "enlace-dir/nuevo.txt", "roto"] {
            XCTAssertThrowsError(try guardian.resolve(path), path) {
                XCTAssertEqual($0 as? PathGuardError, .outsideAuthorizedRoot, path)
            }
        }
    }

    func testAllowsSymlinkThatStaysInside() throws {
        try FileManager.default.createSymbolicLink(
            at: root.appendingPathComponent("interno"),
            withDestinationURL: root.appendingPathComponent("sub")
        )
        let guardian = try PathGuard(root: root)
        XCTAssertTrue(try guardian.resolve("interno/ok.txt").path.hasSuffix("/Autorizada/sub/ok.txt"))
    }

    func testMissingRootFails() {
        XCTAssertThrowsError(try PathGuard(root: base.appendingPathComponent("no-existe")))
    }
}

/// Reloj manual para probar caducidades sin esperar.
private final class TestClock: @unchecked Sendable {
    private let lock = NSLock()
    private var current = Date(timeIntervalSince1970: 1_000_000)

    var now: Date {
        lock.lock(); defer { lock.unlock() }
        return current
    }

    func advance(_ seconds: TimeInterval) {
        lock.lock(); defer { lock.unlock() }
        current = current.addingTimeInterval(seconds)
    }
}

final class PairingManagerTests: XCTestCase {
    private let phone = "192.168.1.50"

    private func make() -> (PairingManager, TestClock) {
        let clock = TestClock()
        return (PairingManager(now: { clock.now }), clock)
    }

    private func wrongPIN(for manager: PairingManager) -> String {
        manager.currentPIN == "000000" ? "111111" : "000000"
    }

    func testPINIsSixDigits() {
        let (manager, _) = make()
        XCTAssertEqual(manager.currentPIN.count, 6)
        XCTAssertTrue(manager.currentPIN.allSatisfy(\.isNumber))
    }

    func testPINsVary() {
        let (manager, _) = make()
        let pins = Set((0..<50).map { _ in manager.rotatePIN() })
        XCTAssertGreaterThan(pins.count, 40)
    }

    func testCorrectPINOnlyCreatesPendingRequest() throws {
        let (manager, _) = make()
        let request = try manager.submitPIN(manager.currentPIN, clientAddress: phone, deviceName: "HONOR 8XD")
        XCTAssertEqual(manager.pendingRequests, [request])
        XCTAssertTrue(manager.activeSessions.isEmpty)
    }

    func testApprovalCreatesWorkingSessionAndRotatesPIN() throws {
        let (manager, _) = make()
        let pin = manager.currentPIN
        let request = try manager.submitPIN(pin, clientAddress: phone, deviceName: "HONOR 8XD")
        let session = try manager.approve(requestID: request.id)

        XCTAssertEqual(session.token.count, 64)
        XCTAssertNotNil(manager.validate(token: session.token, clientAddress: phone))
        XCTAssertTrue(manager.pendingRequests.isEmpty)
        XCTAssertNotEqual(manager.currentPIN, pin)
    }

    func testRejectionGivesNoSession() throws {
        let (manager, _) = make()
        let request = try manager.submitPIN(manager.currentPIN, clientAddress: phone, deviceName: "X")
        manager.reject(requestID: request.id)
        XCTAssertThrowsError(try manager.approve(requestID: request.id)) {
            XCTAssertEqual($0 as? PairingError, .unknownRequest)
        }
    }

    func testLockoutAfterFiveFailuresEvenWithCorrectPIN() throws {
        let (manager, clock) = make()
        let bad = wrongPIN(for: manager)
        for left in stride(from: 4, through: 1, by: -1) {
            XCTAssertThrowsError(try manager.submitPIN(bad, clientAddress: phone, deviceName: "X")) {
                XCTAssertEqual($0 as? PairingError, .wrongPIN(attemptsLeft: left))
            }
        }
        XCTAssertThrowsError(try manager.submitPIN(bad, clientAddress: phone, deviceName: "X")) {
            guard case .lockedOut = $0 as? PairingError else { return XCTFail("debe bloquear") }
        }
        XCTAssertThrowsError(try manager.submitPIN(manager.currentPIN, clientAddress: phone, deviceName: "X")) {
            guard case .lockedOut = $0 as? PairingError else { return XCTFail("sigue bloqueado") }
        }
        // Otra IP no queda afectada.
        XCTAssertNoThrow(try manager.submitPIN(manager.currentPIN, clientAddress: "192.168.1.51", deviceName: "Y"))

        clock.advance(5 * 60 + 1)
        XCTAssertNoThrow(try manager.submitPIN(manager.currentPIN, clientAddress: phone, deviceName: "X"))
    }

    func testPINExpires() throws {
        let (manager, clock) = make()
        let pin = manager.currentPIN
        clock.advance(10 * 60 + 1)
        XCTAssertThrowsError(try manager.submitPIN(pin, clientAddress: phone, deviceName: "X")) {
            XCTAssertEqual($0 as? PairingError, .pinExpired)
        }
        XCTAssertNotEqual(manager.currentPIN, pin)
    }

    func testTokenRulesExpiryOtherIPAndActivity() throws {
        let (manager, clock) = make()
        let request = try manager.submitPIN(manager.currentPIN, clientAddress: phone, deviceName: "X")
        let session = try manager.approve(requestID: request.id)

        XCTAssertNil(manager.validate(token: "falso", clientAddress: phone))
        XCTAssertNil(manager.validate(token: session.token, clientAddress: "192.168.1.99"))

        clock.advance(50 * 60)
        XCTAssertNotNil(manager.validate(token: session.token, clientAddress: phone))
        clock.advance(50 * 60) // Sigue viva: la actividad la prolongó.
        XCTAssertNotNil(manager.validate(token: session.token, clientAddress: phone))

        clock.advance(60 * 60 + 1)
        XCTAssertNil(manager.validate(token: session.token, clientAddress: phone))
        XCTAssertTrue(manager.activeSessions.isEmpty)
    }

    func testResetAndRevoke() throws {
        let (manager, _) = make()
        let first = try manager.approve(requestID:
            try manager.submitPIN(manager.currentPIN, clientAddress: phone, deviceName: "X").id)
        manager.revoke(sessionID: first.id)
        XCTAssertNil(manager.validate(token: first.token, clientAddress: phone))

        let second = try manager.approve(requestID:
            try manager.submitPIN(manager.currentPIN, clientAddress: phone, deviceName: "X").id)
        manager.reset()
        XCTAssertNil(manager.validate(token: second.token, clientAddress: phone))
    }

    func testDeviceNameIsCleaned() throws {
        let (manager, _) = make()
        let request = try manager.submitPIN(
            manager.currentPIN,
            clientAddress: phone,
            deviceName: "Hola\n\u{0}" + String(repeating: "a", count: 200)
        )
        XCTAssertFalse(request.deviceName.contains("\n"))
        XCTAssertEqual(request.deviceName.count, 60)
    }
}

final class LocalNetworkTests: XCTestCase {
    func testPrivateIPv4() {
        for address in ["10.0.0.1", "172.16.0.1", "172.31.255.1", "192.168.1.5", "169.254.1.1", "127.0.0.1"] {
            XCTAssertTrue(LocalNetwork.isPrivateIPv4(address), address)
        }
        for address in ["8.8.8.8", "172.15.0.1", "172.32.0.1", "192.169.0.1", "1.1.1.1", "256.1.1.1", "192.168.1", "0x7f.0.0.1", "192.168.1.1.1", ""] {
            XCTAssertFalse(LocalNetwork.isPrivateIPv4(address), address)
        }
    }

    func testLocalClientRule() {
        for address in ["192.168.0.20", "::ffff:192.168.0.20", "fe80::1%en0", "FE80::abcd", "fd12:3456::1", "::1"] {
            XCTAssertTrue(LocalNetwork.isLocalClient(address), address)
        }
        for address in ["8.8.8.8", "::ffff:8.8.8.8", "2001:4860:4860::8888", "not-an-ip", ""] {
            XCTAssertFalse(LocalNetwork.isLocalClient(address), address)
        }
    }

    func testPrefersWiFiOverVPNAndVirtualInterfaces() {
        let list = [
            NetworkInterfaceAddress(interfaceName: "utun3", address: "10.8.0.2"),
            NetworkInterfaceAddress(interfaceName: "bridge100", address: "192.168.64.1"),
            NetworkInterfaceAddress(interfaceName: "en5", address: "192.168.2.10"),
            NetworkInterfaceAddress(interfaceName: "en0", address: "192.168.1.34"),
            NetworkInterfaceAddress(interfaceName: "en7", address: "8.8.4.4")
        ]
        XCTAssertEqual(LocalNetwork.pickPreferred(from: list)?.address, "192.168.1.34")
        XCTAssertNil(LocalNetwork.pickPreferred(from: [list[0], list[1], list[4]]))
    }

    func testReadsRealInterfacesWithoutCrashing() {
        for item in LocalNetwork.currentAddresses() {
            XCTAssertFalse(item.interfaceName.isEmpty)
            XCTAssertEqual(item.address.split(separator: ".").count, 4)
        }
    }
}

final class ModelTests: XCTestCase {
    func testRecordRoundTrip() throws {
        let record = TransferRecord(fileName: "Video.MP4", sizeBytes: 1_000, direction: .androidToMac, status: .completed)
        let data = try JSONEncoder().encode(record)
        XCTAssertEqual(try JSONDecoder().decode(TransferRecord.self, from: data), record)
        XCTAssertEqual(record.fileExtension, "mp4")
    }

    func testByteFormat() {
        XCTAssertEqual(ByteFormat.size(512), "512 B")
        XCTAssertEqual(ByteFormat.size(1_500_000), "1.5 MB")
        XCTAssertEqual(ByteFormat.size(1_000_000_000), "1.0 GB")
        XCTAssertEqual(ByteFormat.speed(bytesPerSecond: 25_000_000), "25.0 MB/s")
        XCTAssertEqual(ByteFormat.duration(seconds: 44.2), "45 s")
        XCTAssertEqual(ByteFormat.duration(seconds: 200), "3 min 20 s")
        XCTAssertEqual(ByteFormat.duration(seconds: 3900), "1 h 5 min")
    }
}
