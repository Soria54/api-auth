/**
 * Validation par schéma zod, montée AVANT le contrôleur : une entrée invalide répond 400
 * sans jamais atteindre la base.
 *
 * Le résultat validé (et converti) est écrit dans `req.valide.{corps,params,query}`.
 * `req.body`, `req.params` et `req.query` ne sont jamais modifiés.
 * Le détail renvoyé ne contient que `{ champ, code }` (jamais le message anglais de zod).
 */
import { sendError } from '../utils/reponse.js';

const construireValidateur = (schema, lireSource, cle) => (req, res, next) => {
  const resultat = schema.safeParse(lireSource(req));
  if (!resultat.success) {
    const champs = resultat.error.issues.map((issue) => ({
      champ: issue.path.join('.'),
      code: issue.code,
    }));
    return sendError(res, 'Requête invalide.', 400, { code: 'REQUETE_INVALIDE', details: champs });
  }
  req.valide = { ...req.valide, [cle]: resultat.data };
  return next();
};

export const validerCorps = (schema) => construireValidateur(schema, (req) => req.body, 'corps');
export const validerParams = (schema) =>
  construireValidateur(schema, (req) => req.params, 'params');
export const validerQuery = (schema) => construireValidateur(schema, (req) => req.query, 'query');
