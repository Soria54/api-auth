/**
 * `/api/auth` : routes publiques (inscription, connexion) et profil courant.
 * Quota dédié par IP sur inscription et connexion (anti force brute), compteurs propres.
 */
import { Router } from 'express';
import { LIMITE_REQUETES_CONNEXION } from '../config/constantes.js';
import * as controleur from '../controllers/auth.controller.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { exigerAuthentification } from '../middlewares/exigerAuthentification.js';
import { creerLimiteur } from '../middlewares/limiteur.js';
import { validerCorps } from '../middlewares/valider.js';
import { schemaConnexion, schemaInscription } from '../validators/auth.validator.js';

const router = Router();
const limiteurConnexion = creerLimiteur({ limite: LIMITE_REQUETES_CONNEXION });

/**
 * @swagger
 * tags:
 *   - name: AUTH
 *     description: Authentification par jeton JWT
 */

/**
 * @swagger
 * /api/auth/inscription:
 *   post:
 *     tags: [AUTH]
 *     summary: Crée un compte (si INSCRIPTION_OUVERTE=true)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, mot_de_passe]
 *             properties:
 *               email: { type: string, format: email }
 *               mot_de_passe: { type: string, minLength: 12 }
 *     responses:
 *       201: { description: "{ data: { id, email, role } }" }
 *       403: { description: Inscriptions fermées }
 *       409: { description: Email déjà utilisé }
 */
router.post(
  '/inscription',
  limiteurConnexion,
  validerCorps(schemaInscription),
  asyncHandler(controleur.inscrire),
);

/**
 * @swagger
 * /api/auth/connexion:
 *   post:
 *     tags: [AUTH]
 *     summary: Échange email + mot de passe contre un jeton
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, mot_de_passe]
 *             properties:
 *               email: { type: string, format: email }
 *               mot_de_passe: { type: string }
 *     responses:
 *       200: { description: "{ data: { jeton, utilisateur } }" }
 *       401: { description: Identifiants invalides }
 *       429: { description: Trop de tentatives }
 */
router.post(
  '/connexion',
  limiteurConnexion,
  validerCorps(schemaConnexion),
  asyncHandler(controleur.connecter),
);

/**
 * @swagger
 * /api/auth/moi:
 *   get:
 *     tags: [AUTH]
 *     summary: Profil de l'utilisateur du jeton
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: "{ data: { id, email, role } }" }
 *       401: { description: Jeton absent ou invalide }
 */
router.get('/moi', exigerAuthentification, asyncHandler(controleur.moi));

export default router;
