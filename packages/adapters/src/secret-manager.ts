import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import type { SecretManagerProvider } from './interfaces.js';

// ============================================================
// GCP Secret Manager implementation
// The GCP SDK is imported ONLY in this file (adapter boundary).
// The returned secret value must NEVER be logged or persisted.
//
// Secret refs are stored in the DB as: gcp://<projectId>/<secretId>
// ============================================================

function parseRef(ref: string): { projectId: string; secretId: string } {
  // ref format: gcp://<projectId>/<secretId>
  const stripped = ref.replace(/^gcp:\/\//, '');
  const slashIdx = stripped.indexOf('/');
  if (slashIdx === -1) {
    throw new Error(`Invalid GCP secret ref (expected gcp://<projectId>/<secretId>): ${ref}`);
  }
  return {
    projectId: stripped.slice(0, slashIdx),
    secretId: stripped.slice(slashIdx + 1),
  };
}

function getProjectId(): string {
  const projectId = process.env['GCP_PROJECT_ID'];
  if (!projectId) throw new Error('GCP_PROJECT_ID environment variable is required');
  return projectId;
}

export class GCPSecretManagerProvider implements SecretManagerProvider {
  // Lazily instantiated so tests that don't use this provider don't require ADC.
  private client: SecretManagerServiceClient | null = null;

  private getClient(): SecretManagerServiceClient {
    if (!this.client) {
      this.client = new SecretManagerServiceClient();
    }
    return this.client;
  }

  async createSecret(name: string, value: string): Promise<string> {
    const projectId = getProjectId();
    // Sanitise name to be a valid GCP secret ID (alphanumeric + hyphens + underscores)
    const secretId = `udd-${name.replace(/[^a-zA-Z0-9_-]/g, '-')}-${Date.now()}`;
    const client = this.getClient();

    // 1. Create the secret resource
    await client.createSecret({
      parent: `projects/${projectId}`,
      secretId,
      secret: {
        replication: { automatic: {} },
      },
    });

    // 2. Add the initial secret version
    await client.addSecretVersion({
      parent: `projects/${projectId}/secrets/${secretId}`,
      payload: { data: Buffer.from(value, 'utf8') },
    });

    return `gcp://${projectId}/${secretId}`;
  }

  async getSecret(ref: string): Promise<string> {
    const { projectId, secretId } = parseRef(ref);
    const client = this.getClient();

    // Always retrieve the 'latest' enabled version.
    const versionName = `projects/${projectId}/secrets/${secretId}/versions/latest`;

    let response;
    try {
      [response] = await client.accessSecretVersion({ name: versionName });
    } catch (err: unknown) {
      // GCP throws a gRPC NOT_FOUND (code 5) when the secret or version does not exist.
      const code = (err as { code?: number }).code;
      if (code === 5) {
        throw new Error(`Secret not found: ${ref}`);
      }
      throw err;
    }

    const raw = response.payload?.data;
    if (!raw) throw new Error(`Secret ${ref} has no data payload`);
    return Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
  }

  async rotateSecret(currentRef: string, newValue: string): Promise<string> {
    const { projectId, secretId } = parseRef(currentRef);
    const client = this.getClient();

    // Add a new version — GCP retains the previous version automatically.
    // Subsequent getSecret calls always resolve 'latest', picking up the new value.
    await client.addSecretVersion({
      parent: `projects/${projectId}/secrets/${secretId}`,
      payload: { data: Buffer.from(newValue, 'utf8') },
    });

    // Disable older versions (best-effort) to limit blast radius.
    try {
      const [versions] = await client.listSecretVersions({
        parent: `projects/${projectId}/secrets/${secretId}`,
        filter: 'state:ENABLED',
      });
      // Sort descending by version number and disable everything except the newest.
      const sorted = [...(versions ?? [])].sort((a, b) => {
        const numA = parseInt(a.name?.split('/').pop() ?? '0', 10);
        const numB = parseInt(b.name?.split('/').pop() ?? '0', 10);
        return numB - numA;
      });
      for (const version of sorted.slice(1)) {
        if (version.name) {
          await client.disableSecretVersion({ name: version.name }).catch(() => {
            // Best-effort; don't fail the rotation if disabling an old version errors.
          });
        }
      }
    } catch {
      // Non-fatal: rotation succeeded even if cleanup fails.
    }

    return currentRef;
  }

  async scheduleDelete(ref: string): Promise<void> {
    const { projectId, secretId } = parseRef(ref);
    const client = this.getClient();

    // Deletes the secret and ALL its versions immediately.
    await client.deleteSecret({
      name: `projects/${projectId}/secrets/${secretId}`,
    });
  }
}

// ============================================================
// In-memory provider for local development and testing
// ============================================================

export class InMemorySecretManagerProvider implements SecretManagerProvider {
  private readonly store = new Map<string, string>();

  async createSecret(name: string, value: string): Promise<string> {
    const ref = `mem://${name}/${Date.now()}`;
    this.store.set(ref, value);
    return ref;
  }

  async getSecret(ref: string): Promise<string> {
    const value = this.store.get(ref);
    if (!value) throw new Error(`Secret not found: ${ref}`);
    return value;
  }

  async rotateSecret(currentRef: string, newValue: string): Promise<string> {
    const name = currentRef.split('/')[2] ?? 'secret';
    const newRef = `mem://${name}/${Date.now()}`;
    this.store.set(newRef, newValue);
    this.store.delete(currentRef);
    return newRef;
  }

  async scheduleDelete(ref: string): Promise<void> {
    this.store.delete(ref);
  }
}
