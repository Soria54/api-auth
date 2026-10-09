/**
 * Construction de l'application Express, sans écoute réseau (testable avec supertest).
 *
 * Ordre de montage — ne pas le changer sans raison écrite :
 *   1. trust proxy, journal HTTP (avant tout : même les requêtes rejetées sont tracées)
 *   2. helmet, CORS, lecture du corps JSON (taille bornée)
 *   3. routes système (hors /api, sans authentification)
 *   4. quota global puis routes /api
 *   5. 404 JSON puis gestionnaire d'erreurs terminal
 */
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { FENETRE_LIMITE_MS, LIMITE_CORPS_JSON, LIMITE_REQUETES_API } from './config/constantes.js';
import { httpLogger } from './config/logger.js';
import { gestionnaireErreurs, routeIntrouvable } from './middlewares/gestionErreurs.js';
import { creerLimiteur } from './middlewares/limiteur.js';
import routes from './routes/index.js';
import { creerRoutesSysteme } from './routes/systeme.route.js';

const lireOriginesCors = () =>
  (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origine) => origine.trim())
    .filter(Boolean);

const lireTrustProxy = () => {
  const valeur = Number(process.env.TRUST_PROXY_HOPS);
  return Number.isInteger(valeur) && valeur >= 0 ? valeur : 1;
};

export const creerApp = ({ db }) => {
  const app = express();

  app.set('trust proxy', lireTrustProxy());
  app.disable('x-powered-by');
  app.use(httpLogger);

  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(cors({ origin: lireOriginesCors(), credentials: true }));
  app.use(express.json({ limit: LIMITE_CORPS_JSON }));

  app.use(creerRoutesSysteme({ db }));

  app.use('/api', creerLimiteur({ limite: LIMITE_REQUETES_API, fenetreMs: FENETRE_LIMITE_MS }));
  app.use('/api', routes);

  app.use(routeIntrouvable);
  app.use(gestionnaireErreurs);

  return app;
};

export default creerApp;
