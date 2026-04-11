variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "name_prefix" {
  type        = string
  description = "Prefix for the bucket name (e.g. udd-dev)"
}

variable "location" {
  type        = string
  description = "GCS bucket location (multi-region or region)"
  default     = "US"
}

variable "labels" {
  type        = map(string)
  description = "Labels to apply to the storage bucket"
  default     = {}
}
