variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "name_prefix" {
  type        = string
  description = "Prefix for all resource names (e.g. udd-dev)"
}

variable "labels" {
  type        = map(string)
  description = "Labels to apply to Pub/Sub resources"
  default     = {}
}
