import XCTest
@testable import UDDCompanion

final class SessionContractDecodingTests: XCTestCase {

    // MARK: - Canonical shape (all required + all optional fields present)

    func testSessionDecoding_allFieldsPresent() throws {
        let json = """
        {
            "id": "sess_500",
            "projectId": "proj_300",
            "userId": "user_42",
            "state": "running",
            "startedAt": "2024-03-15T09:00:00Z",
            "stoppedAt": null,
            "lastActivityAt": "2024-03-15T09:05:00Z",
            "idleTimeoutSeconds": 600,
            "createdAt": "2024-03-15T08:55:00Z",
            "updatedAt": "2024-03-15T09:05:00Z"
        }
        """.data(using: .utf8)!

        let session = try JSONDecoder().decode(Session.self, from: json)

        XCTAssertEqual(session.id, "sess_500")
        XCTAssertEqual(session.projectId, "proj_300")
        XCTAssertEqual(session.userId, "user_42")
        XCTAssertEqual(session.state, "running")
        XCTAssertEqual(session.startedAt, "2024-03-15T09:00:00Z")
        XCTAssertNil(session.stoppedAt)
        XCTAssertEqual(session.lastActivityAt, "2024-03-15T09:05:00Z")
        XCTAssertEqual(session.idleTimeoutSeconds, 600)
        XCTAssertEqual(session.createdAt, "2024-03-15T08:55:00Z")
        XCTAssertEqual(session.updatedAt, "2024-03-15T09:05:00Z")
    }

    // MARK: - Optional fields absent

    func testSessionDecoding_optionalFieldsMissing() throws {
        let json = """
        {
            "id": "sess_501",
            "projectId": "proj_301",
            "userId": "user_43",
            "state": "pending",
            "idleTimeoutSeconds": 300,
            "createdAt": "2024-03-15T08:00:00Z",
            "updatedAt": "2024-03-15T08:00:00Z"
        }
        """.data(using: .utf8)!

        let session = try JSONDecoder().decode(Session.self, from: json)

        XCTAssertEqual(session.id, "sess_501")
        XCTAssertEqual(session.state, "pending")
        XCTAssertNil(session.startedAt)
        XCTAssertNil(session.stoppedAt)
        XCTAssertNil(session.lastActivityAt)
    }

    // MARK: - Stopped session with all timestamps populated

    func testSessionDecoding_stoppedState() throws {
        let json = """
        {
            "id": "sess_502",
            "projectId": "proj_302",
            "userId": "user_44",
            "state": "stopped",
            "startedAt": "2024-03-15T08:00:00Z",
            "stoppedAt": "2024-03-15T10:00:00Z",
            "lastActivityAt": "2024-03-15T09:58:00Z",
            "idleTimeoutSeconds": 300,
            "createdAt": "2024-03-15T07:55:00Z",
            "updatedAt": "2024-03-15T10:00:00Z"
        }
        """.data(using: .utf8)!

        let session = try JSONDecoder().decode(Session.self, from: json)

        XCTAssertEqual(session.state, "stopped")
        XCTAssertEqual(session.startedAt, "2024-03-15T08:00:00Z")
        XCTAssertEqual(session.stoppedAt, "2024-03-15T10:00:00Z")
        XCTAssertEqual(session.lastActivityAt, "2024-03-15T09:58:00Z")
    }

    // MARK: - Ignores extra fields from TS contract (workspaceId, workerHost, hostPort, version)

    func testSessionDecoding_ignoresExtraContractFields() throws {
        let json = """
        {
            "id": "sess_503",
            "projectId": "proj_303",
            "workspaceId": "ws_999",
            "userId": "user_45",
            "state": "running",
            "workerHost": "worker-1.internal",
            "hostPort": 8080,
            "startedAt": "2024-03-15T09:00:00Z",
            "lastActivityAt": "2024-03-15T09:10:00Z",
            "idleTimeoutSeconds": 300,
            "version": 5,
            "createdAt": "2024-03-15T08:55:00Z",
            "updatedAt": "2024-03-15T09:10:00Z"
        }
        """.data(using: .utf8)!

        let session = try JSONDecoder().decode(Session.self, from: json)

        XCTAssertEqual(session.id, "sess_503")
        XCTAssertEqual(session.projectId, "proj_303")
        XCTAssertEqual(session.state, "running")
        XCTAssertEqual(session.idleTimeoutSeconds, 300)
    }

    // MARK: - Session in APIResponse wrapper

    func testSessionDecoding_wrappedInAPIResponse() throws {
        let json = """
        {
            "data": {
                "id": "sess_504",
                "projectId": "proj_304",
                "userId": "user_46",
                "state": "running",
                "idleTimeoutSeconds": 300,
                "createdAt": "2024-03-15T09:00:00Z",
                "updatedAt": "2024-03-15T09:00:00Z"
            },
            "correlationId": "corr_sess_001"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(APIResponse<Session>.self, from: json)

        XCTAssertEqual(response.data.id, "sess_504")
        XCTAssertEqual(response.data.state, "running")
        XCTAssertEqual(response.correlationId, "corr_sess_001")
    }

    // MARK: - Sessions in PaginatedResponse wrapper

    func testSessionDecoding_paginatedResponse() throws {
        let json = """
        {
            "data": [
                {
                    "id": "sess_600",
                    "projectId": "proj_400",
                    "userId": "user_50",
                    "state": "running",
                    "idleTimeoutSeconds": 300,
                    "createdAt": "2024-03-15T09:00:00Z",
                    "updatedAt": "2024-03-15T09:00:00Z"
                },
                {
                    "id": "sess_601",
                    "projectId": "proj_400",
                    "userId": "user_51",
                    "state": "stopped",
                    "startedAt": "2024-03-14T08:00:00Z",
                    "stoppedAt": "2024-03-14T10:00:00Z",
                    "idleTimeoutSeconds": 600,
                    "createdAt": "2024-03-14T07:55:00Z",
                    "updatedAt": "2024-03-14T10:00:00Z"
                }
            ],
            "nextCursor": "cursor_sess_2",
            "hasMore": true,
            "correlationId": "corr_page_001"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PaginatedResponse<Session>.self, from: json)

        XCTAssertEqual(response.data.count, 2)
        XCTAssertEqual(response.data[0].id, "sess_600")
        XCTAssertEqual(response.data[0].state, "running")
        XCTAssertEqual(response.data[1].id, "sess_601")
        XCTAssertEqual(response.data[1].state, "stopped")
        XCTAssertEqual(response.nextCursor, "cursor_sess_2")
        XCTAssertTrue(response.hasMore)
        XCTAssertEqual(response.correlationId, "corr_page_001")
    }

    // MARK: - Session state values match TS SessionState enum

    func testSessionDecoding_allKnownStates() throws {
        let states = ["pending", "starting", "running", "stopping", "stopped", "failed"]

        for state in states {
            let json = """
            {
                "id": "sess_state_\(state)",
                "projectId": "proj_100",
                "userId": "user_1",
                "state": "\(state)",
                "idleTimeoutSeconds": 300,
                "createdAt": "2024-01-01T00:00:00Z",
                "updatedAt": "2024-01-01T00:00:00Z"
            }
            """.data(using: .utf8)!

            let session = try JSONDecoder().decode(Session.self, from: json)
            XCTAssertEqual(session.state, state, "State '\(state)' should decode correctly")
        }
    }
}
