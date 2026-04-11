import type { BillingProvider } from './interfaces.js';

export class StripeBillingProvider implements BillingProvider {
  async createCustomer(_workspaceId: string, _email: string): Promise<{ customerId: string }> {
    throw new Error('StripeBillingProvider.createCustomer not implemented');
  }
  async recordUsage(_customerId: string, _units: number, _metricName: string): Promise<void> {
    throw new Error('StripeBillingProvider.recordUsage not implemented');
  }
  async getSubscriptionStatus(_customerId: string): Promise<'active' | 'past_due' | 'canceled' | 'none'> {
    return 'none';
  }
}
