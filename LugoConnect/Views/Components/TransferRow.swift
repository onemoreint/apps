import LugoCore
import SwiftUI

/// Fila de transferencia: nombre, extensión, tamaño, fecha, estado, progreso y velocidad.
struct TransferRow: View {
    let transfer: TransferSnapshot
    let onCancel: () -> Void

    var body: some View {
        Card {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 10) {
                    Text(transfer.fileExtension.isEmpty ? "—" : transfer.fileExtension.uppercased())
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Theme.accentBright)
                        .lineLimit(1)
                        .frame(width: 44, height: 28)
                        .background(RoundedRectangle(cornerRadius: 7, style: .continuous).fill(Theme.background))
                    VStack(alignment: .leading, spacing: 1) {
                        Text(transfer.fileName)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(Theme.textPrimary)
                            .lineLimit(1)
                            .truncationMode(.middle)
                        Text(detailLine)
                            .font(.system(size: 12))
                            .monospacedDigit()
                            .foregroundColor(Theme.textSecondary)
                            .lineLimit(1)
                    }
                    Spacer()
                    Text(transfer.status.label)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(statusColor)
                    if !transfer.status.isFinal {
                        Button(action: onCancel) {
                            Image(systemName: "xmark.circle.fill")
                        }
                        .buttonStyle(.borderless)
                        .help("Cancelar esta transferencia")
                        .accessibilityLabel("Cancelar \(transfer.fileName)")
                    }
                }
                if !transfer.status.isFinal {
                    ProgressView(value: transfer.progress)
                    Text(progressLine)
                        .font(.system(size: 12))
                        .monospacedDigit()
                        .foregroundColor(Theme.textSecondary)
                } else if let detail = transfer.detail {
                    Text(detail)
                        .font(.system(size: 12))
                        .foregroundColor(Theme.textSecondary)
                }
            }
        }
    }

    private var detailLine: String {
        let date = (transfer.endDate ?? transfer.startDate)
            .formatted(date: .omitted, time: .shortened)
        return "\(ByteFormat.size(transfer.totalBytes)) · \(date)"
    }

    private var progressLine: String {
        var parts = ["\(Int(transfer.progress * 100))%"]
        if transfer.bytesPerSecond > 0 {
            parts.append(ByteFormat.speed(bytesPerSecond: transfer.bytesPerSecond))
        }
        if let remaining = transfer.secondsRemaining {
            parts.append("Quedan \(ByteFormat.duration(seconds: remaining))")
        }
        return parts.joined(separator: " · ")
    }

    private var statusColor: Color {
        switch transfer.status {
        case .completed: return Theme.success
        case .failed: return Theme.warning
        case .queued, .inProgress: return Theme.accentBright
        case .cancelled: return Theme.textSecondary
        }
    }
}

/// Lista de transferencias con su botón de limpiar, usada en las dos direcciones.
struct TransferList: View {
    @ObservedObject var connection: ConnectionViewModel
    let direction: TransferDirection
    let emptyText: String

    var body: some View {
        let items = connection.transfers(in: direction)
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Transferencias")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(Theme.textPrimary)
                Spacer()
                if items.contains(where: { $0.status.isFinal }) {
                    Button("Limpiar terminadas") {
                        connection.clearFinishedTransfers()
                    }
                    .buttonStyle(.borderless)
                }
            }
            if items.isEmpty {
                Text(emptyText)
                    .font(.system(size: 13))
                    .foregroundColor(Theme.textSecondary)
            }
            ForEach(items) { transfer in
                TransferRow(transfer: transfer) {
                    connection.cancel(transfer)
                }
            }
        }
    }
}
