# 🔒 Checklist de déploiement sécurisé — banque-app

> Générée suite à l'audit de sécurité du 2026-07-02. À suivre **dans l'ordre** avant toute mise en ligne.

## 1. Variables d'environnement (`backend/.env` de production)

- [ ] `NODE_ENV=production` — active `trust proxy`, désactive le mode démo OTP, masque les erreurs internes
- [ ] `JWT_SECRET` : générer une clé **neuve** (jamais celle de dev) : `openssl rand -base64 48`
- [ ] `DEMO_OTP=false` (de toute façon ignoré en prod, mais gardez la config cohérente)
- [ ] `SMTP_USER` / `SMTP_PASS` configurés — **obligatoire** : sans SMTP, les clients ne reçoivent pas leur code OTP et ne peuvent pas se connecter
- [ ] `DB_USER` / `DB_PASS` : utilisateur MySQL **dédié** (pas root) :
  ```sql
  CREATE USER 'banque'@'%' IDENTIFIED BY '<mot_de_passe_fort>';
  GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON banque.* TO 'banque'@'%';
  ```
- [ ] `ADMIN_PASSWORD` : mot de passe admin fort (ou laisser vide → généré aléatoirement au seed, affiché une fois)

## 2. Serveur / plateforme

- [ ] HTTPS obligatoire (Render/Railway/Vercel le fournissent ; nginx → certbot). Le backend suppose TLS terminé par le proxy.
- [ ] Un seul proxy devant l'app (`trust proxy` est réglé à `1`) — si vous chaînez CDN + proxy, ajuster dans `app.js`
- [ ] `npm run seed` exécuté une fois, mot de passe admin noté puis changé au premier login
- [ ] Sauvegardes automatiques de la base MySQL activées

## 3. Vérifications post-déploiement

- [ ] `POST /api/auth/login` ne renvoie **pas** de champ `codeDemo` dans la réponse
- [ ] Le code OTP arrive bien par email
- [ ] `GET /api/admin/audit/verification` (en admin) répond « Chaîne intègre »
- [ ] Les en-têtes `Content-Security-Policy` et `Strict-Transport-Security` sont présents (onglet Réseau du navigateur)
- [ ] Une erreur serveur renvoie `{"message":"Erreur serveur"}` sans détail SQL

## 4. Traçabilité (journal d'audit à intégrité vérifiable)

Le journal `audit_logs` couvre : connexions (réussies **et** échouées), OTP, déconnexions,
inscriptions, modifications de profil, toutes les opérations d'argent (dépôts, retraits,
virements, Interac, factures, cartes, récurrentes), ouvertures de compte, actions RGPD,
et toutes les actions admin (y compris la **consultation** des données clients et du journal lui-même).

Chaque entrée est chaînée par SHA-256 à la précédente (`hashPrecedent` → `empreinte`) :
toute modification, insertion ou suppression a posteriori **casse la chaîne**.

- Vérifier l'intégrité : `GET /api/admin/audit/verification`
- Consulter le journal : `GET /api/admin/audit?limit=100&action=auth.login&userId=<uuid>`

Pour un niveau de preuve supérieur (recommandé si enjeu réel) :
- retirer les droits `UPDATE`/`DELETE` sur `audit_logs` à l'utilisateur MySQL de l'app ;
- exporter périodiquement le dernier hash (`audit_chain_state.dernierHash`) vers un stockage externe horodaté.

## 5. Risques résiduels acceptés (documentés)

| Risque | Justification |
|---|---|
| `uuid` < 11.1.1 via Sequelize (2× moderate) | La faille exige l'appel `uuidv4(options, buf)` avec buffer fourni — Sequelize ne l'utilise jamais ainsi. Le correctif npm imposerait une rétrogradation Sequelize v6→v3. À réévaluer quand Sequelize mettra à jour sa dépendance. |
| `style-src 'unsafe-inline'` dans la CSP | Requis par les styles inline de React/recharts. Les **scripts** inline restent interdits (vecteur XSS principal bloqué). |
| JWT dans `sessionStorage` (frontend) | Effacé à la fermeture de l'onglet ; le passage en cookie `httpOnly` exigerait une protection CSRF complète — compromis assumé pour ce projet. |
| `sequelize.sync({ alter: true })` en prod | Acceptable pour ce projet ; une vraie prod bancaire exigerait des migrations versionnées (sequelize-cli). |
