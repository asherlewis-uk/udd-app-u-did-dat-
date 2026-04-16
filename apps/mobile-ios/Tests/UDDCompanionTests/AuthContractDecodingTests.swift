import XCTest
@testable import UDDCompanion

final class AuthContractDecodingTests: XCTestCase {

    // MARK: - PKCEInitResponse

    func testPKCEInitResponseDecoding_canonicalShape() throws {
        let json = """
        {
            "state": "random_state_abc123",
            "codeChallenge": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
            "codeChallengeMethod": "S256"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PKCEInitResponse.self, from: json)

        XCTAssertEqual(response.state, "random_state_abc123")
        XCTAssertEqual(response.codeChallenge, "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")
        XCTAssertEqual(response.codeChallengeMethod, "S256")
    }

    func testPKCEInitResponseDecoding_ignoresExtraFields() throws {
        let json = """
        {
            "state": "state_xyz",
            "codeChallenge": "challenge_value",
            "codeChallengeMethod": "S256",
            "redirectUri": "https://app.example.com/callback",
            "expiresIn": 600
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PKCEInitResponse.self, from: json)

        XCTAssertEqual(response.state, "state_xyz")
        XCTAssertEqual(response.codeChallenge, "challenge_value")
    }

    // MARK: - ExchangeResponse

    func testExchangeResponseDecoding_canonicalShape() throws {
        let json = """
        {
            "token": "eyJhbGciOiJIUzI1NiJ9.session.token_abc",
            "userId": "user_100"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(ExchangeResponse.self, from: json)

        XCTAssertEqual(response.token, "eyJhbGciOiJIUzI1NiJ9.session.token_abc")
        XCTAssertEqual(response.userId, "user_100")
    }

    func testExchangeResponseDecoding_ignoresExtraFields() throws {
        let json = """
        {
            "token": "eyJhbGciOiJIUzI1NiJ9.session.token_def",
            "userId": "user_101",
            "expiresAt": "2024-04-01T13:00:00Z",
            "refreshToken": "refresh_xyz"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(ExchangeResponse.self, from: json)

        XCTAssertEqual(response.token, "eyJhbGciOiJIUzI1NiJ9.session.token_def")
        XCTAssertEqual(response.userId, "user_101")
    }

    // MARK: - UserResponse (matches TS MeResponse)

    func testUserResponseDecoding_allFieldsPresent() throws {
        let json = """
        {
            "id": "user_200",
            "email": "alice@example.com",
            "displayName": "Alice Smith",
            "avatarUrl": "https://cdn.example.com/avatars/alice.png"
        }
        """.data(using: .utf8)!

        let user = try JSONDecoder().decode(UserResponse.self, from: json)

        XCTAssertEqual(user.id, "user_200")
        XCTAssertEqual(user.email, "alice@example.com")
        XCTAssertEqual(user.displayName, "Alice Smith")
        XCTAssertEqual(user.avatarUrl, "https://cdn.example.com/avatars/alice.png")
    }

    func testUserResponseDecoding_avatarUrlNull() throws {
        let json = """
        {
            "id": "user_201",
            "email": "bob@example.com",
            "displayName": "Bob Jones",
            "avatarUrl": null
        }
        """.data(using: .utf8)!

        let user = try JSONDecoder().decode(UserResponse.self, from: json)

        XCTAssertEqual(user.id, "user_201")
        XCTAssertEqual(user.email, "bob@example.com")
        XCTAssertEqual(user.displayName, "Bob Jones")
        XCTAssertNil(user.avatarUrl)
    }

    func testUserResponseDecoding_avatarUrlAbsent() throws {
        let json = """
        {
            "id": "user_202",
            "email": "carol@example.com",
            "displayName": "Carol Davis"
        }
        """.data(using: .utf8)!

        let user = try JSONDecoder().decode(UserResponse.self, from: json)

        XCTAssertEqual(user.id, "user_202")
        XCTAssertNil(user.avatarUrl)
    }

    func testUserResponseDecoding_ignoresExtraFields() throws {
        let json = """
        {
            "id": "user_203",
            "email": "dave@example.com",
            "displayName": "Dave Wilson",
            "avatarUrl": "https://cdn.example.com/dave.png",
            "externalAuthId": "auth0|abc123",
            "createdAt": "2024-01-01T00:00:00Z",
            "updatedAt": "2024-01-02T00:00:00Z"
        }
        """.data(using: .utf8)!

        let user = try JSONDecoder().decode(UserResponse.self, from: json)

        XCTAssertEqual(user.id, "user_203")
        XCTAssertEqual(user.email, "dave@example.com")
        XCTAssertEqual(user.displayName, "Dave Wilson")
    }

    // MARK: - UserResponse conforms to Identifiable

    func testUserResponseDecoding_identifiable() throws {
        let json = """
        {
            "id": "user_204",
            "email": "eve@example.com",
            "displayName": "Eve Taylor"
        }
        """.data(using: .utf8)!

        let user = try JSONDecoder().decode(UserResponse.self, from: json)

        // Identifiable conformance — id is the identity
        XCTAssertEqual(user.id, "user_204")
    }

    // MARK: - APIErrorResponse

    func testAPIErrorResponseDecoding_canonicalShape() throws {
        let json = """
        {
            "code": "NOT_FOUND",
            "message": "Session not found",
            "correlationId": "corr_err_001"
        }
        """.data(using: .utf8)!

        let error = try JSONDecoder().decode(APIErrorResponse.self, from: json)

        XCTAssertEqual(error.code, "NOT_FOUND")
        XCTAssertEqual(error.message, "Session not found")
        XCTAssertEqual(error.correlationId, "corr_err_001")
    }

    func testAPIErrorResponseDecoding_correlationIdNull() throws {
        let json = """
        {
            "code": "INTERNAL_ERROR",
            "message": "Something went wrong",
            "correlationId": null
        }
        """.data(using: .utf8)!

        let error = try JSONDecoder().decode(APIErrorResponse.self, from: json)

        XCTAssertEqual(error.code, "INTERNAL_ERROR")
        XCTAssertEqual(error.message, "Something went wrong")
        XCTAssertNil(error.correlationId)
    }

    func testAPIErrorResponseDecoding_ignoresDetailsField() throws {
        let json = """
        {
            "code": "VALIDATION_ERROR",
            "message": "Invalid input",
            "correlationId": "corr_err_002",
            "details": [{"field": "name", "issue": "required"}]
        }
        """.data(using: .utf8)!

        let error = try JSONDecoder().decode(APIErrorResponse.self, from: json)

        XCTAssertEqual(error.code, "VALIDATION_ERROR")
        XCTAssertEqual(error.message, "Invalid input")
        XCTAssertEqual(error.correlationId, "corr_err_002")
    }

    // MARK: - All known API error codes decode as strings

    func testAPIErrorResponseDecoding_allKnownErrorCodes() throws {
        let codes = [
            "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "CONFLICT", "GONE",
            "VALIDATION_ERROR", "RATE_LIMITED", "INTERNAL_ERROR",
            "SESSION_NOT_RUNNING", "WORKER_UNAVAILABLE",
            "PREVIEW_EXPIRED", "PREVIEW_REVOKED",
            "PIPELINE_INACTIVE", "ROLE_INACTIVE", "PROVIDER_INACTIVE",
            "INVALID_DAG", "IDEMPOTENCY_CONFLICT",
            "PROJECT_CONTAINER_UNAVAILABLE"
        ]

        for code in codes {
            let json = """
            {
                "code": "\(code)",
                "message": "Error: \(code)",
                "correlationId": "corr_\(code)"
            }
            """.data(using: .utf8)!

            let error = try JSONDecoder().decode(APIErrorResponse.self, from: json)
            XCTAssertEqual(error.code, code, "Error code '\(code)' should decode correctly")
        }
    }
}
