import SwiftUI

/// Computadora y teléfono unidos por una línea. La línea late suavemente si hay red local
/// y se queda quieta si activaste "Reducir movimiento" en macOS.
struct DeviceLinkIllustration: View {
    let isOnline: Bool

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isPulsing = false

    var body: some View {
        HStack(spacing: 18) {
            device("laptopcomputer", size: 54)
            link
            device("candybarphone", size: 42)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 1.4).repeatForever(autoreverses: true)) {
                isPulsing = true
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Una computadora y un teléfono unidos por la red")
    }

    private func device(_ symbol: String, size: CGFloat) -> some View {
        Image(systemName: symbol)
            .font(.system(size: size, weight: .light))
            .foregroundColor(Theme.textPrimary)
    }

    private var link: some View {
        ZStack {
            Capsule()
                .stroke(
                    isOnline ? Theme.accent : Theme.textSecondary.opacity(0.4),
                    style: StrokeStyle(lineWidth: 2, lineCap: .round, dash: [2, 7])
                )
                .frame(width: 130, height: 1)
                .opacity(isOnline && isPulsing ? 1 : 0.55)

            Image(systemName: isOnline ? "wifi" : "wifi.slash")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(isOnline ? Theme.accentBright : Theme.textSecondary)
                .padding(8)
                .background(Circle().fill(Theme.card))
        }
    }
}
