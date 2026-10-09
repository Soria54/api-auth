import { DataTypes } from 'sequelize';

/**
 * Table `jeton_rafraichissement` — créée par la migration `002_creation_jeton_rafraichissement`.
 * Une ligne par session ouverte (appareil). Seule l'empreinte SHA-256 du jeton est stockée.
 * Une ligne révoquée est gardée jusqu'à expiration : un jeton remplacé par rotation qui
 * revient trahit un vol.
 */
export const defineJetonRafraichissement = (sequelize) =>
  sequelize.define(
    'JetonRafraichissement',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      id_utilisateur: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      jeton_hash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      appareil: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      expire_le: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      revoque_le: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // `rotation`, `deconnexion`, `toutes_sessions`, `mot_de_passe`.
      motif_revocation: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      // Ouverture de la session (connexion), recopiée à chaque rotation : borne la durée totale.
      debut_session: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: 'jeton_rafraichissement',
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  );

export default defineJetonRafraichissement;
