import CoreGraphics
import CoreImage
import Foundation

/// Genera el QR con Core Image, sin bibliotecas externas ni conexión a Internet.
@MainActor
enum QRCodeGenerator {
    private static var cached: (text: String, image: CGImage)?

    /// Guarda el último QR: la vista se redibuja varias veces por segundo durante una
    /// transferencia y generarlo cada vez gastaría CPU sin motivo.
    static func image(for text: String) -> CGImage? {
        if let cached, cached.text == text { return cached.image }
        guard let image = generate(text) else { return nil }
        cached = (text, image)
        return image
    }

    private static func generate(_ text: String) -> CGImage? {
        guard let filter = CIFilter(name: "CIQRCodeGenerator") else { return nil }
        filter.setValue(Data(text.utf8), forKey: "inputMessage")
        filter.setValue("M", forKey: "inputCorrectionLevel")
        guard let output = filter.outputImage else { return nil }
        // Escala entera sobre los módulos: los bordes quedan nítidos y se lee mejor.
        let scaled = output.transformed(by: CGAffineTransform(scaleX: 12, y: 12))
        return CIContext().createCGImage(scaled, from: scaled.extent)
    }
}
