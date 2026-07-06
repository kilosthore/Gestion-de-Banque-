# Script vidéo de démonstration — TorcolBank (~7 min)

## Avant d'enregistrer (checklist)

- [ ] XAMPP : démarrer **MySQL**
- [ ] Terminal 1 : `npm run dev` à la racine (backend :5000 + frontend :5173)
- [ ] Ouvrir http://localhost:5173 en **mode sombre** (le plus beau) et en **plein écran** (F11)
- [ ] Avoir sous la main : email/mot de passe d'un **client démo** avec quelques transactions déjà faites, et ceux de l'**admin** (`admin@banque.com`)
- [ ] Fermer les onglets/notifications personnels ; enregistrer en **1080p** (OBS Studio ou Xbox Game Bar : `Win+G`)
- [ ] Parler lentement, faire des pauses aux transitions — tu couperas au montage

> Astuce : fais une répétition complète à blanc avant d'enregistrer.
> Si tu te trompes, ne coupe pas — reprends la phrase, tu monteras après.

---

## Scène 1 — Accueil & présentation (0:00 → 0:40)

**À l'écran :** la page d'accueil avec l'animation Lamp qui révèle « TorcolBank ».
Laisse l'animation se jouer entièrement avant de parler. Survole les deux boutons.

**Narration :**
> « Bonjour, je vous présente TorcolBank, mon application de gestion bancaire
> développée en React, Node.js/Express et MySQL, gérée en méthode Scrum avec
> Jira sur trois sprints. Elle couvre tout le cycle de vie d'un client :
> inscription, comptes, opérations, épargne, notifications et administration.
> Commençons par créer un compte. »

**Action :** clique sur **Créer un compte**.

## Scène 2 — Inscription (0:40 → 1:40)

**À l'écran :** le wizard d'inscription (barre de progression cuivre en 6 étapes).

**Narration :**
> « L'inscription est un parcours KYC en six étapes : informations personnelles,
> coordonnées, situation professionnelle, choix du compte, conformité et
> documents. Toutes les données sont validées côté serveur par JSON Schema,
> et le mot de passe exige majuscule, minuscule et chiffre. »

**Action :** remplis les étapes (prépare des valeurs à l'avance pour aller vite).
Montre du curseur la barre de progression qui avance.

> « Le dossier est créé en statut "en vérification" — c'est l'administrateur
> qui l'approuvera. Pour la démo, j'utilise un compte client déjà actif. »

## Scène 3 — Connexion 2FA (1:40 → 2:30) ⭐ moment sécurité

**Action :** va sur **Se connecter**, saisis email + mot de passe du client démo.

**Narration :**
> « La connexion se fait en deux étapes. Après le mot de passe — haché en bcrypt —
> l'application exige un code à usage unique de six chiffres, valable cinq minutes.
> En production il part par email ; en mode démo il s'affiche à l'écran. »

**Action :** montre le code démo, saisis les 6 chiffres (les cases s'enchaînent
automatiquement), valide.

> « Cinq échecs de mot de passe verrouillent le compte, et le jeton de session
> expire après trente minutes — il est révoqué à la déconnexion. »

## Scène 4 — Tableau de bord (2:30 → 3:20)

**À l'écran :** le dashboard (solde total, comptes, actions rapides, graphique).

**Narration :**
> « Voici le tableau de bord : solde total hors crédit, mes comptes avec leur
> solde, des actions rapides, les dernières transactions et le graphique
> entrées/sorties des six derniers mois. »

**Action :** bascule **mode clair** puis reviens en sombre :
> « L'interface est entièrement déclinée en mode clair et sombre, aux couleurs
> de la marque : marine et cuivre. »

## Scène 5 — Virement interne + cas d'erreur (3:20 → 4:20) ⭐ critère d'acceptation

**Action :** va dans **Opérations** → virement interne. Fais UN virement valide
(ex. 50 $ du chèque vers l'épargne). Montre les deux soldes mis à jour.

**Narration :**
> « Le virement débite et crédite les deux comptes dans une transaction
> atomique avec verrous — impossible de perdre de l'argent en cours de route. »

**Action :** refais un virement avec un **montant supérieur au solde** → montre
le message d'erreur.

> « Et si le solde est insuffisant, l'opération est rejetée : aucun compte n'est
> modifié. C'est exactement le scénario alternatif de mon diagramme de séquence. »

## Scène 6 — Paiement, historique et relevé (4:20 → 5:10)

**Action :** paie une facture (fournisseur existant), puis ouvre **Historique** :
utilise la recherche/filtres, montre le relevé mensuel par catégorie.

**Narration :**
> « Je peux payer des factures auprès de fournisseurs, déposer un chèque par
> photo, puis tout retrouver dans l'historique : recherche, filtres par type et
> par date, et un relevé mensuel regroupé par catégorie. »

## Scène 7 — Épargne, budgets, calendrier (5:10 → 5:50)

**Action :** ouvre **Épargne** (barre de progression d'un objectif), **Budgets**,
puis **Calendrier** (transaction récurrente planifiée).

**Narration :**
> « Côté gestion : des objectifs d'épargne avec progression visuelle, des budgets
> intelligents par catégorie, et des transactions récurrentes planifiées dans
> le calendrier, suspendables à tout moment. »

## Scène 8 — Notifications (5:50 → 6:15)

**Action :** ouvre **Notifications**, montre une alerte de solde faible ou fraude.

**Narration :**
> « Le système me notifie automatiquement : solde sous le seuil configuré,
> activité suspecte, décisions de l'administrateur. »

## Scène 9 — Espace administrateur (6:15 → 7:00)

**Action :** déconnecte-toi, connecte-toi en **admin** (2FA à nouveau — passe vite).
Montre : la liste des dossiers en vérification (approuve celui créé en scène 2
si possible), les paramètres globaux, la réinitialisation d'un profil.

**Narration :**
> « L'administrateur a son propre espace : il valide les dossiers d'inscription —
> ce qui ouvre un compte chèque avec un dépôt de bienvenue — approuve les prêts,
> configure les paramètres globaux comme le seuil de solde faible, et peut
> réinitialiser un profil avec un mot de passe temporaire envoyé par email.
> Chaque action sensible est tracée dans un journal d'audit infalsifiable. »

## Scène 10 — Conclusion (7:00 → 7:30)

**À l'écran :** reviens sur le tableau de bord ou la page d'accueil Lamp.

**Narration :**
> « En résumé : TorcolBank couvre les vingt-deux user stories du backlog,
> livrées en trois sprints suivis dans Jira, avec une architecture trois-tiers,
> une authentification à deux facteurs, une intégrité comptable prouvée par des
> tests de concurrence, et le respect du RGPD. Merci de votre attention. »

---

## Plan B si quelque chose plante en tournage

| Problème | Réflexe |
|---|---|
| « Erreur réseau » sur le dashboard | MySQL ou backend éteint → relance XAMPP puis `npm run dev` |
| Le code OTP n'apparaît pas | Normal si SMTP configuré → regarde la console backend |
| Compte verrouillé (5 échecs) | Utilise l'admin pour réinitialiser, ou un autre compte démo |
| Animation Lamp déjà jouée | Recharge la page (Ctrl+R) avant de lancer l'enregistrement |
