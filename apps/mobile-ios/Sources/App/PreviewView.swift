import SwiftUI
import WebKit

// MARK: - Preview Tab

struct PreviewTabView: View {
    @Environment(AuthManager.self) private var auth
    let projectId: String
    @State private var sessions: [Session] = []
    @State private var selectedSession: Session?
    @State private var preview: PreviewRouteBinding?
    @State private var previewToken: String?
    @State private var previewTokenExpiresAt: Date?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var refreshKey = 0

    var body: some View {
        Group {
            if let preview, preview.state == "active", let previewToken {
                // Preview binding is active and we have a short-lived token.
                // Load the preview via token-authenticated gateway URL.
                let baseURL = "\(AppConfig.gatewayBaseURL.absoluteString)/preview/\(preview.previewId)"
                let tokenURL = "\(baseURL)?preview_token=\(previewToken)"

                VStack(spacing: 0) {
                    // URL bar
                    HStack(spacing: 8) {
                        Image(systemName: "globe")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                        Text(baseURL)
                            .font(.caption2.monospaced())
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                            .truncationMode(.middle)
                        Spacer()
                        Button {
                            Task { await refreshPreviewToken() }
                            refreshKey += 1
                        } label: {
                            Image(systemName: "arrow.clockwise")
                                .font(.caption2)
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(.bar)

                    PreviewWebView(url: URL(string: tokenURL)!)
                        .id(refreshKey)
                }
            } else if let preview, preview.state == "active" {
                // Binding exists but token not yet fetched
                ProgressView("Loading preview…")
                    .frame(maxHeight: .infinity)
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

                // Fetch a short-lived preview token for gateway access
                if let previewData = preview {
                    await fetchPreviewToken(previewId: previewData.previewId)
                }
            }
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func fetchPreviewToken(previewId: String) async {
        do {
            let tokenResponse = try await auth.api.getPreviewToken(previewId: previewId)
            previewToken = tokenResponse.data.token
            if let expiresAt = ISO8601DateFormatter().date(from: tokenResponse.data.expiresAt) {
                previewTokenExpiresAt = expiresAt
                scheduleTokenRefresh(previewId: previewId, expiresAt: expiresAt)
            }
        } catch {
            previewToken = nil
        }
    }

    private func refreshPreviewToken() async {
        guard let preview else { return }
        await fetchPreviewToken(previewId: preview.previewId)
    }

    private func scheduleTokenRefresh(previewId: String, expiresAt: Date) {
        let refreshInterval = max(expiresAt.timeIntervalSinceNow * 0.8, 5)
        Task {
            try? await Task.sleep(for: .seconds(refreshInterval))
            guard !Task.isCancelled else { return }
            await fetchPreviewToken(previewId: previewId)
        }
    }
}

// MARK: - WKWebView Wrapper
//
// Loads preview content using a token-authenticated gateway URL.
// The preview_token query parameter is included in the URL itself,
// so all sub-resource requests (CSS, JS, images) carry the credential
// automatically. No Authorization header is needed.

struct PreviewWebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.allowsBackForwardNavigationGestures = true
        let request = URLRequest(url: url)
        webView.load(request)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // Preview content is loaded once; pull-to-refresh reloads via parent.
    }
}
