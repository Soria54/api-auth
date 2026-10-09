/**
 * `/api/moi` : le compte de l'utilisateur du jeton. Monté APRÈS la garde d'authentification.
 * Quotas par compte sur les actions qui vérifient le mot de passe (anti force brute) et sur
 * la modification du profil (anti énumération des emails).
 */
import { Router } from 'express';
import { LIMITE_REQUETES_CONNEXION } from '../config/constantes.js';
import * as controleur from '../controllers/moi.controller.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { creerLimiteur } from '../middlewares/limiteur.js';
import { validerCorps } from '../middlewares/valider.js';
import {
  schemaChangerMotDePasse,
  schemaModifierProfil,
  schemaSupprimerCompte,
} from '../validators/auth.validator.js';

const router = Router();
// Compteurs par compte (l'utilisateur est connu) : changer d'IP ne contourne pas le quota.
const parCompte = (req) => `compte:${req.auth.id}`;
const limiteurMotDePasse = creerLimiteur({ limite: LIMITE_REQUETES_CONNEXION, cle: parCompte });
// PATCH révèle si un email est pris (409) : quota bas contre l'énumération.
const limiteurProfil = creerLimiteur({ limite: LIMITE_REQUETES_CONNEXION, cle: parCompte });

/**
 * @swagger
 * tags:
 *   - name: MOI
 *     description: Compte de l'utilisateur connecté
 */

/**
 * @swagger
 * /api/moi:
 *   get:
 *     tags: [MOI]
 *     summary: Profil de l'utilisateur du jeton
 *     responses:
 *       200: { description: "{ data: Profil }" }
 *       401: { description: Jeton absent ou invalide }
 *   patch:
 *     tags: [MOI]
 *     summary: Modifie les champs facultatifs du profil (null efface un champ)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ChampsProfil' }
 *     responses:
 *       200: { description: "{ data: Profil }" }
 *       400: { description: Champ invalide, inconnu, ou corps vide }
 *       409: { description: Email déjà utilisé }
 *       429: { description: Trop de modifications }
 *   delete:
 *     tags: [MOI]
 *     summary: Supprime le compte et toutes ses sessions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mot_de_passe]
 *             properties:
 *               mot_de_passe: { type: string }
 *     responses:
 *       204: { description: Compte supprimé }
 *       400: { description: Mot de passe incorrect }
 */
router.get('/', asyncHandler(controleur.lire));
router.patch(
  '/',
  limiteurProfil,
  validerCorps(schemaModifierProfil),
  asyncHandler(controleur.modifier),
);
router.delete(
  '/',
  limiteurMotDePasse,
  validerCorps(schemaSupprimerCompte),
  asyncHandler(controleur.supprimer),
);

/**
 * @swagger
 * /api/moi/mot-de-passe:
 *   post:
 *     tags: [MOI]
 *     summary: Change le mot de passe et ferme toutes les sessions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mot_de_passe_actuel, nouveau_mot_de_passe]
 *             properties:
 *               mot_de_passe_actuel: { type: string }
 *               nouveau_mot_de_passe: { type: string, minLength: 12, maxLength: 128 }
 *     responses:
 *       204: { description: Mot de passe changé, reconnexion nécessaire }
 *       400: { description: Mot de passe actuel incorrect ou nouveau invalide }
 */
router.post(
  '/mot-de-passe',
  limiteurMotDePasse,
  validerCorps(schemaChangerMotDePasse),
  asyncHandler(controleur.changerMotDePasse),
);

/**
 * @swagger
 * /api/moi/deconnexion-partout:
 *   post:
 *     tags: [MOI]
 *     summary: Ferme toutes les sessions du compte (tous les appareils)
 *     responses:
 *       204: { description: Sessions fermées }
 */
router.post('/deconnexion-partout', asyncHandler(controleur.deconnecterPartout));

export default router;
