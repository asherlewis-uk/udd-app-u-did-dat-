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

# ---- Pusher (collaboration service) ----

variable "pusher_app_id" {
  type        = string
  description = "Pusher application ID for realtime events"
}

variable "pusher_key" {
  type        = string
  description = "Pusher application key"
}

variable "pusher_secret" {
  type        = string
  description = "Pusher application secret"
  sensitive   = true
}

variable "pusher_cluster" {
  type        = string
  description = "Pusher cluster region (e.g. us2, eu, ap1)"
}

variable "ssl_domains" {
  type        = list(string)
  description = <<-EOT
    Domains on the Google-managed SSL certificate attached to the global HTTPS
    load balancer. Only domains that actually resolve to the LB IP will finish
    provisioning; others stay in PROVISIONING indefinitely.

    Hardened-v1 canonical: `api.asherlewis.org` is the public API + gateway
    host (gateway is path-routed under `/preview/*` behind this same host).
    `app.asherlewis.org` is the canonical web origin but is NOT added here
    until a web-deploy target exists — adding it before DNS resolves would
    block cert provisioning.
  EOT
  default     = ["api.asherlewis.org"]
}

variable "alert_notification_email" {
  type        = string
  description = "Email address to receive monitoring alert notifications"
}

variable "cloud_run_url_suffix" {
  type        = string
  description = "The unique URL suffix appended by Cloud Run (e.g. abc123-ew.a.run.app)"
}
