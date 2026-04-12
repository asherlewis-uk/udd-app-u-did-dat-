import SwiftUI

// MARK: - Workspace List

struct WorkspacesView: View {
    @Environment(AuthManager.self) private var auth
    @State private var workspaces: [Workspace] = []
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
            } else if workspaces.isEmpty {
                ContentUnavailableView(
                    "No Workspaces",
                    systemImage: "folder",
                    description: Text("Create a workspace on the web to get started.")
                )
            } else {
                List(workspaces) { workspace in
                    NavigationLink(value: workspace) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(workspace.name)
                                .font(.headline)
                            Text(workspace.slug)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Workspaces")
        .navigationDestination(for: Workspace.self) { workspace in
            ProjectsListView(workspace: workspace)
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        do {
            let response = try await auth.api.listWorkspaces()
            workspaces = response.data
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Projects List (within a workspace)

struct ProjectsListView: View {
    @Environment(AuthManager.self) private var auth
    let workspace: Workspace
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
                    systemImage: "doc",
                    description: Text("No projects in this workspace yet.")
                )
            } else {
                List(projects) { project in
                    NavigationLink(value: project) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(project.name)
                                .font(.headline)
                            if let desc = project.description {
                                Text(desc)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(2)
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle(workspace.name)
        .navigationDestination(for: Project.self) { project in
            ProjectDetailView(project: project)
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        do {
            let response = try await auth.api.listProjects(workspaceId: workspace.id)
            projects = response.data
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
