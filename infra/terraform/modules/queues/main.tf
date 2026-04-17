terraform {
  required_providers {
    google = { source = "hashicorp/google", version = "~> 5.0" }
  }
}

# ============================================================
# Enable Pub/Sub API
# ============================================================

resource "google_project_service" "pubsub" {
  project            = var.project_id
  service            = "pubsub.googleapis.com"
  disable_on_destroy = false
}

# ============================================================
# Pub/Sub topics + subscriptions (mirrors existing SQS FIFO queues)
# Message ordering enabled to preserve FIFO semantics.
# ============================================================

locals {
  topics = [
    "session-events",
    "preview-events",
    "worker-events",
    "usage-events",
    "ai-events",
    "audit-events",
  ]
}

# Main topics
resource "google_pubsub_topic" "main" {
  for_each = toset(local.topics)

  project = var.project_id
  name    = "${var.name_prefix}-${each.key}"

  # Retain undelivered messages for 24 hours
  message_retention_duration = "86400s"

  labels = var.labels

  depends_on = [google_project_service.pubsub]
}

# Dead-letter topics (14 day retention)
resource "google_pubsub_topic" "dead_letter" {
  for_each = toset(local.topics)

  project = var.project_id
  name    = "${var.name_prefix}-${each.key}-dlq"

  message_retention_duration = "1209600s"  # 14 days

  labels = var.labels

  depends_on = [google_project_service.pubsub]
}

# Dead-letter subscriptions — consumers read from these to handle failed messages
resource "google_pubsub_subscription" "dead_letter" {
  for_each = toset(local.topics)

  project = var.project_id
  name    = "${var.name_prefix}-${each.key}-dlq-sub"
  topic   = google_pubsub_topic.dead_letter[each.key].name

  ack_deadline_seconds         = 300
  message_retention_duration   = "1209600s"  # 14 days
  enable_message_ordering      = true
  retain_acked_messages        = false

  labels = var.labels
}

# Main subscriptions — one default pull subscription per topic
resource "google_pubsub_subscription" "main" {
  for_each = toset(local.topics)

  project = var.project_id
  name    = "${var.name_prefix}-${each.key}-sub"
  topic   = google_pubsub_topic.main[each.key].name

  ack_deadline_seconds       = 300
  message_retention_duration = "86400s"  # 24 hours
  enable_message_ordering    = true
  retain_acked_messages      = false

  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.dead_letter[each.key].id
    max_delivery_attempts = 5
  }

  # Exponential backoff retry policy
  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }

  labels = var.labels
}

# Grant the Cloud Pub/Sub service account permission to forward dead-letter messages
data "google_project" "main" {
  project_id = var.project_id
}

resource "google_pubsub_topic_iam_member" "dead_letter_publisher" {
  for_each = toset(local.topics)

  project = var.project_id
  topic   = google_pubsub_topic.dead_letter[each.key].name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:service-${data.google_project.main.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}

resource "google_pubsub_subscription_iam_member" "dead_letter_subscriber" {
  for_each = toset(local.topics)

  project      = var.project_id
  subscription = google_pubsub_subscription.main[each.key].name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:service-${data.google_project.main.number}@gcp-sa-pubsub.iam.gserviceaccount.com"
}
