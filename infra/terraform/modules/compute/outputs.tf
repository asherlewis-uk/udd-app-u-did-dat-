output "service_urls" {
  description = "Map of service name to Cloud Run service URL"
  # TODO: Reconnect this output when the control-plane services are restored.
  value = {
    "ai-orchestration" = google_cloud_run_v2_service.ai_orchestration.uri
  }
}

output "api_service_url" {
  description = "URL of the api Cloud Run service"
  # TODO: Reconnect this output when the api Cloud Run service is restored.
  value = null
}

output "gateway_service_url" {
  description = "URL of the gateway Cloud Run service"
  # TODO: Reconnect this output when the gateway Cloud Run service is restored.
  value = null
}

output "session_reaper_job_name" {
  description = "Name of the session-reaper Cloud Run Job"
  # TODO: Reconnect this output when the session-reaper job is restored.
  value = null
}

output "worker_manager_service_url" {
  description = "URL of the worker-manager Cloud Run service"
  value       = google_cloud_run_v2_service.worker_manager.uri
}
