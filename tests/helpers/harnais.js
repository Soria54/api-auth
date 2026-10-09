/**
 * Harnais de test : vraie base SQLite en mémoire, schéma recréé depuis les modèles
 * (`sync()`, uniquement ici), application Express complète.
 *
 * Limites à garder en tête : SQLite n'est pas la base de production.
 * Collation (casse), longueur des chaînes et types de date diffèrent : une contrainte
 * propre au moteur réel (index unique, CHECK, longueur) se vérifie par la migration,
 * exécutée contre la vraie base.
 */
import { Sequelize } from 'sequelize';
import { initialiserBase } from '../../models/index.js';
import { creerApp } from '../../app.js';
import { signerJeton } from '../../security/jwt.js';
// @@imports-harnais

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

/** Secret réservé aux tests : jamais utilisé hors de Vitest. */
export const SECRET_DE_TEST = 'secret-de-test-uniquement-0123456789abcdef';
process.env.JWT_SECRET ??= SECRET_DE_TEST;

/** Jeton valide pour les tests (utilisateur fictif, rôle `utilisateur` par défaut). */
export const jetonDeTest = ({ id = 1, email = 'test@exemple.fr', role = 'utilisateur' } = {}) =>
  signerJeton({ id, email, role });
// @@helpers-harnais
