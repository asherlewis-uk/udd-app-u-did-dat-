import Foundation

// MARK: - API Errors

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int, apiError: APIErrorResponse?)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid server response"
        case .httpError(let code, let apiError):
            return apiError?.message ?? "HTTP error \(code)"
        }
    }
}

// MARK: - API Client

final class APIClient {
    let baseURL: String
    var sessionToken: String?

    init(baseURL: String = AppConfig.apiBaseURL.absoluteString) {
        self.baseURL = baseURL
    }

    // MARK: Core request

    private func performRequest<T: Decodable>(
        _ path: String,
        method: String = "GET",
        bodyData: Data? = nil
    ) async throws -> T {
        guard let url = URL(string: baseURL + path) else {
            throw APIError.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(UUID().uuidString, forHTTPHeaderField: "X-Correlation-ID")
        if let token = sessionToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = bodyData

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200...299).contains(http.statusCode) else {
            let apiErr = try? JSONDecoder().decode(APIErrorResponse.self, from: data)
            throw APIError.httpError(statusCode: http.statusCode, apiError: apiErr)
        }

        return try JSONDecoder().decode(T.self, from: data)
    }

    // MARK: Auth (unauthenticated)

    func pkceInit() async throws -> APIResponse<PKCEInitResponse> {
        try await performRequest("/v1/auth/session/pkce-init", method: "POST")
    }

    func exchangeCode(_ code: String, state: String) async throws -> APIResponse<ExchangeResponse> {
        struct Body: Encodable { let code: String; let state: String }
        let data = try JSONEncoder().encode(Body(code: code, state: state))
        return try await performRequest("/v1/auth/session/exchange", method: "POST", bodyData: data)
    }

    // MARK: User

    func getMe() async throws -> APIResponse<UserResponse> {
        try await performRequest("/v1/me")
    }

    // MARK: Projects

    func listProjects(cursor: String? = nil) async throws -> PaginatedResponse<Project> {
        var path = "/v1/projects"
        if let cursor { path += "?cursor=\(cursor)" }
        return try await performRequest(path)
    }

    func getProject(_ id: String) async throws -> APIResponse<Project> {
        try await performRequest("/v1/projects/\(id)")
    }

    // MARK: Sessions (Runs)

    func listSessions(projectId: String, cursor: String? = nil) async throws -> PaginatedResponse<Session> {
        var path = "/v1/projects/\(projectId)/sessions"
        if let cursor { path += "?cursor=\(cursor)" }
        return try await performRequest(path)
    }

    func getSession(_ id: String) async throws -> APIResponse<Session> {
        try await performRequest("/v1/sessions/\(id)")
    }

    func startSession(_ id: String) async throws -> APIResponse<Session> {
        try await performRequest("/v1/sessions/\(id)/start", method: "POST")
    }

    func stopSession(_ id: String) async throws -> APIResponse<Session> {
        try await performRequest("/v1/sessions/\(id)/stop", method: "POST")
    }

    // MARK: Comments

    func listComments(projectId: String, cursor: String? = nil) async throws -> PaginatedResponse<CollaborationThread> {
        var path = "/v1/projects/\(projectId)/comments"
        if let cursor { path += "?cursor=\(cursor)" }
        return try await performRequest(path)
    }

    func postComment(projectId: String, commentBody: String, threadId: String? = nil) async throws -> APIResponse<Comment> {
        struct Anchor: Encodable { let type: String }
        struct Payload: Encodable { let body: String; let threadId: String?; let anchor: Anchor? }
        let payload = Payload(body: commentBody, threadId: threadId, anchor: threadId == nil ? Anchor(type: "general") : nil)
        let data = try JSONEncoder().encode(payload)
        return try await performRequest("/v1/projects/\(projectId)/comments", method: "POST", bodyData: data)
    }

    // MARK: Previews

    func createPreview(sessionId: String) async throws -> APIResponse<PreviewRouteBinding> {
        try await performRequest("/v1/sessions/\(sessionId)/previews", method: "POST")
    }

    func getPreview(_ previewId: String) async throws -> APIResponse<PreviewRouteBinding> {
        try await performRequest("/v1/previews/\(previewId)")
    }

    func getPreviewToken(previewId: String) async throws -> APIResponse<PreviewTokenResponse> {
        try await performRequest("/v1/previews/\(previewId)/token", method: "POST")
    }
}