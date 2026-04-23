import Foundation

// ============================================================
// iOS App Configuration — Build-Phase Parameterization
//
// Values are read from Info.plist keys populated by Xcode build
// settings (e.g. UDD_API_BASE_URL, UDD_GATEWAY_BASE_URL,
// UDD_WORKOS_CLIENT_ID). DEBUG / local-dev builds may fall back
// to localhost defaults. Non-debug builds fail fast if required
// values are absent or unresolved.
//
// To configure for hosted/production:
//   1. Set the build settings in the Xcode target or xcconfig.
//   2. Info.plist references them via $(UDD_API_BASE_URL) etc.
//
// See docs/ENV_CONTRACT.md § "Non-env configuration note".
// ============================================================

enum AppConfig {
    private static func configuredValue(for key: String) -> String? {
        guard let override = Bundle.main.infoDictionary?[key] as? String,
              !override.isEmpty,
              !override.hasPrefix("$(") else {
            return nil
        }
        return override
    }

    private static func requiredURL(_ key: String, debugFallback: String) -> URL {
        if let override = configuredValue(for: key),
           let url = URL(string: override) {
            return url
        }

#if DEBUG
        return URL(string: debugFallback)!
#else
        preconditionFailure("Missing required iOS build setting: \(key)")
#endif
    }

    private static func requiredString(_ key: String, debugFallback: String? = nil) -> String {
        if let override = configuredValue(for: key) {
            return override
        }

#if DEBUG
        if let debugFallback {
            return debugFallback
        }
#endif
        preconditionFailure("Missing required iOS build setting: \(key)")
    }

    // MARK: - API and Gateway URLs

    /// API base URL — hosted mode: set via `UDD_API_BASE_URL` build setting.
    /// DEBUG-only local fallback: `http://localhost:8080` (matches api service default port).
    static let apiBaseURL = requiredURL("UDD_API_BASE_URL", debugFallback: "http://localhost:8080")

    /// Gateway base URL — hosted mode: set via `UDD_GATEWAY_BASE_URL` build setting.
    /// DEBUG-only local fallback: `http://localhost:3000` (matches gateway service default port).
    static let gatewayBaseURL = requiredURL("UDD_GATEWAY_BASE_URL", debugFallback: "http://localhost:3000")

    // MARK: - WorkOS AuthKit

    /// WorkOS client ID — must be set via `UDD_WORKOS_CLIENT_ID` for hosted builds.
    /// DEBUG / SPM-only builds may leave this empty to skip auth configuration locally.
    static let workosClientID = requiredString("UDD_WORKOS_CLIENT_ID", debugFallback: "")

    static let workosRedirectScheme = "uddcompanion"
    static let workosRedirectURI = "uddcompanion://auth/callback"
    static let workosAuthorizeURL = "https://api.workos.com/user_management/authorize"
}
