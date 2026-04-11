terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
}

# ============================================================
# Enable required APIs
# ============================================================

resource "google_project_service" "compute" {
  project            = var.project_id
  service            = "compute.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "vpcaccess" {
  project            = var.project_id
  service            = "vpcaccess.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "servicenetworking" {
  project            = var.project_id
  service            = "servicenetworking.googleapis.com"
  disable_on_destroy = false
}

# ============================================================
# VPC network
# Control plane Cloud Run services use Serverless VPC Access
# Cloud SQL and Memorystore live on the private VPC range
# ============================================================

resource "google_compute_network" "main" {
  project                 = var.project_id
  name                    = "${var.name_prefix}-vpc"
  auto_create_subnetworks = false
  description             = "UDD Platform VPC — ${var.name_prefix}"

  depends_on = [google_project_service.compute]
}

# Control-plane subnet (Cloud Run VPC Access connector lives here)
resource "google_compute_subnetwork" "control_plane" {
  project                  = var.project_id
  name                     = "${var.name_prefix}-subnet-control-plane"
  network                  = google_compute_network.main.id
  region                   = var.region
  ip_cidr_range            = var.control_plane_cidr
  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Worker-plane subnet (isolated — no direct internet)
resource "google_compute_subnetwork" "worker_plane" {
  project                  = var.project_id
  name                     = "${var.name_prefix}-subnet-worker-plane"
  network                  = google_compute_network.main.id
  region                   = var.region
  ip_cidr_range            = var.worker_plane_cidr
  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# ============================================================
# Cloud Router + NAT (outbound internet for Cloud Run via VPC)
# ============================================================

resource "google_compute_router" "main" {
  project = var.project_id
  name    = "${var.name_prefix}-router"
  network = google_compute_network.main.id
  region  = var.region
}

resource "google_compute_router_nat" "main" {
  project                            = var.project_id
  name                               = "${var.name_prefix}-nat"
  router                             = google_compute_router.main.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# ============================================================
# Serverless VPC Access Connector
# Allows Cloud Run services to reach Cloud SQL, Memorystore
# ============================================================

resource "google_vpc_access_connector" "main" {
  project        = var.project_id
  name           = "${var.name_prefix}-vpc-connector"
  region         = var.region
  network        = google_compute_network.main.id
  ip_cidr_range  = var.connector_cidr
  min_instances  = 2
  max_instances  = 10
  machine_type   = "e2-micro"

  depends_on = [
    google_project_service.vpcaccess,
    google_compute_subnetwork.control_plane,
  ]
}

# ============================================================
# Private Service Connect — reserved range for Cloud SQL /
# Memorystore (Private Service Access)
# ============================================================

resource "google_compute_global_address" "private_service_range" {
  project       = var.project_id
  name          = "${var.name_prefix}-private-svc-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 20
  network       = google_compute_network.main.id

  depends_on = [google_project_service.compute]
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_range.name]

  depends_on = [google_project_service.servicenetworking]
}

# ============================================================
# Firewall rules
# ============================================================

# Allow health-check probes from Google LB ranges
resource "google_compute_firewall" "allow_health_checks" {
  project = var.project_id
  name    = "${var.name_prefix}-fw-allow-health-checks"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443", "3000", "3001"]
  }

  source_ranges = ["35.191.0.0/16", "130.211.0.0/22"]
  target_tags   = ["udd-control-plane"]
  description   = "Allow Google LB health-check probes"
}

# Allow internal traffic within VPC
resource "google_compute_firewall" "allow_internal" {
  project = var.project_id
  name    = "${var.name_prefix}-fw-allow-internal"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }
  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }
  allow {
    protocol = "icmp"
  }

  source_ranges = [var.control_plane_cidr, var.worker_plane_cidr, var.connector_cidr]
  description   = "Allow internal VPC traffic"
}

# Preview port range — connector/VPC to worker plane only
resource "google_compute_firewall" "allow_preview_ports" {
  project = var.project_id
  name    = "${var.name_prefix}-fw-allow-preview-ports"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["32000-33000"]
  }

  source_ranges = [var.connector_cidr, var.control_plane_cidr]
  target_tags   = ["udd-worker-plane"]
  description   = "Preview port range — gateway (via connector) to worker plane only"
}
