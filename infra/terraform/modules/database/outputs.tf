output "instance_name" {
  description = "Name of the Cloud SQL instance"
  value       = google_sql_database_instance.main.name
}

output "instance_connection_name" {
  description = "Connection name for Cloud SQL proxy (project:region:instance)"
  value       = google_sql_database_instance.main.connection_name
}

output "private_ip_address" {
  description = "Private IP address of the Cloud SQL instance"
  value       = google_sql_database_instance.main.private_ip_address
}

output "database_name" {
  description = "Name of the created database"
  value       = google_sql_database.main.name
}

output "db_username" {
  description = "Database admin username"
  value       = google_sql_user.main.name
}

output "read_replica_connection_name" {
  description = "Connection name of the read replica (if created)"
  value       = length(google_sql_database_instance.read_replica) > 0 ? google_sql_database_instance.read_replica[0].connection_name : null
}

output "read_replica_private_ip" {
  description = "Private IP of the read replica (if created)"
  value       = length(google_sql_database_instance.read_replica) > 0 ? google_sql_database_instance.read_replica[0].private_ip_address : null
}
