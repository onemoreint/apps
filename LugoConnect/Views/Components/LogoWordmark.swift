import SwiftUI

/// Marca de la app dibujada con SwiftUI: dos eslabones unidos dentro de un cuadrado azul.
struct LogoMark: View {
    var size: CGFloat = 30

    var body: some View {
        RoundedRectangle(cornerRadius: size * 0.27, style: .continuous)
            .fill(LinearGradient(
                colors: [Theme.accentBright, Theme.accent],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ))
            .frame(width: size, height: size)
            .overlay {
                Image(systemName: "link")
                    .font(.system(size: size * 0.5, weight: .bold))
                    .foregroundColor(.white)
            }
            .accessibilityHidden(true)
    }
}

struct LogoWordmark: View {
    var body: some View {
        HStack(spacing: 10) {
            LogoMark()
            VStack(alignment: .leading, spacing: 0) {
                Text("LUGO")
                    .font(.system(size: 13, weight: .heavy))
                    .tracking(1.6)
                    .foregroundColor(Theme.textPrimary)
                Text("CONNECT")
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(2.2)
                    .foregroundColor(Theme.accentBright)
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("LUGO CONNECT")
    }
}
