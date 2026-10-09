/**
 * Fin de chaîne Express : 404 JSON puis gestionnaire d'erreurs terminal.
 * Jamais de stack trace, de chemin de fichier ni de message brut de librairie
 * dans la réponse, quel que soit NODE_ENV. Seul le serveur journalise le détail.
 */
import { logger } from '../config/logger.js';
import { AppError } from '../utils/erreurs.js';
import { sendError } from '../utils/reponse.js';

export const routeIntrouvable = (req, res) =>
  sendError(res, 'Route introuvable.', 404, { code: 'ROUTE_INTROUVABLE' });

const traduireErreurSequelize = (err) => {
  switch (err.name) {
    case 'SequelizeUniqueConstraintError':
      return new AppError('Cette ressource existe déjà.', 409, 'CONFLIT');
    case 'SequelizeForeignKeyConstraintError':
      return new AppError('Référence invalide ou encore utilisée.', 409, 'CONTRAINTE');
    case 'SequelizeValidationError':
      return new AppError(
        'Données invalides.',
        400,
        'REQUETE_INVALIDE',
        err.errors?.map((e) => ({ champ: e.path, code: e.validatorKey })),
      );
    default:
      return null;
  }
};

// eslint-disable-next-line no-unused-vars
export const gestionnaireErreurs = (err, req, res, _next) => {
  if (err.type === 'entity.parse.failed') {
    return sendError(res, 'Corps JSON invalide.', 400, { code: 'JSON_INVALIDE' });
  }
  if (err.type === 'entity.too.large') {
    return sendError(res, 'Corps de requête trop volumineux.', 413, { code: 'TROP_VOLUMINEUX' });
  }

  const connue = err instanceof AppError ? err : traduireErreurSequelize(err);
  if (connue) {
    if (connue.status >= 500) logger.error(err.message, { stack: err.stack });
    return sendError(res, connue.message, connue.status, {
      code: connue.code,
      details: connue.details,
    });
  }

  logger.error(`Erreur non gérée sur ${req.method} ${req.path} : ${err.message}`, {
    stack: err.stack,
  });
  return sendError(res, 'Erreur interne.', 500, { code: 'ERREUR_INTERNE' });
};
