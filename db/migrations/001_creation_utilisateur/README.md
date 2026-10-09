# 001_creation_utilisateur

## Objectif

Crée la table `utilisateur` de l'authentification JWT (`/api/auth`).

## Changements

- `email` unique (stocké en minuscules par le validateur), `mot_de_passe_hash` (scrypt), `role` (défaut `utilisateur`).

## Rollback

`npm run db:migrate:rollback` : supprime la table et tous les comptes.
