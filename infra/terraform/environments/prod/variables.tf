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

variable "ssl_domains" {
  type        = list(string)
  description = "Domains for the Google-managed SSL certificate"
  default     = ["udd.example.com", "www.udd.example.com"]
}

variable "alert_notification_email" {
  type        = string
  description = "Email address to receive monitoring alert notifications"
}

variable "cloud_run_url_suffix" {
  type        = string
  description = "The unique URL suffix appended by Cloud Run (e.g. abc123-ew.a.run.app)"
}
