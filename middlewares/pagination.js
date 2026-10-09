/**
 * Lit `?page` et `?size`, les borne, et pose `req.pagination = { page, size, limit, offset }`.
 * Une taille au-delà du maximum est ramenée au maximum (jamais une liste sans borne).
 */
import { PAGINATION_TAILLE_DEFAUT, PAGINATION_TAILLE_MAX } from '../config/constantes.js';

const entierPositif = (valeur, defaut) => {
  const nombre = Number.parseInt(valeur, 10);
  return Number.isInteger(nombre) && nombre > 0 ? nombre : defaut;
};

export const pagination = (req, _res, next) => {
  const page = entierPositif(req.query.page, 1);
  const size = Math.min(
    entierPositif(req.query.size, PAGINATION_TAILLE_DEFAUT),
    PAGINATION_TAILLE_MAX,
  );
  req.pagination = { page, size, limit: size, offset: (page - 1) * size };
  next();
};

export default pagination;
