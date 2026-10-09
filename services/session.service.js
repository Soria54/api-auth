/**
 * Sessions : émission d'une paire jeton d'accès + jeton de rafraîchissement, rotation,
 * révocation. Partagé par `auth.service.js` et `compte.service.js`.
 */
import { Op } from 'sequelize';
import { DUREE_JETON_RAFRAICHISSEMENT_JOURS } from '../config/constantes.js';
import db from '../models/index.js';
import { signerJeton } from '../security/jwt.js';
import { genererJetonRafraichissement } from '../security/jetonRafraichissement.js';

const JOUR_MS = 24 * 60 * 60 * 1000;

/** Cause d'une révocation : seule une `rotation` rejouée trahit un vol. */
export const MOTIFS = {
  rotation: 'rotation',
  deconnexion: 'deconnexion',
  toutes: 'toutes_sessions',
  motDePasse: 'mot_de_passe',
};

/** Ce que l'API montre d'un compte (jamais le hash). */
export const profil = (u) => ({
  id: u.id,
  nom_utilisateur: u.nom_utilisateur,
  role: u.role,
  prenom: u.prenom ?? null,
  sexe: u.sexe ?? null,
  email: u.email ?? null,
  email_verifie: Boolean(u.email_verifie),
  ville: u.ville ?? null,
  date_naissance: u.date_naissance ?? null,
  derniere_connexion: u.derniere_connexion ?? null,
});

/**
 * Émet une paire de jetons. Nouvelle session (connexion) ou suite d'une session (rotation :
 * `debutSession` est recopié, pour borner la durée totale). Purge les sessions expirées.
 */
export const emettreJetons = async (
  utilisateur,
  { appareil = null, debutSession = new Date(), transaction } = {},
) => {
  const maintenant = new Date();
  await db.JetonRafraichissement.destroy({
    where: { id_utilisateur: utilisateur.id, expire_le: { [Op.lte]: maintenant } },
    transaction,
  });
  const { jeton, empreinte } = genererJetonRafraichissement();
  await db.JetonRafraichissement.create(
    {
      id_utilisateur: utilisateur.id,
      jeton_hash: empreinte,
      appareil,
      debut_session: debutSession,
      expire_le: new Date(maintenant.getTime() + DUREE_JETON_RAFRAICHISSEMENT_JOURS * JOUR_MS),
    },
    { transaction },
  );
  return {
    jeton: await signerJeton(utilisateur),
    jeton_rafraichissement: jeton,
    utilisateur: profil(utilisateur),
  };
};

/** Ferme toutes les sessions encore ouvertes d'un compte. */
export const revoquerToutesLesSessions = (idUtilisateur, motif, transaction) =>
  db.JetonRafraichissement.update(
    { revoque_le: new Date(), motif_revocation: motif },
    { where: { id_utilisateur: idUtilisateur, revoque_le: null }, transaction },
  );
