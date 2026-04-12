import SwiftUI

struct CommentsView: View {
    @Environment(AuthManager.self) private var auth
    let projectId: String
    @State private var threads: [CollaborationThread] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var newComment = ""
    @State private var isPosting = false

    var body: some View {
        VStack(spacing: 0) {
            // Thread list
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
                } else if threads.isEmpty {
                    ContentUnavailableView(
                        "No Comments",
                        systemImage: "bubble.left",
                        description: Text("Start a conversation.")
                    )
                } else {
                    List(threads) { thread in
                        VStack(alignment: .leading, spacing: 6) {
                            HStack(spacing: 6) {
                                Image(systemName: anchorIcon(thread.anchor.type))
                                    .foregroundStyle(.secondary)
                                Text(thread.anchor.type.capitalized)
                                    .font(.caption.bold())
                                if let path = thread.anchor.path {
                                    Text(path)
                                        .font(.caption)
                                        .foregroundStyle(.tertiary)
                                        .lineLimit(1)
                                }
                            }
                            Text("Thread \(String(thread.id.prefix(8)))…")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            Divider()

            // Compose bar
            HStack(spacing: 8) {
                TextField("Add a comment…", text: $newComment)
                    .textFieldStyle(.roundedBorder)
                Button {
                    Task { await postComment() }
                } label: {
                    if isPosting {
                        ProgressView()
                    } else {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.title2)
                    }
                }
                .disabled(newComment.trimmingCharacters(in: .whitespaces).isEmpty || isPosting)
            }
            .padding()
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func anchorIcon(_ type: String) -> String {
        switch type {
        case "file": return "doc"
        case "preview": return "eye"
        default: return "bubble.left"
        }
    }

    private func load() async {
        do {
            let response = try await auth.api.listComments(projectId: projectId)
            threads = response.data
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func postComment() async {
        let text = newComment.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        isPosting = true
        defer { isPosting = false }
        do {
            _ = try await auth.api.postComment(projectId: projectId, commentBody: text)
            newComment = ""
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
