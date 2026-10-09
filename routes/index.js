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
import moiRoutes from './moi.route.js';
// @@imports-routes

const router = Router();

// Publiques : on ne peut pas exiger un jeton pour obtenir un jeton.
router.use('/auth', authRoutes);
// @@routes-publiques

// Tout ce qui suit exige un jeton valide : refus par défaut.
router.use(exigerAuthentification);

router.use('/moi', moiRoutes);
// @@routes

export default router;
