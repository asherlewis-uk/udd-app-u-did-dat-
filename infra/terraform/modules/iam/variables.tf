variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "name_prefix" {
  type        = string
  description = "Prefix for service account IDs (e.g. udd-dev)"
}

variable "workload_identity_namespace" {
  type        = string
  description = "Kubernetes namespace for Workload Identity bindings (e.g. udd-system)"
  default     = "udd-system"
}

variable "labels" {
  type        = map(string)
  description = "Labels — reserved for future use"
  default     = {}
}
