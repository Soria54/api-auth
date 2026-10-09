/** Compte de l'utilisateur connecté : profil, mot de passe, sessions, suppression. */
import db from '../models/index.js';
import { erreurs } from '../utils/erreurs.js';
import { hacherMotDePasse, verifierMotDePasse } from '../utils/motDePasse.js';
import { verifierEmailLibre } from './auth.service.js';
import { MOTIFS, profil, revoquerToutesLesSessions } from './session.service.js';

const trouver = async (id, scope = 'defaultScope') => {
  const utilisateur = await db.Utilisateur.scope(scope).findByPk(id);
  // Jeton encore valide d'un compte supprimé : traité comme une absence d'authentification.
  if (!utilisateur) throw erreurs.nonAuthentifie();
  return utilisateur;
};

const exigerMotDePasse = async (utilisateur, motDePasse) => {
  if (!(await verifierMotDePasse(motDePasse, utilisateur.mot_de_passe_hash))) {
    throw erreurs.requeteInvalide('Mot de passe incorrect.');
  }
};

export const lire = async (id) => profil(await trouver(id));

export const modifier = async (id, champs) => {
  const utilisateur = await trouver(id);
  const modifications = { ...champs };
  if ('email' in champs && champs.email !== utilisateur.email) {
    await verifierEmailLibre(champs.email, id);
    modifications.email_verifie = false;
  }
  await utilisateur.update(modifications);
  return profil(utilisateur);
};

/** Change le mot de passe et ferme toutes les sessions (y compris celle-ci). */
export const changerMotDePasse = async (
  id,
  { mot_de_passe_actuel: actuel, nouveau_mot_de_passe: nouveau },
) => {
  const utilisateur = await trouver(id, 'avecMotDePasse');
  await exigerMotDePasse(utilisateur, actuel);
  const hash = await hacherMotDePasse(nouveau);
  await db.sequelize.transaction(async (transaction) => {
    await utilisateur.update({ mot_de_passe_hash: hash }, { transaction });
    await revoquerToutesLesSessions(id, MOTIFS.motDePasse, transaction);
  });
};

export const deconnecterPartout = async (id) => {
  await trouver(id);
  await revoquerToutesLesSessions(id, MOTIFS.toutes);
};

/** Supprime le compte et ses sessions, après confirmation par le mot de passe. */
export const supprimer = async (id, { mot_de_passe: motDePasse }) => {
  const utilisateur = await trouver(id, 'avecMotDePasse');
  await exigerMotDePasse(utilisateur, motDePasse);
  await db.sequelize.transaction(async (transaction) => {
    await db.JetonRafraichissement.destroy({ where: { id_utilisateur: id }, transaction });
    await utilisateur.destroy({ transaction });
  });
};
