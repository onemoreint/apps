import LugoCore
import SwiftUI

struct HistoryView: View {
    @ObservedObject var connection: ConnectionViewModel
    @State private var isConfirmingClear = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack(alignment: .top) {
                    PageTitle(title: "Historial", subtitle: "Se guarda solo en este Mac.")
                    Spacer()
                    if !connection.history.isEmpty {
                        Button("Limpiar historial") {
                            isConfirmingClear = true
                        }
                    }
                }

                if connection.history.isEmpty {
                    Text("Todavía no hay transferencias.")
                        .font(.system(size: 13))
                        .foregroundColor(Theme.textSecondary)
                } else {
                    Card {
                        LazyVStack(alignment: .leading, spacing: 10) {
                            ForEach(connection.history) { record in
                                row(record)
                                if record.id != connection.history.last?.id {
                                    Divider().overlay(Theme.stroke)
                                }
                            }
                        }
                    }
                }
            }
            .padding(Theme.pagePadding)
            .frame(maxWidth: 760, alignment: .leading)
            .frame(maxWidth: .infinity)
        }
        .alert("¿Limpiar el historial?", isPresented: $isConfirmingClear) {
            Button("Cancelar", role: .cancel) {}
            Button("Limpiar", role: .destructive) {
                connection.clearHistory()
            }
        } message: {
            Text("Se borra la lista. Tus archivos no se tocan.")
        }
    }

    private func row(_ record: TransferRecord) -> some View {
        HStack(spacing: 12) {
            Image(systemName: record.direction == .androidToMac ? "square.and.arrow.down" : "square.and.arrow.up")
                .foregroundColor(Theme.accentBright)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 1) {
                Text(record.fileName)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Theme.textPrimary)
                    .lineLimit(1)
                    .truncationMode(.middle)
                Text("\(record.date.formatted(date: .abbreviated, time: .shortened)) · \(ByteFormat.size(record.sizeBytes)) · \(record.direction.label)")
                    .font(.system(size: 12))
                    .foregroundColor(Theme.textSecondary)
                    .lineLimit(1)
            }
            Spacer()
            Text(record.status.label)
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(record.status == .completed ? Theme.success : Theme.textSecondary)
        }
    }
}
