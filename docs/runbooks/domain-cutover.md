### Runbook: Hardened-v1 Domain Cutover

**Status:** Canonical
Back to [docs/\_INDEX.md](../_INDEX.md).

## Use this runbook when

- pointing `api.asherlewis.org` / `staging-api.asherlewis.org` at the Cloud Run global load balancer for the first time
- rotating the LB static IP (e.g. after recreating the prod environment)
- bringing `app.asherlewis.org` online once a web-deploy target exists
- adding the `www.asherlewis.org` → `app.asherlewis.org` redirect

Canonical host contract lives in [docs/ENV_CONTRACT.md — Hardened-v1 canonical public hosts](../ENV_CONTRACT.md#hardened-v1-canonical-public-hosts). This runbook is the operational companion.

## Current state (snapshot)

- Repo-side Terraform is ready: `infra/terraform/modules/loadbalancer` consumes `ssl_domains` per environment.
- Prod default: `ssl_domains = ["api.asherlewis.org"]` (`infra/terraform/environments/prod/variables.tf`).
- Staging default: `ssl_domains = ["staging-api.asherlewis.org"]` (`infra/terraform/environments/staging/variables.tf`).
- DNS is **not yet pointed** — the wrangler CLI token available in this environment has no DNS write scope, so records must be created manually.
- `app.asherlewis.org` has no backend yet. Leave it unpointed until a web deploy target exists.

## Prerequisites

- GCP access with permission to run `terraform apply` against the target environment and to read Cloud Run URIs.
- Cloudflare access to zone `asherlewis.org` with DNS edit permission.
- WorkOS dashboard access.

## 1. Apply Terraform and read the LB IP

Run from `infra/terraform/environments/prod` (or `staging`):

```bash
terraform init
terraform plan -out plan.out
terraform apply plan.out

# Read the static LB IP that DNS must point at.
terraform output -raw lb_ip_address
# -> e.g. 34.120.0.42
```

If `lb_ip_address` is not exposed as an output, read it directly:

```bash
terraform state show 'module.loadbalancer.google_compute_global_address.lb_ip' | grep -E '^\s*address\s*='
```

The managed SSL certificate (`google_compute_managed_ssl_certificate`) will be in `PROVISIONING` state until DNS resolves to this IP.

## 2. Create Cloudflare DNS records

Token-limited automation is not available here — create records in the Cloudflare dashboard for zone `asherlewis.org`.

### Prod

| Type  | Name  | Content                          | Proxy status | TTL  |
| ----- | ----- | -------------------------------- | ------------ | ---- |
| A     | `api` | `<prod LB IP from step 1>`       | DNS only (grey cloud) | Auto |

### Staging

| Type  | Name          | Content                              | Proxy status          | TTL  |
| ----- | ------------- | ------------------------------------ | --------------------- | ---- |
| A     | `staging-api` | `<staging LB IP from step 1>`        | DNS only (grey cloud) | Auto |

### Reserved (do NOT create until backing services exist)

| Type  | Name  | Reason to defer                                                                                   |
| ----- | ----- | ------------------------------------------------------------------------------------------------- |
| CNAME | `app` | `apps/web` has no Cloud Run target; pointing this prematurely produces a broken primary web host. |
| CNAME | `www` | Depends on `app` existing so the redirect has a target.                                           |

Record **must be** "DNS only" (grey cloud). Cloudflare proxy-mode would terminate TLS upstream of GCP's managed cert, which breaks managed-cert provisioning and invalidates the hardened-v1 assumption that `api.asherlewis.org` terminates on the GCP LB.

If and when Cloudflare-fronted termination is later chosen, revisit ADR 015 and swap to a Cloudflare-origin cert before flipping the orange cloud.

### Equivalent `wrangler` command (for later, once token has DNS write scope)

```bash
wrangler dns record create asherlewis.org \
  --type A --name api --content <LB_IP> --ttl 1 --proxied=false
```

## 3. Wait for managed SSL certificate to go ACTIVE

After DNS propagates (usually <15 min for Cloudflare), poll the managed cert:

```bash
gcloud compute ssl-certificates describe <name_prefix>-ssl-cert \
  --global \
  --format='value(managed.status,managed.domainStatus)'
```

Expected progression: `PROVISIONING` → `ACTIVE`. If it sticks in `PROVISIONING` for >30 min, verify:

- `dig +short A api.asherlewis.org` returns the LB IP.
- Cloudflare proxy is **off** (grey cloud) for the `api` record.
- The domain on the cert resource matches the DNS name exactly.

## 4. Verify end-to-end

```bash
# LB routes / (default) to the api service.
curl -fsS https://api.asherlewis.org/healthz

# LB routes /preview/* to the gateway service.
curl -fsS -o /dev/null -w "%{http_code}\n" https://api.asherlewis.org/preview/
# Expect a gateway-origin response (404/401 is fine — the path is not proxied to api).
```

Cross-check LB path-routing by comparing against the service-level URIs emitted by Terraform:

```bash
terraform output api_service_url       # Cloud Run URI (internal canonical)
terraform output gateway_service_url   # Cloud Run URI (internal canonical)
```

The Cloud Run URIs remain the source of truth for internal service-to-service traffic and for the connectivity audit (`/v1/healthz/connectivity`). Cloud Run URIs do not disappear when the public hostname goes live — they just become invisible to external clients.

## 5. Update WorkOS redirect URIs

WorkOS only redeems authorization codes for redirect URIs registered in the dashboard. After step 3 completes, add the canonical redirect URI for each environment.

| Environment | Redirect URI (web)                                | Redirect URI (iOS) |
| ----------- | -------------------------------------------------- | ------------------ |
| prod        | `https://app.asherlewis.org/auth/callback` (once web host exists) | `uddcompanion://auth/callback` |
| staging     | `https://staging-app.asherlewis.org/auth/callback` (once web host exists) | `uddcompanion://auth/callback` |

Until the web-deploy target exists, web redirects continue to use whatever origin hosts `apps/web` — typically localhost for dev. The iOS custom-URL-scheme redirect is independent of the API hostname and does not need to change during API cutover.

## 6. (Deferred) `app.asherlewis.org` cutover

Blocked on choosing a deploy target for `apps/web`. Two viable shapes:

1. **Cloud Run service** — add a `google_cloud_run_v2_service` resource for `web` in `infra/terraform/modules/compute`, a `cloudbuild.web.yaml`, and a `web` entry in `.github/workflows/deploy.yml` `SERVICES`. Add `app.asherlewis.org` to the LB `ssl_domains` and extend the URL map with a host rule (or stand up a second LB if path-based routing conflicts).
2. **Static export on Cloud Storage + CDN** — depends on whether `apps/web` can run fully static under `next export` (typed rewrites, server actions, and API proxying currently make this non-trivial).

Once option 1 or 2 exists:

1. Set the prod `ssl_domains` default (or TF var) to `["api.asherlewis.org", "app.asherlewis.org"]` (Cloud Run LB) **or** point a separate static-host domain mapping.
2. Add Cloudflare DNS record:

   | Type  | Name  | Content                              | Proxy status          |
   | ----- | ----- | ------------------------------------ | --------------------- |
   | A or CNAME | `app` | `<web LB IP>` or `c.storage.googleapis.com` (per chosen host) | DNS only (grey cloud) |

3. Verify `https://app.asherlewis.org/` serves the Next.js web app.
4. Add the WorkOS redirect URI from step 5.

## 7. (Deferred) `www.asherlewis.org` redirect

Blocked on step 6. Once `app.asherlewis.org` is live:

1. Cloudflare → Rules → Bulk Redirects (or a single Page Rule on the Free plan):
   - Source: `https://www.asherlewis.org/*`
   - Target: `https://app.asherlewis.org/$1`
   - Status: `301 Moved Permanently`
   - Preserve query string: yes
2. Add DNS so the source host resolves:

   | Type  | Name  | Content                  | Proxy status            |
   | ----- | ----- | ------------------------ | ----------------------- |
   | CNAME | `www` | `app.asherlewis.org`     | Proxied (orange cloud)  |

   The redirect executes on Cloudflare's edge, so the `www` record should be proxied. This is the one record that is intentionally orange-cloud.

3. Verify:

```bash
curl -sI https://www.asherlewis.org/ | grep -E '^(HTTP|location:)'
# Expect: HTTP/2 301 ; location: https://app.asherlewis.org/
```

## Recovery

- **Managed cert stuck in `PROVISIONING`.** Almost always a DNS issue — check `dig`, check proxy status, check the cert's `domains` list matches the DNS name. Do not delete the cert resource mid-provision; wait or fix DNS.
- **LB returns 404 on every path.** The `google_compute_url_map.main` default service is `api`. If the api Cloud Run service is down, the LB will pass through its error. Check `gcloud run services describe api-<env>`.
- **`/preview/*` routes to api, not gateway.** URL map ordering bug. Verify `path_rule { paths = ["/preview", "/preview/*"] }` still exists in `infra/terraform/modules/loadbalancer/main.tf`.
- **iOS app cannot reach new host.** Rebuild the Release config with `UDD_API_BASE_URL=https://api.asherlewis.org` and `UDD_GATEWAY_BASE_URL=https://api.asherlewis.org`. The build-phase substitution in `apps/mobile-ios/UDDCompanion.xcodeproj/project.pbxproj` is the single source of truth for the Release binary.
- **Need to roll back cutover.** The Cloud Run internal URIs (`*-abc123-uc.a.run.app`) never change. Clients can be pointed back at the internal URIs while DNS and cert issues are investigated.

## See also

- [docs/ENV_CONTRACT.md](../ENV_CONTRACT.md) — canonical env + host contract
- [docs/adr/015-canonical-hosted-baseline-and-middleware.md](../adr/015-canonical-hosted-baseline-and-middleware.md)
- [docs/implementation-gaps.md — Active gaps — public hosting](../implementation-gaps.md#active-gaps--public-hosting-hardened-v1-canonical-hosts)
- `infra/terraform/modules/loadbalancer/main.tf` — URL map, managed cert, forwarding rules
