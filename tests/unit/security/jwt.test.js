import { SignJWT } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initJwtOuArreter, signerJeton, verifierJeton } from '../../../security/jwt.js';
import { exigerRole } from '../../../middlewares/exigerRole.js';
import { SECRET_DE_TEST } from '../../helpers/harnais.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('security/jwt', () => {
  it('signe puis vérifie un jeton', async () => {
    vi.stubEnv('JWT_SECRET', SECRET_DE_TEST);
    const jeton = await signerJeton({ id: 7, email: 'a@b.fr', role: 'admin' });
    expect(await verifierJeton(jeton)).toEqual({ id: 7, email: 'a@b.fr', role: 'admin' });
  });

  it('refuse un jeton signé avec un autre secret', async () => {
    vi.stubEnv('JWT_SECRET', SECRET_DE_TEST);
    const autre = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('1')
      .sign(new TextEncoder().encode('x'.repeat(40)));
    await expect(verifierJeton(autre)).rejects.toThrow();
  });

  it('arrête le processus sans secret suffisant', () => {
    vi.stubEnv('JWT_SECRET', 'trop-court');
    const sortie = vi.spyOn(process, 'exit').mockImplementation(() => undefined);
    initJwtOuArreter();
    expect(sortie).toHaveBeenCalledWith(1);
  });

  it('démarre avec un secret suffisant', () => {
    vi.stubEnv('JWT_SECRET', SECRET_DE_TEST);
    const sortie = vi.spyOn(process, 'exit').mockImplementation(() => undefined);
    initJwtOuArreter();
    expect(sortie).not.toHaveBeenCalled();
  });
});

describe('middlewares/exigerRole', () => {
  it('lève à la construction sans rôle', () => {
    expect(() => exigerRole()).toThrow();
  });

  it('laisse passer le bon rôle, refuse les autres (403)', () => {
    const garde = exigerRole('admin');
    const next = vi.fn();
    garde({ auth: { role: 'admin' } }, {}, next);
    expect(next).toHaveBeenCalled();

    const res = { status: vi.fn(() => res), json: vi.fn(() => res) };
    garde({ auth: { role: 'utilisateur' } }, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
