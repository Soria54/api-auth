import { DataTypes } from 'sequelize';

/** Table `utilisateur` — créée par la migration `001_creation_utilisateur`. */
export const defineUtilisateur = (sequelize) =>
  sequelize.define(
    'Utilisateur',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      // Toujours en minuscules (le validateur normalise) : unicité insensible à la casse.
      nom_utilisateur: {
        type: DataTypes.STRING(30),
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
      prenom: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      sexe: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      // Facultatif ; plusieurs NULL sont permis par l'index unique.
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
      },
      email_verifie: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      ville: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      date_naissance: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      derniere_connexion: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'utilisateur',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      // Le hash ne sort jamais par défaut : `scope('avecMotDePasse')` pour le vérifier.
      defaultScope: { attributes: { exclude: ['mot_de_passe_hash'] } },
      scopes: { avecMotDePasse: { attributes: { include: ['mot_de_passe_hash'] } } },
    },
  );

export default defineUtilisateur;
