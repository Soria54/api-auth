/**
 * Registre des modèles : `defineModels` déclare, `associerModeles` relie.
 * Un modèle = un fichier `models/<Nom>.js` qui exporte `define<Nom>(sequelize)`.
 * Le schéma réel est créé par les migrations SQL (`db/migrations`), jamais par `sync()`
 * hors des tests.
 */
import { defineUtilisateur } from './Utilisateur.js';
// @@imports-modeles

export const defineModels = (sequelize) => ({
  sequelize,
  Utilisateur: defineUtilisateur(sequelize),
  // @@modeles
});

export const associerModeles = (m) => {
  // @@associations
  return m;
};
