terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
}

# ============================================================
# Secret Manager — enable the API
#
# Actual secrets are created at runtime by the application.
# This module ensures the API is enabled and exposes the
# project number for constructing IAM member strings.
# IAM bindings for individual service accounts are handled
# in the IAM module to avoid circular dependencies.
# ============================================================

resource "google_project_service" "secretmanager" {
  project            = var.project_id
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

# Data source to fetch project number (used downstream for IAM)
data "google_project" "main" {
  project_id = var.project_id
}
