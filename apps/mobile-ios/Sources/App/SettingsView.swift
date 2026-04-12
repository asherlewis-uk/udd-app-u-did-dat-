import SwiftUI

struct SettingsView: View {
    @Environment(AuthManager.self) private var auth

    var body: some View {
        List {
            if let user = auth.currentUser {
                Section("Account") {
                    LabeledContent("Name", value: user.displayName)
                    LabeledContent("Email", value: user.email)
                    LabeledContent("User ID", value: String(user.id.prefix(12)) + "…")
                }
            }

            Section("App") {
                LabeledContent("API Server", value: AppConfig.apiBaseURL.host() ?? "—")
                LabeledContent("Version", value: "0.1.0")
            }

            Section {
                Button("Sign Out", role: .destructive) {
                    auth.signOut()
                }
            }
        }
        .navigationTitle("Settings")
    }
}
