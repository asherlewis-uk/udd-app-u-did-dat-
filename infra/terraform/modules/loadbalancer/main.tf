terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
}

# ============================================================
# Global HTTPS Application Load Balancer
# Routes external traffic to Cloud Run via Serverless NEGs.
#
# Topology:
#   Internet → Global Forwarding Rule (443/80)
#            → Target HTTPS/HTTP Proxy
#            → URL Map
#            → Backend Service → Serverless NEG → Cloud Run
#
# /preview/* routes → gateway Cloud Run service
# /* (default)     → api Cloud Run service
#
# Hardened-v1 canonical hosts (see docs/ENV_CONTRACT.md):
#   - prod API host:     api.asherlewis.org     (this LB)
#   - staging API host:  staging-api.asherlewis.org
#   - web origin:        app.asherlewis.org     (NOT this LB; web deploy
#                        target TBD — see docs/implementation-gaps.md)
#
# URL map hosts = ["*"] is intentional: only hostnames that actually DNS
# to `google_compute_global_address.lb_ip` reach this LB, and path routing
# (api default + /preview/* → gateway) is uniform across them.
# ============================================================

# ---- Serverless NEGs (one per Cloud Run service) -----------

resource "google_compute_region_network_endpoint_group" "api" {
  project               = var.project_id
  name                  = "${var.name_prefix}-neg-api"
  network_endpoint_type = "SERVERLESS"
  region                = var.region

  cloud_run {
    service = var.api_cloud_run_service_name
  }
}

resource "google_compute_region_network_endpoint_group" "gateway" {
  project               = var.project_id
  name                  = "${var.name_prefix}-neg-gateway"
  network_endpoint_type = "SERVERLESS"
  region                = var.region

  cloud_run {
    service = var.gateway_cloud_run_service_name
  }
}

# ---- Backend Services --------------------------------------

resource "google_compute_backend_service" "api" {
  project               = var.project_id
  name                  = "${var.name_prefix}-backend-api"
  description           = "Backend for UDD API Cloud Run service"
  protocol              = "HTTPS"
  port_name             = "https"
  timeout_sec           = 30
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group = google_compute_region_network_endpoint_group.api.id
  }

  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

resource "google_compute_backend_service" "gateway" {
  project               = var.project_id
  name                  = "${var.name_prefix}-backend-gateway"
  description           = "Backend for UDD Gateway Cloud Run service"
  protocol              = "HTTPS"
  port_name             = "https"
  timeout_sec           = 30
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group = google_compute_region_network_endpoint_group.gateway.id
  }

  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

# ---- URL Map -----------------------------------------------

resource "google_compute_url_map" "main" {
  project         = var.project_id
  name            = "${var.name_prefix}-url-map"
  description     = "UDD Platform global HTTPS load balancer URL map"
  default_service = google_compute_backend_service.api.id

  host_rule {
    hosts        = ["*"]
    path_matcher = "udd-paths"
  }

  path_matcher {
    name            = "udd-paths"
    default_service = google_compute_backend_service.api.id

    path_rule {
      paths   = ["/preview", "/preview/*"]
      service = google_compute_backend_service.gateway.id
    }
  }
}

# ---- HTTP → HTTPS redirect map -----------------------------

resource "google_compute_url_map" "redirect_http" {
  project = var.project_id
  name    = "${var.name_prefix}-url-map-http-redirect"

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

# ---- SSL Certificate (managed) -----------------------------

resource "google_compute_managed_ssl_certificate" "main" {
  project = var.project_id
  name    = "${var.name_prefix}-ssl-cert"

  managed {
    domains = var.ssl_domains
  }
}

# ---- HTTPS Target Proxy + Forwarding Rule ------------------

resource "google_compute_target_https_proxy" "main" {
  project          = var.project_id
  name             = "${var.name_prefix}-https-proxy"
  url_map          = google_compute_url_map.main.id
  ssl_certificates = [google_compute_managed_ssl_certificate.main.id]
}

resource "google_compute_global_forwarding_rule" "https" {
  project               = var.project_id
  name                  = "${var.name_prefix}-fw-rule-https"
  description           = "Global HTTPS forwarding rule for UDD Platform"
  target                = google_compute_target_https_proxy.main.id
  port_range            = "443"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  ip_address            = google_compute_global_address.lb_ip.address
}

# ---- HTTP Target Proxy + Forwarding Rule (redirect) --------

resource "google_compute_target_http_proxy" "redirect" {
  project = var.project_id
  name    = "${var.name_prefix}-http-proxy-redirect"
  url_map = google_compute_url_map.redirect_http.id
}

resource "google_compute_global_forwarding_rule" "http_redirect" {
  project               = var.project_id
  name                  = "${var.name_prefix}-fw-rule-http-redirect"
  description           = "HTTP → HTTPS redirect"
  target                = google_compute_target_http_proxy.redirect.id
  port_range            = "80"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  ip_address            = google_compute_global_address.lb_ip.address
}

# ---- Static Global IP Address ------------------------------

resource "google_compute_global_address" "lb_ip" {
  project      = var.project_id
  name         = "${var.name_prefix}-lb-ip"
  address_type = "EXTERNAL"
  ip_version   = "IPV4"
  description  = "Static IP for UDD Platform global load balancer"
}
