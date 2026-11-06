import LugoCore
import SwiftUI

struct AndroidToMacView: View {
    @ObservedObject var connection: ConnectionViewModel
    let openSettings: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                PageTitle(
                    title: "Android a Mac",
                    subtitle: "Elige los archivos en la página abierta en tu teléfono y aparecerán aquí."
                )

                Card {
                    HStack(spacing: 10) {
                        Image(systemName: "folder.fill")
                            .foregroundColor(Theme.accentBright)
                        VStack(alignment: .leading, spacing: 1) {
                            Text("Se guardan en")
                                .font(.system(size: 12))
                                .foregroundColor(Theme.textSecondary)
                            Text(connection.destinationName)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(Theme.textPrimary)
                                .lineLimit(1)
                                .truncationMode(.middle)
                        }
                        Spacer()
                        Button("Abrir en Finder") {
                            connection.openDestinationInFinder()
                        }
                        Button("Cambiar", action: openSettings)
                    }
                }

                TransferList(
                    connection: connection,
                    direction: .androidToMac,
                    emptyText: "Aún no has recibido archivos en esta sesión."
                )
            }
            .padding(Theme.pagePadding)
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
    }
}
