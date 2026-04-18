import XCTest
@testable import UDDCompanion

final class APIContractParityTests: XCTestCase {

    // MARK: - APIResponse<T> generic wrapper

    func testAPIResponseDecoding_wrapsProject() throws {
        let json = """
        {
            "data": {
                "id": "proj_700",
                "name": "Wrapped Project",
                "slug": "wrapped-project",
                "description": "A project inside an API response",
                "createdAt": "2024-01-01T00:00:00Z",
                "updatedAt": "2024-01-02T00:00:00Z"
            },
            "correlationId": "corr_api_001"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(APIResponse<Project>.self, from: json)

        XCTAssertEqual(response.data.id, "proj_700")
        XCTAssertEqual(response.data.name, "Wrapped Project")
        XCTAssertEqual(response.correlationId, "corr_api_001")
    }

    func testAPIResponseDecoding_correlationIdNull() throws {
        let json = """
        {
            "data": {
                "id": "proj_701",
                "name": "No Correlation",
                "slug": "no-correlation",
                "description": null,
                "createdAt": "2024-01-01T00:00:00Z",
                "updatedAt": "2024-01-01T00:00:00Z"
            },
            "correlationId": null
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(APIResponse<Project>.self, from: json)

        XCTAssertEqual(response.data.id, "proj_701")
        XCTAssertNil(response.data.description)
        XCTAssertNil(response.correlationId)
    }

    func testAPIResponseDecoding_correlationIdAbsent() throws {
        let json = """
        {
            "data": {
                "id": "proj_702",
                "name": "Missing Correlation",
                "slug": "missing-correlation",
                "createdAt": "2024-01-01T00:00:00Z",
                "updatedAt": "2024-01-01T00:00:00Z"
            }
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(APIResponse<Project>.self, from: json)

        XCTAssertEqual(response.data.id, "proj_702")
        XCTAssertNil(response.correlationId)
    }

    // MARK: - PaginatedResponse<T> edge cases

    func testPaginatedResponseDecoding_emptyData() throws {
        let json = """
        {
            "data": [],
            "nextCursor": null,
            "hasMore": false,
            "correlationId": "corr_empty_001"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PaginatedResponse<Project>.self, from: json)

        XCTAssertEqual(response.data.count, 0)
        XCTAssertNil(response.nextCursor)
        XCTAssertFalse(response.hasMore)
        XCTAssertEqual(response.correlationId, "corr_empty_001")
    }

    func testPaginatedResponseDecoding_multipleItems() throws {
        let json = """
        {
            "data": [
                {
                    "id": "proj_800",
                    "name": "First",
                    "slug": "first",
                    "createdAt": "2024-01-01T00:00:00Z",
                    "updatedAt": "2024-01-01T00:00:00Z"
                },
                {
                    "id": "proj_801",
                    "name": "Second",
                    "slug": "second",
                    "description": "Has description",
                    "createdAt": "2024-01-02T00:00:00Z",
                    "updatedAt": "2024-01-02T00:00:00Z"
                },
                {
                    "id": "proj_802",
                    "name": "Third",
                    "slug": "third",
                    "description": null,
                    "createdAt": "2024-01-03T00:00:00Z",
                    "updatedAt": "2024-01-03T00:00:00Z"
                }
            ],
            "nextCursor": "cursor_after_802",
            "hasMore": true,
            "correlationId": "corr_multi_001"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PaginatedResponse<Project>.self, from: json)

        XCTAssertEqual(response.data.count, 3)
        XCTAssertEqual(response.data[0].id, "proj_800")
        XCTAssertNil(response.data[0].description)
        XCTAssertEqual(response.data[1].description, "Has description")
        XCTAssertNil(response.data[2].description)
        XCTAssertEqual(response.nextCursor, "cursor_after_802")
        XCTAssertTrue(response.hasMore)
    }

    func testPaginatedResponseDecoding_nextCursorAbsent() throws {
        let json = """
        {
            "data": [],
            "hasMore": false,
            "correlationId": "corr_nocursor_001"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PaginatedResponse<Session>.self, from: json)

        XCTAssertNil(response.nextCursor)
        XCTAssertFalse(response.hasMore)
    }

    func testPaginatedResponseDecoding_sessionsPage() throws {
        let json = """
        {
            "data": [
                {
                    "id": "sess_900",
                    "projectId": "proj_900",
                    "userId": "user_900",
                    "state": "running",
                    "startedAt": "2024-03-01T10:00:00Z",
                    "idleTimeoutSeconds": 300,
                    "createdAt": "2024-03-01T09:55:00Z",
                    "updatedAt": "2024-03-01T10:00:00Z"
                }
            ],
            "nextCursor": null,
            "hasMore": false,
            "correlationId": "corr_sess_page_001"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PaginatedResponse<Session>.self, from: json)

        XCTAssertEqual(response.data.count, 1)
        XCTAssertEqual(response.data[0].id, "sess_900")
        XCTAssertEqual(response.data[0].state, "running")
        XCTAssertFalse(response.hasMore)
    }

    // MARK: - CollaborationThread decoding

    func testCollaborationThreadDecoding_fileAnchor() throws {
        let json = """
        {
            "id": "thread_100",
            "projectId": "proj_100",
            "sessionId": "sess_100",
            "anchor": {
                "type": "file",
                "path": "src/main.ts",
                "line": 42
            },
            "createdAt": "2024-05-01T10:00:00Z",
            "updatedAt": "2024-05-01T10:00:00Z"
        }
        """.data(using: .utf8)!

        let thread = try JSONDecoder().decode(CollaborationThread.self, from: json)

        XCTAssertEqual(thread.id, "thread_100")
        XCTAssertEqual(thread.projectId, "proj_100")
        XCTAssertEqual(thread.sessionId, "sess_100")
        XCTAssertEqual(thread.anchor.type, "file")
        XCTAssertEqual(thread.anchor.path, "src/main.ts")
        XCTAssertEqual(thread.anchor.line, 42)
    }

    func testCollaborationThreadDecoding_generalAnchorMinimalFields() throws {
        let json = """
        {
            "id": "thread_101",
            "projectId": "proj_101",
            "anchor": {
                "type": "general"
            },
            "createdAt": "2024-05-01T11:00:00Z",
            "updatedAt": "2024-05-01T11:00:00Z"
        }
        """.data(using: .utf8)!

        let thread = try JSONDecoder().decode(CollaborationThread.self, from: json)

        XCTAssertEqual(thread.id, "thread_101")
        XCTAssertNil(thread.sessionId)
        XCTAssertEqual(thread.anchor.type, "general")
        XCTAssertNil(thread.anchor.path)
        XCTAssertNil(thread.anchor.line)
    }

    func testCollaborationThreadDecoding_previewAnchor() throws {
        let json = """
        {
            "id": "thread_102",
            "projectId": "proj_102",
            "sessionId": null,
            "anchor": {
                "type": "preview",
                "path": "/dashboard"
            },
            "createdAt": "2024-05-01T12:00:00Z",
            "updatedAt": "2024-05-01T12:00:00Z"
        }
        """.data(using: .utf8)!

        let thread = try JSONDecoder().decode(CollaborationThread.self, from: json)

        XCTAssertEqual(thread.anchor.type, "preview")
        XCTAssertEqual(thread.anchor.path, "/dashboard")
        XCTAssertNil(thread.anchor.line)
        XCTAssertNil(thread.sessionId)
    }

    // MARK: - Comment decoding

    func testCommentDecoding_canonicalShape() throws {
        let json = """
        {
            "id": "comment_100",
            "threadId": "thread_100",
            "authorUserId": "user_50",
            "body": "This looks like a bug on line 42.",
            "createdAt": "2024-05-01T10:05:00Z",
            "updatedAt": "2024-05-01T10:05:00Z"
        }
        """.data(using: .utf8)!

        let comment = try JSONDecoder().decode(Comment.self, from: json)

        XCTAssertEqual(comment.id, "comment_100")
        XCTAssertEqual(comment.threadId, "thread_100")
        XCTAssertEqual(comment.authorUserId, "user_50")
        XCTAssertEqual(comment.body, "This looks like a bug on line 42.")
        XCTAssertEqual(comment.createdAt, "2024-05-01T10:05:00Z")
        XCTAssertEqual(comment.updatedAt, "2024-05-01T10:05:00Z")
    }

    func testCommentDecoding_ignoresDeletedAtField() throws {
        let json = """
        {
            "id": "comment_101",
            "threadId": "thread_101",
            "authorUserId": "user_51",
            "body": "Deleted comment body",
            "createdAt": "2024-05-01T10:10:00Z",
            "updatedAt": "2024-05-01T10:15:00Z",
            "deletedAt": "2024-05-01T10:15:00Z"
        }
        """.data(using: .utf8)!

        let comment = try JSONDecoder().decode(Comment.self, from: json)

        XCTAssertEqual(comment.id, "comment_101")
        XCTAssertEqual(comment.body, "Deleted comment body")
    }

    // MARK: - Project description null vs absent

    func testProjectDecoding_descriptionNull() throws {
        let json = """
        {
            "id": "proj_900",
            "name": "Null Description",
            "slug": "null-desc",
            "description": null,
            "createdAt": "2024-01-01T00:00:00Z",
            "updatedAt": "2024-01-01T00:00:00Z"
        }
        """.data(using: .utf8)!

        let project = try JSONDecoder().decode(Project.self, from: json)

        XCTAssertNil(project.description)
    }

    func testProjectDecoding_descriptionAbsent() throws {
        let json = """
        {
            "id": "proj_901",
            "name": "Missing Description",
            "slug": "missing-desc",
            "createdAt": "2024-01-01T00:00:00Z",
            "updatedAt": "2024-01-01T00:00:00Z"
        }
        """.data(using: .utf8)!

        let project = try JSONDecoder().decode(Project.self, from: json)

        XCTAssertNil(project.description)
    }

    // MARK: - Cross-type paginated responses

    func testPaginatedResponseDecoding_previewBindings() throws {
        let json = """
        {
            "data": [
                {
                    "id": "prev_500",
                    "previewId": "pv_500",
                    "sessionId": "sess_500",
                    "projectId": "proj_500",
                    "state": "bound",
                    "boundAt": "2024-04-01T12:00:00Z",
                    "expiresAt": "2024-04-01T13:00:00Z"
                },
                {
                    "id": "prev_501",
                    "previewId": "pv_501",
                    "sessionId": "sess_501",
                    "projectId": "proj_500",
                    "state": "expired",
                    "boundAt": "2024-04-01T10:00:00Z",
                    "expiresAt": "2024-04-01T11:00:00Z"
                }
            ],
            "nextCursor": null,
            "hasMore": false,
            "correlationId": "corr_prev_page_001"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PaginatedResponse<PreviewRouteBinding>.self, from: json)

        XCTAssertEqual(response.data.count, 2)
        XCTAssertEqual(response.data[0].state, "bound")
        XCTAssertEqual(response.data[1].state, "expired")
        XCTAssertFalse(response.hasMore)
    }

    // MARK: - Extra top-level fields on envelope are ignored

    func testAPIResponseDecoding_ignoresExtraTopLevelFields() throws {
        let json = """
        {
            "data": {
                "id": "proj_999",
                "name": "Extra Fields Project",
                "slug": "extra-fields",
                "createdAt": "2024-01-01T00:00:00Z",
                "updatedAt": "2024-01-01T00:00:00Z"
            },
            "correlationId": "corr_extra_001",
            "requestId": "req_123",
            "serverTimestamp": "2024-01-01T00:00:01Z"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(APIResponse<Project>.self, from: json)

        XCTAssertEqual(response.data.id, "proj_999")
        XCTAssertEqual(response.correlationId, "corr_extra_001")
    }

    func testPaginatedResponseDecoding_ignoresExtraTopLevelFields() throws {
        let json = """
        {
            "data": [],
            "nextCursor": null,
            "hasMore": false,
            "correlationId": "corr_extra_002",
            "totalCount": 0,
            "pageSize": 25
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PaginatedResponse<Project>.self, from: json)

        XCTAssertEqual(response.data.count, 0)
        XCTAssertFalse(response.hasMore)
        XCTAssertEqual(response.correlationId, "corr_extra_002")
    }

    // MARK: - UserResponse wrapped in APIResponse (matches /me endpoint)

    func testUserResponseDecoding_wrappedInAPIResponse() throws {
        let json = """
        {
            "data": {
                "id": "user_300",
                "email": "me@example.com",
                "displayName": "Current User",
                "avatarUrl": "https://cdn.example.com/me.png"
            },
            "correlationId": "corr_me_001"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(APIResponse<UserResponse>.self, from: json)

        XCTAssertEqual(response.data.id, "user_300")
        XCTAssertEqual(response.data.email, "me@example.com")
        XCTAssertEqual(response.data.displayName, "Current User")
        XCTAssertEqual(response.correlationId, "corr_me_001")
    }
}
