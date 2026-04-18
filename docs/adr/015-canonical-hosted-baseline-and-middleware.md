# ADR 015: Canonical Hosted Baseline and Middleware

## Status
Canonical (2026-04-18)

## Context
Previous ADRs (004, 014) maintained vendor-neutrality for container isolation and service adapters. This created implementation drift and decision paralysis. The platform's hosted deployment is currently stalled due to infrastructure-reality mismatches.

## Decisions

### 1. Compute: GCP Cloud Run
We explicitly reject the "MicroVM" and "Local Docker" management models for the hosted control plane. All sessions and services will run on **GCP Cloud Run**.
- **Control Plane:** Cloud Run Services.
- **Worker Plane (Sessions):** Ephemeral Cloud Run Services orchestrated by `worker-manager`.

### 2. AI Retrieval: Hybrid Boundary
AI context retrieval will utilize a hybrid approach:
- **Vector search (RAG)** for semantic concept discovery and natural language queries.
- **GitNexus Graph** for structural verification, symbol tracing, and blast-radius analysis.
The boundary must ensure that "hallucinated" RAG results are filtered by the symbol graph's ground truth.

### 3. Service Adapters: GCP Native
All AWS abstractions are to be stripped. We will implement and maintain only GCP-native adapters:
- **Secrets:** GCP Secret Manager.
- **Storage:** Google Cloud Storage (GCS).
- **Queues/Events:** GCP Pub/Sub.

### 4. Real-time: Managed Pusher
To bypass Cloud Run's connection timeouts and operational complexity, real-time collaboration and state synchronization will use **Pusher**.

## Tradeoffs

### Pros
- **Velocity:** Simplifies the codebase by removing unused abstractions.
- **Scalability:** Leverages GCP's managed scale-to-zero compute.
- **Operational Simplicity:** Managed Pusher handles WebSocket persistence and connection state.

### Cons
- **Vendor Lock-in:** Hard dependency on GCP and Pusher.
- **Privacy:** Code-sync metadata traverses a third-party managed service (Pusher).

## Consequences
- `packages/adapters` must be purged of AWS code.
- `apps/worker-manager` must be rewritten to target the Cloud Run API instead of local Docker.
- `apps/collaboration` will be refactored to use the Pusher SDK.
