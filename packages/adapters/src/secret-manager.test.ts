import { describe, it, expect } from 'vitest';
import { InMemorySecretManagerProvider } from './secret-manager.js';

describe('InMemorySecretManagerProvider', () => {
  it('creates a secret and returns a ref', async () => {
    const provider = new InMemorySecretManagerProvider();
    const ref = await provider.createSecret('test-secret', 'my-api-key');
    expect(ref).toContain('test-secret');
    expect(ref).toMatch(/^mem:\/\//);
  });

  it('retrieves a secret by ref', async () => {
    const provider = new InMemorySecretManagerProvider();
    const ref = await provider.createSecret('api-key', 'super-secret-value');
    const value = await provider.getSecret(ref);
    expect(value).toBe('super-secret-value');
  });

  it('throws when getting a non-existent ref', async () => {
    const provider = new InMemorySecretManagerProvider();
    await expect(provider.getSecret('mem://nonexistent/12345')).rejects.toThrow('not found');
  });

  it('rotates a secret — old ref becomes invalid', async () => {
    const provider = new InMemorySecretManagerProvider();
    const ref1 = await provider.createSecret('cred', 'old-value');
    const ref2 = await provider.rotateSecret(ref1, 'new-value');

    // New ref works
    const newValue = await provider.getSecret(ref2);
    expect(newValue).toBe('new-value');

    // Old ref is gone
    await expect(provider.getSecret(ref1)).rejects.toThrow();
  });

  it('scheduleDelete removes the secret', async () => {
    const provider = new InMemorySecretManagerProvider();
    const ref = await provider.createSecret('temp-key', 'temp-value');

    await provider.scheduleDelete(ref);
    await expect(provider.getSecret(ref)).rejects.toThrow();
  });

  it('different secrets have distinct refs', async () => {
    const provider = new InMemorySecretManagerProvider();
    const ref1 = await provider.createSecret('key-a', 'value-a');
    const ref2 = await provider.createSecret('key-b', 'value-b');
    expect(ref1).not.toBe(ref2);
  });
});
