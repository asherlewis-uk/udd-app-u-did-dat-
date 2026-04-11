output "topic_ids" {
  description = "Map of topic name to Pub/Sub topic ID"
  value       = { for k, v in google_pubsub_topic.main : k => v.id }
}

output "topic_names" {
  description = "Map of topic name to Pub/Sub topic full name"
  value       = { for k, v in google_pubsub_topic.main : k => v.name }
}

output "subscription_ids" {
  description = "Map of topic name to main subscription ID"
  value       = { for k, v in google_pubsub_subscription.main : k => v.id }
}

output "dead_letter_topic_ids" {
  description = "Map of topic name to dead-letter topic ID"
  value       = { for k, v in google_pubsub_topic.dead_letter : k => v.id }
}

output "dead_letter_subscription_ids" {
  description = "Map of topic name to dead-letter subscription ID"
  value       = { for k, v in google_pubsub_subscription.dead_letter : k => v.id }
}
