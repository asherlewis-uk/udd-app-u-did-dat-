variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "name_prefix" {
  type        = string
  description = "Prefix for all resource names (e.g. udd-dev)"
}

variable "region" {
  type        = string
  description = "GCP region"
  default     = "us-central1"
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"
  default     = "dev"
}

variable "vpc_connector_id" {
  type        = string
  description = "Self-link of the Serverless VPC Access connector"
}

variable "artifact_registry_repo" {
  type        = string
  description = "Artifact Registry repository name"
  default     = "udd-images"
}

# Map of service name -> service account email
# Required keys: api, gateway, orchestrator, ai-orchestration,
#                collaboration, usage-meter, session-reaper, worker-manager
variable "service_account_emails" {
  type        = map(string)
  description = "Service account emails keyed by service name"
}

variable "scheduler_service_account_email" {
  type        = string
  description = "Service account email used by Cloud Scheduler to invoke Cloud Run Jobs"
}

variable "min_instances" {
  type        = number
  description = "Minimum number of Cloud Run instances (0 = scale-to-zero)"
  default     = 0
}

variable "max_instances" {
  type        = number
  description = "Maximum number of Cloud Run instances"
  default     = 10
}

variable "cpu_limit" {
  type        = string
  description = "CPU limit per Cloud Run container"
  default     = "1"
}

variable "memory_limit" {
  type        = string
  description = "Memory limit per Cloud Run container"
  default     = "512Mi"
}

variable "labels" {
  type        = map(string)
  description = "Labels to apply to all Cloud Run resources"
  default     = {}
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
