output "service_account_emails" {
  description = "Map of service name to service account email"
  value       = { for k, v in google_service_account.services : k => v.email }
}

output "api_service_account_email" {
  description = "Email of the api service account"
  value       = google_service_account.services["api"].email
}

output "ai_orchestration_service_account_email" {
  description = "Email of the ai-orchestration service account"
  value       = google_service_account.services["ai-orchestration"].email
}

output "scheduler_service_account_email" {
  description = "Email of the scheduler service account (used by Cloud Scheduler)"
  value       = google_service_account.services["scheduler"].email
}

output "service_account_ids" {
  description = "Map of service name to service account resource ID"
  value       = { for k, v in google_service_account.services : k => v.name }
}
