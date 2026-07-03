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

## Écarts constatés entre la description utilisateur et le code réel (code NON modifié)
1. **codeDemo présent dans la réponse login** : le code applicatif force le mode
   démo si SMTP absent (`demoActif = DEMO_OTP==='true' || !smtpConfigure()`).
   Correctif config : fournir SMTP_USER/SMTP_PASS réels dans backend/.env.
2. **ADMIN_PASSWORD non supporté** : seed.js code en dur `Admin1234`
   (aucune référence à ADMIN_PASSWORD dans le code).
3. **GET /api/admin/audit/verification n'existe pas** (404). Le middleware
   audit.js est un journal simple (pas de chaîne SHA-256 ni FOR UPDATE).

## Backlog
- P0 : obtenir SMTP_USER/SMTP_PASS de l'utilisateur → désactive le mode démo OTP
- P1 : déploiement production (env cible devra fournir MySQL externe via DB_*)
- P2 : rien — aucun changement de code autorisé
