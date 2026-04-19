terraform {
  required_version = ">= 1.9.0"
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
  backend "gcs" {
    bucket = "udd-terraform-state-gcp"
    prefix = "dev/terraform.tfstate"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region

  default_labels = local.common_labels
}

locals {
  name_prefix   = "udd-dev"
  environment   = "dev"
  common_labels = {
    environment = "dev"
    project     = "udd-platform"
    managed_by  = "terraform"
  }
}

# ============================================================
# Networking — VPC, subnets, VPC Access connector, PSC
# ============================================================

module "networking" {
  source      = "../../modules/networking"
  project_id  = var.project_id
  name_prefix = local.name_prefix
  region      = var.region

  # dev uses default CIDRs (10.0.0.0/20, 10.0.16.0/20, connector /28)
}

# ============================================================
# IAM — service accounts + bindings + Workload Identity
# ============================================================

module "iam" {
  source      = "../../modules/iam"
  project_id  = var.project_id
  name_prefix = local.name_prefix
}

# ============================================================
# Secrets — enable Secret Manager API
# ============================================================

module "secrets" {
  source      = "../../modules/secrets"
  project_id  = var.project_id
  name_prefix = local.name_prefix
}

# ============================================================
# Database — Cloud SQL PostgreSQL 16 (ZONAL, db-f1-micro)
# ============================================================

module "database" {
  source      = "../../modules/database"
  project_id  = var.project_id
  name_prefix = local.name_prefix
  region      = var.region

  vpc_id                 = module.networking.vpc_id
  private_vpc_connection = module.networking.private_vpc_connection

  tier              = "db-f1-micro"
  disk_size_gb      = 20
  availability_type = "ZONAL"
  deletion_protection = false

  db_username = var.db_username
  db_password = var.db_password

  labels = local.common_labels
}

# ============================================================
# Redis — Memorystore BASIC tier, 1 GB
# ============================================================

module "redis" {
  source      = "../../modules/redis"
  project_id  = var.project_id
  name_prefix = local.name_prefix
  region      = var.region

  vpc_id                 = module.networking.vpc_id
  private_vpc_connection = module.networking.private_vpc_connection

  tier           = "BASIC"
  memory_size_gb = 1

  labels = local.common_labels
}

# ============================================================
# Queues — Pub/Sub topics + subscriptions
# ============================================================

module "queues" {
  source      = "../../modules/queues"
  project_id  = var.project_id
  name_prefix = local.name_prefix
  labels      = local.common_labels
}

# ============================================================
# Storage — Cloud Storage bucket
# ============================================================

module "storage" {
  source      = "../../modules/storage"
  project_id  = var.project_id
  name_prefix = local.name_prefix
  labels      = local.common_labels
}

# ============================================================
# Compute — Cloud Run services + jobs (scale-to-zero in dev)
# ============================================================

module "compute" {
  source      = "../../modules/compute"
  project_id  = var.project_id
  name_prefix = local.name_prefix
  region      = var.region
  environment = local.environment

  vpc_connector_id = module.networking.vpc_connector_id

  service_account_emails          = module.iam.service_account_emails
  scheduler_service_account_email = module.iam.scheduler_service_account_email

  min_instances = 0   # scale-to-zero in dev
  max_instances = 10

  pusher_app_id  = var.pusher_app_id
  pusher_key     = var.pusher_key
  pusher_secret  = var.pusher_secret
  pusher_cluster = var.pusher_cluster

  labels = local.common_labels
}

# ============================================================
# Load Balancer — global HTTPS LB with serverless NEGs
# ============================================================

# TODO: Re-enable the load balancer module after the api and gateway
# Cloud Run services are restored with published Artifact Registry images.
#
# module "loadbalancer" {
#   source      = "../../modules/loadbalancer"
#   project_id  = var.project_id
#   name_prefix = local.name_prefix
#   region      = var.region
#
#   api_cloud_run_service_name     = "${local.name_prefix}-api"
#   gateway_cloud_run_service_name = "${local.name_prefix}-gateway"
#
#   ssl_domains = var.ssl_domains
#
#   labels = local.common_labels
#
#   depends_on = [module.compute]
# }

# ============================================================
# Monitoring — uptime checks + alert policies
# ============================================================

# TODO: Re-enable the monitoring module after the control-plane Cloud Run
# services (api, gateway, orchestrator) are restored with published images.
#
# module "monitoring" {
#   source      = "../../modules/monitoring"
#   project_id  = var.project_id
#   name_prefix = local.name_prefix
#   region      = var.region
#   labels      = local.common_labels
#
#   notification_email   = var.alert_notification_email
#   error_rate_threshold = 0.05
#
#   http_services = {
#     api       = "https://${local.name_prefix}-api-${var.cloud_run_url_suffix}"
#     gateway   = "https://${local.name_prefix}-gateway-${var.cloud_run_url_suffix}"
#     orchestrator = "https://${local.name_prefix}-orchestrator-${var.cloud_run_url_suffix}"
#   }
#
#   depends_on = [module.compute]
# }
