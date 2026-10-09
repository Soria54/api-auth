/**
 * Charge les variables d'environnement AVANT tout module qui lit `process.env`.
 * Ordre : `.env.<NODE_ENV>` puis `.env` (la première valeur trouvée gagne).
 * En test, rien n'est chargé : les tests posent leurs propres variables.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const chargerEnv = () => {
  const environnement = process.env.NODE_ENV || 'development';
  if (environnement === 'test') return;
  dotenv.config({ path: path.join(racine, `.env.${environnement}`), quiet: true });
  dotenv.config({ path: path.join(racine, '.env'), quiet: true });
};

export const estProduction = () => process.env.NODE_ENV === 'production';

export default chargerEnv;
