import Foundation
#if canImport(Darwin)
import Darwin
#else
import Glibc
#endif

/// Una dirección IP de una interfaz de red del Mac.
public struct NetworkInterfaceAddress: Equatable, Sendable {
    public let interfaceName: String
    public let address: String

    public init(interfaceName: String, address: String) {
        self.interfaceName = interfaceName
        self.address = address
    }
}

public enum LocalNetwork {
    /// Lista las direcciones IPv4 de las interfaces activas, sin contar loopback.
    public static func currentAddresses() -> [NetworkInterfaceAddress] {
        var head: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&head) == 0, let first = head else { return [] }
        defer { freeifaddrs(head) }

        var result: [NetworkInterfaceAddress] = []
        for pointer in sequence(first: first, next: { $0.pointee.ifa_next }) {
            let entry = pointer.pointee
            guard let socketAddress = entry.ifa_addr,
                  socketAddress.pointee.sa_family == sa_family_t(AF_INET) else { continue }

            let flags = Int32(truncatingIfNeeded: entry.ifa_flags)
            guard flags & Int32(IFF_UP) != 0,
                  flags & Int32(IFF_RUNNING) != 0,
                  flags & Int32(IFF_LOOPBACK) == 0 else { continue }

            var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
            let status = getnameinfo(
                socketAddress,
                socklen_t(MemoryLayout<sockaddr_in>.size),
                &host,
                socklen_t(host.count),
                nil,
                0,
                NI_NUMERICHOST
            )
            guard status == 0 else { continue }
            result.append(NetworkInterfaceAddress(
                interfaceName: String(cString: entry.ifa_name),
                address: String(cString: host)
            ))
        }
        return result
    }

    /// La dirección que debe ir en el QR: la IP privada de la Wi-Fi si existe.
    public static func preferredAddress() -> String? {
        pickPreferred(from: currentAddresses())?.address
    }

    /// Elige la mejor interfaz. Descarta VPN, puentes de máquinas virtuales y enlaces
    /// internos de Apple, porque el teléfono no podría llegar a esas direcciones.
    public static func pickPreferred(
        from addresses: [NetworkInterfaceAddress]
    ) -> NetworkInterfaceAddress? {
        let excluded = ["utun", "awdl", "llw", "bridge", "vmnet", "vnic", "ppp", "ipsec", "gif", "stf", "anpi", "ap"]

        let candidates = addresses.filter { item in
            !excluded.contains { item.interfaceName.hasPrefix($0) }
                && isPrivateIPv4(item.address)
                && !item.address.hasPrefix("169.254.")
        }
        // Dentro de "enX" gana el número más bajo: en un MacBook, en0 es la Wi-Fi.
        return candidates.min { rank($0.interfaceName) < rank($1.interfaceName) }
    }

    /// Regla del servidor: solo atiende clientes de la red local. Acepta IPv4 e IPv6
    /// porque así es como `Network.framework` entrega la dirección del cliente.
    public static func isLocalClient(_ rawAddress: String) -> Bool {
        var address = rawAddress.lowercased()
        // Quita la zona, como en "fe80::1%en0".
        if let percent = address.firstIndex(of: "%") {
            address = String(address[..<percent])
        }
        if address.hasPrefix("::ffff:") {
            address = String(address.dropFirst("::ffff:".count))
        }
        if address.contains(".") {
            return isPrivateIPv4(address)
        }
        guard address.contains(":") else { return false }
        if address == "::1" { return true }

        // IPv6: fe80::/10 (enlace local) y fc00::/7 (únicas locales).
        guard let firstGroup = address.split(separator: ":", omittingEmptySubsequences: false).first,
              firstGroup.count == 4,
              let value = UInt16(firstGroup, radix: 16) else { return false }
        return (value & 0xFFC0) == 0xFE80 || (value & 0xFE00) == 0xFC00
    }

    /// 10/8, 172.16/12, 192.168/16, 169.254/16 y 127/8.
    public static func isPrivateIPv4(_ address: String) -> Bool {
        let parts = address.split(separator: ".", omittingEmptySubsequences: false)
        guard parts.count == 4 else { return false }

        var octets: [Int] = []
        for part in parts {
            // Solo dígitos: evita formas raras como "0x7f" o "+1".
            guard !part.isEmpty, part.count <= 3,
                  part.allSatisfy({ $0.isASCII && $0.isNumber }),
                  let value = Int(part), value <= 255 else { return false }
            octets.append(value)
        }

        switch (octets[0], octets[1]) {
        case (10, _), (127, _), (192, 168), (169, 254): return true
        case (172, 16...31): return true
        default: return false
        }
    }

    private static func rank(_ interfaceName: String) -> Int {
        guard interfaceName.hasPrefix("en"),
              let number = Int(interfaceName.dropFirst(2)) else { return Int.max }
        return number
    }
}
