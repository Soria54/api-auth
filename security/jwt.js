/**
 * Jetons JWT signés par l'API (HS256, secret partagé `JWT_SECRET`).
 *
 * Fail-closed : sans secret valide (absent ou trop court), l'API refuse de démarrer
 * (`initJwtOuArreter`). Jamais de secret par défaut, jamais de mode « sans vérification ».
 * L'algorithme est imposé à la vérification : un jeton `alg: none` ou RS256 est refusé.
 */
import { SignJWT, jwtVerify } from 'jose';
import { LONGUEUR_SECRET_JWT_MIN } from '../config/constantes.js';
import { logger } from '../config/logger.js';
import { lirePackage } from '../utils/version.js';

const ALGORITHME = 'HS256';
const emetteur = () => lirePackage().name;

const lireSecret = () => {
  const secret = process.env.JWT_SECRET ?? '';
  if (secret.length < LONGUEUR_SECRET_JWT_MIN) {
    throw new Error(
      `JWT_SECRET absent ou trop court (${LONGUEUR_SECRET_JWT_MIN} caractères minimum)`,
    );
  }
  return new TextEncoder().encode(secret);
};

export const initJwtOuArreter = () => {
  try {
    lireSecret();
  } catch (err) {
    logger.error(`${err.message} : arrêt.`);
    process.exit(1);
  }
};

export const signerJeton = async ({ id, email, role }) =>
  new SignJWT({ email, role })
    .setProtectedHeader({ alg: ALGORITHME })
    .setSubject(String(id))
    .setIssuer(emetteur())
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_DUREE || '1h')
    .sign(lireSecret());

/** Renvoie `{ id, email, role }` ou lève si le jeton est invalide ou expiré. */
export const verifierJeton = async (jeton) => {
  const { payload } = await jwtVerify(jeton, lireSecret(), {
    algorithms: [ALGORITHME],
    issuer: emetteur(),
  });
  return { id: Number(payload.sub), email: payload.email, role: payload.role };
};
