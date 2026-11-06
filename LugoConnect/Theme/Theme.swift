import SwiftUI

/// Colores y medidas de toda la app. Fondo oscuro con azul eléctrico como acento.
enum Theme {
    static let background = Color(red: 0.043, green: 0.055, blue: 0.082)
    static let sidebar = Color(red: 0.063, green: 0.078, blue: 0.114)
    static let card = Color(red: 0.086, green: 0.106, blue: 0.149)
    static let stroke = Color.white.opacity(0.08)

    static let accent = Color(red: 0.145, green: 0.455, blue: 1.0)
    static let accentBright = Color(red: 0.365, green: 0.667, blue: 1.0)

    static let textPrimary = Color.white
    static let textSecondary = Color.white.opacity(0.62)

    static let success = Color(red: 0.235, green: 0.827, blue: 0.565)
    static let warning = Color(red: 1.0, green: 0.725, blue: 0.298)

    static let cardRadius: CGFloat = 16
    static let pagePadding: CGFloat = 32
}
