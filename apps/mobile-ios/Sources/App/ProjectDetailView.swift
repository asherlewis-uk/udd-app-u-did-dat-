import SwiftUI

struct ProjectDetailView: View {
    let project: Project
    @State private var selectedTab = 0

    var body: some View {
        VStack(spacing: 0) {
            Picker("Section", selection: $selectedTab) {
                Text("Runs").tag(0)
                Text("Comments").tag(1)
                Text("Preview").tag(2)
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.vertical, 8)

            Divider()

            switch selectedTab {
            case 0:
                RunsView(projectId: project.id)
            case 1:
                CommentsView(projectId: project.id)
            default:
                PreviewTabView(projectId: project.id)
            }
        }
        .navigationTitle(project.name)
        .navigationBarTitleDisplayMode(.inline)
    }
}
