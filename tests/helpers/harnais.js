/**
 * Harnais de test : vraie base SQLite en mémoire, schéma recréé depuis les modèles
 * (`sync()`, uniquement ici), application Express complète.
 *
 * Limites à garder en tête : SQLite n'est pas la base de production.
 * Collation (casse), longueur des chaînes et types de date diffèrent : une contrainte
 * propre au moteur réel (index unique, CHECK, longueur) se vérifie par la migration,
 * exécutée contre la vraie base.
 */
import { generateKeyPairSync } from 'node:crypto';
import { Sequelize } from 'sequelize';
import { initialiserBase } from '../../models/index.js';
import { creerApp } from '../../app.js';
import { signerJeton } from '../../security/jwt.js';
// @@imports-harnais

// Les tests simulent un proxy (X-Forwarded-For) pour isoler les compteurs des quotas.
process.env.TRUST_PROXY_HOPS ??= '1';

export const creerAppDeTest = async () => {
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    define: { underscored: true, freezeTableName: true },
  });
  const db = initialiserBase(sequelize);
  await sequelize.sync();
  const app = creerApp({ db });
  return { app, db, sequelize };
};

/** Clé Ed25519 créée à chaque lancement des tests : jamais utilisée hors de Vitest. */
export const nouvelleCleDeTest = () =>
  generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' });
export const CLE_DE_TEST = nouvelleCleDeTest();
process.env.JWT_CLE_PRIVEE ??= CLE_DE_TEST;

/** Jeton valide pour les tests (utilisateur fictif, rôle `utilisateur` par défaut). */
export const jetonDeTest = ({ id = 1, nom_utilisateur = 'test', role = 'utilisateur' } = {}) =>
  signerJeton({ id, nom_utilisateur, role });
/**
 * Adresse IP différente à chaque appel (en-tête X-Forwarded-For, `TRUST_PROXY_HOPS=1`) :
 * chaque test a ses propres compteurs dans les limiteurs de débit.
 */
let compteurIp = 0;
export const ipDeTest = () => {
  compteurIp += 1;
  return `10.${Math.floor(compteurIp / 65536) % 256}.${Math.floor(compteurIp / 256) % 256}.${compteurIp % 256}`;
};
// @@helpers-harnais
