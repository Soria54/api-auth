/**
 * Jetons d'accès JWT signés par l'API avec une clé privée Ed25519 (algorithme EdDSA).
 *
 * Pourquoi une paire de clés et pas un secret partagé (HS256) : les autres applications
 * (SSO à venir) vérifient les jetons avec la clé PUBLIQUE, publiée sur
 * `/.well-known/jwks.json`, sans jamais pouvoir en fabriquer.
 *
 * Fail-closed : sans clé Ed25519 valide, l'API refuse de démarrer (`initJwtOuArreter`).
 * L'algorithme est imposé à la vérification : un jeton `alg: none`, HS256 ou RS256 est refusé.
 * Clé : `JWT_CLE_PRIVEE_FICHIER` (chemin d'un PEM PKCS#8, production) ou `JWT_CLE_PRIVEE`
 * (PEM dans la variable, `\n` accepté). Génération : `npm run cle:generer`.
 */
import { createPrivateKey, createPublicKey } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { SignJWT, calculateJwkThumbprint, exportJWK, jwtVerify } from 'jose';
import { DUREE_JETON_ACCES_DEFAUT } from '../config/constantes.js';
import { logger } from '../config/logger.js';
import { lirePackage } from '../utils/version.js';

const ALGORITHME = 'EdDSA';
const emetteur = () => process.env.JWT_EMETTEUR || lirePackage().name;

let cache = null;

const lireSource = () => {
  const fichier = process.env.JWT_CLE_PRIVEE_FICHIER;
  if (fichier) return { cle: `fichier:${fichier}`, lire: () => readFileSync(fichier, 'utf8') };
  const pem = (process.env.JWT_CLE_PRIVEE ?? '').replaceAll('\\n', '\n');
  return { cle: `variable:${pem}`, lire: () => pem };
};

/** Clés chargées une fois par source (fichier ou variable), puis gardées en mémoire. */
const chargerCles = async () => {
  const source = lireSource();
  if (cache?.source === source.cle) return cache;
  const pem = source.lire();
  if (!pem.trim()) throw new Error('JWT_CLE_PRIVEE_FICHIER (ou JWT_CLE_PRIVEE) absente');
  const privee = createPrivateKey(pem);
  if (privee.asymmetricKeyType !== 'ed25519') throw new Error('La clé JWT doit être Ed25519');
  const publique = createPublicKey(privee);
  const jwk = await exportJWK(publique);
  const kid = await calculateJwkThumbprint(jwk);
  cache = {
    source: source.cle,
    privee,
    publique,
    kid,
    jwk: { ...jwk, kid, alg: ALGORITHME, use: 'sig' },
  };
  return cache;
};

export const initJwtOuArreter = async () => {
  try {
    await chargerCles();
  } catch (err) {
    logger.error(`Clé JWT invalide (${err.message}) : arrêt.`);
    process.exit(1);
  }
};

export const signerJeton = async ({ id, nom_utilisateur: nomUtilisateur, role }) => {
  const { privee, kid } = await chargerCles();
  return new SignJWT({ nom_utilisateur: nomUtilisateur, role })
    .setProtectedHeader({ alg: ALGORITHME, kid, typ: 'JWT' })
    .setSubject(String(id))
    .setIssuer(emetteur())
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_DUREE || DUREE_JETON_ACCES_DEFAUT)
    .sign(privee);
};

/** Renvoie `{ id, nom_utilisateur, role }` ou lève si le jeton est invalide ou expiré. */
export const verifierJeton = async (jeton) => {
  const { publique } = await chargerCles();
  const { payload } = await jwtVerify(jeton, publique, {
    algorithms: [ALGORITHME],
    issuer: emetteur(),
  });
  return { id: Number(payload.sub), nom_utilisateur: payload.nom_utilisateur, role: payload.role };
};

/** Jeu de clés publiques (JWKS) pour les applications qui vérifient nos jetons. */
export const lireJwks = async () => ({ keys: [(await chargerCles()).jwk] });
