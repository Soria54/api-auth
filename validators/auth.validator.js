/** Schémas zod de `/api/auth` et `/api/moi`. */
import { z } from 'zod';
import {
  MOT_DE_PASSE_LONGUEUR_MAX,
  MOT_DE_PASSE_LONGUEUR_MIN,
  NOM_UTILISATEUR_LONGUEUR_MAX,
  NOM_UTILISATEUR_LONGUEUR_MIN,
  SEXES,
} from '../config/constantes.js';

const DATE_NAISSANCE_MIN = '1900-01-01';
const aujourdhui = () => new Date().toISOString().slice(0, 10);

/** Normalisé en minuscules : `Alice` et `alice` sont le même compte. */
const nomUtilisateur = z
  .string()
  .trim()
  .toLowerCase()
  .min(NOM_UTILISATEUR_LONGUEUR_MIN)
  .max(NOM_UTILISATEUR_LONGUEUR_MAX)
  .regex(/^[a-z0-9._-]+$/);

const nouveauMotDePasse = z.string().min(MOT_DE_PASSE_LONGUEUR_MIN).max(MOT_DE_PASSE_LONGUEUR_MAX);
const motDePasseSaisi = z.string().min(1).max(MOT_DE_PASSE_LONGUEUR_MAX);

/** Champs facultatifs du profil. Pas d'adresse postale : la ville seulement. */
const champsProfil = {
  prenom: z.string().trim().min(1).max(100),
  sexe: z.enum(SEXES),
  email: z.string().trim().toLowerCase().max(255).pipe(z.email()),
  ville: z.string().trim().min(1).max(100),
  date_naissance: z.iso.date().refine((date) => date >= DATE_NAISSANCE_MIN && date < aujourdhui(), {
    message: 'Date de naissance hors limites.',
  }),
};

const facultatifs = (nullable) =>
  Object.fromEntries(
    Object.entries(champsProfil).map(([cle, schema]) => [
      cle,
      nullable ? schema.nullable().optional() : schema.optional(),
    ]),
  );

export const schemaInscription = z.strictObject({
  nom_utilisateur: nomUtilisateur,
  mot_de_passe: nouveauMotDePasse,
  ...facultatifs(false),
});

export const schemaConnexion = z.strictObject({
  nom_utilisateur: z.string().trim().toLowerCase().min(1).max(NOM_UTILISATEUR_LONGUEUR_MAX),
  mot_de_passe: motDePasseSaisi,
  appareil: z.string().trim().max(255).optional(),
});

export const schemaJetonRafraichissement = z.strictObject({
  jeton_rafraichissement: z.string().min(1).max(200),
});

/** `null` efface un champ facultatif. Au moins un champ. */
export const schemaModifierProfil = z
  .strictObject(facultatifs(true))
  .refine((corps) => Object.keys(corps).length > 0, { message: 'Aucun champ à modifier.' });

export const schemaChangerMotDePasse = z
  .strictObject({
    mot_de_passe_actuel: motDePasseSaisi,
    nouveau_mot_de_passe: nouveauMotDePasse,
  })
  .refine((corps) => corps.mot_de_passe_actuel !== corps.nouveau_mot_de_passe, {
    message: 'Le nouveau mot de passe doit être différent.',
    path: ['nouveau_mot_de_passe'],
  });

export const schemaSupprimerCompte = z.strictObject({
  mot_de_passe: motDePasseSaisi,
});
