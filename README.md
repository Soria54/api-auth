# API Auth

Comptes utilisateurs et authentification JWT, partagés entre plusieurs applications
(musculation d'abord, d'autres plus tard en SSO).

API REST Node.js : Express 5, Sequelize (postgres), validation zod, tests Vitest.
Créée avec le plugin Claude Code `api` (hub `atelier`).

## Démarrer

```bash
cp .env.example .env.development   # puis renseigner la base
npm install
npm run cle:generer                # clé de signature des jetons (secrets/, non versionné)
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
| `npm run cle:generer [-- <chemin>]`                                | Clé Ed25519 des jetons (n'écrase jamais)     |

## Routes

| Méthode | Chemin                   | Rôle                                                   |
| ------- | ------------------------ | ------------------------------------------------------ |
| GET     | `/`, `/version`          | Nom, version                                           |
| GET     | `/healthz`, `/ping`      | Sondes (sans base)                                     |
| GET     | `/dbcheck`               | État de la connexion à la base                         |
| GET     | `/.well-known/jwks.json` | Clé publique des jetons (pour les autres applications) |

### Authentification (JWT)

| Méthode | Chemin                  | Rôle                                                                      |
| ------- | ----------------------- | ------------------------------------------------------------------------- |
| POST    | `/api/auth/inscription` | Crée un compte (si `INSCRIPTION_OUVERTE=true`)                            |
| POST    | `/api/auth/connexion`   | Renvoie `{ jeton, jeton_rafraichissement, utilisateur }`                  |
| POST    | `/api/auth/rafraichir`  | Nouvelle paire de jetons ; l'ancien jeton de rafraîchissement est révoqué |
| POST    | `/api/auth/deconnexion` | Ferme la session du jeton de rafraîchissement                             |

### Mon compte (jeton exigé)

| Méthode | Chemin                         | Rôle                                              |
| ------- | ------------------------------ | ------------------------------------------------- |
| GET     | `/api/moi`                     | Profil                                            |
| PATCH   | `/api/moi`                     | Champs facultatifs (`null` efface)                |
| DELETE  | `/api/moi`                     | Supprime le compte (mot de passe exigé)           |
| POST    | `/api/moi/mot-de-passe`        | Change le mot de passe, ferme toutes les sessions |
| POST    | `/api/moi/deconnexion-partout` | Ferme toutes les sessions                         |

Toutes les routes `/api` hors `/api/auth` exigent `Authorization: Bearer <jeton>`.

### Utiliser les jetons depuis une application

1. `POST /api/auth/connexion` : garder `jeton` (15 min) et `jeton_rafraichissement` (30 jours).
2. Appeler les API avec `Authorization: Bearer <jeton>`.
3. Sur un 401 : `POST /api/auth/rafraichir`, garder la **nouvelle** paire (l'ancienne ne sert
   plus), rejouer la requête. Un 401 au rafraîchissement : retour à l'écran de connexion.
4. Une autre application vérifie un jeton **sans appeler l'API** : clé publique de
   `/.well-known/jwks.json`, algorithme `EdDSA`, émetteur `JWT_EMETTEUR`. L'identifiant du
   compte est le claim `sub`.

## Déployer

Serveur maison avec Docker : [deploiement/README.md](deploiement/README.md).
<!-- @@routes-readme -->

## Format des réponses

| Cas           | Corps                                                                                |
| ------------- | ------------------------------------------------------------------------------------ |
| Succès        | `{ "data": … }`                                                                      |
| Liste paginée | `{ "data": [...], "pagination": { "total", "page", "size", "totalPages" } }`         |
| Erreur        | `{ "message": "…", "code": "…", "details": [...] }` (`details` absent en production) |
