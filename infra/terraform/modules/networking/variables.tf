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

variable "control_plane_cidr" {
  type        = string
  description = "CIDR for the control-plane subnet"
  default     = "10.0.0.0/20"
}

variable "worker_plane_cidr" {
  type        = string
  description = "CIDR for the worker-plane subnet (isolated)"
  default     = "10.0.16.0/20"
}

variable "connector_cidr" {
  type        = string
  description = "/28 CIDR for the Serverless VPC Access connector (must not overlap subnets)"
  default     = "10.0.32.0/28"
}

variable "tags" {
  type        = map(string)
  description = "Labels to apply to resources"
  default     = {}
}
