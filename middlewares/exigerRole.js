/**
 * Exige un des rôles listés (à monter APRÈS `exigerAuthentification`).
 * Sans rôle à la construction : erreur immédiate au chargement (jamais un 403 pour tous).
 */
import { sendError } from '../utils/reponse.js';

export const exigerRole = (...roles) => {
  if (roles.length === 0) throw new Error('exigerRole : au moins un rôle est requis');
  return (req, res, next) =>
    roles.includes(req.auth?.role)
      ? next()
      : sendError(res, 'Accès refusé.', 403, { code: 'INTERDIT' });
};

export default exigerRole;
