import Foundation

enum AppConfig {
    // In production, swap for the real deployed API URL.
    // During local dev, this points at the API service on port 8080.
    #if DEBUG
    static let apiBaseURL = URL(string: "http://localhost:8080")!
    static let gatewayBaseURL = URL(string: "http://localhost:3000")!
    #else
    static let apiBaseURL = URL(string: "https://api.uddplatform.com")!
    static let gatewayBaseURL = URL(string: "https://gateway.uddplatform.com")!
    #endif

    // WorkOS AuthKit — client ID is a public value (safe to embed).
    // Replace with the real client ID from the WorkOS dashboard.
    static let workosClientID = "client_REPLACE_WITH_YOUR_WORKOS_CLIENT_ID"
    static let workosRedirectScheme = "uddcompanion"
    static let workosRedirectURI = "uddcompanion://auth/callback"
    static let workosAuthorizeURL = "https://api.workos.com/user_management/authorize"
}
