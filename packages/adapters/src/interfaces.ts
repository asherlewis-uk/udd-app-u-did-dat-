// ============================================================
// Vendor-isolation adapter interfaces
// Every external system is accessed exclusively through these interfaces.
// Concrete implementations live in this package.
// Nothing outside this package should import vendor SDKs directly.
// ============================================================

// ============================================================
// Auth Provider (WorkOS boundary)
// ============================================================

export interface WorkOSUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
}

export interface AuthProvider {
  /** Validate a WorkOS token and return the user */
  validateToken(token: string): Promise<WorkOSUser>;
  /**
   * Exchange a WorkOS AuthKit authorization code for a user.
   * When PKCE is in use, pass the `codeVerifier` that was generated at
   * pkce-init time so WorkOS can verify the challenge.
   */
  authenticateWithCode(code: string, codeVerifier?: string): Promise<WorkOSUser>;
  /** Fetch user by WorkOS ID */
  getUser(workosUserId: string): Promise<WorkOSUser | null>;
  /** Generate WorkOS OAuth authorization URL */
  getAuthorizationUrl(redirectUri: string, state?: string): string;
}

// ============================================================
// Git Provider
// ============================================================

export interface GitRepoInfo {
  defaultBranch: string;
  isPrivate: boolean;
  cloneUrl: string;
}

export interface GitProvider {
  getRepo(remoteUrl: string, accessToken: string): Promise<GitRepoInfo | null>;
  validateAccess(remoteUrl: string, accessToken: string): Promise<boolean>;
}

// ============================================================
// Billing Provider
// ============================================================

export interface BillingProvider {
  createCustomer(workspaceId: string, email: string): Promise<{ customerId: string }>;
  recordUsage(customerId: string, units: number, metricName: string): Promise<void>;
  getSubscriptionStatus(customerId: string): Promise<'active' | 'past_due' | 'canceled' | 'none'>;
}

// ============================================================
// Notification Provider
// ============================================================

export interface NotificationPayload {
  to: string;
  subject: string;
  body: string;
  templateId?: string;
  templateVars?: Record<string, string>;
}

export interface NotificationProvider {
  send(payload: NotificationPayload): Promise<void>;
}

// ============================================================
// Object Storage Provider
// ============================================================

export interface ObjectStorageProvider {
  /** Upload raw content, returns the storage reference key */
  put(key: string, content: Buffer | string, contentType?: string): Promise<string>;
  /** Download content by key */
  get(key: string): Promise<Buffer>;
  /** Generate a pre-signed URL for client-side access */
  presignedUrl(key: string, expiresInSeconds: number): Promise<string>;
  /** Delete by key */
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// ============================================================
// Secret Manager Provider
// This is the ONLY way credentials reach the adapter boundary.
// ============================================================

export interface SecretManagerProvider {
  /** Create a new secret, returns the secret reference key */
  createSecret(name: string, value: string): Promise<string>;
  /**
   * Retrieve a secret value by reference.
   * The returned value must NEVER be logged or persisted.
   */
  getSecret(ref: string): Promise<string>;
  /**
   * Rotate a secret: write new value, return new reference.
   * Old ref is marked for deferred deletion by the provider.
   */
  rotateSecret(currentRef: string, newValue: string): Promise<string>;
  /** Mark a secret for deletion */
  scheduleDelete(ref: string): Promise<void>;
}

// ============================================================
// Telemetry Sink
// ============================================================

export interface TelemetryEvent {
  name: string;
  attributes: Record<string, string | number | boolean>;
  timestamp?: string;
}

export interface TelemetrySink {
  emit(event: TelemetryEvent): Promise<void>;
  flush(): Promise<void>;
}
