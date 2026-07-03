# Credentials de test — Banque Demo

## Admin (créé par backend/src/utils/seed.js — mot de passe codé en dur dans le seed)
- Email: admin@banque.com
- Mot de passe: Admin1234
- Connexion en 2 étapes: login → OTP. SMTP non configuré → mode démo: le code OTP
  est retourné dans le champ `codeDemo` de la réponse POST /api/auth/login et
  loggé dans /var/log/supervisor/backend.out.log

## Base de données (MariaDB local, gérée par supervisor "mariadb")
- DB_HOST=127.0.0.1, DB_PORT=3306, DB_NAME=banque
- DB_USER=banque_user, DB_PASS=66b157e6e6984c8d26b4e97f98992933

## Architecture de déploiement
- Backend Node/Express réel sur port interne 5050 (NODE_ENV=production)
- /app/backend/server.py = shim proxy ASGI (uvicorn:8001 → node:5050), requis car
  la config supervisor est readonly et impose uvicorn sur 8001
- Frontend: build Vite servi par `vite preview` sur port 3000 (script "start")

## PayPal Sandbox
- Clés dans backend/.env (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET), devise CAD
- Page client : /paypal (lien sidebar). Endpoints : /api/paypal/config, /orders,
  /orders/:id/capture, /historique
- Test capture sans acheteur : approuver l'ordre via API PayPal
  confirm-payment-source avec carte 4111111111111111 exp 2030-12, puis capturer
