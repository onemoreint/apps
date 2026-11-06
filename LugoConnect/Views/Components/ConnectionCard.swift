import SwiftUI

/// QR, dirección y PIN: lo necesario para conectar el teléfono.
struct ConnectionCard: View {
    @ObservedObject var connection: ConnectionViewModel
    var qrSize: CGFloat = 200

    var body: some View {
        Card {
            HStack(alignment: .top, spacing: 22) {
                qrCode
                VStack(alignment: .leading, spacing: 14) {
                    step("1", "Conecta el teléfono a la misma Wi-Fi que este Mac.")
                    step("2", "Escanea el código con la cámara o con Chrome.")
                    step("3", "Escribe este PIN en el teléfono:")
                    Text(spacedPIN)
                        .font(.system(size: 32, weight: .bold))
                        .monospacedDigit()
                        .foregroundColor(connection.isRunning ? Theme.accentBright : Theme.textSecondary)
                        .textSelection(.enabled)
                        .accessibilityLabel("PIN \(connection.pin)")
                    if let url = connection.connectionURL {
                        HStack(spacing: 6) {
                            Text(url)
                                .font(.system(size: 13))
                                .foregroundColor(Theme.textSecondary)
                                .textSelection(.enabled)
                            Button {
                                connection.copyConnectionURL()
                            } label: {
                                Image(systemName: "doc.on.doc")
                            }
                            .buttonStyle(.borderless)
                            .help("Copiar dirección")
                            .accessibilityLabel("Copiar dirección")
                        }
                    }
                }
            }
        }
    }

    private var spacedPIN: String {
        guard connection.pin.count == 6 else { return "— — —" }
        let digits = Array(connection.pin)
        return String(digits[0..<3]) + " " + String(digits[3..<6])
    }

    @ViewBuilder
    private var qrCode: some View {
        if let url = connection.connectionURL, let image = QRCodeGenerator.image(for: url) {
            Image(decorative: image, scale: 1)
                .interpolation(.none)
                .resizable()
                .frame(width: qrSize, height: qrSize)
                .padding(10)
                .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Color.white))
                .accessibilityLabel("Código QR para conectar el teléfono")
        } else {
            VStack(spacing: 8) {
                Image(systemName: "wifi.slash")
                    .font(.system(size: 30, weight: .light))
                    .foregroundColor(Theme.textSecondary)
                Text(connection.isRunning ? "Conecta el Mac a una red Wi-Fi" : "Servidor detenido")
                    .font(.system(size: 13))
                    .foregroundColor(Theme.textSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding(10)
            .frame(width: qrSize + 20, height: qrSize + 20)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(Theme.background))
        }
    }

    private func step(_ number: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Text(number)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(Theme.accentBright)
            Text(text)
                .font(.system(size: 13))
                .foregroundColor(Theme.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

/// Teléfonos con sesión abierta, con opción de desconectarlos.
struct DevicesCard: View {
    @ObservedObject var connection: ConnectionViewModel

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 10) {
                Text("Dispositivos")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(Theme.textPrimary)
                if connection.sessions.isEmpty {
                    Text("Todavía no hay ningún teléfono conectado.")
                        .font(.system(size: 13))
                        .foregroundColor(Theme.textSecondary)
                }
                ForEach(connection.sessions) { session in
                    let isActive = connection.connectedSessions.contains { $0.id == session.id }
                    HStack(spacing: 10) {
                        Circle()
                            .fill(isActive ? Theme.success : Theme.textSecondary)
                            .frame(width: 8, height: 8)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(session.deviceName)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(Theme.textPrimary)
                            Text("\(isActive ? "Conectado" : "Inactivo") · \(session.clientAddress)")
                                .font(.system(size: 12))
                                .foregroundColor(Theme.textSecondary)
                        }
                        Spacer()
                        Button("Desconectar") {
                            connection.disconnect(session)
                        }
                    }
                }
            }
        }
    }
}
