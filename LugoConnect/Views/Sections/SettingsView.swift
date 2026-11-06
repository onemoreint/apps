import SwiftUI

struct SettingsView: View {
    @ObservedObject var viewModel: SettingsViewModel
    let defaultDestinationName: String

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                PageTitle(
                    title: "Configuración",
                    subtitle: "Tus ajustes se guardan en este Mac y siguen ahí al volver a abrir la app."
                )
                destinationCard
                sharedFoldersCard
                serverCard
            }
            .padding(Theme.pagePadding)
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .alert(
            "No se pudo completar",
            isPresented: Binding(
                get: { viewModel.errorMessage != nil },
                set: { if !$0 { viewModel.errorMessage = nil } }
            )
        ) {
            Button("Entendido", role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
    }

    private var destinationCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                sectionHeader(
                    "Carpeta de destino",
                    detail: "Aquí se guardará lo que envíes desde el teléfono."
                )
                if let folder = viewModel.destination {
                    folderRow(folder)
                } else {
                    Text(defaultDestinationName)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(Theme.textPrimary)
                }
                HStack(spacing: 10) {
                    Button("Cambiar carpeta") {
                        viewModel.chooseDestination()
                    }
                    .buttonStyle(.borderedProminent)
                    if viewModel.destination != nil {
                        Button("Usar \(defaultDestinationName)") {
                            viewModel.useDefaultDestination()
                        }
                    }
                }
            }
        }
    }

    private var sharedFoldersCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                sectionHeader(
                    "Carpetas compartidas con Android",
                    detail: "El teléfono solo podrá ver estas carpetas y lo que hay dentro."
                )
                ForEach(viewModel.sharedFolders) { folder in
                    HStack {
                        folderRow(folder)
                        Button {
                            viewModel.removeSharedFolder(folder)
                        } label: {
                            Image(systemName: "trash")
                        }
                        .buttonStyle(.borderless)
                        .help("Dejar de compartir esta carpeta")
                        .accessibilityLabel("Dejar de compartir \(folder.displayName)")
                    }
                }
                Button("Añadir carpeta") {
                    viewModel.addSharedFolder()
                }
            }
        }
    }

    private var serverCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 14) {
                sectionHeader(
                    "Servidor y seguridad",
                    detail: "Los cambios se aplican al momento. Cambiar el puerto desconecta a los teléfonos."
                )

                HStack {
                    Text("Puerto")
                    Spacer()
                    TextField("Puerto", value: $viewModel.port, format: .number.grouping(.never))
                        .textFieldStyle(.roundedBorder)
                        .multilineTextAlignment(.trailing)
                        .frame(width: 90)
                        .labelsHidden()
                }

                Picker("La sesión del teléfono caduca tras", selection: $viewModel.sessionMinutes) {
                    ForEach(SettingsStore.sessionChoices, id: \.self) { minutes in
                        Text(viewModel.sessionLabel(minutes: minutes)).tag(minutes)
                    }
                }

                Toggle("Limitar el tamaño por archivo", isOn: $viewModel.sizeLimitEnabled)

                if viewModel.sizeLimitEnabled {
                    Stepper(value: $viewModel.sizeLimitGB, in: 1...1024) {
                        Text("Máximo: \(viewModel.sizeLimitGB) GB")
                    }
                }
            }
            .font(.system(size: 14))
            .foregroundColor(Theme.textPrimary)
        }
    }

    private func sectionHeader(_ title: String, detail: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(Theme.textPrimary)
            Text(detail)
                .font(.system(size: 13))
                .foregroundColor(Theme.textSecondary)
        }
    }

    private func folderRow(_ folder: FolderBookmark) -> some View {
        let isAvailable = viewModel.isAvailable(folder)
        return HStack(spacing: 10) {
            Image(systemName: isAvailable ? "folder.fill" : "exclamationmark.triangle.fill")
                .foregroundColor(isAvailable ? Theme.accentBright : Theme.warning)
            VStack(alignment: .leading, spacing: 1) {
                Text(folder.displayName)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Theme.textPrimary)
                Text(isAvailable ? folder.path : "No disponible. Vuelve a elegirla.")
                    .font(.system(size: 12))
                    .foregroundColor(Theme.textSecondary)
                    .lineLimit(1)
                    .truncationMode(.middle)
            }
            Spacer()
        }
    }
}
