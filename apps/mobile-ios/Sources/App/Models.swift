import Foundation

// MARK: - API Response Wrappers

struct APIResponse<T: Decodable>: Decodable {
    let data: T
    let correlationId: String?
}

struct PaginatedResponse<T: Decodable>: Decodable {
    let data: [T]
    let nextCursor: String?
    let hasMore: Bool
    let correlationId: String?
}

struct APIErrorResponse: Decodable {
    let code: String
    let message: String
    let correlationId: String?
}

// MARK: - Auth

struct PKCEInitResponse: Decodable {
    let state: String
    let codeChallenge: String
    let codeChallengeMethod: String
}

struct ExchangeResponse: Decodable {
    let token: String
    let userId: String
}

// MARK: - User

struct UserResponse: Decodable, Identifiable {
    let id: String
    let email: String
    let displayName: String
    let avatarUrl: String?
}

// MARK: - Project

struct Project: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let slug: String
    let description: String?
    let createdAt: String
    let updatedAt: String
}

// MARK: - Session (Run)

struct Session: Decodable, Identifiable, Hashable {
    let id: String
    let projectId: String
    let userId: String
    let state: String
    let startedAt: String?
    let stoppedAt: String?
    let lastActivityAt: String?
    let idleTimeoutSeconds: Int
    let createdAt: String
    let updatedAt: String
}

// MARK: - Collaboration

struct CollaborationThread: Decodable, Identifiable {
    let id: String
    let projectId: String
    let sessionId: String?
    let anchor: CommentAnchor
    let createdAt: String
    let updatedAt: String
}

struct CommentAnchor: Decodable {
    let type: String
    let path: String?
    let line: Int?
}

struct Comment: Decodable, Identifiable {
    let id: String
    let threadId: String
    let authorUserId: String
    let body: String
    let createdAt: String
    let updatedAt: String
}

// MARK: - Preview

struct PreviewRouteBinding: Decodable, Identifiable {
    let id: String
    let previewId: String
    let sessionId: String
    let projectId: String
    let state: String
    let boundAt: String
    let expiresAt: String?
    let revokedAt: String?
}

struct PreviewTokenResponse: Decodable {
    let token: String
    let expiresAt: String
}