import SwiftUI

// Status/review/comments companion — NO code editor, NO terminal
struct ContentView: View {
    var body: some View {
        TabView {
            NavigationView {
                Text("Home").navigationTitle("Home")
            }
            .tabItem { Label("Home", systemImage: "house") }

            NavigationView {
                Text("Projects").navigationTitle("Projects")
            }
            .tabItem { Label("Projects", systemImage: "folder") }

            NavigationView {
                Text("Activity").navigationTitle("Activity")
            }
            .tabItem { Label("Activity", systemImage: "bell") }

            NavigationView {
                Text("Settings").navigationTitle("Settings")
            }
            .tabItem { Label("Settings", systemImage: "gear") }
        }
    }
}
