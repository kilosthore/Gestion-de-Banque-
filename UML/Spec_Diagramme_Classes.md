# Spécification — Diagramme de classes (Gestion de banque)

Aligné sur le cahier des charges (collections MongoDB + User Stories de la grille).
Format : `nom : type` pour les attributs ; `methode(param:type) : retour` pour les opérations.

> Déjà saisi dans Astah : **Client**, **Administrateur**, **Compte** (attributs).
> Reste à compléter : les méthodes + les 8 autres classes + les relations.

---

## Classes

### Client  *(attributs faits)*
- id : String
- nom : String
- prenom : String
- email : String
- motDePasseHache : String
- dateCreation : Date

Méthodes : `creerProfil()`, `selectionnerProfil()`, `consulterComptes()`, `consulterHistorique()`

### Administrateur  *(attributs faits)*
- id : String
- nom : String
- email : String
- motDePasseHache : String

Méthodes : `configurerParametres()`, `reinitialiserProfil()`

### Compte  *(id, type, solde faits — ajouter devise + dateOuverture)*
- id : String
- type : String        (cheque, epargne, credit, pret, investissement)
- solde : double
- devise : String
- dateOuverture : Date

Méthodes : `crediter(montant:double)`, `debiter(montant:double)`, `verifierSolde() : double`

### Transaction
- id : String
- type : String        (virement, interac, paiement, depot, retrait)
- montant : double
- date : Date
- description : String
- statut : String

Méthodes : `executer()`, `annuler()`

### Beneficiaire
- id : String
- nom : String
- coordonnees : String

Méthodes : `ajouter()`, `modifier()`

### Fournisseur
- id : String
- nom : String
- categorie : String

Méthodes : `ajouter()`

### ObjectifEpargne
- id : String
- nom : String
- montantCible : double
- montantEpargne : double

Méthodes : `progression() : double`

### Notification
- id : String
- message : String
- date : Date
- lue : boolean

Méthodes : `envoyer()`

### CarteCredit   *(hérite de Compte)*
- numero : String
- limite : double
- soldeUtilise : double

Méthodes : `payer(montant:double)`

### ProduitFinancier
- id : String
- nom : String
- type : String
- valeur : double

Méthodes : `consulter()`

### ParametresGlobaux
- seuilSoldeFaible : double
- devise : String

Méthodes : `modifier()`

---

## Relations

| Type | De → Vers | Multiplicité | Sens / rôle |
|------|-----------|--------------|-------------|
| Généralisation (▷) | CarteCredit → Compte | — | une carte de crédit EST un compte |
| Composition (◆) | Client → Compte | 1 → 0..* | possède |
| Composition (◆) | Client → Beneficiaire | 1 → 0..* | gère |
| Composition (◆) | Client → ObjectifEpargne | 1 → 0..* | définit |
| Composition (◆) | Compte → Transaction | 1 → 0..* | contient |
| Association | Client → Fournisseur | 1 → 0..* | gère |
| Association | Client → Notification | 1 → 0..* | reçoit |
| Association | Client → ProduitFinancier | 1 → 0..* | consulte |
| Association | Transaction → Beneficiaire | 0..* → 0..1 | virement vers |
| Association | Transaction → Fournisseur | 0..* → 0..1 | paiement vers |
| Association | Administrateur → ParametresGlobaux | 1 → 1 | configure |

---

## Astuces de saisie dans Astah (pour éviter les pièges)

1. Sélectionner la classe → onglet **Attribute** (en bas) → bouton **+** (Ajouter).
2. Taper le **nom**, valider par **Entrée**, puis **double‑cliquer la cellule Type** et taper le type.
3. Pour un type nouveau (double, Date, boolean) Astah demande « créer le type ? » → **Oui**.
4. Méthodes : même principe via l'onglet **Operation**.
5. Relations : barre d'outils → **Association** (trait), **Generalization** (triangle creux) ;
   pour une **composition**, tracer une Association puis mettre l'extrémité côté Client en **Aggregation = composite**.
