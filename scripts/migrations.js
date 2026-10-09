/**
 * Migrations SQL versionnées : `db/migrations/NNN_description/{migration.sql, rollback.sql, README.md}`.
 * Usage : node scripts/migrations.js appliquer | statut | annuler
 *
 * - Historique dans la table `migration_historique` (nom, appliquee_le).
 * - Chaque migration s'exécute dans une transaction : tout ou rien.
 * - SQL Server : lots séparés par une ligne `GO`. SQLite : une instruction par `;` en fin de ligne.
 * - Compte utilisé : MIGRATION_USER / MIGRATION_PASSWORD, à défaut DB_USER / DB_PASSWORD.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { chargerEnv } from '../config/env.js';

chargerEnv();

const { lireConfigBase } = await import('../config/database.js');
const { creerSequelize } = await import('../models/index.js');

const DOSSIER = path.resolve('db/migrations');
const TABLE = 'migration_historique';

const DDL_HISTORIQUE = {
  postgres: `CREATE TABLE IF NOT EXISTS ${TABLE} (nom VARCHAR(255) PRIMARY KEY, appliquee_le TIMESTAMPTZ NOT NULL DEFAULT now())`,
  sqlite: `CREATE TABLE IF NOT EXISTS ${TABLE} (nom TEXT PRIMARY KEY, appliquee_le TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  mssql: `IF OBJECT_ID(N'${TABLE}', N'U') IS NULL CREATE TABLE ${TABLE} (nom NVARCHAR(255) NOT NULL CONSTRAINT PK_${TABLE} PRIMARY KEY, appliquee_le DATETIME2 NOT NULL CONSTRAINT DF_${TABLE}_appliquee_le DEFAULT SYSUTCDATETIME())`,
};

const SEPARATEURS = { mssql: /^\s*GO\s*$/im, sqlite: /;\s*$/m };

// Les lignes de commentaire `--` sont retirées : SQLite ignore silencieusement une
// instruction précédée d'un commentaire.
const sansCommentaires = (lot) =>
  lot
    .split('\n')
    .filter((ligne) => !ligne.trim().startsWith('--'))
    .join('\n')
    .trim();

const decouperEnLots = (sql, dialecte) => {
  const morceaux = SEPARATEURS[dialecte] ? sql.split(SEPARATEURS[dialecte]) : [sql];
  return morceaux.map(sansCommentaires).filter(Boolean);
};

const listerMigrations = () =>
  readdirSync(DOSSIER, { withFileTypes: true })
    .filter((entree) => entree.isDirectory() && /^\d{3}_/.test(entree.name))
    .map((entree) => entree.name)
    .sort();

const executer = async (sequelize, fichier, dialecte, transaction) => {
  for (const lot of decouperEnLots(readFileSync(fichier, 'utf8'), dialecte)) {
    await sequelize.query(lot, { transaction });
  }
};

const main = async () => {
  const commande = process.argv[2] ?? 'statut';
  const config = lireConfigBase({ migration: true });
  const sequelize = creerSequelize(config);
  const { dialect: dialecte } = config;

  try {
    await sequelize.query(DDL_HISTORIQUE[dialecte]);
    const [lignes] = await sequelize.query(`SELECT nom FROM ${TABLE} ORDER BY nom`);
    const appliquees = new Set(lignes.map((ligne) => ligne.nom));
    const toutes = listerMigrations();

    if (commande === 'statut') {
      toutes.forEach((nom) => console.log(`${appliquees.has(nom) ? '✔' : '·'} ${nom}`));
      console.log(`${appliquees.size} appliquée(s), ${toutes.length - appliquees.size} en attente`);
      return;
    }

    if (commande === 'appliquer') {
      const enAttente = toutes.filter((nom) => !appliquees.has(nom));
      for (const nom of enAttente) {
        await sequelize.transaction(async (transaction) => {
          await executer(
            sequelize,
            path.join(DOSSIER, nom, 'migration.sql'),
            dialecte,
            transaction,
          );
          await sequelize.query(`INSERT INTO ${TABLE} (nom) VALUES (:nom)`, {
            replacements: { nom },
            transaction,
          });
        });
        console.log(`✔ ${nom}`);
      }
      console.log(
        enAttente.length ? `${enAttente.length} migration(s) appliquée(s)` : 'Rien à appliquer',
      );
      return;
    }

    if (commande === 'annuler') {
      const derniere = [...appliquees].sort().pop();
      if (!derniere) {
        console.log('Aucune migration à annuler');
        return;
      }
      const rollback = path.join(DOSSIER, derniere, 'rollback.sql');
      if (!existsSync(rollback)) throw new Error(`${derniere} n'a pas de rollback.sql`);
      await sequelize.transaction(async (transaction) => {
        await executer(sequelize, rollback, dialecte, transaction);
        await sequelize.query(`DELETE FROM ${TABLE} WHERE nom = :nom`, {
          replacements: { nom: derniere },
          transaction,
        });
      });
      console.log(`↩ ${derniere} annulée`);
      return;
    }

    throw new Error(`Commande inconnue : ${commande} (appliquer | statut | annuler)`);
  } finally {
    await sequelize.close();
  }
};

main().catch((err) => {
  console.error(`Échec des migrations : ${err.message}`);
  process.exit(1);
});
