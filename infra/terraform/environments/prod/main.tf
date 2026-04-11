terraform {
  required_version = ">= 1.9.0"
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
  backend "gcs" {
    bucket = "udd-terraform-state-gcp"
    prefix = "prod/terraform.tfstate"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region

  default_labels = local.common_labels
}

locals {
  name_prefix   = "udd-prod"
  environment   = "prod"
  common_labels = {
    environment = "prod"
    project     = "udd-platform"
    managed_by  = "terraform"
  }
}

# ============================================================
# Networking
# ============================================================

module "networking" {
  source      = "../../modules/networking"
  project_id  = var.project_id
  name_prefix = local.name_prefix
  region      = var.region

  control_plane_cidr = "10.2.0.0/20"
  worker_plane_cidr  = "10.2.16.0/20"
  connector_cidr     = "10.2.32.0/28"
}

# ============================================================
# IAM
# ============================================================

module "iam" {
  source      = "../../modules/iam"
  project_id  = var.project_id
  name_prefix = local.name_prefix
}

# ============================================================
# Secrets
# ============================================================

module "secrets" {
  source      = "../../modules/secrets"
  project_id  = var.project_id
  name_prefix = local.name_prefix
}

# ============================================================
# Database — Cloud SQL db-custom-4-15360, REGIONAL HA + read replica
# ============================================================

module "database" {
  source      = "../../modules/database"
  project_id  = var.project_id
  name_prefix = local.name_prefix
  region      = var.region

  vpc_id                 = module.networking.vpc_id
  private_vpc_connection = module.networking.private_vpc_connection

  tier                     = "db-custom-4-15360"
  disk_size_gb             = 100
  disk_autoresize_limit_gb = 500
  availability_type        = "REGIONAL"
  deletion_protection      = true

  read_replica_tier = "db-custom-2-7680"

  db_username = var.db_username
  db_password = var.db_password

  labels = local.common_labels
}

# ============================================================
# Redis — Memorystore STANDARD_HA, 4 GB
# ============================================================

module "redis" {
  source      = "../../modules/redis"
  project_id  = var.project_id
  name_prefix = local.name_prefix
  region      = var.region

  vpc_id                 = module.networking.vpc_id
  private_vpc_connection = module.networking.private_vpc_connection

  tier           = "STANDARD_HA"
  memory_size_gb = 4

  labels = local.common_labels
}

# ============================================================
# Queues
# ============================================================

module "queues" {
  source      = "../../modules/queues"
  project_id  = var.project_id
  name_prefix = local.name_prefix
  labels      = local.common_labels
}

# ============================================================
# Storage
# ============================================================

module "storage" {
  source      = "../../modules/storage"
  project_id  = var.project_id
  name_prefix = local.name_prefix
  labels      = local.common_labels
}

# ============================================================
# Compute — min 2 instances, max 100
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

  min_instances = 2
  max_instances = 100
  cpu_limit     = "4"
  memory_limit  = "2Gi"

  labels = local.common_labels
}

# ============================================================
# Load Balancer
# ============================================================

module "loadbalancer" {
  source      = "../../modules/loadbalancer"
  project_id  = var.project_id
  name_prefix = local.name_prefix
  region      = var.region

  api_cloud_run_service_name     = "${local.name_prefix}-api"
  gateway_cloud_run_service_name = "${local.name_prefix}-gateway"

  ssl_domains = var.ssl_domains

  labels = local.common_labels

  depends_on = [module.compute]
}

# ============================================================
# Monitoring — uptime checks + alert policies
# ============================================================

module "monitoring" {
  source      = "../../modules/monitoring"
  project_id  = var.project_id
  name_prefix = local.name_prefix
  region      = var.region
  labels      = local.common_labels

  notification_email   = var.alert_notification_email
  error_rate_threshold = 0.01

  http_services = {
    api          = "https://${local.name_prefix}-api-${var.cloud_run_url_suffix}"
    gateway      = "https://${local.name_prefix}-gateway-${var.cloud_run_url_suffix}"
    orchestrator = "https://${local.name_prefix}-orchestrator-${var.cloud_run_url_suffix}"
  }

  depends_on = [module.compute]
}
