output "lb_ip_address" {
  description = "Static global IP address of the load balancer"
  value       = google_compute_global_address.lb_ip.address
}

output "lb_ip_name" {
  description = "Resource name of the static global IP address"
  value       = google_compute_global_address.lb_ip.name
}

output "ssl_certificate_name" {
  description = "Name of the Google-managed SSL certificate"
  value       = google_compute_managed_ssl_certificate.main.name
}

output "url_map_name" {
  description = "Name of the HTTPS URL map"
  value       = google_compute_url_map.main.name
}

output "api_backend_service_name" {
  description = "Name of the api backend service"
  value       = google_compute_backend_service.api.name
}

output "gateway_backend_service_name" {
  description = "Name of the gateway backend service"
  value       = google_compute_backend_service.gateway.name
}
