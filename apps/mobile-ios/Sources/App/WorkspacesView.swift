import SwiftUI

struct ProjectsView: View {
    @Environment(AuthManager.self) private var auth
    @State private var projects: [Project] = []
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
            } else if let error = errorMessage {
                ContentUnavailableView(
                    "Failed to Load",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else if projects.isEmpty {
                ContentUnavailableView(
                    "No Projects",
                    systemImage: "folder",
                    description: Text("Create a project on the web to get started.")
                )
            } else {
                List(projects) { project in
                    NavigationLink(value: project) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(project.name)
                                .font(.headline)
                            if let description = project.description {
                                Text(description)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(2)
                            } else {
                                Text(project.slug)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle("Projects")
        .navigationDestination(for: Project.self) { project in
            ProjectDetailView(project: project)
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        do {
            let response = try await auth.api.listProjects()
            projects = response.data
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}