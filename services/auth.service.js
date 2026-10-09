/**
 * Inscription, connexion, profil courant.
 * Connexion : même réponse et même coût (un hachage est toujours calculé) que l'email
 * existe ou non — on ne révèle jamais qu'un compte existe.
 */
import db from '../models/index.js';
import { signerJeton } from '../security/jwt.js';
import { erreurs } from '../utils/erreurs.js';
import { hacherMotDePasse, verifierMotDePasse } from '../utils/motDePasse.js';

const HASH_LEURRE = await hacherMotDePasse('leurre-pour-egaliser-le-temps-de-reponse');

const profil = ({ id, email, role }) => ({ id, email, role });

export const inscrire = async ({ email, mot_de_passe }) => {
  if (process.env.INSCRIPTION_OUVERTE !== 'true') {
    throw erreurs.interdit('Les inscriptions sont fermées.');
  }
  const existant = await db.Utilisateur.findOne({ where: { email } });
  if (existant) throw erreurs.conflit('Cet email est déjà utilisé.');
  const utilisateur = await db.Utilisateur.create({
    email,
    mot_de_passe_hash: await hacherMotDePasse(mot_de_passe),
  });
  return profil(utilisateur);
};

export const connecter = async ({ email, mot_de_passe }) => {
  const utilisateur = await db.Utilisateur.scope('avecMotDePasse').findOne({ where: { email } });
  const valide = await verifierMotDePasse(
    mot_de_passe,
    utilisateur?.mot_de_passe_hash ?? HASH_LEURRE,
  );
  if (!utilisateur || !valide) throw erreurs.nonAuthentifie('Identifiants invalides.');
  return { jeton: await signerJeton(utilisateur), utilisateur: profil(utilisateur) };
};

export const moi = async (id) => {
  const utilisateur = await db.Utilisateur.findByPk(id);
  if (!utilisateur) throw erreurs.nonAuthentifie();
  return profil(utilisateur);
};
