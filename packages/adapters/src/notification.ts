import type { NotificationProvider, NotificationPayload } from './interfaces.js';

export class EmailNotificationProvider implements NotificationProvider {
  async send(_payload: NotificationPayload): Promise<void> {
    throw new Error('EmailNotificationProvider.send not implemented');
  }
}
