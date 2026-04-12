import SwiftUI

/// Main tab shell — shown only when authenticated.
struct ContentView: View {
    @Environment(AuthManager.self) private var auth

    var body: some View {
        TabView {
            NavigationStack {
                WorkspacesView()
            }
            .tabItem { Label("Projects", systemImage: "folder") }

            NavigationStack {
                SettingsView()
            }
            .tabItem { Label("Settings", systemImage: "gear") }
        }
        .task {
            await auth.restoreSession()
        }
    }
}
