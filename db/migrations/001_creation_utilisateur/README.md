# 001_creation_utilisateur

## Objectif

Crée la table `utilisateur` : comptes partagés par les applications qui utilisent l'API.

## Changements

- `nom_utilisateur` unique et obligatoire, toujours en minuscules (contrainte `CHECK`).
- `mot_de_passe_hash` (scrypt), `role` (`utilisateur` par défaut, ou `admin` ; `CHECK`).
- `email` toujours en minuscules (`CHECK`).
- Facultatifs : `prenom`, `sexe` (`femme`, `homme`, `autre`), `email` (unique), `ville`,
  `date_naissance`. `email_verifie` (faux par défaut), `derniere_connexion`.
- Pas d'adresse postale : la ville seulement.

## Rollback

`npm run db:migrate:rollback` : supprime la table et tous les comptes.
