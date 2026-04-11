terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
}

# ============================================================
# Enable Cloud SQL API
# ============================================================

resource "google_project_service" "sql" {
  project            = var.project_id
  service            = "sql.googleapis.com"
  disable_on_destroy = false
}

# ============================================================
# Cloud SQL for PostgreSQL 16
# Uses Private Service Access (VPC peering) for private IP.
# ============================================================

resource "google_sql_database_instance" "main" {
  project             = var.project_id
  name                = "${var.name_prefix}-postgres"
  database_version    = "POSTGRES_16"
  region              = var.region
  deletion_protection = var.deletion_protection

  settings {
    tier              = var.tier
    disk_size         = var.disk_size_gb
    disk_type         = "PD_SSD"
    disk_autoresize   = true
    disk_autoresize_limit = var.disk_autoresize_limit_gb

    availability_type = var.availability_type  # REGIONAL (HA) or ZONAL

    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }

    maintenance_window {
      day          = 7  # Sunday
      hour         = 4
      update_track = "stable"
    }

    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = var.vpc_id
      enable_private_path_for_google_cloud_services = true
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = "1000"
    }

    database_flags {
      name  = "cloudsql.enable_pg_cron"
      value = "on"
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = false
    }

    user_labels = var.labels
  }

  depends_on = [
    google_project_service.sql,
    var.private_vpc_connection,
  ]
}

# Read replica (created only when var.read_replica_tier is non-empty)
resource "google_sql_database_instance" "read_replica" {
  count = var.read_replica_tier != "" ? 1 : 0

  project              = var.project_id
  name                 = "${var.name_prefix}-postgres-replica"
  database_version     = "POSTGRES_16"
  region               = var.region
  master_instance_name = google_sql_database_instance.main.name
  deletion_protection  = var.deletion_protection

  replica_configuration {
    failover_target = false
  }

  settings {
    tier      = var.read_replica_tier
    disk_type = "PD_SSD"
    disk_autoresize = true

    availability_type = "ZONAL"

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_id
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = "1000"
    }

    user_labels = var.labels
  }

  depends_on = [google_sql_database_instance.main]
}

# ============================================================
# Database + User
# ============================================================

resource "google_sql_database" "main" {
  project  = var.project_id
  instance = google_sql_database_instance.main.name
  name     = var.db_name
}

resource "google_sql_user" "main" {
  project  = var.project_id
  instance = google_sql_database_instance.main.name
  name     = var.db_username
  password = var.db_password
  type     = "BUILT_IN"
}
