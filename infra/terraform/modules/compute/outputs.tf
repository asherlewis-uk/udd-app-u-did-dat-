output "service_urls" {
  description = "Map of service name to Cloud Run service URL"
  value = merge(
    { for k, v in google_cloud_run_v2_service.control_plane : k => v.uri },
    { "ai-orchestration" = google_cloud_run_v2_service.ai_orchestration.uri }
  )
}

output "api_service_url" {
  description = "URL of the api Cloud Run service"
  value       = google_cloud_run_v2_service.control_plane["api"].uri
}

output "gateway_service_url" {
  description = "URL of the gateway Cloud Run service"
  value       = google_cloud_run_v2_service.control_plane["gateway"].uri
}

output "session_reaper_job_name" {
  description = "Name of the session-reaper Cloud Run Job"
  value       = google_cloud_run_v2_job.session_reaper.name
}

output "worker_manager_service_url" {
  description = "URL of the worker-manager Cloud Run service"
  value       = google_cloud_run_v2_service.worker_manager.uri
}
