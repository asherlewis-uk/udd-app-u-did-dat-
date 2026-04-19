terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
}

# ============================================================
# Enable Cloud Run API
# ============================================================

resource "google_project_service" "run" {
  project            = var.project_id
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

# ============================================================
# Control-plane Cloud Run services
# All services route through the VPC connector for private
# access to Cloud SQL, Memorystore, and internal services.
# ============================================================

locals {
  api_service = {
    port        = 8080
    public      = true
    description = "UDD REST API — public-facing"
  }
}

locals {
  orchestrator_service = {
    port        = 3002
    public      = false
    description = "Session orchestration — internal only"
  }
}

locals {
  gateway_service = {
    port        = 3000
    public      = true
    description = "UDD Gateway — public-facing, preview proxying"
  }
}

locals {
  ai_orchestration_service = {
    port        = 8080
    public      = false
    description = "AI pipeline orchestration — internal only"
  }
}

locals {
  usage_meter_service = {
    port        = 3006
    public      = false
    description = "Usage metering and billing events — internal only"
  }
}

locals {
  collaboration_service = {
    port        = 3003
    public      = false
    description = "Collaboration and commenting — internal only"
  }
}

resource "google_cloud_run_v2_service" "gateway" {
  project  = var.project_id
  name     = "${var.name_prefix}-gateway"
  location = var.region

  description = local.gateway_service.description

  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = var.service_account_emails["gateway"]

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "ALL_TRAFFIC"
    }

    containers {
      name  = "gateway"
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/gateway:latest"

      ports {
        container_port = local.gateway_service.port
      }

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      env {
        name  = "NODE_ENV"
        value = var.environment
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "GCP_REGION"
        value = var.region
      }
      env {
        name  = "API_BASE_URL"
        value = google_cloud_run_v2_service.api.uri
      }
    }

    labels = var.labels
  }

  labels = var.labels

  depends_on = [google_project_service.run]
}

resource "google_cloud_run_v2_service" "api" {
  project  = var.project_id
  name     = "${var.name_prefix}-api"
  location = var.region

  description = local.api_service.description

  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = var.service_account_emails["api"]

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "ALL_TRAFFIC"
    }

    containers {
      name  = "api"
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/api:latest"

      ports {
        container_port = local.api_service.port
      }

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      env {
        name  = "NODE_ENV"
        value = var.environment
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "GCP_REGION"
        value = var.region
      }
      env {
        name  = "AI_ORCHESTRATION_BASE_URL"
        value = google_cloud_run_v2_service.ai_orchestration.uri
      }
      env {
        name  = "ORCHESTRATOR_BASE_URL"
        value = google_cloud_run_v2_service.orchestrator.uri
      }
      env {
        name  = "COLLABORATION_BASE_URL"
        value = google_cloud_run_v2_service.collaboration.uri
      }
      env {
        name  = "WORKER_MANAGER_BASE_URL"
        value = google_cloud_run_v2_service.worker_manager.uri
      }
      env {
        name  = "USAGE_METER_BASE_URL"
        value = google_cloud_run_v2_service.usage_meter.uri
      }
      env {
        name  = "GATEWAY_BASE_URL"
        value = google_cloud_run_v2_service.gateway.uri
      }
    }

    labels = var.labels
  }

  labels = var.labels

  depends_on = [google_project_service.run]
}

resource "google_cloud_run_v2_service" "orchestrator" {
  project  = var.project_id
  name     = "${var.name_prefix}-orchestrator"
  location = var.region

  description = local.orchestrator_service.description

  ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    service_account = var.service_account_emails["orchestrator"]

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "ALL_TRAFFIC"
    }

    containers {
      name  = "orchestrator"
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/orchestrator:latest"

      ports {
        container_port = local.orchestrator_service.port
      }

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      env {
        name  = "NODE_ENV"
        value = var.environment
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "GCP_REGION"
        value = var.region
      }
    }

    labels = var.labels
  }

  labels = var.labels

  depends_on = [google_project_service.run]
}

resource "google_cloud_run_v2_service" "usage_meter" {
  project  = var.project_id
  name     = "${var.name_prefix}-usage-meter"
  location = var.region

  description = local.usage_meter_service.description

  ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    service_account = var.service_account_emails["usage-meter"]

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "ALL_TRAFFIC"
    }

    containers {
      name  = "usage-meter"
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/usage-meter:latest"

      ports {
        container_port = local.usage_meter_service.port
      }

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      env {
        name  = "NODE_ENV"
        value = var.environment
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "GCP_REGION"
        value = var.region
      }
    }

    labels = var.labels
  }

  labels = var.labels

  depends_on = [google_project_service.run]
}

resource "google_cloud_run_v2_service" "ai_orchestration" {
  project  = var.project_id
  name     = "${var.name_prefix}-ai-orchestration"
  location = var.region

  description = local.ai_orchestration_service.description

  ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    service_account = var.service_account_emails["ai-orchestration"]

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "ALL_TRAFFIC"
    }

    containers {
      name  = "ai-orchestration"
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/ai-orchestration:latest"

      ports {
        container_port = local.ai_orchestration_service.port
      }

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      env {
        name  = "NODE_ENV"
        value = var.environment
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "GCP_REGION"
        value = var.region
      }
    }

    labels = var.labels
  }

  labels = var.labels

  depends_on = [google_project_service.run]
}

resource "google_cloud_run_v2_service" "collaboration" {
  project  = var.project_id
  name     = "${var.name_prefix}-collaboration"
  location = var.region

  description = local.collaboration_service.description

  ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    service_account = var.service_account_emails["collaboration"]

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "ALL_TRAFFIC"
    }

    containers {
      name  = "collaboration"
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/collaboration:latest"

      ports {
        container_port = local.collaboration_service.port
      }

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      env {
        name  = "NODE_ENV"
        value = var.environment
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "GCP_REGION"
        value = var.region
      }
      env {
        name  = "PUSHER_APP_ID"
        value = var.pusher_app_id
      }
      env {
        name  = "PUSHER_KEY"
        value = var.pusher_key
      }
      env {
        name  = "PUSHER_SECRET"
        value = var.pusher_secret
      }
      env {
        name  = "PUSHER_CLUSTER"
        value = var.pusher_cluster
      }
    }

    labels = var.labels
  }

  labels = var.labels

  depends_on = [google_project_service.run]
}

resource "google_cloud_run_v2_service_iam_member" "gateway_public_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.gateway.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "api_public_invoker" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ============================================================
# Worker-plane Cloud Run resources (Jobs + Services)
# ============================================================

resource "google_cloud_run_v2_job" "session_reaper" {
  project  = var.project_id
  name     = "${var.name_prefix}-session-reaper"
  location = var.region

  labels = var.labels

  template {
    template {
      service_account = var.service_account_emails["session-reaper"]

      vpc_access {
        connector = var.vpc_connector_id
        egress    = "ALL_TRAFFIC"
      }

      containers {
        name  = "session-reaper"
        image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/session-reaper:latest"

        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }

        env {
          name  = "GCP_PROJECT_ID"
          value = var.project_id
        }
        env {
          name  = "GCP_REGION"
          value = var.region
        }
      }
    }
  }

  depends_on = [google_project_service.run]
}

resource "google_cloud_run_v2_service" "worker_manager" {
  project  = var.project_id
  name     = "${var.name_prefix}-worker-manager"
  location = var.region

  description = "Worker lifecycle management — internal only"

  ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  template {
    service_account = var.service_account_emails["worker-manager"]

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    vpc_access {
      connector = var.vpc_connector_id
      egress    = "ALL_TRAFFIC"
    }

    containers {
      name  = "worker-manager"
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/worker-manager:latest"

      ports {
        container_port = 3005
      }

      resources {
        limits = {
          cpu    = var.cpu_limit
          memory = var.memory_limit
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }

      env {
        name  = "NODE_ENV"
        value = var.environment
      }
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "GCP_REGION"
        value = var.region
      }
    }

    labels = var.labels
  }

  labels = var.labels

  depends_on = [google_project_service.run]
}

# ============================================================
# Cloud Scheduler — trigger session-reaper on a schedule
# ============================================================

resource "google_project_service" "cloudscheduler" {
  project            = var.project_id
  service            = "cloudscheduler.googleapis.com"
  disable_on_destroy = false
}

resource "google_cloud_scheduler_job" "session_reaper" {
  project          = var.project_id
  name             = "${var.name_prefix}-session-reaper-schedule"
  region           = var.region
  description      = "Trigger session-reaper Cloud Run Job every 5 minutes"
  schedule         = "*/5 * * * *"
  time_zone        = "UTC"
  attempt_deadline = "320s"

  http_target {
    http_method = "POST"
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.session_reaper.name}:run"

    oauth_token {
      service_account_email = var.scheduler_service_account_email
    }
  }

  depends_on = [
    google_project_service.cloudscheduler,
    google_cloud_run_v2_job.session_reaper,
  ]
}
