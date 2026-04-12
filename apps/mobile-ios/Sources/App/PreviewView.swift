import SwiftUI
import WebKit

// MARK: - Preview Tab

struct PreviewTabView: View {
    @Environment(AuthManager.self) private var auth
    let projectId: String
    @State private var sessions: [Session] = []
    @State private var selectedSession: Session?
    @State private var preview: PreviewRouteBinding?
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if let preview, preview.state == "active" {
                let url = URL(string: "\(AppConfig.gatewayBaseURL.absoluteString)/preview/\(preview.previewId)")!
                PreviewWebView(url: url, token: auth.api.sessionToken)
                    .ignoresSafeArea(edges: .bottom)
            } else if isLoading {
                ProgressView("Loading preview…")
                    .frame(maxHeight: .infinity)
            } else {
                ContentUnavailableView(
                    "No Active Preview",
                    systemImage: "eye.slash",
                    description: Text(errorMessage ?? "Start a session and create a preview from the web IDE to view it here.")
                )
            }
        }
        .task { await loadPreview() }
        .refreshable { await loadPreview() }
    }

    private func loadPreview() async {
        isLoading = true
        defer { isLoading = false }
        do {
            // Find the first running session and try to get its preview
            let sessionsResponse = try await auth.api.listSessions(projectId: projectId)
            sessions = sessionsResponse.data
            if let running = sessions.first(where: { $0.state == "running" }) {
                selectedSession = running
                // Try creating a preview — if one already exists the API returns it
                let previewResponse = try await auth.api.createPreview(sessionId: running.id)
                preview = previewResponse.data
            }
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

// MARK: - WKWebView Wrapper

struct PreviewWebView: UIViewRepresentable {
    let url: URL
    let token: String?

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.allowsBackForwardNavigationGestures = true
        var request = URLRequest(url: url)
        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        webView.load(request)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // Preview content is loaded once; pull-to-refresh reloads via parent.
    }
}
