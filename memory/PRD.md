# PRD — Déploiement Application Bancaire Démo (telle quelle)

## Problem statement original
Déployer TELLE QUELLE une application bancaire de démonstration déjà complète
(46 tests Jest, auditée sécurité). Stack imposée : backend Node.js/Express/
Sequelize/MySQL, frontend React/Vite/Tailwind. INTERDICTION de modifier le code
applicatif (routes, modèles Sequelize, middleware d'audit). Travail autorisé :
configuration, build et déploiement uniquement. MySQL 8+ requis, seed admin,
vérifications post-déploiement (/api/sante, absence codeDemo, audit).

## Architecture de déploiement (03/07/2026)
- **Contrainte plateforme** : supervisor (readonly) impose uvicorn:8001 (backend)
  et `yarn start`:3000 (frontend), ingress /api→8001, reste→3000.
- **Backend Node réel** : `node src/server.js`, NODE_ENV=production, port interne
  5050, lancé et proxifié par `/app/backend/server.py` (shim ASGI uvicorn:8001 →
  node:5050). Aucun code applicatif Node modifié.
- **Frontend** : `npm ci --legacy-peer-deps && npm run build` → `frontend/dist`
  servi par `vite preview` port 3000 (script "start" ajouté à package.json +
  section `preview` dans vite.config.js — config uniquement).
- **Base de données** : MariaDB 11 locale, gérée par supervisor (program
  `mariadb`), user `banque_user` (credentials dans backend/.env et
  memory/test_credentials.md). Tables créées par sequelize.sync au démarrage.
- **backend/.env** : NODE_ENV=production, PORT=5050, JWT_SECRET 96 car. hex,
  DB_*, SMTP vide (mode démo), DEMO_OTP=false.

## Ce qui a été fait
- [x] Install MariaDB + user dédié + supervision
- [x] Build frontend (correctif : --legacy-peer-deps, conflit plugin-react@4/vite@8)
- [x] npm ci backend
- [x] Shim proxy server.py (config déploiement, pas de logique métier)
- [x] Seed exécuté : admin admin@banque.com + paramètres + 4 produits financiers
- [x] Vérifs : /api/sante OK, login admin+OTP+JWT OK, /api/admin/stats OK
- [x] Tests : backend 12/12 pass, frontend e2e flow login validé (iteration_1.json)

## Intégration PayPal Sandbox (03/07/2026) — ADDITIVE, code existant intact
- Usages : dépôt sur compte client + souscription produit financier (crédité sur
  compte 'investissement', créé au besoin). Devise CAD, plafond 10 000 $.
- Nouveaux fichiers : backend/src/routes/paypal.routes.js, utils/paypal.js
  (REST PayPal via fetch natif, zéro dépendance), models/PaiementPaypal.js
  (table paiements_paypal, sync auto) ; frontend/src/pages/PaiementPaypal.jsx
  (@paypal/react-paypal-js).
- Lignes ajoutées : montage /api/paypal dans app.js (AVANT divers.routes qui
  applique protect sur tout /api), route /paypal + import dans App.jsx, lien
  sidebar dans Layout.jsx. Clés dans backend/.env (PAYPAL_CLIENT_ID/SECRET,
  PAYPAL_BASE_URL sandbox, PAYPAL_CURRENCY=CAD).
- Endpoints : GET /api/paypal/config (public), POST /api/paypal/orders,
  POST /api/paypal/orders/:orderId/capture (idempotent, LOCK.UPDATE, audit),
  GET /api/paypal/historique.
- Validé contre le VRAI sandbox : capture complète testée via
  confirm-payment-source + carte test 4111111111111111 (dépôt 500→525,50 $ ;
  produit → compte investissement crédité 100 $). Tests agent : 18/18 backend,
  UI 100 % (iteration_2.json).

## Écarts constatés entre la description utilisateur et le code réel (code NON modifié)
1. **codeDemo présent dans la réponse login** : le code applicatif force le mode
   démo si SMTP absent (`demoActif = DEMO_OTP==='true' || !smtpConfigure()`).
   Correctif config : fournir SMTP_USER/SMTP_PASS réels dans backend/.env.
2. **ADMIN_PASSWORD non supporté** : seed.js code en dur `Admin1234`
   (aucune référence à ADMIN_PASSWORD dans le code).
3. **GET /api/admin/audit/verification n'existe pas** (404). Le middleware
   audit.js est un journal simple (pas de chaîne SHA-256 ni FOR UPDATE).

## Itération UI — Dock animé, popovers, icônes lucide (03/07/2026)
- Composants shadcn-style dans frontend/src/components/ui/ (.tsx compilés
  nativement par Vite, alias @ → src, cn dans src/lib/utils.js) :
  dock-two.tsx (dock flottant framer-motion), popover-profil.tsx +
  popover-info.tsx (@ark-ui/react), icone-action.tsx (IconeAction animée
  hover/tap + infobulle, IconeFlottante flottement continu).
- Intégrations : Layout.jsx (sidebar avec icônes lucide, avatar popover profil,
  Dock fixed bottom avec pointer-events-none sur wrapper — IMPORTANT, sinon
  bloque les clics sidebar), Admin.jsx (boutons approbation/rejet/réinit
  en IconeAction, stats avec IconeFlottante, badges lucide), Profil.jsx
  (PopoverInfo sécurité, titre animé).
- Config : tailwind content +ts,tsx ; tokens secondary/popover ; keyframes
  fade-in/out. Deps : framer-motion, @ark-ui/react. Thème jaune-orange intact.
- Tests : iteration_3 (7/8 puis bug pointer-events corrigé et vérifié par
  clic souris réel : toggle thème OK, dock nav OK, approbation prêt e2e OK).

## Itération UI v2 (03/07/2026) — extension à toutes les pages
- Dock : pastille de notifications non-lues sur l'icône Bell (prop badge).
- Icônes lucide + IconeFlottante/IconeAction étendues à : Opérations (onglets +
  titres de formulaires), Historique (onglets), Objectifs (suppression via
  IconeAction Trash2, bouton Verser avec Coins), Comptes (cartes de comptes avec
  icônes flottantes), Notifications, Prêts (badges Clock/CheckCircle2/XCircle),
  Contacts (édition/suppression via IconeAction), PayPal (titre), et dashboard
  (QuickActions flottantes, AccountCards, RecentTransactions, SavingsGoals,
  SpendingChart).
- Bug corrigé : occurrence résiduelle `{icone}` dans AccountCards (page blanche
  dashboard) — replace_all n'avait matché qu'une occurrence sur deux.
- Vérifié par screenshots : 6 pages client + dashboard rendent sans erreur JS.

## Itération UI v3 (03/07/2026) — calendrier, transitions, nettoyage US
- Nouvelle page /calendrier (lien sidebar + dock, icône CalendarDays) : grille
  mensuelle avec projection des occurrences des transactions récurrentes
  (hebdo/mensuelle depuis prochaineDate, GET /api/transactions/planifiees),
  jour courant surligné, navigation mois préc/suiv, liste « Prochaines
  échéances » avec annulation (DELETE /api/transactions/planifiees/:id),
  bouton « Planifier une opération » → /operations.
- Transitions de page animées : motion.main (fade + slide-up 0.3s) dans
  Layout.jsx, keyed sur location.pathname.
- Toutes les mentions visibles « (US-xx) » supprimées du frontend (9 fichiers,
  regex, vérifié 0 restante dans l'UI). Backend intact.
- Bug corrigé : useEffect(charger, []) retournait une Promise (cleanup invalide
  → crash à la navigation). Toujours utiliser useEffect(() => { charger(); }, []).
- data-testid du dock normalisés (accents retirés : dock-operations).
- Push Git : à faire par l'utilisateur via « Save to GitHub » (l'agent ne fait
  pas d'actions d'écriture git).

## Backlog
- P0 : obtenir SMTP_USER/SMTP_PASS de l'utilisateur → désactive le mode démo OTP
- P1 : déploiement production (env cible devra fournir MySQL externe via DB_*)
- P2 : rien — aucun changement de code autorisé
