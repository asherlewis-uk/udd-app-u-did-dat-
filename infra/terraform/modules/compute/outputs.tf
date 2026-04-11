output "service_urls" {
  description = "Map of service name to Cloud Run service URL"
  value = {
    for k, v in google_cloud_run_v2_service.control_plane : k => v.uri
  }
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

output "worker_manager_job_name" {
  description = "Name of the worker-manager Cloud Run Job"
  value       = google_cloud_run_v2_job.worker_manager.name
}
