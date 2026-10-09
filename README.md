# API Auth

Comptes utilisateurs et authentification JWT, partagés entre plusieurs applications

API REST Node.js : Express 5, Sequelize (postgres), validation zod, tests Vitest.
Créée avec le plugin Claude Code `api` (hub `atelier`).

## Démarrer

```bash
cp .env.example .env.development   # puis renseigner la base
npm install
npm run db:migrate
npm run dev                        # http://localhost:3000
```

## Commandes

| Commande                                                           | Rôle                                         |
| ------------------------------------------------------------------ | -------------------------------------------- |
| `npm run dev`                                                      | Démarrage avec rechargement                  |
| `npm test` / `npm run test:coverage`                               | Tests Vitest (SQLite en mémoire), seuil 80 % |
| `npm run lint` / `npm run format:check`                            | ESLint (airbnb-base) / Prettier              |
| `npm run db:migrate` · `db:migrate:status` · `db:migrate:rollback` | Migrations SQL                               |
| `npm run db:migration:create -- <description>`                     | Nouvelle migration                           |
| `npm run openapi:generate`                                         | Écrit `openapi/openapi.json`                 |

## Routes

| Méthode | Chemin              | Rôle                           |
| ------- | ------------------- | ------------------------------ |
| GET     | `/`, `/version`     | Nom, version                   |
| GET     | `/healthz`, `/ping` | Sondes (sans base)             |
| GET     | `/dbcheck`          | État de la connexion à la base |

### Authentification (JWT)

| Méthode | Chemin                  | Rôle                                           |
| ------- | ----------------------- | ---------------------------------------------- |
| POST    | `/api/auth/inscription` | Crée un compte (si `INSCRIPTION_OUVERTE=true`) |
| POST    | `/api/auth/connexion`   | Renvoie `{ jeton, utilisateur }`               |
| GET     | `/api/auth/moi`         | Profil du jeton                                |

Toutes les autres routes `/api` exigent `Authorization: Bearer <jeton>`.
<!-- @@routes-readme -->

## Format des réponses

| Cas           | Corps                                                                                |
| ------------- | ------------------------------------------------------------------------------------ |
| Succès        | `{ "data": … }`                                                                      |
| Liste paginée | `{ "data": [...], "pagination": { "total", "page", "size", "totalPages" } }`         |
| Erreur        | `{ "message": "…", "code": "…", "details": [...] }` (`details` absent en production) |
