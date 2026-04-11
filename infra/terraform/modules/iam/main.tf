terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
}

# ============================================================
# Service Accounts — one per service (least-privilege)
# ============================================================

locals {
  services = [
    "api",
    "gateway",
    "orchestrator",
    "ai-orchestration",
    "collaboration",
    "usage-meter",
    "session-reaper",
    "worker-manager",
    "scheduler",
  ]
}

resource "google_service_account" "services" {
  for_each = toset(local.services)

  project      = var.project_id
  account_id   = "${var.name_prefix}-${each.key}-sa"
  display_name = "UDD ${each.key} service account (${var.name_prefix})"
  description  = "Least-privilege service account for the ${each.key} service in ${var.name_prefix}"
}

# ============================================================
# Secret Manager IAM bindings
# api-service: secretAccessor
# ai-orchestration-service: secretAccessor + secretVersionManager
# ============================================================

resource "google_project_iam_member" "api_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.services["api"].email}"
}

resource "google_project_iam_member" "ai_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.services["ai-orchestration"].email}"
}

resource "google_project_iam_member" "ai_secret_version_manager" {
  project = var.project_id
  role    = "roles/secretmanager.secretVersionManager"
  member  = "serviceAccount:${google_service_account.services["ai-orchestration"].email}"
}

# ============================================================
# Cloud SQL Client role — services that need DB access
# ============================================================

resource "google_project_iam_member" "sql_client" {
  for_each = toset(["api", "orchestrator", "ai-orchestration", "usage-meter"])

  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.services[each.key].email}"
}

# ============================================================
# Pub/Sub Publisher — services that emit events
# ============================================================

resource "google_project_iam_member" "pubsub_publisher" {
  for_each = toset(["api", "gateway", "orchestrator", "ai-orchestration", "collaboration", "usage-meter"])

  project = var.project_id
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.services[each.key].email}"
}

# ============================================================
# Pub/Sub Subscriber — services that consume events
# ============================================================

resource "google_project_iam_member" "pubsub_subscriber" {
  for_each = toset(["orchestrator", "ai-orchestration", "usage-meter", "session-reaper", "worker-manager"])

  project = var.project_id
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.services[each.key].email}"
}

# ============================================================
# Cloud Storage Object Admin — for pipeline artefacts
# ============================================================

resource "google_project_iam_member" "storage_object_admin" {
  for_each = toset(["api", "orchestrator", "ai-orchestration"])

  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.services[each.key].email}"
}

# ============================================================
# Cloud Run Invoker — internal service-to-service calls
# ============================================================

resource "google_project_iam_member" "run_invoker" {
  for_each = toset(["api", "gateway", "orchestrator"])

  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.services[each.key].email}"
}

# Scheduler SA needs to invoke Cloud Run Jobs
resource "google_project_iam_member" "scheduler_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.services["scheduler"].email}"
}

# ============================================================
# Workload Identity Federation
# Allows Kubernetes service accounts (or CI/CD) to impersonate
# GCP service accounts without key files.
# ============================================================

resource "google_service_account_iam_binding" "workload_identity" {
  for_each = toset(local.services)

  service_account_id = google_service_account.services[each.key].name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    # GKE Workload Identity: cluster namespace/KSA
    "serviceAccount:${var.project_id}.svc.id.goog[${var.workload_identity_namespace}/${each.key}]",
  ]
}
