/**
 * Jetons de rafraîchissement : une valeur aléatoire opaque (256 bits), remise une seule fois
 * au client. La base n'en garde que l'empreinte SHA-256 : une fuite de la table ne permet
 * pas d'ouvrir de session. Pas besoin de sel ni de scrypt : la valeur est déjà aléatoire.
 */
import { createHash, randomBytes } from 'node:crypto';

export const empreinteJeton = (jeton) => createHash('sha256').update(jeton).digest('hex');

export const genererJetonRafraichissement = () => {
  const jeton = randomBytes(32).toString('base64url');
  return { jeton, empreinte: empreinteJeton(jeton) };
};
