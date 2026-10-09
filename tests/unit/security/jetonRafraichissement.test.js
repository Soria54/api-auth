import { describe, expect, it } from 'vitest';
import {
  empreinteJeton,
  genererJetonRafraichissement,
} from '../../../security/jetonRafraichissement.js';

describe('security/jetonRafraichissement', () => {
  it('génère un jeton aléatoire et son empreinte SHA-256', () => {
    const a = genererJetonRafraichissement();
    const b = genererJetonRafraichissement();
    expect(a.jeton).not.toBe(b.jeton);
    expect(a.jeton).toMatch(/^[\w-]{43}$/);
    expect(a.empreinte).toMatch(/^[0-9a-f]{64}$/);
    expect(empreinteJeton(a.jeton)).toBe(a.empreinte);
  });
});
