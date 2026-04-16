import { WorkOS } from '@workos-inc/node';
import { config } from '@udd/config';
import type { AuthProvider, WorkOSUser } from './interfaces.js';

// ============================================================
// WorkOS AuthProvider — real implementation
// The WorkOS SDK is imported ONLY in this file (adapter boundary).
// ============================================================

function getClientId(): string {
  return config.auth.workosClientId();
}

function getWorkOS(): WorkOS {
  return new WorkOS(config.auth.workosApiKey());
}

function mapUser(user: {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePictureUrl?: string | null;
}): WorkOSUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    profilePictureUrl: user.profilePictureUrl ?? null,
  };
}

export class WorkOSAuthProvider implements AuthProvider {
  /**
   * Exchange a WorkOS AuthKit authorization code for a user.
   * Call this from the session exchange endpoint.
   * When PKCE is in use, pass `codeVerifier` so WorkOS can verify the challenge.
   */
  async authenticateWithCode(code: string, codeVerifier?: string): Promise<WorkOSUser> {
    const result = await getWorkOS().userManagement.authenticateWithCode({
      code,
      clientId: getClientId(),
      ...(codeVerifier !== undefined ? { codeVerifier } : {}),
    });
    return mapUser(result.user);
  }

  /** validateToken: not used in code-exchange flow — kept for interface compat */
  async validateToken(_token: string): Promise<WorkOSUser> {
    throw new Error('Use authenticateWithCode for AuthKit code exchange');
  }

  async getUser(workosUserId: string): Promise<WorkOSUser | null> {
    try {
      const user = await getWorkOS().userManagement.getUser(workosUserId);
      return mapUser(user);
    } catch {
      return null;
    }
  }

  getAuthorizationUrl(redirectUri: string, state?: string): string {
    const opts: { provider: string; redirectUri: string; clientId: string; state?: string } = {
      provider: 'authkit',
      redirectUri,
      clientId: getClientId(),
    };
    if (state !== undefined) opts.state = state;
    return getWorkOS().userManagement.getAuthorizationUrl(opts);
  }
}
