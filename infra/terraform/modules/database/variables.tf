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

variable "vpc_id" {
  type        = string
  description = "Self-link of the VPC network for private IP"
}

# Dependency handle: pass google_service_networking_connection.private_vpc_connection.network
variable "private_vpc_connection" {
  type        = string
  description = "The private VPC connection network (used as an explicit depends_on handle)"
}

variable "tier" {
  type        = string
  description = "Cloud SQL machine tier (e.g. db-f1-micro, db-custom-2-7680)"
  default     = "db-f1-micro"
}

variable "disk_size_gb" {
  type        = number
  description = "Initial disk size in GB"
  default     = 20
}

variable "disk_autoresize_limit_gb" {
  type        = number
  description = "Maximum disk size for autoresize (0 = unlimited)"
  default     = 100
}

variable "availability_type" {
  type        = string
  description = "REGIONAL for HA, ZONAL for single-zone"
  default     = "ZONAL"

  validation {
    condition     = contains(["REGIONAL", "ZONAL"], var.availability_type)
    error_message = "availability_type must be REGIONAL or ZONAL"
  }
}

variable "db_name" {
  type        = string
  description = "Name of the database to create"
  default     = "udd"
}

variable "db_username" {
  type        = string
  description = "Database admin username"
}

variable "db_password" {
  type        = string
  description = "Database admin password"
  sensitive   = true
}

variable "deletion_protection" {
  type        = bool
  description = "Enable deletion protection on the Cloud SQL instance"
  default     = false
}

variable "read_replica_tier" {
  type        = string
  description = "Tier for the read replica. Empty string means no replica is created."
  default     = ""
}

variable "labels" {
  type        = map(string)
  description = "Labels to apply to the Cloud SQL instance"
  default     = {}
}
