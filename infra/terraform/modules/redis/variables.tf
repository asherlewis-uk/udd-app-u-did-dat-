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
  description = "Self-link of the VPC network (authorized network for Memorystore)"
}

# Dependency handle: pass google_service_networking_connection.private_vpc_connection.network
variable "private_vpc_connection" {
  type        = string
  description = "The private VPC connection network (used as an explicit depends_on handle)"
}

variable "tier" {
  type        = string
  description = "Memorystore tier: BASIC (no replication) or STANDARD_HA (replicated)"
  default     = "BASIC"

  validation {
    condition     = contains(["BASIC", "STANDARD_HA"], var.tier)
    error_message = "tier must be BASIC or STANDARD_HA"
  }
}

variable "memory_size_gb" {
  type        = number
  description = "Redis instance memory size in GB"
  default     = 1
}

variable "labels" {
  type        = map(string)
  description = "Labels to apply to the Redis instance"
  default     = {}
}
