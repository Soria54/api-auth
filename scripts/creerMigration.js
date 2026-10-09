/**
 * Crée `db/migrations/NNN_<description>/` depuis `db/migrations/templates`.
 * Usage : npm run db:migration:create -- ajout_colonne_echeance
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const description = (process.argv[2] ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_|_$/g, '');
if (!description) {
  console.error('Usage : npm run db:migration:create -- <description_en_snake_case>');
  process.exit(1);
}

const dossier = path.resolve('db/migrations');
const numeros = readdirSync(dossier)
  .map((nom) => Number.parseInt(nom.slice(0, 3), 10))
  .filter(Number.isInteger);
const numero = String(Math.max(0, ...numeros) + 1).padStart(3, '0');
const cible = path.join(dossier, `${numero}_${description}`);

if (existsSync(cible)) {
  console.error(`${cible} existe déjà`);
  process.exit(1);
}
mkdirSync(cible);
for (const fichier of ['migration.sql', 'rollback.sql', 'README.md']) {
  cpSync(path.join(dossier, 'templates', fichier), path.join(cible, fichier));
  const contenu = readFileSync(path.join(cible, fichier), 'utf8').replaceAll(
    '{{migration}}',
    `${numero}_${description}`,
  );
  writeFileSync(path.join(cible, fichier), contenu);
}
console.log(`Créée : db/migrations/${numero}_${description}/`);
