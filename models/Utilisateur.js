import { DataTypes } from 'sequelize';

/** Table `utilisateur` — créée par la migration `creation_utilisateur`. */
export const defineUtilisateur = (sequelize) =>
  sequelize.define(
    'Utilisateur',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      mot_de_passe_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'utilisateur',
      },
    },
    {
      tableName: 'utilisateur',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      // Le hash ne sort jamais par défaut : `scope('avecMotDePasse')` pour la connexion.
      defaultScope: { attributes: { exclude: ['mot_de_passe_hash'] } },
      scopes: { avecMotDePasse: { attributes: { include: ['mot_de_passe_hash'] } } },
    },
  );

export default defineUtilisateur;
