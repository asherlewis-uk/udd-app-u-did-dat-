output "host" {
  description = "Private IP address of the Memorystore Redis instance"
  value       = google_redis_instance.main.host
}

output "port" {
  description = "Port of the Memorystore Redis instance"
  value       = google_redis_instance.main.port
}

output "redis_url" {
  description = "Redis connection URL (without auth token)"
  value       = "redis://${google_redis_instance.main.host}:${google_redis_instance.main.port}"
}

output "auth_string" {
  description = "Redis AUTH string (sensitive)"
  value       = google_redis_instance.main.auth_string
  sensitive   = true
}

output "instance_name" {
  description = "Name of the Memorystore Redis instance"
  value       = google_redis_instance.main.name
}
