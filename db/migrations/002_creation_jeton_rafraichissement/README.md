# 002_creation_jeton_rafraichissement

## Objectif

Crée la table `jeton_rafraichissement` : une ligne par session ouverte (appareil).

## Changements

- `jeton_hash` : empreinte SHA-256 du jeton (jamais le jeton lui-même), unique.
- `expire_le` (30 jours), `revoque_le` et `motif_revocation` (`rotation`, `deconnexion`,
  `toutes_sessions`, `mot_de_passe`) : seule une `rotation` rejouée ferme toutes les sessions.
- `debut_session` : date de connexion, recopiée à chaque rotation (90 jours au plus).
- `id_utilisateur` → `utilisateur.id`, `ON DELETE CASCADE` : supprimer un compte ferme ses sessions.
- Index sur `id_utilisateur` (révocation de toutes les sessions d'un compte).

## Rollback

`npm run db:migrate:rollback` : supprime la table ; toutes les sessions sont fermées.
