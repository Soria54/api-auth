#!/usr/bin/env node
/**
 * Génère la clé privée Ed25519 qui signe les jetons d'accès.
 * Usage : npm run cle:generer [-- <chemin>]   (défaut : secrets/jwt-ed25519.pem)
 * N'écrase jamais une clé existante : changer de clé déconnecte tout le monde.
 * Le fichier est créé en 0600 ; `secrets/` est ignoré par git.
 */
import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const chemin = resolve(process.argv[2] ?? 'secrets/jwt-ed25519.pem');

if (existsSync(chemin)) {
  console.error(`${chemin} existe déjà : rien n'est écrasé.`);
  process.exit(1);
}

const { privateKey } = generateKeyPairSync('ed25519');
mkdirSync(dirname(chemin), { recursive: true, mode: 0o700 });
writeFileSync(chemin, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600 });
console.warn(`Clé écrite : ${chemin}`);
console.warn(`À mettre dans .env : JWT_CLE_PRIVEE_FICHIER=${chemin}`);
