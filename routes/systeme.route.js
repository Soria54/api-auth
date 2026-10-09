/**
 * Routes système, hors `/api` et sans authentification :
 * `/`, `/version`, `/healthz` (sonde rapide, sans base), `/ping`, `/dbcheck` (diagnostic base).
 */
import { Router } from 'express';
import { DELAI_DBCHECK_MS } from '../config/constantes.js';
import { lirePackage, lireVersion } from '../utils/version.js';

/**
 * @swagger
 * tags:
 *   - name: Système
 *     description: Sondes et informations de l'API
 */
export const creerRoutesSysteme = ({ db }) => {
  const router = Router();
  const { name } = lirePackage();

  /**
   * @swagger
   * /:
   *   get:
   *     tags: [Système]
   *     summary: Nom et version de l'API
   *     responses:
   *       200:
   *         description: API opérationnelle
   */
  router.get('/', (_req, res) => res.json({ name, version: lireVersion() }));

  /**
   * @swagger
   * /version:
   *   get:
   *     tags: [Système]
   *     summary: Version détaillée
   *     responses:
   *       200:
   *         description: Version, environnement
   */
  router.get('/version', (_req, res) =>
    res.json({ name, version: lireVersion(), environment: process.env.NODE_ENV || 'development' }),
  );

  /**
   * @swagger
   * /healthz:
   *   get:
   *     tags: [Système]
   *     summary: Sonde de vie, sans accès base
   *     responses:
   *       200:
   *         description: "{ status: 'up' }"
   */
  router.get('/healthz', (_req, res) =>
    res.json({ status: 'up', timestamp: new Date().toISOString() }),
  );

  /**
   * @swagger
   * /ping:
   *   get:
   *     tags: [Système]
   *     summary: Réponse immédiate
   *     responses:
   *       200:
   *         description: pong
   */
  router.get('/ping', (_req, res) => res.json({ pong: true }));

  /**
   * @swagger
   * /dbcheck:
   *   get:
   *     tags: [Système]
   *     summary: Diagnostic de la connexion à la base (toujours 200, statut dans le corps)
   *     responses:
   *       200:
   *         description: "{ status: 'connected' | 'disconnected' }"
   */
  router.get('/dbcheck', async (_req, res) => {
    let minuteur;
    try {
      const delai = new Promise((_resolve, reject) => {
        minuteur = setTimeout(() => reject(new Error('délai dépassé')), DELAI_DBCHECK_MS);
      });
      await Promise.race([db.sequelize.authenticate(), delai]);
      return res.json({ status: 'connected', timestamp: new Date().toISOString() });
    } catch {
      return res.json({ status: 'disconnected', timestamp: new Date().toISOString() });
    } finally {
      clearTimeout(minuteur);
    }
  });

  return router;
};

export default creerRoutesSysteme;
