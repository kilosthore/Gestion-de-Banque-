# Design — Compte épargne créé automatiquement à l'inscription

**Date :** 2026-07-20
**Branche :** fusion-emergent-glass
**Statut :** approuvé (brainstorming)

## Contexte

Le type de compte `epargne` existe déjà de bout en bout (modèle, route `POST /comptes`,
UI page « Mes comptes », tests). Un client peut donc **déjà** ouvrir un compte épargne
manuellement. La seule différence avec le compte chèque : le chèque est **provisionné
automatiquement** à l'ouverture du dossier client, pas l'épargne.

## Objectif

À chaque activation d'un nouveau client, ouvrir **automatiquement** un compte épargne
(solde 0 $) en plus du compte chèque (solde 500 $ de bienvenue, inchangé).

Deux chemins d'activation existent et sont les seuls concernés :
1. `POST /api/auth/register` — inscription simple, activation immédiate.
2. `PUT /api/admin/dossiers/:id` (statut `actif`) — validation KYC par un admin.

> Le wizard `POST /api/auth/register-complet` ne crée aucun compte : il dépose un dossier
> `en_verification`. Les comptes naissent à l'étape 2 (validation admin).

## Approche retenue : fonction utilitaire partagée

Une seule source de vérité pour « les comptes ouverts à l'activation d'un client ».

### Nouveau fichier `backend/src/utils/comptes.js`

```
ouvrirComptesInitiaux(proprietaire, options = {})
  → crée un compte 'cheque' (solde 500) puis un compte 'epargne' (solde 0)
  → propage options.transaction si fournie
  → retourne { cheque, epargne }
```

Le chèque est créé en premier pour préserver l'ordre d'affichage existant
(`order: dateOuverture ASC` → le chèque reste le premier compte).

### `auth.routes.js` — `POST /register`

Remplacer le `Compte.create` unique par un appel à `ouvrirComptesInitiaux`,
le tout enveloppé dans une transaction (`sequelize.transaction`) englobant aussi
la création du `User` — garantit qu'on n'a jamais un client à moitié ouvert.

### `admin.routes.js` — `PUT /dossiers/:id`

Déjà dans une transaction. Remplacer le `Compte.create` unique par
`ouvrirComptesInitiaux(user._id, { transaction: t })`.
Réponse : `compte` continue de pointer sur le **chèque** (rétro-compat du test et de l'API),
ajout d'un champ `compteEpargne`.

## Hors périmètre (YAGNI)

- Pas de rétro-remplissage des clients existants qui n'ont qu'un chèque.
- Pas de bonus de bienvenue sur l'épargne (solde 0 $).
- Aucune modification du frontend (création côté serveur ; l'UI liste déjà N comptes).

## Impact sur les tests

- `banque.test.js` : le test « le client a un compte chèque de 500 $ » affirme aujourd'hui
  `toHaveLength(1)`. À mettre à jour → **2 comptes** : 1 chèque (500 $) + 1 épargne (0 $).
- `inscription-complete.test.js` : après validation admin, ajouter une assertion vérifiant
  la présence du compte épargne (0 $) en plus du chèque.
- Autres tests (`phase4` `>= 1`, `dashboard` créé à la main, `fraude-budgets`) : non impactés.

## Critères de succès

1. Après `POST /register`, `GET /comptes` renvoie 2 comptes : chèque 500 $ + épargne 0 $.
2. Après validation admin d'un dossier, le client possède aussi ces 2 comptes.
3. Atomicité : en cas d'échec, ni user à moitié créé, ni un seul des deux comptes.
4. Toute la suite `npm test` passe.
