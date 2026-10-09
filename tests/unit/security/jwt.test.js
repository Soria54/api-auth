import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SignJWT, importJWK, jwtVerify } from 'jose';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initJwtOuArreter, lireJwks, signerJeton, verifierJeton } from '../../../security/jwt.js';
import { exigerRole } from '../../../middlewares/exigerRole.js';
import { CLE_DE_TEST, nouvelleCleDeTest } from '../../helpers/harnais.js';

const UTILISATEUR = { id: 7, nom_utilisateur: 'alice', role: 'admin' };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('security/jwt', () => {
  it('signe puis vérifie un jeton', async () => {
    const jeton = await signerJeton(UTILISATEUR);
    expect(await verifierJeton(jeton)).toEqual(UTILISATEUR);
  });

  it('un tiers vérifie le jeton avec la seule clé publique du JWKS', async () => {
    const jeton = await signerJeton(UTILISATEUR);
    const { keys } = await lireJwks();
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatchObject({ kty: 'OKP', crv: 'Ed25519', alg: 'EdDSA', use: 'sig' });
    expect(keys[0]).not.toHaveProperty('d');
    const { payload, protectedHeader } = await jwtVerify(jeton, await importJWK(keys[0], 'EdDSA'));
    expect(protectedHeader.kid).toBe(keys[0].kid);
    expect(payload.sub).toBe('7');
  });

  it('refuse un jeton signé par une autre clé', async () => {
    const jeton = await signerJeton(UTILISATEUR);
    vi.stubEnv('JWT_CLE_PRIVEE', nouvelleCleDeTest());
    await expect(verifierJeton(jeton)).rejects.toThrow();
  });

  it('refuse un jeton HS256 (algorithme imposé)', async () => {
    const hs256 = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('1')
      .setIssuer('api-auth')
      .sign(new TextEncoder().encode('x'.repeat(40)));
    await expect(verifierJeton(hs256)).rejects.toThrow();
  });

  it('refuse un autre émetteur', async () => {
    vi.stubEnv('JWT_EMETTEUR', 'https://autre.exemple');
    const jeton = await signerJeton(UTILISATEUR);
    vi.stubEnv('JWT_EMETTEUR', 'https://api.exemple');
    await expect(verifierJeton(jeton)).rejects.toThrow();
  });

  it('lit la clé depuis un fichier (JWT_CLE_PRIVEE_FICHIER), prioritaire', async () => {
    const fichier = join(mkdtempSync(join(tmpdir(), 'cle-')), 'jwt.pem');
    writeFileSync(fichier, CLE_DE_TEST);
    vi.stubEnv('JWT_CLE_PRIVEE', 'pas-une-cle');
    vi.stubEnv('JWT_CLE_PRIVEE_FICHIER', fichier);
    expect(await verifierJeton(await signerJeton(UTILISATEUR))).toEqual(UTILISATEUR);
  });

  it('accepte une clé PEM écrite sur une ligne avec des \\n', async () => {
    vi.stubEnv('JWT_CLE_PRIVEE', CLE_DE_TEST.replaceAll('\n', '\\n'));
    expect(await verifierJeton(await signerJeton(UTILISATEUR))).toEqual(UTILISATEUR);
  });

  it.each([
    ['absente', ''],
    ['illisible', 'pas-une-cle'],
    [
      'qui n’est pas Ed25519',
      generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({
        type: 'pkcs8',
        format: 'pem',
      }),
    ],
  ])('arrête le processus avec une clé %s', async (_cas, valeur) => {
    vi.stubEnv('JWT_CLE_PRIVEE', valeur);
    const sortie = vi.spyOn(process, 'exit').mockImplementation(() => undefined);
    await initJwtOuArreter();
    expect(sortie).toHaveBeenCalledWith(1);
  });

  it('démarre avec une clé valide', async () => {
    const sortie = vi.spyOn(process, 'exit').mockImplementation(() => undefined);
    await initJwtOuArreter();
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
