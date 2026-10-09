import { describe, expect, it } from 'vitest';
import { hacherMotDePasse, verifierMotDePasse } from '../../../utils/motDePasse.js';

describe('utils/motDePasse', () => {
  it('vérifie le bon mot de passe et refuse le mauvais', async () => {
    const hash = await hacherMotDePasse('secret-tres-long');
    expect(hash).toMatch(/^scrypt\$/);
    expect(await verifierMotDePasse('secret-tres-long', hash)).toBe(true);
    expect(await verifierMotDePasse('autre', hash)).toBe(false);
  });

  it('refuse un hash mal formé', async () => {
    expect(await verifierMotDePasse('x', 'md5$abc')).toBe(false);
    expect(await verifierMotDePasse('x', undefined)).toBe(false);
  });
});
