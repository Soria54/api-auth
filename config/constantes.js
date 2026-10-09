/** Constantes partagées. Un seuil de sécurité se change ici, jamais en dur ailleurs. */

export const PAGINATION_TAILLE_DEFAUT = 20;
export const PAGINATION_TAILLE_MAX = 100;

export const LIMITE_CORPS_JSON = '1mb';

/** Quota global par IP sur `/api` (requêtes par fenêtre). */
export const LIMITE_REQUETES_API = 300;
export const FENETRE_LIMITE_MS = 60 * 1000;

export const DELAI_DBCHECK_MS = 5000;
/** Quota par IP sur inscription, connexion et vérification du mot de passe (anti force brute). */
export const LIMITE_REQUETES_CONNEXION = 10;
/** Quota par IP sur rafraîchissement et déconnexion : trafic normal des applications. */
export const LIMITE_REQUETES_SESSION = 60;

/** Durée du jeton d'accès si `JWT_DUREE` est absent : court, car il n'est pas révocable. */
export const DUREE_JETON_ACCES_DEFAUT = '15m';
/** Durée de vie d'un jeton de rafraîchissement (révocable, remplacé à chaque usage). */
export const DUREE_JETON_RAFRAICHISSEMENT_JOURS = 30;
/** Durée maximale d'une session, rotations comprises : ensuite, reconnexion obligatoire. */
export const DUREE_SESSION_MAX_JOURS = 90;
/**
 * Un jeton rejoué moins de N secondes après sa rotation est refusé sans fermer les autres
 * sessions : deux onglets ou un nouvel essai réseau, pas un vol.
 */
export const TOLERANCE_ROTATION_SECONDES = 10;

/** Mots de passe : 12 caractères minimum, 128 maximum (borne le coût de scrypt). */
export const MOT_DE_PASSE_LONGUEUR_MIN = 12;
export const MOT_DE_PASSE_LONGUEUR_MAX = 128;
/** Nom d'utilisateur : minuscules, chiffres, `.`, `_`, `-`. */
export const NOM_UTILISATEUR_LONGUEUR_MIN = 3;
export const NOM_UTILISATEUR_LONGUEUR_MAX = 30;
export const SEXES = ['femme', 'homme', 'autre'];
// @@constantes
