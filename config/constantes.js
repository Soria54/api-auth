/** Constantes partagées. Un seuil de sécurité se change ici, jamais en dur ailleurs. */

export const PAGINATION_TAILLE_DEFAUT = 20;
export const PAGINATION_TAILLE_MAX = 100;

export const LIMITE_CORPS_JSON = '1mb';

/** Quota global par IP sur `/api` (requêtes par fenêtre). */
export const LIMITE_REQUETES_API = 300;
export const FENETRE_LIMITE_MS = 60 * 1000;

export const DELAI_DBCHECK_MS = 5000;
/** Quota par IP sur inscription et connexion (anti force brute). */
export const LIMITE_REQUETES_CONNEXION = 10;

export const LONGUEUR_SECRET_JWT_MIN = 32;
// @@constantes
