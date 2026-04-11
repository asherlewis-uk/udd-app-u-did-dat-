terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
}

# ============================================================
# Enable Memorystore (Redis) API
# ============================================================

resource "google_project_service" "redis" {
  project            = var.project_id
  service            = "redis.googleapis.com"
  disable_on_destroy = false
}

# ============================================================
# Memorystore for Redis 7
# Uses Private Service Access — no public IP.
# ============================================================

resource "google_redis_instance" "main" {
  project            = var.project_id
  name               = "${var.name_prefix}-redis"
  region             = var.region
  tier               = var.tier          # BASIC or STANDARD_HA
  memory_size_gb     = var.memory_size_gb
  redis_version      = "REDIS_7_0"
  display_name       = "UDD Platform Redis — ${var.name_prefix}"
  auth_enabled       = true
  transit_encryption_mode = "SERVER_AUTHENTICATION"

  authorized_network = var.vpc_id

  # Bind to the reserved Private Service Access IP range (same VPC peering used by Cloud SQL)
  connect_mode = "PRIVATE_SERVICE_ACCESS"

  redis_configs = {
    "maxmemory-policy" = "allkeys-lru"
  }

  labels = var.labels

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 4
        minutes = 0
        seconds = 0
        nanos   = 0
      }
    }
  }

  depends_on = [
    google_project_service.redis,
    var.private_vpc_connection,
  ]
}
