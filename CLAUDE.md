# API Auth

Comptes utilisateurs et authentification JWT, partagés entre plusieurs applications

API créée avec le plugin Claude Code **`api`** (modèle `0.4.0`). Les règles
complètes sont dans le guide du plugin (`architecture/GUIDE.md`) ; l'essentiel est ici.

## Architecture

```
route (validation zod, pagination, garde) → contrôleur (req/res) → service (métier + Sequelize) → modèle
```

| Dossier          | Rôle                                                                 | Règle                                                             |
| ---------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `routes/`        | Chemins, middlewares, blocs `@swagger`                               | Aucune logique                                                    |
| `controllers/`   | Lit `req.valide`, appelle le service, répond avec `utils/reponse.js` | Pas de try/catch : `asyncHandler` + gestionnaire terminal         |
| `services/`      | Règles métier, accès Sequelize via `db.<Modele>`                     | Lève `erreurs.*` (`utils/erreurs.js`), ne connaît pas `req`/`res` |
| `models/`        | Un fichier par modèle, enregistré dans `models/definitions.js`       | Le schéma réel vient des migrations                               |
| `validators/`    | Schémas zod (`z.strictObject`)                                       | Une clé inconnue → 400                                            |
| `middlewares/`   | Transverse : validation, pagination, quotas, erreurs                 |                                                                   |
| `db/migrations/` | `NNN_description/{migration.sql, rollback.sql, README.md}`           | Jamais de `sync()` hors tests                                     |
| `tests/`         | `unit/` et `integration/` (supertest + SQLite mémoire)               | Seuil de couverture 80 %                                          |

## Invariants

- Réponses : toujours `sendSuccess` / `sendCreated` / `sendPaginated` / `sendNoContent` / `sendError`.
- Erreurs : jamais de stack ni de message de librairie dans une réponse ; 404 et 500 en JSON.
- Listes : toujours paginées (`middlewares/pagination.js`, taille max 100).
- Logs : `config/logger.js`, jamais `console.log`. Pas de query string ni de secret dans les logs.
- Secrets : `.env.<environnement>` non versionné ; `.env.example` à jour à chaque nouvelle variable.
- Marqueurs `// @@…` : utilisés par les scripts du plugin, ne pas les supprimer.
- Commits : conventional commits (vérifiés par commitlint), jamais `--no-verify`.

## Ajouter une ressource

Avec le plugin : `node <plugin api>/scripts/ajouter-ressource.mjs . <nom> --champs "titre:string!,…"`,
puis `npm run db:migrate`. Sinon, copier une ressource existante (route, contrôleur, service,
validateur, modèle, migration, test) et l'enregistrer dans `models/definitions.js` et `routes/index.js`.

## Base de données

Dialecte : **postgres** (`DB_DIALECT`). Migrations écrites dans ce dialecte.
