# ============================================================
# Cloud Monitoring — uptime checks + alert policies
#
# Creates one uptime check per HTTP service (hitting /ready) and
# a single multi-condition alert policy that pages the notification
# channel when any service's 5xx rate exceeds the threshold.
# ============================================================

# ─── Notification channel ────────────────────────────────────────────────────

resource "google_monitoring_notification_channel" "email" {
  project      = var.project_id
  display_name = "${var.name_prefix} alerts → ${var.notification_email}"
  type         = "email"

  labels = {
    email_address = var.notification_email
  }
}

# ─── Uptime checks (one per service) ─────────────────────────────────────────

resource "google_monitoring_uptime_check_config" "service_ready" {
  for_each = var.http_services

  project      = var.project_id
  display_name = "${var.name_prefix}-${each.key}-ready"

  http_check {
    path         = "/ready"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = regex("https?://([^/]+)", each.value)[0]
    }
  }

  period  = "60s"
  timeout = "10s"

  content_matchers {
    content = "ok"
    matcher = "CONTAINS_STRING"
  }
}

# ─── Alert policy: uptime failure ────────────────────────────────────────────

resource "google_monitoring_alert_policy" "uptime_failure" {
  project      = var.project_id
  display_name = "${var.name_prefix} uptime check failure"
  combiner     = "OR"

  dynamic "conditions" {
    for_each = google_monitoring_uptime_check_config.service_ready

    content {
      display_name = "Uptime failure: ${conditions.key}"

      condition_threshold {
        filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND metric.labels.check_id=\"${conditions.value.uptime_check_id}\""
        comparison      = "COMPARISON_LT"
        threshold_value = 1
        duration        = "120s"

        aggregations {
          alignment_period   = "60s"
          per_series_aligner = "ALIGN_NEXT_OLDER"
          cross_series_reducer  = "REDUCE_COUNT_FALSE"
          group_by_fields    = ["resource.label.host"]
        }
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    notification_rate_limit {
      period = "3600s"
    }
  }
}

# ─── Alert policy: 5xx error rate ────────────────────────────────────────────

resource "google_monitoring_alert_policy" "high_error_rate" {
  project      = var.project_id
  display_name = "${var.name_prefix} high 5xx error rate (>${var.error_rate_threshold * 100}%)"
  combiner     = "OR"

  conditions {
    display_name = "Cloud Run 5xx rate"

    condition_threshold {
      filter = join(" AND ", [
        "resource.type=\"cloud_run_revision\"",
        "resource.labels.location=\"${var.region}\"",
        "metric.type=\"run.googleapis.com/request_count\"",
        "metric.labels.response_code_class=\"5xx\"",
      ])
      comparison      = "COMPARISON_GT"
      threshold_value = var.error_rate_threshold
      duration        = "300s"

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_RATE"
        cross_series_reducer = "REDUCE_SUM"
        group_by_fields      = ["resource.labels.service_name"]
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    notification_rate_limit {
      period = "3600s"
    }
  }
}
