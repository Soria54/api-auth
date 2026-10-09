/**
 * Point d'accès unique aux modèles : `import db from '../models/index.js'`.
 *
 * `db` est rempli par `initialiserBase(sequelize)` au démarrage (server.js) ou par le
 * harnais de test (SQLite en mémoire). Les services lisent `db.<Modele>` à l'appel,
 * jamais au chargement du module : c'est ce qui rend les tests indépendants de la vraie base.
 */
import { Sequelize } from 'sequelize';
import { lireConfigBase } from '../config/database.js';
import { defineModels, associerModeles } from './definitions.js';

const db = {};

export const creerSequelize = (options = lireConfigBase()) => new Sequelize(options);

export const initialiserBase = (sequelize) => {
  Object.keys(db).forEach((cle) => delete db[cle]);
  Object.assign(db, associerModeles(defineModels(sequelize)));
  return db;
};

export default db;
