variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "name_prefix" {
  type        = string
  description = "Prefix for resource names (e.g. udd-dev) — reserved for future use"
}

variable "labels" {
  type        = map(string)
  description = "Labels — reserved for future use"
  default     = {}
}
