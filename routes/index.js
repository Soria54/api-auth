/**
 * Routeur `/api`. Ordre de montage :
 *   1. routes publiques (`// @@routes-publiques`) ;
 *   2. la garde d'authentification, si l'API en a une (refus par défaut) ;
 *   3. routes métier (`// @@routes`), donc protégées dès que la garde existe.
 * Les marqueurs `// @@…` sont utilisés par les scripts du plugin : ne pas les supprimer.
 */
import { Router } from 'express';
import authRoutes from './auth.route.js';
import { exigerAuthentification } from '../middlewares/exigerAuthentification.js';
// @@imports-routes

const router = Router();

router.use('/auth', authRoutes);

// Tout ce qui suit exige un jeton valide : refus par défaut.
router.use(exigerAuthentification);
// @@routes-publiques

// @@routes

export default router;
