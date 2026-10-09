# Migrations

- Un dossier par migration : `NNN_description_snake_case/` avec `migration.sql`, `rollback.sql`, `README.md`.
- Numéro à 3 chiffres, jamais réutilisé, jamais modifié une fois appliqué ailleurs qu'en local.
- Créer : `npm run db:migration:create -- <description>`.
- Appliquer : `npm run db:migrate` · État : `npm run db:migrate:status` · Annuler la dernière : `npm run db:migrate:rollback`.
- Jamais de `sequelize.sync()` hors des tests : le schéma réel vient d'ici.
- Ordre de déploiement : migration d'abord, code ensuite. Rollback : code d'abord, `rollback.sql` ensuite.
