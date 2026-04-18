variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  description = "GCP region"
  default     = "us-central1"
}

variable "db_username" {
  type        = string
  description = "Cloud SQL database admin username"
  default     = "uddadmin"
}

variable "db_password" {
  type        = string
  description = "Cloud SQL database admin password"
  sensitive   = true
}

# TODO: Re-enable when the load balancer module is restored.
# variable "ssl_domains" {
#   type        = list(string)
#   description = "Domains for the Google-managed SSL certificate"
#   default     = ["dev.udd.example.com"]
# }

# TODO: Re-enable when the monitoring module is restored.
# variable "alert_notification_email" {
#   type        = string
#   description = "Email address to receive monitoring alert notifications"
# }

# TODO: Re-enable when the monitoring module is restored.
# variable "cloud_run_url_suffix" {
#   type        = string
#   description = "The unique URL suffix appended by Cloud Run (e.g. abc123-ew.a.run.app)"
# }
