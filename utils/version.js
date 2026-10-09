import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const lirePackage = () =>
  JSON.parse(readFileSync(path.join(racine, 'package.json'), 'utf8'));

/** Version affichée : `APP_VERSION` (posée par la CI/le déploiement), sinon package.json. */
export const lireVersion = () => process.env.APP_VERSION || lirePackage().version;
