import LugoCore
import SwiftUI

struct HomeView: View {
    @ObservedObject var connection: ConnectionViewModel
    let open: (AppSection) -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack(spacing: 14) {
                    LogoMark(size: 48)
                    PageTitle(
                        title: "LUGO CONNECT",
                        subtitle: "Pasa archivos entre tu Android y tu Mac por Wi-Fi, sin cables ni nube."
                    )
                }

                Card {
                    VStack(spacing: 10) {
                        DeviceLinkIllustration(isOnline: connection.isRunning && connection.localAddress != nil)
                        HStack(spacing: 8) {
                            Circle()
                                .fill(statusColor)
                                .frame(width: 8, height: 8)
                            Text(connection.statusTitle)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(Theme.textPrimary)
                        }
                        Button {
                            connection.start()
                            open(.connect)
                        } label: {
                            Text("CONECTAR ANDROID")
                                .font(.system(size: 15, weight: .bold))
                                .frame(maxWidth: 300)
                                .padding(.vertical, 6)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                    }
                    .frame(maxWidth: .infinity)
                }

                ConnectionCard(connection: connection, qrSize: 170)

                HStack(alignment: .top, spacing: 18) {
                    shortcut("Enviar desde Android", symbol: "square.and.arrow.down", section: .androidToMac)
                    shortcut("Enviar desde el Mac", symbol: "square.and.arrow.up", section: .macToAndroid)
                }

                ForEach(connection.activeTransfers) { transfer in
                    TransferRow(transfer: transfer) {
                        connection.cancel(transfer)
                    }
                }

                DevicesCard(connection: connection)
            }
            .padding(Theme.pagePadding)
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
    }

    private var statusColor: Color {
        if !connection.isRunning || connection.localAddress == nil { return Theme.warning }
        return connection.connectedSessions.isEmpty ? Theme.accentBright : Theme.success
    }

    private func shortcut(_ title: String, symbol: String, section: AppSection) -> some View {
        Button {
            open(section)
        } label: {
            Label(title, systemImage: symbol)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 4)
        }
        .controlSize(.large)
    }
}
