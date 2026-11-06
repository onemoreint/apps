import LugoCore
import SwiftUI

struct MacToAndroidView: View {
    @ObservedObject var connection: ConnectionViewModel
    let openSettings: () -> Void

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                PageTitle(
                    title: "Mac a Android",
                    subtitle: "Los archivos que elijas aparecen en tu teléfono, en la pestaña «Recibir del Mac»."
                )

                Card {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Archivos para el teléfono")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(Theme.textPrimary)
                        ForEach(connection.outboxItems) { item in
                            HStack(spacing: 10) {
                                Image(systemName: "doc.fill")
                                    .foregroundColor(Theme.accentBright)
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(item.name)
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(Theme.textPrimary)
                                        .lineLimit(1)
                                        .truncationMode(.middle)
                                    Text(ByteFormat.size(item.sizeBytes))
                                        .font(.system(size: 12))
                                        .foregroundColor(Theme.textSecondary)
                                }
                                Spacer()
                                Button {
                                    connection.removeFromOutbox(item)
                                } label: {
                                    Image(systemName: "trash")
                                }
                                .buttonStyle(.borderless)
                                .help("Quitar de la lista")
                                .accessibilityLabel("Quitar \(item.name)")
                            }
                        }
                        Button("Elegir archivos") {
                            connection.addToOutbox()
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }

                Card {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Carpetas compartidas")
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(Theme.textPrimary)
                            Text("El teléfono también puede explorarlas y descargar de ellas.")
                                .font(.system(size: 13))
                                .foregroundColor(Theme.textSecondary)
                        }
                        Spacer()
                        Button("Gestionar", action: openSettings)
                    }
                }

                TransferList(
                    connection: connection,
                    direction: .macToAndroid,
                    emptyText: "Aún no se ha descargado nada en esta sesión."
                )
            }
            .padding(Theme.pagePadding)
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
    }
}
