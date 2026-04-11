output "vpc_id" {
  description = "Self-link of the VPC network"
  value       = google_compute_network.main.id
}

output "vpc_name" {
  description = "Name of the VPC network"
  value       = google_compute_network.main.name
}

output "control_plane_subnet_id" {
  description = "Self-link of the control-plane subnet"
  value       = google_compute_subnetwork.control_plane.id
}

output "worker_plane_subnet_id" {
  description = "Self-link of the worker-plane subnet"
  value       = google_compute_subnetwork.worker_plane.id
}

output "vpc_connector_id" {
  description = "Self-link of the Serverless VPC Access connector"
  value       = google_vpc_access_connector.main.id
}

output "vpc_connector_name" {
  description = "Name of the Serverless VPC Access connector"
  value       = google_vpc_access_connector.main.name
}

output "private_vpc_connection" {
  description = "The private service connection (used as dependency for Cloud SQL / Memorystore)"
  value       = google_service_networking_connection.private_vpc_connection.network
}
