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
Schéma validé : [docs/base-de-donnees.md](docs/base-de-donnees.md) (`utilisateur`, `jeton_rafraichissement`).

## Ce que fait cette API

Comptes partagés par plusieurs applications : musculation d'abord, d'autres en SSO plus tard.

- **Ressources** : `utilisateur` (compte + profil facultatif), `jeton_rafraichissement` (sessions).
- **Obligatoire** : `nom_utilisateur` et mot de passe. **Facultatif** : prénom, sexe, email,
  ville, date de naissance. **Jamais** d'adresse postale, de photo, de poids ni de taille
  (poids et taille : application musculation, Soria54/musculation#13).
- **Routes publiques** : `/api/auth/*` (inscription, connexion, rafraîchissement,
  déconnexion), `/.well-known/jwks.json`, routes système. Tout le reste exige un jeton.

## Écarts assumés avec le guide du plugin `api`

| Guide du plugin                             | Ici                                                     | Pourquoi                                                    |
| ------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| Connexion par email                         | Par `nom_utilisateur` (minuscules, `a-z0-9._-`, 3-30)   | L'email est facultatif                                      |
| JWT HS256, `JWT_SECRET`                     | **EdDSA** (Ed25519), `JWT_CLE_PRIVEE_FICHIER`, JWKS     | Les autres applications vérifient sans pouvoir signer (SSO) |
| Jeton unique, 1 h                           | Accès 15 min + rafraîchissement 30 jours, rotation      | Sessions révocables (déconnexion, vol, mot de passe changé) |
| `INSCRIPTION_OUVERTE=false`                 | `true` dans `.env.example`                              | Application grand public                                    |
| `/api/auth/moi`                             | `/api/moi` (GET, PATCH, DELETE, mot de passe, sessions) | Compte complet, hors des routes publiques                   |
| Marqueur `@@routes-publiques` sous la garde | Au-dessus de la garde                                   | Sinon une route « publique » ajoutée là serait protégée     |

## Règles de sécurité propres à ce projet

- Mots de passe : scrypt (`utils/motDePasse.js`), 12 à 128 caractères.
- Jeton de rafraîchissement : 256 bits aléatoires, **seule l'empreinte SHA-256 est stockée**.
  Rotation à chaque usage, dans une transaction. Un jeton remplacé par **rotation** qui revient
  plus de 10 s après = copie : toutes les sessions du compte sont fermées
  (`services/auth.service.js`, `rafraichir`). Un jeton fermé par déconnexion est juste refusé.
- Une session dure 90 jours au plus, rotations comprises (`debut_session`).
- Changement de mot de passe : toutes les sessions sont fermées. Le jeton d'accès en cours
  reste valable jusqu'à son expiration (15 min) : c'est le prix d'une vérification sans base.
- Quotas : 10/min **par IP** sur inscription et connexion ; 60/min par IP sur rafraîchissement
  et déconnexion ; 10/min **par compte** sur `PATCH`, `DELETE /api/moi` et le mot de passe.
- `TRUST_PROXY_HOPS` vaut 0 par défaut (X-Forwarded-For ignoré) ; 1 derrière Traefik.
- Pas de quota par nom d'utilisateur sur la connexion : il permettrait de bloquer le compte de
  quelqu'un d'autre. Mots de passe de 12 caractères minimum + scrypt + quota par IP.
- `409` si l'email est déjà pris (inscription, `PATCH`) : révèle qu'il existe, freiné par les
  quotas. À revoir avec la vérification d'email (Soria54/api-auth#1).
- Clé de signature : jamais dans le dépôt (`secrets/` ignoré par git et Docker). En production,
  secret Docker monté en lecture seule (`deploiement/compose.yaml`).
- Changer la clé = tous les jetons d'accès invalides (les sessions de rafraîchissement restent).

## Plus tard

- Double authentification (TOTP puis email) : Soria54/api-auth#1.
- SSO complet (OpenID Connect, ex. `oidc-provider`) une fois un domaine en place ;
  `JWT_EMETTEUR` = URL publique.
- Jeton de rafraîchissement en cookie `HttpOnly` quand front et API partageront un domaine.
- Déploiement : [deploiement/README.md](deploiement/README.md).
