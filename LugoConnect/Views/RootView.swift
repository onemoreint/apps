import LugoCore
import SwiftUI

struct RootView: View {
    @ObservedObject var viewModel: RootViewModel
    @ObservedObject var connection: ConnectionViewModel

    init(viewModel: RootViewModel) {
        self.viewModel = viewModel
        self.connection = viewModel.connection
    }

    var body: some View {
        NavigationSplitView {
            sidebar
        } detail: {
            ZStack {
                Theme.background.ignoresSafeArea()
                detail
            }
        }
        .tint(Theme.accent)
        .sheet(item: approvalBinding) { request in
            ApprovalSheet(
                request: request,
                onAccept: { connection.approve(request) },
                onReject: { connection.reject(request) }
            )
        }
        .alert("LUGO CONNECT", isPresented: errorBinding) {
            Button("Entendido", role: .cancel) {}
        } message: {
            Text(connection.errorMessage ?? "")
        }
    }

    /// El aviso de aprobación sale con la primera solicitud pendiente, esté donde esté.
    private var approvalBinding: Binding<PairingRequest?> {
        Binding(
            get: { connection.pendingRequests.first },
            set: { _ in }
        )
    }

    private var errorBinding: Binding<Bool> {
        Binding(
            get: { connection.errorMessage != nil },
            set: { if !$0 { connection.errorMessage = nil } }
        )
    }

    private var sidebar: some View {
        List(AppSection.allCases, selection: $viewModel.selection) { section in
            Label(section.title, systemImage: section.systemImage)
        }
        .listStyle(.sidebar)
        .scrollContentBackground(.hidden)
        .background(Theme.sidebar)
        .safeAreaInset(edge: .top) {
            LogoWordmark()
                .padding(.horizontal, 18)
                .padding(.top, 8)
                .padding(.bottom, 14)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .navigationSplitViewColumnWidth(min: 220, ideal: 240, max: 280)
    }

    @ViewBuilder
    private var detail: some View {
        switch viewModel.selection ?? .home {
        case .home:
            HomeView(connection: connection) { viewModel.selection = $0 }
        case .connect:
            ConnectView(connection: connection)
        case .androidToMac:
            AndroidToMacView(connection: connection) { viewModel.selection = .settings }
        case .macToAndroid:
            MacToAndroidView(connection: connection) { viewModel.selection = .settings }
        case .history:
            HistoryView(connection: connection)
        case .settings:
            SettingsView(viewModel: viewModel.settings, defaultDestinationName: "Descargas/LUGO CONNECT")
        }
    }
}

/// Aceptación explícita: sin pulsar Aceptar, el teléfono no obtiene acceso.
struct ApprovalSheet: View {
    let request: PairingRequest
    let onAccept: () -> Void
    let onReject: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: "candybarphone")
                .font(.system(size: 38, weight: .light))
                .foregroundColor(Theme.accentBright)
            Text("¿Aceptar este dispositivo?")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(Theme.textPrimary)
            VStack(spacing: 2) {
                Text(request.deviceName)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(Theme.textPrimary)
                Text("IP \(request.clientAddress)")
                    .font(.system(size: 13))
                    .foregroundColor(Theme.textSecondary)
            }
            Text("Podrá enviarte archivos y ver tus carpetas compartidas. Acepta solo si es tu teléfono.")
                .font(.system(size: 13))
                .foregroundColor(Theme.textSecondary)
                .multilineTextAlignment(.center)
            HStack(spacing: 10) {
                Button("Rechazar", role: .cancel, action: onReject)
                    .keyboardShortcut(.cancelAction)
                Button("Aceptar", action: onAccept)
                    .keyboardShortcut(.defaultAction)
                    .buttonStyle(.borderedProminent)
            }
            .controlSize(.large)
        }
        .padding(26)
        .frame(width: 360)
        .interactiveDismissDisabled(true)
    }
}
