/**
 * Point d'entrée : environnement, base, application, écoute, arrêt propre.
 * L'environnement est chargé AVANT l'import des modules qui lisent `process.env`.
 */
import { chargerEnv } from './config/env.js';

chargerEnv();

const { logger } = await import('./config/logger.js');
const { creerSequelize, initialiserBase } = await import('./models/index.js');
const { creerApp } = await import('./app.js');
const { initJwtOuArreter } = await import('./security/jwt.js');

initJwtOuArreter();
// @@demarrage

const sequelize = creerSequelize();
const db = initialiserBase(sequelize);
const app = creerApp({ db });

const port = Number(process.env.PORT) || 3000;
const serveur = app.listen(port, () => {
  logger.info(`API démarrée sur http://localhost:${port} (${process.env.NODE_ENV})`);
});

// Connexion vérifiée sans bloquer le démarrage : /healthz répond même si la base est absente.
sequelize
  .authenticate()
  .then(() => logger.info(`Base connectée (${sequelize.getDialect()})`))
  .catch((err) => logger.error(`Base inaccessible : ${err.message}`));

const arreter = (signal) => {
  logger.info(`Arrêt demandé (${signal})`);
  serveur.close(async () => {
    await sequelize.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => arreter('SIGTERM'));
process.on('SIGINT', () => arreter('SIGINT'));
process.on('unhandledRejection', (raison) => {
  logger.error(`Promesse rejetée non gérée : ${raison}`);
});
