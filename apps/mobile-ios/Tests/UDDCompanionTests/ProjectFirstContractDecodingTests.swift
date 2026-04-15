import XCTest
@testable import UDDCompanion

final class ProjectFirstContractDecodingTests: XCTestCase {

    func testProjectDecoding_canonicalShape() throws {
        let json = """
        {
            "id": "proj_124",
            "name": "My Project No WS",
            "slug": "my-project-no-ws",
            "description": "Test project isolated",
            "createdAt": "2023-01-01T00:00:00Z",
            "updatedAt": "2023-01-01T00:00:00Z"
        }
        """.data(using: .utf8)!

        let project = try JSONDecoder().decode(Project.self, from: json)

        XCTAssertEqual(project.id, "proj_124")
        XCTAssertEqual(project.slug, "my-project-no-ws")
    }

    func testProjectDecoding_ignoresLegacyWorkspaceId() throws {
        let json = """
        {
            "id": "proj_123",
            "workspaceId": "ws_123",
            "name": "My Project",
            "slug": "my-project",
            "description": "Test project",
            "createdAt": "2023-01-01T00:00:00Z",
            "updatedAt": "2023-01-01T00:00:00Z"
        }
        """.data(using: .utf8)!

        let project = try JSONDecoder().decode(Project.self, from: json)

        XCTAssertEqual(project.id, "proj_123")
        XCTAssertEqual(project.name, "My Project")
    }

    func testSessionDecoding_canonicalShape() throws {
        let json = """
        {
            "id": "sess_123",
            "projectId": "proj_124",
            "userId": "user_1",
            "state": "running",
            "idleTimeoutSeconds": 300,
            "createdAt": "2023-01-01T00:00:00Z",
            "updatedAt": "2023-01-01T00:00:00Z"
        }
        """.data(using: .utf8)!

        let session = try JSONDecoder().decode(Session.self, from: json)

        XCTAssertEqual(session.id, "sess_123")
        XCTAssertEqual(session.projectId, "proj_124")
        XCTAssertEqual(session.state, "running")
    }

    func testPreviewBindingDecoding_canonicalShape() throws {
        let json = """
        {
            "id": "prev_001",
            "previewId": "pv_100",
            "sessionId": "sess_123",
            "projectId": "proj_124",
            "state": "bound",
            "boundAt": "2023-06-01T12:00:00Z",
            "expiresAt": "2023-06-01T13:00:00Z"
        }
        """.data(using: .utf8)!

        let binding = try JSONDecoder().decode(PreviewRouteBinding.self, from: json)

        XCTAssertEqual(binding.id, "prev_001")
        XCTAssertEqual(binding.projectId, "proj_124")
        XCTAssertEqual(binding.sessionId, "sess_123")
        XCTAssertNil(binding.revokedAt)
    }

    func testPreviewBindingDecoding_ignoresLegacyWorkspaceId() throws {
        let json = """
        {
            "id": "prev_002",
            "previewId": "pv_101",
            "sessionId": "sess_124",
            "projectId": "proj_125",
            "workspaceId": "ws_200",
            "state": "bound",
            "boundAt": "2023-06-01T12:00:00Z"
        }
        """.data(using: .utf8)!

        let binding = try JSONDecoder().decode(PreviewRouteBinding.self, from: json)

        XCTAssertEqual(binding.id, "prev_002")
        XCTAssertEqual(binding.previewId, "pv_101")
        XCTAssertNil(binding.expiresAt)
    }

    func testPaginatedResponseDecoding_usesTopLevelPaginationFields() throws {
        let json = """
        {
            "data": [
                {
                    "id": "proj_200",
                    "name": "Paged Project",
                    "slug": "paged-project",
                    "description": null,
                    "createdAt": "2023-01-01T00:00:00Z",
                    "updatedAt": "2023-01-02T00:00:00Z"
                }
            ],
            "nextCursor": "cursor_2",
            "hasMore": true,
            "correlationId": "corr_123"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PaginatedResponse<Project>.self, from: json)

        XCTAssertEqual(response.data.count, 1)
        XCTAssertEqual(response.nextCursor, "cursor_2")
        XCTAssertTrue(response.hasMore)
        XCTAssertEqual(response.correlationId, "corr_123")
    }

    func testProviderConfigViewDecoding() throws {
        let json = """
        {
            "id": "prov_001",
            "name": "My OpenAI Key",
            "providerType": "openai",
            "endpointUrl": "https://api.openai.com/v1",
            "modelCatalogMode": "manual",
            "authScheme": "api_key_header",
            "isActive": true,
            "isSystemManaged": false,
            "credentialStatus": "active",
            "createdAt": "2023-01-15T10:30:00Z",
            "updatedAt": "2023-01-15T10:30:00Z"
        }
        """.data(using: .utf8)!

        struct ProviderConfigView: Decodable {
            let id: String
            let name: String
            let providerType: String
            let endpointUrl: String
            let modelCatalogMode: String
            let authScheme: String
            let isActive: Bool
            let isSystemManaged: Bool
            let credentialStatus: String
            let createdAt: String
            let updatedAt: String
        }

        let config = try JSONDecoder().decode(ProviderConfigView.self, from: json)

        XCTAssertEqual(config.id, "prov_001")
        XCTAssertEqual(config.name, "My OpenAI Key")
        XCTAssertEqual(config.providerType, "openai")
        XCTAssertEqual(config.credentialStatus, "active")
        XCTAssertTrue(config.isActive)
    }
}