/**
 * Erreurs métier. Un service LÈVE une `AppError` ; le gestionnaire d'erreurs
 * terminal (`middlewares/gestionErreurs.js`) la transforme en réponse JSON.
 * Le message d'une AppError est montré au client : il ne doit rien révéler d'interne.
 */
export class AppError extends Error {
  constructor(message, status = 400, code = 'ERREUR', details = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const erreurs = {
  requeteInvalide: (message = 'Requête invalide.', details = undefined) =>
    new AppError(message, 400, 'REQUETE_INVALIDE', details),
  nonAuthentifie: (message = 'Authentification requise.') =>
    new AppError(message, 401, 'AUTH_REQUISE'),
  interdit: (message = 'Accès refusé.') => new AppError(message, 403, 'INTERDIT'),
  introuvable: (message = 'Ressource introuvable.') => new AppError(message, 404, 'INTROUVABLE'),
  conflit: (message = 'Conflit.') => new AppError(message, 409, 'CONFLIT'),
};

export default erreurs;
