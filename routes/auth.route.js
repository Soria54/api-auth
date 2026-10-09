/**
 * `/api/auth` : routes publiques (inscription, connexion, rafraîchissement, déconnexion).
 * Quotas dédiés par IP, compteurs propres à ce routeur : strict sur inscription et connexion
 * (anti force brute), plus large sur rafraîchissement et déconnexion (usage normal).
 */
import { Router } from 'express';
import { LIMITE_REQUETES_CONNEXION, LIMITE_REQUETES_SESSION } from '../config/constantes.js';
import * as controleur from '../controllers/auth.controller.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { creerLimiteur } from '../middlewares/limiteur.js';
import { validerCorps } from '../middlewares/valider.js';
import {
  schemaConnexion,
  schemaInscription,
  schemaJetonRafraichissement,
} from '../validators/auth.validator.js';

const router = Router();
const limiteurConnexion = creerLimiteur({ limite: LIMITE_REQUETES_CONNEXION });
const limiteurSession = creerLimiteur({ limite: LIMITE_REQUETES_SESSION });

/**
 * @swagger
 * tags:
 *   - name: AUTH
 *     description: Comptes et sessions (jeton d'accès EdDSA + jeton de rafraîchissement)
 * components:
 *   schemas:
 *     Profil:
 *       type: object
 *       properties:
 *         id: { type: integer }
 *         nom_utilisateur: { type: string }
 *         role: { type: string }
 *         prenom: { type: string, nullable: true }
 *         sexe: { type: string, enum: [femme, homme, autre], nullable: true }
 *         email: { type: string, format: email, nullable: true }
 *         email_verifie: { type: boolean }
 *         ville: { type: string, nullable: true }
 *         date_naissance: { type: string, format: date, nullable: true }
 *         derniere_connexion: { type: string, format: date-time, nullable: true }
 *     Session:
 *       type: object
 *       properties:
 *         jeton: { type: string, description: "Jeton d'accès JWT (15 min)" }
 *         jeton_rafraichissement: { type: string, description: "Usage unique, 30 jours" }
 *         utilisateur: { $ref: '#/components/schemas/Profil' }
 *     ChampsProfil:
 *       type: object
 *       properties:
 *         prenom: { type: string, maxLength: 100 }
 *         sexe: { type: string, enum: [femme, homme, autre] }
 *         email: { type: string, format: email, maxLength: 255 }
 *         ville: { type: string, maxLength: 100 }
 *         date_naissance: { type: string, format: date }
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
 *             allOf:
 *               - $ref: '#/components/schemas/ChampsProfil'
 *               - type: object
 *                 required: [nom_utilisateur, mot_de_passe]
 *                 properties:
 *                   nom_utilisateur: { type: string, minLength: 3, maxLength: 30, pattern: '^[a-zA-Z0-9._-]+$' }
 *                   mot_de_passe: { type: string, minLength: 12, maxLength: 128 }
 *     responses:
 *       201: { description: "{ data: Profil }" }
 *       400: { description: Champ invalide ou inconnu }
 *       403: { description: Inscriptions fermées }
 *       409: { description: Nom d'utilisateur ou email déjà utilisé }
 *       429: { description: Trop de tentatives }
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
 *     summary: Échange nom d'utilisateur + mot de passe contre une session
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nom_utilisateur, mot_de_passe]
 *             properties:
 *               nom_utilisateur: { type: string }
 *               mot_de_passe: { type: string }
 *               appareil: { type: string, maxLength: 255, description: "Libellé libre (ex. téléphone)" }
 *     responses:
 *       200: { description: "{ data: Session }" }
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
 * /api/auth/rafraichir:
 *   post:
 *     tags: [AUTH]
 *     summary: Remplace un jeton de rafraîchissement par une nouvelle session
 *     description: Le jeton présenté est révoqué. S'il resert, toutes les sessions du compte sont fermées.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [jeton_rafraichissement]
 *             properties:
 *               jeton_rafraichissement: { type: string }
 *     responses:
 *       200: { description: "{ data: Session }" }
 *       401: { description: Session invalide, expirée ou révoquée }
 */
router.post(
  '/rafraichir',
  limiteurSession,
  validerCorps(schemaJetonRafraichissement),
  asyncHandler(controleur.rafraichir),
);

/**
 * @swagger
 * /api/auth/deconnexion:
 *   post:
 *     tags: [AUTH]
 *     summary: Ferme la session du jeton de rafraîchissement
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [jeton_rafraichissement]
 *             properties:
 *               jeton_rafraichissement: { type: string }
 *     responses:
 *       204: { description: Session fermée (même réponse si le jeton est inconnu) }
 */
router.post(
  '/deconnexion',
  limiteurSession,
  validerCorps(schemaJetonRafraichissement),
  asyncHandler(controleur.deconnecter),
);

export default router;
