import XCTest
@testable import UDDCompanion

final class PreviewContractDecodingTests: XCTestCase {

    // MARK: - PreviewRouteBinding canonical shape

    func testPreviewRouteBindingDecoding_allFieldsPresent() throws {
        let json = """
        {
            "id": "prev_100",
            "previewId": "pv_200",
            "sessionId": "sess_300",
            "projectId": "proj_400",
            "state": "bound",
            "boundAt": "2024-04-01T12:00:00Z",
            "expiresAt": "2024-04-01T13:00:00Z",
            "revokedAt": null
        }
        """.data(using: .utf8)!

        let binding = try JSONDecoder().decode(PreviewRouteBinding.self, from: json)

        XCTAssertEqual(binding.id, "prev_100")
        XCTAssertEqual(binding.previewId, "pv_200")
        XCTAssertEqual(binding.sessionId, "sess_300")
        XCTAssertEqual(binding.projectId, "proj_400")
        XCTAssertEqual(binding.state, "bound")
        XCTAssertEqual(binding.boundAt, "2024-04-01T12:00:00Z")
        XCTAssertEqual(binding.expiresAt, "2024-04-01T13:00:00Z")
        XCTAssertNil(binding.revokedAt)
    }

    // MARK: - Optional fields absent

    func testPreviewRouteBindingDecoding_optionalFieldsMissing() throws {
        let json = """
        {
            "id": "prev_101",
            "previewId": "pv_201",
            "sessionId": "sess_301",
            "projectId": "proj_401",
            "state": "bound",
            "boundAt": "2024-04-01T12:00:00Z"
        }
        """.data(using: .utf8)!

        let binding = try JSONDecoder().decode(PreviewRouteBinding.self, from: json)

        XCTAssertEqual(binding.id, "prev_101")
        XCTAssertEqual(binding.previewId, "pv_201")
        XCTAssertNil(binding.expiresAt)
        XCTAssertNil(binding.revokedAt)
    }

    // MARK: - Revoked preview with revokedAt populated

    func testPreviewRouteBindingDecoding_revokedState() throws {
        let json = """
        {
            "id": "prev_102",
            "previewId": "pv_202",
            "sessionId": "sess_302",
            "projectId": "proj_402",
            "state": "revoked",
            "boundAt": "2024-04-01T12:00:00Z",
            "expiresAt": "2024-04-01T13:00:00Z",
            "revokedAt": "2024-04-01T12:30:00Z"
        }
        """.data(using: .utf8)!

        let binding = try JSONDecoder().decode(PreviewRouteBinding.self, from: json)

        XCTAssertEqual(binding.state, "revoked")
        XCTAssertEqual(binding.revokedAt, "2024-04-01T12:30:00Z")
        XCTAssertEqual(binding.expiresAt, "2024-04-01T13:00:00Z")
    }

    // MARK: - Ignores extra fields from TS contract (workspaceId, workerHost, hostPort, version)

    func testPreviewRouteBindingDecoding_ignoresExtraContractFields() throws {
        let json = """
        {
            "id": "prev_103",
            "previewId": "pv_203",
            "sessionId": "sess_303",
            "projectId": "proj_403",
            "workspaceId": "ws_500",
            "workerHost": "worker-2.internal",
            "hostPort": 3000,
            "state": "bound",
            "boundAt": "2024-04-01T12:00:00Z",
            "expiresAt": "2024-04-01T13:00:00Z",
            "version": 3
        }
        """.data(using: .utf8)!

        let binding = try JSONDecoder().decode(PreviewRouteBinding.self, from: json)

        XCTAssertEqual(binding.id, "prev_103")
        XCTAssertEqual(binding.previewId, "pv_203")
        XCTAssertEqual(binding.projectId, "proj_403")
        XCTAssertEqual(binding.state, "bound")
    }

    // MARK: - Preview state values match TS PreviewRouteState enum

    func testPreviewRouteBindingDecoding_allKnownStates() throws {
        let states = ["bound", "expired", "revoked"]

        for state in states {
            let json = """
            {
                "id": "prev_state_\(state)",
                "previewId": "pv_state_\(state)",
                "sessionId": "sess_100",
                "projectId": "proj_100",
                "state": "\(state)",
                "boundAt": "2024-04-01T12:00:00Z"
            }
            """.data(using: .utf8)!

            let binding = try JSONDecoder().decode(PreviewRouteBinding.self, from: json)
            XCTAssertEqual(binding.state, state, "State '\(state)' should decode correctly")
        }
    }

    // MARK: - PreviewRouteBinding in APIResponse wrapper

    func testPreviewRouteBindingDecoding_wrappedInAPIResponse() throws {
        let json = """
        {
            "data": {
                "id": "prev_200",
                "previewId": "pv_300",
                "sessionId": "sess_400",
                "projectId": "proj_500",
                "state": "bound",
                "boundAt": "2024-04-01T12:00:00Z",
                "expiresAt": "2024-04-01T13:00:00Z"
            },
            "correlationId": "corr_prev_001"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(APIResponse<PreviewRouteBinding>.self, from: json)

        XCTAssertEqual(response.data.id, "prev_200")
        XCTAssertEqual(response.data.state, "bound")
        XCTAssertEqual(response.correlationId, "corr_prev_001")
    }

    // MARK: - PreviewTokenResponse

    func testPreviewTokenResponseDecoding_canonicalShape() throws {
        let json = """
        {
            "token": "eyJhbGciOiJIUzI1NiJ9.preview.token",
            "expiresAt": "2024-04-01T13:00:00Z"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PreviewTokenResponse.self, from: json)

        XCTAssertEqual(response.token, "eyJhbGciOiJIUzI1NiJ9.preview.token")
        XCTAssertEqual(response.expiresAt, "2024-04-01T13:00:00Z")
    }

    // MARK: - PreviewTokenResponse in APIResponse wrapper

    func testPreviewTokenResponseDecoding_wrappedInAPIResponse() throws {
        let json = """
        {
            "data": {
                "token": "eyJhbGciOiJIUzI1NiJ9.preview.wrapped",
                "expiresAt": "2024-04-01T14:00:00Z"
            },
            "correlationId": "corr_token_001"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(APIResponse<PreviewTokenResponse>.self, from: json)

        XCTAssertEqual(response.data.token, "eyJhbGciOiJIUzI1NiJ9.preview.wrapped")
        XCTAssertEqual(response.data.expiresAt, "2024-04-01T14:00:00Z")
        XCTAssertEqual(response.correlationId, "corr_token_001")
    }

    // MARK: - PreviewTokenResponse ignores extra fields

    func testPreviewTokenResponseDecoding_ignoresExtraFields() throws {
        let json = """
        {
            "token": "eyJhbGciOiJIUzI1NiJ9.preview.extra",
            "expiresAt": "2024-04-01T15:00:00Z",
            "issuedAt": "2024-04-01T14:00:00Z",
            "scope": "preview:read"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PreviewTokenResponse.self, from: json)

        XCTAssertEqual(response.token, "eyJhbGciOiJIUzI1NiJ9.preview.extra")
        XCTAssertEqual(response.expiresAt, "2024-04-01T15:00:00Z")
    }
}
