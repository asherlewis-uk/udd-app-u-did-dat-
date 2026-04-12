import SwiftUI

// MARK: - Session state helpers

extension Session {
    var stateIcon: String {
        switch state {
        case "running": return "play.circle.fill"
        case "idle": return "pause.circle.fill"
        case "stopped": return "stop.circle.fill"
        case "failed": return "xmark.circle.fill"
        case "creating", "starting": return "ellipsis.circle"
        case "stopping": return "hourglass"
        default: return "questionmark.circle"
        }
    }

    var stateColor: Color {
        switch state {
        case "running": return .green
        case "idle": return .orange
        case "stopped": return .secondary
        case "failed": return .red
        default: return .blue
        }
    }
}

// MARK: - Runs List

struct RunsView: View {
    @Environment(AuthManager.self) private var auth
    let projectId: String
    @State private var sessions: [Session] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
                    .frame(maxHeight: .infinity)
            } else if let error = errorMessage {
                ContentUnavailableView(
                    "Failed to Load",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else if sessions.isEmpty {
                ContentUnavailableView(
                    "No Sessions",
                    systemImage: "play.circle",
                    description: Text("Create a session from the web IDE.")
                )
            } else {
                List(sessions) { session in
                    NavigationLink(value: session) {
                        HStack {
                            Image(systemName: session.stateIcon)
                                .foregroundStyle(session.stateColor)
                                .font(.title3)
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Session")
                                    .font(.headline)
                                + Text(" \(String(session.id.prefix(8)))…")
                                    .font(.headline)
                                    .foregroundColor(.secondary)
                                Text(session.state.capitalized)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
        .navigationDestination(for: Session.self) { session in
            RunDetailView(initialSession: session)
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        do {
            let response = try await auth.api.listSessions(projectId: projectId)
            sessions = response.data
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Run Detail

struct RunDetailView: View {
    @Environment(AuthManager.self) private var auth
    let initialSession: Session
    @State private var session: Session
    @State private var isActing = false

    init(initialSession: Session) {
        self.initialSession = initialSession
        _session = State(initialValue: initialSession)
    }

    var body: some View {
        List {
            Section("Status") {
                LabeledContent("State") {
                    HStack(spacing: 6) {
                        Image(systemName: session.stateIcon)
                            .foregroundStyle(session.stateColor)
                        Text(session.state.capitalized)
                    }
                }
                LabeledContent("Session ID", value: session.id)
                if let started = session.startedAt {
                    LabeledContent("Started", value: started)
                }
                if let stopped = session.stoppedAt {
                    LabeledContent("Stopped", value: stopped)
                }
                LabeledContent("Idle Timeout", value: "\(session.idleTimeoutSeconds)s")
            }

            Section {
                if ["running", "idle"].contains(session.state) {
                    Button("Stop Session", role: .destructive) {
                        Task { await stopSession() }
                    }
                    .disabled(isActing)
                }
                if ["creating", "stopped", "idle"].contains(session.state) {
                    Button("Start Session") {
                        Task { await startSession() }
                    }
                    .disabled(isActing)
                }
            }
        }
        .navigationTitle("Run Detail")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await refresh() }
    }

    private func refresh() async {
        guard let r = try? await auth.api.getSession(session.id) else { return }
        session = r.data
    }

    private func startSession() async {
        isActing = true
        defer { isActing = false }
        guard let r = try? await auth.api.startSession(session.id) else { return }
        session = r.data
    }

    private func stopSession() async {
        isActing = true
        defer { isActing = false }
        guard let r = try? await auth.api.stopSession(session.id) else { return }
        session = r.data
    }
}
