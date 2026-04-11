terraform {
  required_version = ">= 1.9.0"
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
  backend "gcs" {
    bucket = "udd-terraform-state-gcp"
    prefix = "staging/terraform.tfstate"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region

  default_labels = local.common_labels
}

locals {
  name_prefix   = "udd-staging"
  environment   = "staging"
  common_labels = {
    environment = "staging"
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

  control_plane_cidr = "10.1.0.0/20"
  worker_plane_cidr  = "10.1.16.0/20"
  connector_cidr     = "10.1.32.0/28"
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
# Database — Cloud SQL db-custom-2-7680, REGIONAL HA
# ============================================================

module "database" {
  source      = "../../modules/database"
  project_id  = var.project_id
  name_prefix = local.name_prefix
  region      = var.region

  vpc_id                 = module.networking.vpc_id
  private_vpc_connection = module.networking.private_vpc_connection

  tier                     = "db-custom-2-7680"
  disk_size_gb             = 50
  disk_autoresize_limit_gb = 250
  availability_type        = "REGIONAL"
  deletion_protection      = true

  db_username = var.db_username
  db_password = var.db_password

  labels = local.common_labels
}

# ============================================================
# Redis — Memorystore STANDARD_HA, 2 GB
# ============================================================

module "redis" {
  source      = "../../modules/redis"
  project_id  = var.project_id
  name_prefix = local.name_prefix
  region      = var.region

  vpc_id                 = module.networking.vpc_id
  private_vpc_connection = module.networking.private_vpc_connection

  tier           = "STANDARD_HA"
  memory_size_gb = 2

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
# Compute — min 1 instance (no cold starts in staging)
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

  min_instances = 1
  max_instances = 20
  cpu_limit     = "2"
  memory_limit  = "1Gi"

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
