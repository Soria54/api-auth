/**
 * Hachage des mots de passe avec scrypt (node:crypto, aucune dépendance native).
 * Format stocké : `scrypt$<sel hex>$<empreinte hex>`. Comparaison à temps constant.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const LONGUEUR_CLE = 64;

export const hacherMotDePasse = async (motDePasse) => {
  const sel = randomBytes(16);
  const empreinte = await scryptAsync(motDePasse, sel, LONGUEUR_CLE);
  return `scrypt$${sel.toString('hex')}$${empreinte.toString('hex')}`;
};

export const verifierMotDePasse = async (motDePasse, stocke) => {
  const [algo, selHex, empreinteHex] = String(stocke).split('$');
  if (algo !== 'scrypt' || !selHex || !empreinteHex) return false;
  const attendue = Buffer.from(empreinteHex, 'hex');
  const calculee = await scryptAsync(motDePasse, Buffer.from(selHex, 'hex'), attendue.length);
  return attendue.length === calculee.length && timingSafeEqual(attendue, calculee);
};
