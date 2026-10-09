/** Schémas zod de `/api/auth`. */
import { z } from 'zod';

const email = z
  .email()
  .max(255)
  .transform((valeur) => valeur.trim().toLowerCase());

export const schemaInscription = z.strictObject({
  email,
  mot_de_passe: z.string().min(12).max(128),
});

export const schemaConnexion = z.strictObject({
  email,
  mot_de_passe: z.string().min(1).max(128),
});
