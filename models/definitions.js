/**
 * Registre des modèles : `defineModels` déclare, `associerModeles` relie.
 * Un modèle = un fichier `models/<Nom>.js` qui exporte `define<Nom>(sequelize)`.
 * Le schéma réel est créé par les migrations SQL (`db/migrations`), jamais par `sync()`
 * hors des tests.
 */
import { defineJetonRafraichissement } from './JetonRafraichissement.js';
import { defineUtilisateur } from './Utilisateur.js';
// @@imports-modeles

export const defineModels = (sequelize) => ({
  sequelize,
  Utilisateur: defineUtilisateur(sequelize),
  JetonRafraichissement: defineJetonRafraichissement(sequelize),
  // @@modeles
});

export const associerModeles = (m) => {
  m.Utilisateur.hasMany(m.JetonRafraichissement, {
    foreignKey: 'id_utilisateur',
    as: 'jetons',
    onDelete: 'CASCADE',
  });
  m.JetonRafraichissement.belongsTo(m.Utilisateur, {
    foreignKey: 'id_utilisateur',
    as: 'utilisateur',
  });
  // @@associations
  return m;
};
