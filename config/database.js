/**
 * Options Sequelize selon `DB_DIALECT` : postgres, mssql ou sqlite.
 * Lu à l'appel (jamais au chargement du module) : `chargerEnv()` doit avoir tourné avant.
 */

const PORTS_PAR_DEFAUT = { postgres: 5432, mssql: 1433 };

export const DIALECTES = ['postgres', 'mssql', 'sqlite'];

export const lireConfigBase = ({ migration = false } = {}) => {
  const dialecte = process.env.DB_DIALECT || 'postgres';
  if (!DIALECTES.includes(dialecte)) {
    throw new Error(`DB_DIALECT inconnu : ${dialecte} (attendu : ${DIALECTES.join(', ')})`);
  }

  const options = {
    dialect: dialecte,
    logging: false,
    define: { underscored: true, freezeTableName: true },
  };

  if (dialecte === 'sqlite') {
    return { ...options, storage: process.env.DB_STORAGE || ':memory:' };
  }

  const production = process.env.NODE_ENV === 'production';
  return {
    ...options,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || PORTS_PAR_DEFAUT[dialecte],
    database: process.env.DB_NAME,
    username: (migration && process.env.MIGRATION_USER) || process.env.DB_USER,
    password: (migration && process.env.MIGRATION_PASSWORD) || process.env.DB_PASSWORD,
    pool: { max: production ? 20 : 5, min: 0, acquire: 30000, idle: 10000 },
    dialectOptions:
      dialecte === 'mssql'
        ? {
            options: {
              encrypt: process.env.DB_ENCRYPT === 'true',
              trustServerCertificate: process.env.DB_TRUST_SERVER_CERT === 'true',
            },
          }
        : {},
  };
};

export default lireConfigBase;
