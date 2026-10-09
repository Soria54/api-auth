/**
 * Inscription, connexion, rafraîchissement, déconnexion.
 * Connexion : même réponse et même coût (un hachage est toujours calculé) que le nom
 * d'utilisateur existe ou non.
 */
import { DUREE_SESSION_MAX_JOURS, TOLERANCE_ROTATION_SECONDES } from '../config/constantes.js';
import { logger } from '../config/logger.js';
import db from '../models/index.js';
import { empreinteJeton } from '../security/jetonRafraichissement.js';
import { erreurs } from '../utils/erreurs.js';
import { hacherMotDePasse, verifierMotDePasse } from '../utils/motDePasse.js';
import { MOTIFS, emettreJetons, profil, revoquerToutesLesSessions } from './session.service.js';

const HASH_LEURRE = await hacherMotDePasse('leurre-pour-egaliser-le-temps-de-reponse');

const refuserSession = () => erreurs.nonAuthentifie('Session invalide ou expirée.');

export const verifierEmailLibre = async (email, idUtilisateur = null) => {
  if (!email) return;
  const existant = await db.Utilisateur.findOne({ where: { email } });
  if (existant && existant.id !== idUtilisateur) {
    throw erreurs.conflit('Cet email est déjà utilisé.');
  }
};

export const inscrire = async ({ mot_de_passe: motDePasse, ...donnees }) => {
  if (process.env.INSCRIPTION_OUVERTE !== 'true') {
    throw erreurs.interdit('Les inscriptions sont fermées.');
  }
  const existant = await db.Utilisateur.findOne({
    where: { nom_utilisateur: donnees.nom_utilisateur },
  });
  if (existant) throw erreurs.conflit("Ce nom d'utilisateur est déjà pris.");
  await verifierEmailLibre(donnees.email);
  const utilisateur = await db.Utilisateur.create({
    ...donnees,
    mot_de_passe_hash: await hacherMotDePasse(motDePasse),
  });
  return profil(utilisateur);
};

export const connecter = async ({
  nom_utilisateur: nomUtilisateur,
  mot_de_passe: motDePasse,
  appareil,
}) => {
  const utilisateur = await db.Utilisateur.scope('avecMotDePasse').findOne({
    where: { nom_utilisateur: nomUtilisateur },
  });
  const valide = await verifierMotDePasse(
    motDePasse,
    utilisateur?.mot_de_passe_hash ?? HASH_LEURRE,
  );
  if (!utilisateur || !valide) throw erreurs.nonAuthentifie('Identifiants invalides.');
  await utilisateur.update({ derniere_connexion: new Date() });
  return emettreJetons(utilisateur, { appareil: appareil ?? null });
};

const JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Rotation : le jeton présenté est révoqué et remplacé, dans une transaction (pas de session
 * perdue si l'émission échoue). Un jeton déjà remplacé qui revient, hors tolérance, signifie
 * qu'il a été copié : toutes les sessions du compte sont fermées. Un jeton fermé par une
 * déconnexion est seulement refusé.
 */
export const rafraichir = async ({ jeton_rafraichissement: jeton }) => {
  const ligne = await db.JetonRafraichissement.findOne({
    where: { jeton_hash: empreinteJeton(jeton) },
  });
  if (!ligne) throw refuserSession();

  const maintenant = Date.now();
  if (ligne.revoque_le) {
    const ecoule = maintenant - new Date(ligne.revoque_le).getTime();
    if (ligne.motif_revocation === MOTIFS.rotation && ecoule > TOLERANCE_ROTATION_SECONDES * 1000) {
      await revoquerToutesLesSessions(ligne.id_utilisateur, MOTIFS.toutes);
      logger.warn(
        `Jeton de rafraîchissement rejoué : sessions du compte ${ligne.id_utilisateur} fermées`,
      );
    }
    throw refuserSession();
  }
  const debutSession = new Date(ligne.debut_session);
  if (
    new Date(ligne.expire_le).getTime() <= maintenant ||
    debutSession.getTime() + DUREE_SESSION_MAX_JOURS * JOUR_MS <= maintenant
  ) {
    throw refuserSession();
  }

  return db.sequelize.transaction(async (transaction) => {
    // Mise à jour conditionnelle : deux appels simultanés avec le même jeton, un seul gagne.
    const [modifiees] = await db.JetonRafraichissement.update(
      { revoque_le: new Date(), motif_revocation: MOTIFS.rotation },
      { where: { id: ligne.id, revoque_le: null }, transaction },
    );
    if (modifiees === 0) throw refuserSession();

    const utilisateur = await db.Utilisateur.findByPk(ligne.id_utilisateur, { transaction });
    if (!utilisateur) throw refuserSession();
    return emettreJetons(utilisateur, { appareil: ligne.appareil, debutSession, transaction });
  });
};

/** Ferme la session du jeton. Ne dit jamais si le jeton existait. */
export const deconnecter = async ({ jeton_rafraichissement: jeton }) => {
  await db.JetonRafraichissement.update(
    { revoque_le: new Date(), motif_revocation: MOTIFS.deconnexion },
    { where: { jeton_hash: empreinteJeton(jeton), revoque_le: null } },
  );
};
