<div align="center">
  <img src="frontend/src/assets/torcolbank-logo.svg" alt="TorcolBank" width="220"/>

  # TorcolBank — Gestion de banque

  *« Prenez de la hauteur. »*

  Application bancaire complète (simulation) : comptes, virements, paiements
  (dont PayPal), épargne, prêts, carte de crédit, budgets, calendrier des
  opérations récurrentes, notifications et administration — avec authentification
  2FA, journal d'audit à intégrité vérifiable et invariant comptable garanti.

  <sub>Stack : React + Vite · Express · Supabase Postgres · déployé sur Vercel</sub>
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
9. [Déploiement (Vercel)](#déploiement-vercel)
10. [Structure du projet](#structure-du-projet)
11. [Sécurité](#sécurité)
12. [Documentation et livrables](#documentation-et-livrables)

## Fonctionnalités

| Domaine | Détail |
|---|---|
| **Profils & authentification** | Inscription simple ou wizard KYC 6 étapes, connexion 2FA (email + OTP 6 chiffres), rôles client/administrateur, mot de passe temporaire à changer à la première connexion |
| **Comptes** | Multi-comptes (chèque, épargne, carte de crédit, prêt, investissement), soldes en temps réel, détail et transactions par compte |
| **Opérations** | Virement interne atomique, Interac, paiement de factures, dépôt/retrait, dépôt de chèque par photo, achat et paiement de carte de crédit |
| **Paiements PayPal** | Alimentation d'un compte via PayPal (intégration dédiée, traçabilité des paiements) |
| **Historique & relevés** | Recherche/filtres, relevé mensuel par catégorie, comparaison des dépenses (graphique 6 mois) |
| **Épargne & budgets** | Objectifs d'épargne avec progression, budgets par catégorie avec alertes de dépassement |
| **Calendrier** | Transactions récurrentes (hebdomadaires/mensuelles) exécutées automatiquement par tâche planifiée quotidienne |
| **Notifications** | Solde faible (seuil configurable), alertes fraude, verrouillage de compte |
| **Administration** | Validation des dossiers KYC, approbation des prêts, paramètres globaux (limites métier), consultation et vérification du journal d'audit |
| **RGPD** | Export des données (art. 20), suppression avec anonymisation comptable (art. 17) |

## Stack technique

| Couche | Technologies |
|---|---|
| Frontend | React 18, Vite, React Router, Tailwind CSS, Framer Motion, Recharts |
| Backend | Node.js, Express, JWT, bcrypt, Helmet, ajv (JSON Schema), Nodemailer |
| Base de données | **Supabase Postgres** via Sequelize (connexion poolée PgBouncer, SSL) |
| Déploiement | **Vercel** — SPA statique + fonctions serverless + cron quotidien |
| Outils | Jira (suivi Scrum), Git/GitHub, Astah UML, Jest + Supertest |

Architecture **3-tiers** : SPA React → API REST Express → Postgres.
Voir le [cahier de conception](docs/) pour les diagrammes (classes, séquence, cas d'utilisation).

## Prérequis

- **Node.js 18+** et npm
- Une base **PostgreSQL** — le plus simple est un projet gratuit [Supabase](https://supabase.com).
  Récupérer la chaîne de connexion **du pooler** (port `6543`, mode session).
- Les tables sont **créées automatiquement** au premier démarrage (`sequelize.sync()`) — aucune migration SQL manuelle.

## Installation

```bash
git clone https://github.com/kilosthore/Gestion-de-Banque-.git
cd Gestion-de-Banque-
npm run install:all        # installe backend + frontend
```

## Configuration

Créer `backend/.env` à partir de `backend/.env.example` et renseigner l'accès Postgres :

```env
# Base de données Postgres (Supabase : utiliser le POOLER, port 6543)
DB_HOST=aws-0-<region>.pooler.supabase.com
DB_PORT=6543
DB_NAME=postgres
DB_NAME_TEST=postgres            # base de test (isolée)
DB_USER=postgres.<ref-projet>    # rôle poolé Supabase
DB_PASS=<mot_de_passe_base>

# Applique les évolutions de schéma (ALTER) — à activer UNE fois après un
# changement de modèle, puis remettre à vide. Ne pas laisser actif en continu.
DB_SYNC_ALTER=

# Sécurité JWT — générer une clé unique par environnement : openssl rand -base64 48
JWT_SECRET=change-moi-en-production
JWT_EXPIRES=30m
TEMP_TOKEN_EXPIRES=5m

# Serveur
PORT=5000
CLIENT_URL=http://localhost:5173
# NODE_ENV=production           # en prod : trust proxy, pas de mode démo OTP, erreurs masquées

# Compte admin créé par le seed. ADMIN_EMAIL doit être une vraie boîte : l'OTP
# de connexion 2FA y est envoyé. Mot de passe : ADMIN_PASSWORD (sinon généré et
# affiché une seule fois).
ADMIN_EMAIL=
ADMIN_PASSWORD=

# Email OTP (obligatoire en production — Gmail : mot de passe d'application)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=

# true = le code OTP est renvoyé dans la réponse API (démo). Ignoré si NODE_ENV=production.
DEMO_OTP=true
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
| **Administrateur** | email défini par `ADMIN_EMAIL` / mot de passe défini au seed (voir ci-dessus) |

**OTP en mode démo** : sans configuration SMTP, le code à 6 chiffres s'affiche
directement dans l'interface de connexion (et dans la console serveur).

## Tester le projet

Les tests (Jest + Supertest) couvrent l'authentification 2FA, les opérations
bancaires, les alertes fraude, les budgets, le verrouillage et **la concurrence**
(virements parallèles → l'invariant comptable est préservé).

```bash
# Renseigner DB_NAME_TEST (base Postgres isolée) dans backend/.env
cd backend
npm test
```

## Déploiement (Vercel)

Le dépôt est prêt pour un déploiement **Vercel** (voir [`vercel.json`](vercel.json)) :

- Le frontend est buildé en statique (`@vercel/static-build`, `frontend/dist`).
- L'API Express est servie en fonction serverless via [`backend/api/index.js`](backend/api/index.js) (`@vercel/node`) ; toutes les routes `/api/*` y sont routées.
- Un **cron quotidien** (`0 6 * * *`) appelle `/api/cron/taches-planifiees` pour exécuter les transactions récurrentes du calendrier.

Définir toutes les variables d'environnement ci-dessus dans **Project Settings → Environment Variables** (utiliser la chaîne de connexion **poolée** de Supabase, port `6543`, indispensable en serverless).

> ⚠️ Ne jamais committer de fichier `.env*` : ils sont ignorés par `.gitignore`.

## Structure du projet

```
├── backend/
│   ├── api/index.js              # Point d'entrée serverless Vercel (enveloppe l'app Express)
│   ├── src/
│   │   ├── config/db.js          # Connexion Sequelize Postgres (pooler + SSL) + sync auto
│   │   ├── models/               # User, Compte, Transaction, ObjectifEpargne, PaiementPaypal, AuditLog…
│   │   ├── routes/               # auth, comptes, transactions, budgets, prets, paypal, cron, admin, dashboard
│   │   ├── middleware/           # protect (JWT), adminOnly, auditLog, rate limit
│   │   └── utils/                # mailer (OTP), seed, catégorisation, budget, fraude, récurrence, paypal
│   └── tests/                    # Jest + Supertest
├── frontend/
│   ├── src/
│   │   ├── pages/                # TableauDeBord, Comptes, Operations, Prets, PaiementPaypal, Calendrier, Admin…
│   │   ├── components/           # Layout, dashboard/, inscription/, ui/ (lamp, fond animé)
│   │   ├── styles/theme.css      # Thème « Marine & Cuivre » (tokens Tailwind)
│   │   ├── assets/               # Logos TorcolBank (SVG)
│   │   └── i18n/                 # Traductions FR/EN
│   └── tailwind.config.js        # Design tokens (palette marine #1E3055 / cuivre #C2762E)
├── docs/                         # PRD, diagramme de cas d'utilisation (Astah)
└── vercel.json                   # Builds, routes API/SPA et cron quotidien
```

## Sécurité

- **2FA** : OTP 6 chiffres haché, usage unique, expiration 5 min
- **Mots de passe** : bcrypt (12 rounds), politique 8+ caractères
- **JWT** : expiration 30 min, `jti` unique, blacklist à la déconnexion
- **Anti-force brute** : rate limiting + verrouillage après 5 échecs
- **Intégrité comptable** : transactions Sequelize atomiques, `LOCK.UPDATE`,
  tri anti-deadlock — prouvé par test de concurrence
- **Audit trail chaîné** : chaque entrée porte le SHA-256 de la précédente ;
  toute altération casse la chaîne et devient détectable via `/admin/audit`

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
