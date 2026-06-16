# Djousse Tech Evolution — WhatsApp Group Bot Admin Platform

**Version 2.0.0 | Auteur: Djousse TECH**

Plateforme d'administration de groupes WhatsApp avec interface Next.js déployable sur Vercel et serveur bot Node.js déployable sur Railway/Render.

---

## 🏗️ Architecture

```
djousse-tech-evolution/
│
├── frontend/          ← Next.js (→ Vercel)
│   ├── pages/
│   │   ├── index.tsx       Interface principale
│   │   └── api/            Proxy API vers le bot
│   ├── styles/
│   └── package.json
│
└── bot/               ← Node.js (→ Railway / Render / VPS)
    ├── server.js           Serveur Express + WhatsApp
    ├── data/               Données persistantes
    └── package.json
```

---

## 🚀 Déploiement complet (GitHub → Vercel + Railway)

### ÉTAPE 1 — Préparer GitHub

```bash
# Cloner ou initialiser le projet
git init
git add .
git commit -m "Initial commit — Djousse Tech Evolution v2.0"

# Créer un repo GitHub (via github.com ou gh CLI)
gh repo create djousse-tech-evolution --public
git remote add origin https://github.com/TON_USERNAME/djousse-tech-evolution.git
git push -u origin main
```

---

### ÉTAPE 2 — Déployer le BOT sur Railway

> Railway supporte Puppeteer/Chromium nativement, contrairement à Vercel.

1. Aller sur **https://railway.app** → New Project → Deploy from GitHub Repo
2. Sélectionner ton repo GitHub
3. Choisir le dossier **`bot/`** comme root directory
4. Dans **Settings → Variables**, ajouter :

```
PORT=4000
ADMIN_NUMBER=237600000000          ← Ton numéro sans le +
FRONTEND_URL=https://TON_APP.vercel.app
```

5. Railway génère automatiquement une URL : `https://djousse-tech-evolution-bot.up.railway.app`
6. **Copier cette URL** — tu en as besoin pour l'étape suivante.

**Alternative — Render.com :**

1. Aller sur **https://render.com** → New Web Service → Connect GitHub
2. Root directory : `bot`
3. Build Command : `npm install`
4. Start Command : `npm start`
5. Ajouter les mêmes variables d'environnement

---

### ÉTAPE 3 — Déployer le FRONTEND sur Vercel

1. Aller sur **https://vercel.com** → New Project → Import GitHub Repo
2. Sélectionner ton repo
3. **Root directory** : `frontend`
4. Framework Preset : **Next.js** (auto-détecté)
5. Dans **Environment Variables**, ajouter :

```
BOT_SERVER_URL = https://djousse-tech-evolution-bot.up.railway.app
```

6. Cliquer **Deploy** → Vercel génère : `https://djousse-tech.vercel.app`

---

### ÉTAPE 4 — Mettre à jour le bot avec l'URL Vercel

Retourner sur Railway → Variables → mettre à jour :

```
FRONTEND_URL=https://djousse-tech.vercel.app
```

Redéployer le bot (Railway le fait automatiquement).

---

### ÉTAPE 5 — Connecter le bot WhatsApp

1. Ouvrir `https://djousse-tech.vercel.app`
2. Choisir la langue
3. Entrer ton numéro WhatsApp admin dans la sidebar
4. Cliquer **Connecter**
5. Aller dans les logs Railway → **QR code affiché dans la console**
6. Scanner avec WhatsApp (Paramètres → Appareils liés → Lier un appareil)
7. ✅ Le bot est opérationnel !

---

## 💻 Développement local

### Lancer le bot en local

```bash
cd bot
npm install
cp .env.example .env
# Éditer .env avec ton numéro
npm run dev
# → http://localhost:4000
```

### Lancer le frontend en local

```bash
cd frontend
npm install
cp .env.example .env.local
# Éditer .env.local : BOT_SERVER_URL=http://localhost:4000
npm run dev
# → http://localhost:3000
```

---

## 🔌 API du serveur bot

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/health` | État du serveur |
| GET | `/api/status` | Statut du bot WhatsApp |
| GET | `/api/qr` | QR code pour connexion |
| POST | `/api/connect` | Lancer la connexion |
| GET | `/api/groups` | Liste des groupes détectés |
| POST | `/api/groups/select` | Sauvegarder la sélection |
| POST | `/api/send` | Envoyer un message à un groupe |
| GET | `/api/scheduled` | Messages planifiés |
| POST | `/api/scheduled` | Ajouter un message planifié |
| DELETE | `/api/scheduled` | Supprimer un message planifié |

---

## 🤖 Commandes disponibles dans les groupes

| Commande | Description |
|----------|-------------|
| `/help` | Liste des commandes |
| `/status` | Statut du bot |
| `/info` | À propos de Djousse Tech Evolution |
| `/support` | Contact support |
| `/groupes` | Groupes actifs |

---

## ⚠️ Compatibilité Vercel

Vercel est une plateforme **serverless** — elle ne peut pas faire tourner Puppeteer/Chromium (requis par whatsapp-web.js). C'est pourquoi l'architecture est séparée :

- **Vercel** → Interface React + API routes (proxies légers)
- **Railway/Render** → Serveur bot persistant avec WhatsApp connecté

---

## 📁 Variables d'environnement

### Frontend (Vercel)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `BOT_SERVER_URL` | URL du serveur bot | `https://bot.railway.app` |

### Bot (Railway/Render)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `PORT` | Port du serveur | `4000` |
| `ADMIN_NUMBER` | Numéro WhatsApp admin (sans +) | `237600000000` |
| `FRONTEND_URL` | URL du frontend Vercel | `https://app.vercel.app` |

---

## 🔒 Sécurité

- Ne jamais commiter `.env` (déjà dans `.gitignore`)
- Ne jamais commiter `data/sessions/` (sessions WhatsApp)
- Utiliser HTTPS en production (Vercel et Railway le font automatiquement)
- L'API `/api/connect` vérifie le numéro admin si `ADMIN_NUMBER` est défini

---

## 📞 Support

Djousse TECH — WhatsApp Group Bot Admin Platform v2.0
