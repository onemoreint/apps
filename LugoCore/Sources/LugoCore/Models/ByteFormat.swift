import Foundation

/// Formatos de tamaño y velocidad para la interfaz, en base 1000 como Finder.
public enum ByteFormat {
    public static func size(_ bytes: Int64) -> String {
        let units = ["B", "KB", "MB", "GB", "TB"]
        var value = Double(max(bytes, 0))
        var index = 0
        while value >= 1000, index < units.count - 1 {
            value /= 1000
            index += 1
        }
        if index == 0 { return "\(Int(value)) B" }
        return String(format: "%.1f %@", value, units[index])
    }

    /// "45 s", "3 min 20 s" o "1 h 5 min".
    public static func duration(seconds: Double) -> String {
        let total = Int(max(seconds, 0).rounded(.up))
        if total < 60 { return "\(total) s" }
        if total < 3600 { return "\(total / 60) min \(total % 60) s" }
        return "\(total / 3600) h \((total % 3600) / 60) min"
    }

    public static func speed(bytesPerSecond: Double) -> String {
        String(format: "%.1f MB/s", max(bytesPerSecond, 0) / 1_000_000)
    }
}
