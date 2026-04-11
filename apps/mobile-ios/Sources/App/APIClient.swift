import Foundation

struct APIClient {
    let baseURL: URL
    var sessionToken: String?

    init(baseURL: URL = URL(string: ProcessInfo.processInfo.environment["API_BASE_URL"] ?? "https://api.yourdomain.com/v1")!) {
        self.baseURL = baseURL
    }

    private func request<T: Decodable>(_ path: String, method: String = "GET", body: Encodable? = nil) async throws -> T {
        var req = URLRequest(url: baseURL.appendingPathComponent(path))
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = sessionToken {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            req.httpBody = try JSONEncoder().encode(body)
        }
        let (data, _) = try await URLSession.shared.data(for: req)
        return try JSONDecoder().decode(T.self, from: data)
    }

    func getMe() async throws -> UserResponse {
        try await request("/me")
    }

    func listWorkspaces() async throws -> PaginatedResponse<WorkspaceDTO> {
        try await request("/workspaces")
    }
}

// Minimal DTO types matching contracts
struct UserResponse: Decodable { let id: String; let email: String; let displayName: String }
struct WorkspaceDTO: Decodable, Identifiable { let id: String; let name: String; let slug: String }
struct PaginatedResponse<T: Decodable>: Decodable { let data: [T]; let hasMore: Bool }
