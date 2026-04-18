output "notification_channel_id" {
  description = "ID of the email notification channel"
  value       = google_monitoring_notification_channel.email.id
}

output "uptime_check_ids" {
  description = "Map of service name → uptime check ID"
  value       = { for k, v in google_monitoring_uptime_check_config.service_ready : k => v.uptime_check_id }
}
