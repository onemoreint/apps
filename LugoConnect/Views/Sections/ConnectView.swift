import SwiftUI

struct ConnectView: View {
    @ObservedObject var connection: ConnectionViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                PageTitle(title: "Conectar dispositivo", subtitle: connection.statusTitle)
                ConnectionCard(connection: connection, qrSize: 220)

                HStack(spacing: 10) {
                    if connection.isRunning {
                        Button("Detener servidor") {
                            connection.stop()
                        }
                        Button("Generar otro PIN") {
                            connection.regeneratePIN()
                        }
                    } else {
                        Button("Iniciar servidor") {
                            connection.start()
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }
                .controlSize(.large)

                Text("Solo es accesible desde tu red local y deja de funcionar al cerrar la app. La conexión no va cifrada: úsala en redes de confianza.")
                    .font(.system(size: 12))
                    .foregroundColor(Theme.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)

                DevicesCard(connection: connection)
            }
            .padding(Theme.pagePadding)
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
    }
}
