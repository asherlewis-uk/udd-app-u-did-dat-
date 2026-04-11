import type { GitProvider, GitRepoInfo } from './interfaces.js';

export class GitHubProvider implements GitProvider {
  async getRepo(_remoteUrl: string, _accessToken: string): Promise<GitRepoInfo | null> {
    throw new Error('GitHubProvider.getRepo not implemented');
  }
  async validateAccess(_remoteUrl: string, _accessToken: string): Promise<boolean> {
    throw new Error('GitHubProvider.validateAccess not implemented');
  }
}
