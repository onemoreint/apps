import AppKit
import SwiftUI

@main
struct LugoConnectApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var root = RootViewModel()

    var body: some Scene {
        Window("LUGO CONNECT", id: "main") {
            RootView(viewModel: root)
                .frame(minWidth: 860, minHeight: 580)
                .preferredColorScheme(.dark)
        }
        .defaultSize(width: 1040, height: 680)
        .windowStyle(.hiddenTitleBar)
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    /// Cerrar la ventana cierra la app y apaga el servidor, así que nunca queda un puerto
    /// abierto sin que lo sepas.
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }
}
