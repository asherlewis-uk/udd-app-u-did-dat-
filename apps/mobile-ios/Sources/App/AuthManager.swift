import AuthenticationServices
import Observation
import Security
import UIKit

// MARK: - Keychain Helper

private enum KeychainHelper {
    static func save(key: String, value: String) {
        let data = Data(value.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
        let attrs: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
        ]
        SecItemAdd(attrs as CFDictionary, nil)
    }

    static func read(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
        ]
        SecItemDelete(query as CFDictionary)
    }
}

// MARK: - Presentation Context

private class AuthPresenter: NSObject, ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = scene.windows.first
        else {
            return ASPresentationAnchor()
        }
        return window
    }
}

// MARK: - Auth Manager

@Observable
final class AuthManager {
    private(set) var isAuthenticated = false
    private(set) var isLoading = false
    private(set) var currentUser: UserResponse?
    private(set) var errorMessage: String?

    let api: APIClient

    private var webAuthSession: ASWebAuthenticationSession?
    private let presenter = AuthPresenter()

    init() {
        self.api = APIClient()
        // Restore persisted session
        if let token = KeychainHelper.read(key: "session_token") {
            api.sessionToken = token
            isAuthenticated = true
        }
    }

    /// Validate stored token by fetching the current user profile.
    @MainActor
    func restoreSession() async {
        guard isAuthenticated else { return }
        do {
            let response = try await api.getMe()
            currentUser = response.data
        } catch {
            // Token is expired or invalid — force re-auth
            signOut()
        }
    }

    /// Full PKCE sign-in flow via ASWebAuthenticationSession.
    @MainActor
    func signIn() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            // 1. Get PKCE challenge from backend
            let pkce = try await api.pkceInit()
            let init_ = pkce.data

            // 2. Build WorkOS authorization URL
            var components = URLComponents(string: AppConfig.workosAuthorizeURL)!
            components.queryItems = [
                URLQueryItem(name: "client_id", value: AppConfig.workosClientID),
                URLQueryItem(name: "redirect_uri", value: AppConfig.workosRedirectURI),
                URLQueryItem(name: "response_type", value: "code"),
                URLQueryItem(name: "code_challenge", value: init_.codeChallenge),
                URLQueryItem(name: "code_challenge_method", value: init_.codeChallengeMethod),
                URLQueryItem(name: "state", value: init_.state),
                URLQueryItem(name: "provider", value: "authkit"),
            ]

            guard let authURL = components.url else {
                errorMessage = "Failed to build authorization URL"
                return
            }

            // 3. Launch web auth session
            let presenter = self.presenter
            let code: String = try await withCheckedThrowingContinuation { continuation in
                let session = ASWebAuthenticationSession(
                    url: authURL,
                    callbackURLScheme: AppConfig.workosRedirectScheme
                ) { callbackURL, error in
                    if let error {
                        continuation.resume(throwing: error)
                        return
                    }
                    guard let callbackURL,
                          let comps = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false),
                          let code = comps.queryItems?.first(where: { $0.name == "code" })?.value
                    else {
                        continuation.resume(throwing: URLError(.badServerResponse))
                        return
                    }
                    continuation.resume(returning: code)
                }
                session.presentationContextProvider = presenter
                session.prefersEphemeralWebBrowserSession = false
                self.webAuthSession = session // retain
                session.start()
            }

            // 4. Exchange authorization code for session JWT
            let exchange = try await api.exchangeCode(code, state: init_.state)
            let token = exchange.data.token

            // 5. Persist and update state
            KeychainHelper.save(key: "session_token", value: token)
            api.sessionToken = token
            isAuthenticated = true
            webAuthSession = nil

            // 6. Fetch user profile
            await restoreSession()

        } catch is CancellationError {
            // User dismissed the auth sheet — not an error
        } catch let error as ASWebAuthenticationSessionError
            where error.code == .canceledLogin {
            // User tapped Cancel — not an error
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    @MainActor
    func signOut() {
        KeychainHelper.delete(key: "session_token")
        api.sessionToken = nil
        currentUser = nil
        isAuthenticated = false
    }
}
