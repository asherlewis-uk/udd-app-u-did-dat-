variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "name_prefix" {
  description = "Resource name prefix (e.g. udd-dev, udd-staging, udd-prod)"
  type        = string
}

variable "region" {
  description = "GCP region where Cloud Run services are deployed"
  type        = string
}

variable "notification_email" {
  description = "Email address for alert notifications"
  type        = string
}

variable "labels" {
  description = "Labels to apply to all monitoring resources"
  type        = map(string)
  default     = {}
}

# Services that expose an HTTP /ready endpoint
variable "http_services" {
  description = "Map of service name to its Cloud Run base URL (without path)"
  type        = map(string)
  # e.g. { api = "https://udd-dev-api-xyz-ew.a.run.app" }
}

# 5xx error rate threshold that triggers an alert (0.0 – 1.0)
variable "error_rate_threshold" {
  description = "Fraction of 5xx responses that triggers the alert policy"
  type        = number
  default     = 0.05
}
