<div align="center">
  <img src="frontend/src/assets/torcolbank-logo.svg" alt="TorcolBank" width="220"/>

  # TorcolBank — Gestion de banque

  *« Prenez de la hauteur. »*

  Application bancaire complète (simulation) : comptes, virements, paiements,
  épargne, prêts, carte de crédit, notifications et administration — avec
  authentification 2FA, audit trail et intégrité comptable garantie.
</div>

---

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Stack technique](#stack-technique)
3. [Prérequis](#prérequis)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Lancer le projet](#lancer-le-projet)
7. [Comptes de démonstration](#comptes-de-démonstration)
8. [Tester le projet](#tester-le-projet)
9. [Structure du projet](#structure-du-projet)
10. [Sécurité](#sécurité)
11. [Documentation et livrables](#documentation-et-livrables)

## Fonctionnalités

| Domaine | Détail |
|---|---|
| **Profils & authentification** | Inscription simple ou wizard KYC 6 étapes, connexion 2FA (email + OTP 6 chiffres), rôles client/administrateur |
| **Comptes** | Multi-comptes (chèque, épargne, carte de crédit, prêt), soldes en temps réel, détail par compte |
| **Opérations** | Virement interne atomique, Interac, paiement de factures, dépôt/retrait, dépôt de chèque par photo |
| **Historique & relevés** | Recherche/filtres, relevé mensuel par catégorie, comparaison des dépenses (graphique 6 mois) |
| **Épargne & budgets** | Objectifs d'épargne avec progression, budgets intelligents, transactions récurrentes (calendrier) |
| **Notifications** | Solde faible (seuil configurable), alertes fraude, verrouillage de compte |
| **Administration** | Validation des dossiers KYC, approbation des prêts, paramètres globaux, réinitialisation de profil |
| **RGPD** | Export des données (art. 20), suppression avec anonymisation comptable (art. 17) |

## Stack technique

| Couche | Technologies |
|---|---|
| Frontend | React 18, Vite, React Router, Tailwind CSS, Framer Motion, Recharts |
| Backend | Node.js, Express, JWT, bcrypt, Helmet, ajv (JSON Schema), Nodemailer |
| Base de données | MySQL/MariaDB (XAMPP) via Sequelize |
| Outils | Jira (suivi Scrum), Git/GitHub, Astah UML, Jest + Supertest |

Architecture **3-tiers** : SPA React → API REST Express → MySQL.
Voir le [cahier de conception](docs/) pour les diagrammes (classes, séquence, cas d'utilisation).

## Prérequis

- **Node.js 18+** et npm
- **XAMPP** (ou toute instance MySQL/MariaDB sur le port 3306) — démarrer **MySQL** depuis le panneau XAMPP avant de lancer le backend
- La base de données est **créée automatiquement** au premier démarrage (`CREATE DATABASE IF NOT EXISTS banque`) — aucune commande SQL manuelle

## Installation

```bash
git clone https://github.com/kilosthore/Gestion-de-Banque-.git
cd Gestion-de-Banque-
npm run install:all        # installe backend + frontend
```

## Configuration

Créer `backend/.env` (les valeurs par défaut conviennent pour un poste de dev XAMPP standard) :

```env
# Base de données (défauts : 127.0.0.1:3306, root sans mot de passe)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=banque
DB_NAME_TEST=banque_test
DB_USER=root
DB_PASS=

# Authentification
JWT_SECRET=change-moi-en-production
JWT_EXPIRES=30m
PORT=5000

# Email OTP (optionnel — sans SMTP, le code s'affiche à l'écran en mode démo)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

Puis initialiser les données (admin, paramètres globaux, produits financiers) :

```bash
npm run seed --prefix backend
```

> Le mot de passe admin est celui de `ADMIN_PASSWORD` (.env) ou généré et
> **affiché une seule fois** dans la console du seed — notez-le.

## Lancer le projet

**Développement** (backend :5000 + frontend :5173 avec rechargement à chaud) :

```bash
npm run dev
```

Ouvrir **http://localhost:5173** — le proxy Vite relaie `/api` vers le backend.

**Production locale** (Express sert le build React sur un seul port) :

```bash
npm run build
npm start          # → http://localhost:5000
```

## Comptes de démonstration

| Rôle | Accès |
|---|---|
| **Client** | Créer un profil via « Créer un compte » → un compte chèque avec **500 $** de démonstration est ouvert automatiquement |
| **Administrateur** | `admin@banque.com` / mot de passe défini au seed (voir ci-dessus) |

**OTP en mode démo** : sans configuration SMTP, le code à 6 chiffres s'affiche
directement dans l'interface de connexion (et dans la console serveur).

## Tester le projet

Les tests (Jest + Supertest) couvrent l'authentification 2FA, les opérations
bancaires, les alertes fraude, les budgets, le verrouillage et **la concurrence**
(virements parallèles → l'invariant comptable est préservé).

```bash
# MySQL/XAMPP doit être démarré (utilise la base banque_test, isolée)
cd backend
npm test
```

## Structure du projet

```
├── backend/
│   ├── src/
│   │   ├── config/db.js          # Connexion Sequelize + création auto de la base
│   │   ├── models/               # User, Compte, Transaction, ObjectifEpargne…
│   │   ├── routes/               # auth, comptes, transactions, admin, dashboard…
│   │   ├── middleware/           # protect (JWT), adminOnly, auditLog, rate limit
│   │   └── utils/                # mailer (OTP), seed
│   └── tests/                    # Jest + Supertest
├── frontend/
│   ├── src/
│   │   ├── pages/                # TableauDeBord, Comptes, Operations, Admin…
│   │   ├── components/           # Layout, dashboard/, inscription/, ui/ (lamp, fond animé)
│   │   ├── styles/theme.css      # Thème « Marine & Cuivre » (tokens Tailwind)
│   │   ├── assets/               # Logos TorcolBank (SVG)
│   │   └── i18n/                 # Traductions FR/EN
│   └── tailwind.config.js        # Design tokens (palette marine #1E3055 / cuivre #C2762E)
└── docs/                         # PRD, diagramme de cas d'utilisation (Astah)
```

## Sécurité

- **2FA** : OTP 6 chiffres haché, usage unique, expiration 5 min
- **Mots de passe** : bcrypt (12 rounds), politique 8+ caractères
- **JWT** : expiration 30 min, `jti` unique, blacklist à la déconnexion
- **Anti-force brute** : rate limiting + verrouillage après 5 échecs
- **Intégrité comptable** : transactions Sequelize atomiques, `LOCK.UPDATE`,
  tri anti-deadlock — prouvé par test de concurrence
- **Audit trail** : IP, user-agent, statut et payload nettoyé pour chaque action sensible

Détails : [SECURITE-DEPLOIEMENT.md](SECURITE-DEPLOIEMENT.md)

## Documentation et livrables

| Livrable | Emplacement |
|---|---|
| Cahier de conception (classes, séquences, BD, sécurité) | `Cahier_de_Conception_GESTION_DE_BANQUE.docx` |
| Diagramme de cas d'utilisation (source Astah) | [docs/Diagramme_Cas_Utilisation_Banque.asta](docs/Diagramme_Cas_Utilisation_Banque.asta) |
| PRD | [docs/PRD-EMERGENT.md](docs/PRD-EMERGENT.md) |
| Sécurité & déploiement | [SECURITE-DEPLOIEMENT.md](SECURITE-DEPLOIEMENT.md) |
| Suivi Scrum (backlog, épics, 3 sprints) | [Jira — projet SCRUM](https://josuekilongozi4.atlassian.net/jira/software/projects/SCRUM/boards/1) |

---

*Projet académique réalisé par Josué Nyembo — application de simulation :
aucune donnée bancaire réelle n'est traitée.*
