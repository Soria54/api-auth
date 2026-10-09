import { afterEach, describe, expect, it, vi } from 'vitest';
import { creerApp } from '../../app.js';

afterEach(() => vi.unstubAllEnvs());

describe('app : trust proxy', () => {
  it('ignore X-Forwarded-For sans TRUST_PROXY_HOPS (0 par défaut)', () => {
    vi.stubEnv('TRUST_PROXY_HOPS', undefined);
    expect(creerApp({ db: {} }).get('trust proxy')).toBe(0);
  });

  it('suit TRUST_PROXY_HOPS', () => {
    vi.stubEnv('TRUST_PROXY_HOPS', '1');
    expect(creerApp({ db: {} }).get('trust proxy')).toBe(1);
  });
});
