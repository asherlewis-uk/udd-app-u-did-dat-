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
  description = "GCP region where Cloud Run services are deployed"
  default     = "us-central1"
}

variable "api_cloud_run_service_name" {
  type        = string
  description = "Name of the api Cloud Run service"
}

variable "gateway_cloud_run_service_name" {
  type        = string
  description = "Name of the gateway Cloud Run service"
}

variable "ssl_domains" {
  type        = list(string)
  description = "Domains for the Google-managed SSL certificate"
}

variable "labels" {
  type        = map(string)
  description = "Labels to apply to load balancer resources"
  default     = {}
}
