output "project_number" {
  description = "GCP project number (useful for constructing service account IAM members)"
  value       = data.google_project.main.number
}

output "secret_manager_api_enabled" {
  description = "Whether the Secret Manager API has been enabled"
  value       = google_project_service.secretmanager.id
}
