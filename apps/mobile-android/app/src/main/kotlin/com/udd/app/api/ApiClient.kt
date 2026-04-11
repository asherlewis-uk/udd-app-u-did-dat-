package com.udd.app.api

import io.ktor.client.*
import io.ktor.client.engine.android.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

class ApiClient(private val baseUrl: String = "https://api.yourdomain.com/v1") {
    private var sessionToken: String? = null

    private val client = HttpClient(Android) {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true })
        }
    }

    fun setSessionToken(token: String) { sessionToken = token }

    private suspend fun get(path: String): HttpResponse =
        client.get("$baseUrl$path") {
            sessionToken?.let { header(HttpHeaders.Authorization, "Bearer $it") }
        }

    suspend fun getMe(): MeResponse = get("/me").body()
    suspend fun listWorkspaces(): PaginatedResponse<WorkspaceDTO> = get("/workspaces").body()

    private suspend inline fun <reified T> HttpResponse.body(): T =
        io.ktor.client.call.body()
}

@Serializable data class MeResponse(val id: String, val email: String, val displayName: String)
@Serializable data class WorkspaceDTO(val id: String, val name: String, val slug: String)
@Serializable data class PaginatedResponse<T>(val data: List<T>, val hasMore: Boolean)
