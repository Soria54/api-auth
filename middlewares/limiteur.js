/**
 * Fabrique de limiteurs de débit. Chaque appel crée une instance NEUVE : deux familles
 * de routes ne partagent jamais leurs compteurs.
 */
import { rateLimit } from 'express-rate-limit';
import { FENETRE_LIMITE_MS } from '../config/constantes.js';
import { sendError } from '../utils/reponse.js';

export const creerLimiteur = ({ limite, fenetreMs = FENETRE_LIMITE_MS, cle } = {}) =>
  rateLimit({
    windowMs: fenetreMs,
    limit: limite,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ...(cle ? { keyGenerator: cle } : {}),
    handler: (_req, res) =>
      sendError(res, 'Trop de requêtes, réessayez plus tard.', 429, { code: 'QUOTA_DEPASSE' }),
  });

export default creerLimiteur;
