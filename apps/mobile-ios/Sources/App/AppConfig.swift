import Foundation

// ============================================================
// iOS App Configuration — Build-Phase Parameterization
//
// Values are read from Info.plist keys populated by Xcode build
// settings (e.g. UDD_API_BASE_URL, UDD_GATEWAY_BASE_URL,
// UDD_WORKOS_CLIENT_ID).  When a key is absent — typically in
// local-dev or SPM-only builds — the fallback is a localhost
// default that matches the canonical port assignments in
// docs/ENV_CONTRACT.md.
//
// To configure for hosted/production:
//   1. Set the build settings in the Xcode scheme or xcconfig.
//   2. Info.plist references them via $(UDD_API_BASE_URL) etc.
//
// See docs/ENV_CONTRACT.md § "Non-env configuration note".
// ============================================================

enum AppConfig {
    // MARK: - API and Gateway URLs

    /// API base URL — hosted mode: set via `UDD_API_BASE_URL` build setting.
    /// Local-dev fallback: `http://localhost:8080` (matches api service default port).
    static let apiBaseURL: URL = {
        if let override = Bundle.main.infoDictionary?["UDD_API_BASE_URL"] as? String,
           !override.isEmpty,
           !override.hasPrefix("$("),
           let url = URL(string: override) {
            return url
        }
        return URL(string: "http://localhost:8080")!
    }()

    /// Gateway base URL — hosted mode: set via `UDD_GATEWAY_BASE_URL` build setting.
    /// Local-dev fallback: `http://localhost:3000` (matches gateway service default port).
    static let gatewayBaseURL: URL = {
        if let override = Bundle.main.infoDictionary?["UDD_GATEWAY_BASE_URL"] as? String,
           !override.isEmpty,
           !override.hasPrefix("$("),
           let url = URL(string: override) {
            return url
        }
        return URL(string: "http://localhost:3000")!
    }()

    // MARK: - WorkOS AuthKit

    /// WorkOS client ID — must be set via `UDD_WORKOS_CLIENT_ID` build setting
    /// for any auth flow to work.  Falls back to empty string (auth will fail
    /// gracefully rather than silently using a placeholder).
    static let workosClientID: String = {
        if let override = Bundle.main.infoDictionary?["UDD_WORKOS_CLIENT_ID"] as? String,
           !override.isEmpty,
           !override.hasPrefix("$(") {
            return override
        }
        return ""
    }()

    static let workosRedirectScheme = "uddcompanion"
    static let workosRedirectURI = "uddcompanion://auth/callback"
    static let workosAuthorizeURL = "https://api.workos.com/user_management/authorize"
}
