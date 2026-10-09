/**
 * `/.well-known/jwks.json` : clé publique qui vérifie nos jetons d'accès.
 * Publique par nature : les applications clientes (SSO) la lisent pour vérifier un jeton
 * sans appeler l'API à chaque requête. Hors `/api` : chemin standard (RFC 8615).
 */
import { Router } from 'express';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { lireJwks } from '../security/jwt.js';

const router = Router();

/**
 * @swagger
 * /.well-known/jwks.json:
 *   get:
 *     tags: [AUTH]
 *     summary: Clés publiques (JWKS) pour vérifier les jetons d'accès
 *     security: []
 *     responses:
 *       200: { description: "{ keys: [ { kty: OKP, crv: Ed25519, x, kid, alg: EdDSA, use: sig } ] }" }
 */
router.get(
  '/jwks.json',
  asyncHandler(async (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    // Format JWKS imposé (RFC 7517) : pas d'enveloppe `{ data }`, donc pas de `sendSuccess`.
    res.json(await lireJwks());
  }),
);

export default router;
