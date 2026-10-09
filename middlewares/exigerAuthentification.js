/**
 * Exige un jeton `Authorization: Bearer <jwt>` valide et pose `req.auth = { id, email, role }`.
 * Toute absence ou invalidité → même 401 générique (aucun indice sur la cause).
 */
import { verifierJeton } from '../security/jwt.js';
import { sendError } from '../utils/reponse.js';

const refuser = (res) => sendError(res, 'Authentification requise.', 401, { code: 'AUTH_REQUISE' });

export const exigerAuthentification = async (req, res, next) => {
  const [schema, jeton] = (req.headers.authorization ?? '').split(' ');
  if (schema !== 'Bearer' || !jeton) return refuser(res);
  try {
    req.auth = await verifierJeton(jeton);
    return next();
  } catch {
    return refuser(res);
  }
};

export default exigerAuthentification;
