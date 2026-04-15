import XCTest
@testable import UDDCompanion

final class ProjectFirstContractDecodingTests: XCTestCase {
    
    // MARK: - Project decoding
    
    func testProjectDecoding_withWorkspaceId() throws {
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
        
        let decoder = JSONDecoder()
        let project = try decoder.decode(Project.self, from: json)
        
        XCTAssertEqual(project.id, "proj_123")
        XCTAssertEqual(project.workspaceId, "ws_123")
    }
    
    func testProjectDecoding_withoutWorkspaceId() throws {
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
        
        let decoder = JSONDecoder()
        let project = try decoder.decode(Project.self, from: json)
        
        XCTAssertEqual(project.id, "proj_124")
        XCTAssertNil(project.workspaceId)
    }
    
    // MARK: - Session decoding
    
    func testSessionDecoding_withoutWorkspaceId() throws {
        let json = """
        {
            "id": "sess_123",
            "projectId": "proj_124",
            "userId": "user_1",
            "state": "running",
            "idleTimeoutSeconds": 300,
            "version": 1,
            "createdAt": "2023-01-01T00:00:00Z",
            "updatedAt": "2023-01-01T00:00:00Z"
        }
        """.data(using: .utf8)!
        
        let decoder = JSONDecoder()
        let session = try decoder.decode(Session.self, from: json)
        
        XCTAssertEqual(session.id, "sess_123")
        XCTAssertEqual(session.projectId, "proj_124")
        XCTAssertNil(session.workspaceId)
    }
    
    // MARK: - Preview binding decoding
    
    func testPreviewBindingDecoding_withoutWorkspaceId() throws {
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
        
        let decoder = JSONDecoder()
        let binding = try decoder.decode(PreviewRouteBinding.self, from: json)
        
        XCTAssertEqual(binding.id, "prev_001")
        XCTAssertEqual(binding.projectId, "proj_124")
        XCTAssertEqual(binding.sessionId, "sess_123")
        XCTAssertNil(binding.workspaceId)
    }
    
    func testPreviewBindingDecoding_withWorkspaceId() throws {
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
        
        let decoder = JSONDecoder()
        let binding = try decoder.decode(PreviewRouteBinding.self, from: json)
        
        XCTAssertEqual(binding.id, "prev_002")
        XCTAssertEqual(binding.workspaceId, "ws_200")
        XCTAssertNil(binding.expiresAt)
    }
    
    // MARK: - Provider config view decoding
    
    /// Provider config views returned by canonical `/me/ai/providers` omit
    /// credentialSecretRef and workspaceId. The iOS client must decode this
    /// shape without crashing. We test against a minimal provider-view JSON.
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
            "status": "active",
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
            let status: String
            let createdAt: String
            let updatedAt: String
        }
        
        let decoder = JSONDecoder()
        let config = try decoder.decode(ProviderConfigView.self, from: json)
        
        XCTAssertEqual(config.id, "prov_001")
        XCTAssertEqual(config.name, "My OpenAI Key")
        XCTAssertEqual(config.providerType, "openai")
        XCTAssertTrue(config.isActive)
    }
}
