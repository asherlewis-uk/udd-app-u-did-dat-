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

# TODO: Re-enable the control-plane Cloud Run services (api, gateway,
# orchestrator, collaboration, usage-meter) after publishing their images
# to Artifact Registry. Dockerfiles exist in apps/<service>/Dockerfile.
# locals {
#   control_plane_services = {
#     api = {
#       port         = 8080
#       public       = true
#       description  = "UDD REST API — public-facing"
#     }
#     gateway = {
#       port         = 3000
#       public       = true
#       description  = "UDD Gateway — public-facing, preview proxying"
#     }
#     orchestrator = {
#       port         = 3002
#       public       = false
#       description  = "Session orchestration — internal only"
#     }
#     collaboration = {
#       port         = 3003
#       public       = false
#       description  = "Real-time collaboration service — internal only"
#     }
#     usage-meter = {
#       port         = 3006
#       public       = false
#       description  = "Usage metering and billing events — internal only"
#     }
#   }
# }

locals {
  ai_orchestration_service = {
    port        = 8080
    public      = false
    description = "AI pipeline orchestration — internal only"
  }
}

# TODO: Re-enable the control-plane Cloud Run services (api, gateway,
# orchestrator, collaboration, usage-meter) after publishing their images
# to Artifact Registry. Dockerfiles exist in apps/<service>/Dockerfile.
# resource "google_cloud_run_v2_service" "control_plane" {
#   for_each = local.control_plane_services
#
#   project  = var.project_id
#   name     = "${var.name_prefix}-${each.key}"
#   location = var.region
#
#   description = each.value.description
#
#   ingress = each.value.public ? "INGRESS_TRAFFIC_ALL" : "INGRESS_TRAFFIC_INTERNAL_ONLY"
#
#   template {
#     service_account = var.service_account_emails[each.key]
#
#     scaling {
#       min_instance_count = var.min_instances
#       max_instance_count = var.max_instances
#     }
#
#     vpc_access {
#       connector = var.vpc_connector_id
#       egress    = "ALL_TRAFFIC"
#     }
#
#     containers {
#       name  = each.key
#       image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/${each.key}:latest"
#
#       ports {
#         container_port = each.value.port
#       }
#
#       resources {
#         limits = {
#           cpu    = var.cpu_limit
#           memory = var.memory_limit
#         }
#         cpu_idle          = true
#         startup_cpu_boost = true
#       }
#
#       env {
#         name  = "NODE_ENV"
#         value = var.environment
#       }
#       env {
#         name  = "GCP_PROJECT_ID"
#         value = var.project_id
#       }
#       env {
#         name  = "GCP_REGION"
#         value = var.region
#       }
#
#       # Service discovery — wire cross-service URLs where needed
#       dynamic "env" {
#         for_each = each.key == "api" ? [1] : []
#         content {
#           name  = "AI_ORCHESTRATION_BASE_URL"
#           value = google_cloud_run_v2_service.ai_orchestration.uri
#         }
#       }
#     }
#
#     labels = var.labels
#   }
#
#   labels = var.labels
#
#   depends_on = [google_project_service.run]
# }

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

# TODO: Re-enable the control-plane Cloud Run services (api, gateway,
# orchestrator, collaboration, usage-meter) after publishing their images
# to Artifact Registry. Dockerfiles exist in apps/<service>/Dockerfile.
# # Allow unauthenticated access for public-facing services (api, gateway)
# # Internal services require Identity token authentication
# resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
#   for_each = {
#     for k, v in local.control_plane_services : k => v if v.public
#   }
#
#   project  = var.project_id
#   location = var.region
#   name     = google_cloud_run_v2_service.control_plane[each.key].name
#   role     = "roles/run.invoker"
#   member   = "allUsers"
# }

# ============================================================
# Worker-plane Cloud Run resources (Jobs + Services)
# ============================================================

# TODO: Re-enable the session-reaper Cloud Run Job after publishing the
# session-reaper image to Artifact Registry.
# resource "google_cloud_run_v2_job" "session_reaper" {
#   project  = var.project_id
#   name     = "${var.name_prefix}-session-reaper"
#   location = var.region
#
#   labels = var.labels
#
#   template {
#     template {
#       service_account = var.service_account_emails["session-reaper"]
#
#       vpc_access {
#         connector = var.vpc_connector_id
#         egress    = "ALL_TRAFFIC"
#       }
#
#       containers {
#         name  = "session-reaper"
#         image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.artifact_registry_repo}/session-reaper:latest"
#
#         resources {
#           limits = {
#             cpu    = "1"
#             memory = "512Mi"
#           }
#         }
#
#         env {
#           name  = "GCP_PROJECT_ID"
#           value = var.project_id
#         }
#         env {
#           name  = "GCP_REGION"
#           value = var.region
#         }
#       }
#     }
#   }
#
#   depends_on = [google_project_service.run]
# }

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

# TODO: Re-enable the scheduler once the session-reaper Cloud Run Job is
# restored with a published Artifact Registry image.
# resource "google_cloud_scheduler_job" "session_reaper" {
#   project          = var.project_id
#   name             = "${var.name_prefix}-session-reaper-schedule"
#   region           = var.region
#   description      = "Trigger session-reaper Cloud Run Job every 5 minutes"
#   schedule         = "*/5 * * * *"
#   time_zone        = "UTC"
#   attempt_deadline = "320s"
#
#   http_target {
#     http_method = "POST"
#     uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.session_reaper.name}:run"
#
#     oauth_token {
#       service_account_email = var.scheduler_service_account_email
#     }
#   }
#
#   depends_on = [
#     google_project_service.cloudscheduler,
#     google_cloud_run_v2_job.session_reaper,
#   ]
# }
