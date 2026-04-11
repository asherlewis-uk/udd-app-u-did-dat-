terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
}

# ============================================================
# Enable Cloud Storage API
# ============================================================

resource "google_project_service" "storage" {
  project            = var.project_id
  service            = "storage.googleapis.com"
  disable_on_destroy = false
}

# ============================================================
# Cloud Storage bucket
# - Versioning enabled
# - Uniform bucket-level access (no legacy ACLs)
# - Lifecycle rules for pipeline-runs/ and session-logs/
# - Encryption via Google-managed keys (CMEK can be added later)
# ============================================================

resource "google_storage_bucket" "main" {
  project                     = var.project_id
  name                        = "${var.name_prefix}-storage-${var.project_id}"
  location                    = var.location
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age            = 90
      matches_prefix = ["pipeline-runs/"]
    }
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age            = 30
      matches_prefix = ["session-logs/"]
    }
  }

  # Move noncurrent versions to Nearline after 30 days, delete after 90
  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
    condition {
      age                = 30
      num_newer_versions = 1
    }
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age                = 90
      num_newer_versions = 1
    }
  }

  labels = var.labels

  depends_on = [google_project_service.storage]
}
