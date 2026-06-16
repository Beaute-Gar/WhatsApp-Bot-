// ═══════════════════════════════════════════════════════════════════════════════
//  DJOUSSE TECH EVOLUTION — WhatsApp Bot Server
//  Author: Djousse TECH | Version: 2.0.0
//  Déployable sur : Railway, Render, VPS, ou en local
// ═══════════════════════════════════════════════════════════════════════════════

'use strict'

require('dotenv').config()
const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const { Client, LocalAuth } = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')
const { v4: uuidv4 } = require('uuid')

// ─── Configuration ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000
const ADMIN_NUMBER = process.env.ADMIN_NUMBER || ''
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

const DATA_DIR = path.join(__dirname, 'data')
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions')
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json')
const SCHEDULED_FILE = path.join(DATA_DIR, 'scheduled.json')
const STATS_FILE = path.join(DATA_DIR, 'stats.json')

;[DATA_DIR, SESSIONS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }) })

// ─── Helpers ──────────────────────────────────────────────────────────────────
const readJSON = (file, def) => {
  try { return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : def }
  catch { return def }
}
const writeJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2))

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express()

app.use(cors({
  origin: [FRONTEND_URL, 'http://localhost:3000', /\.vercel\.app$/],
  credentials: true,
}))
app.use(express.json())

// ─── État global ──────────────────────────────────────────────────────────────
let client = null
let isReady = false
let currentQR = null
let selectedGroupIds = readJSON(GROUPS_FILE, [])
let scheduledMessages = readJSON(SCHEDULED_FILE, [])
let stats = readJSON(STATS_FILE, { msgsSent: 0, startTime: Date.now() })
let detectedGroups = []

// ─── Persistance ──────────────────────────────────────────────────────────────
const saveGroups = () => writeJSON(GROUPS_FILE, selectedGroupIds)
const saveScheduled = () => writeJSON(SCHEDULED_FILE, scheduledMessages)
const saveStats = () => writeJSON(STATS_FILE, stats)

// ─── Réponses automatiques par défaut ─────────────────────────────────────────
const AUTO_RESPONSES = {
  '/help': (lang) => lang === 'fr'
    ? `📋 *Djousse Tech Evolution — Commandes disponibles :*\n\n• /help — Affiche ce menu\n• /status — Statut du bot\n• /info — À propos du bot\n• /support — Contacter le support\n• /groupes — Groupes actifs`
    : `📋 *Djousse Tech Evolution — Available commands:*\n\n• /help — Show this menu\n• /status — Bot status\n• /info — About the bot\n• /support — Contact support\n• /groupes — Active groups`,

  '/status': () => `🤖 *Djousse Tech Evolution — Status*\n\n✅ Bot en ligne / Online\n✅ Serveur opérationnel\n⏱️ Uptime: ${formatUptime()}`,

  '/info': () => `✨ *Djousse Tech Evolution*\n\nPlateforme d'administration WhatsApp\n\n👤 Auteur: Djousse TECH\n📱 Version: 2.0\n🌍 Disponible 24h/24`,

  '/support': () => `📞 *Support Djousse Tech Evolution*\n\nContactez l'administrateur pour toute assistance.\n\n_Powered by Djousse TECH_`,

  '/groupes': () => `📱 *Groupes gérés (${selectedGroupIds.length}) :*\n\n${
    detectedGroups
      .filter(g => selectedGroupIds.includes(g.id))
      .map(g => `• ${g.name} (${g.memberCount} membres)`)
      .join('\n') || 'Aucun groupe configuré'
  }`,
}

function formatUptime() {
  const ms = Date.now() - stats.startTime
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${m}m`
}

// ─── Initialisation du client WhatsApp ────────────────────────────────────────
function initClient() {
  console.log('🔄 Initialisation du client WhatsApp...')

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSIONS_DIR }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    },
  })

  client.on('qr', (qr) => {
    console.log('\n📱 Scannez ce QR code avec WhatsApp :')
    qrcode.generate(qr, { small: true })
    currentQR = qr
    console.log('\n💡 Ou accédez à l\'API GET /api/qr pour récupérer le QR sous forme texte\n')
  })

  client.on('authenticated', () => {
    console.log('🔐 Authentification réussie')
    currentQR = null
  })

  client.on('ready', async () => {
    console.log('✅ Bot WhatsApp prêt !')
    isReady = true
    currentQR = null
    await refreshGroups()
    startScheduler()
  })

  client.on('auth_failure', (msg) => {
    console.error('❌ Échec authentification:', msg)
    isReady = false
  })

  client.on('disconnected', (reason) => {
    console.warn('⚠️ Déconnecté:', reason)
    isReady = false
    setTimeout(() => {
      console.log('🔄 Reconnexion...')
      client.initialize().catch(console.error)
    }, 5000)
  })

  client.on('message', handleMessage)

  client.initialize().catch(err => {
    console.error('❌ Erreur initialisation:', err)
  })
}

// ─── Gestion des messages entrants ────────────────────────────────────────────
async function handleMessage(message) {
  try {
    if (message.isStatus || !message.body) return

    const chat = await message.getChat()
    const body = message.body.trim().toLowerCase()

    if (!chat.isGroup) {
      // Message privé de l'admin
      if (ADMIN_NUMBER && message.from === `${ADMIN_NUMBER}@c.us`) {
        await message.reply(`🤖 *Djousse Tech Evolution Bot*\n\nJe suis actif et opérationnel.\nAjoutez-moi à un groupe pour utiliser toutes mes fonctionnalités.\n\n_Uptime: ${formatUptime()}_`)
      }
      return
    }

    // Commandes dans les groupes
    const handler = AUTO_RESPONSES[body]
    if (handler) {
      const contact = await message.getContact()
      const lang = contact.pushname?.match(/[^\x00-\x7F]/) ? 'fr' : 'fr'
      await message.reply(handler(lang))
      console.log(`📝 Commande ${body} traitée dans ${chat.name}`)
    }
  } catch (err) {
    console.error('❌ Erreur traitement message:', err)
  }
}

// ─── Détection des groupes ────────────────────────────────────────────────────
async function refreshGroups() {
  if (!isReady || !client) return []
  try {
    const chats = await client.getChats()
    detectedGroups = chats
      .filter(c => c.isGroup)
      .map(c => ({
        id: c.id._serialized,
        name: c.name,
        memberCount: c.participants?.length || 0,
        isAdmin: c.participants?.some(p => p.id._serialized === client.info?.wid?._serialized && p.isAdmin) || false,
        selected: selectedGroupIds.includes(c.id._serialized),
      }))
    console.log(`📋 ${detectedGroups.length} groupe(s) détecté(s)`)
    return detectedGroups
  } catch (err) {
    console.error('❌ Erreur détection groupes:', err)
    return []
  }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────
let schedulerInterval = null

function startScheduler() {
  if (schedulerInterval) clearInterval(schedulerInterval)
  schedulerInterval = setInterval(runScheduler, 60000)
  console.log('⏰ Scheduler démarré')
}

async function runScheduler() {
  if (!isReady) return
  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  for (const sched of scheduledMessages) {
    if (!sched.active || sched.time !== currentTime) continue
    try {
      const success = await sendToGroup(sched.groupId, sched.message)
      if (success) {
        stats.msgsSent++
        saveStats()
        console.log(`⏰ Message planifié envoyé à ${sched.groupId} (${currentTime})`)
      }
    } catch (err) {
      console.error('❌ Erreur scheduler:', err)
    }
  }
}

// ─── Envoi de message ─────────────────────────────────────────────────────────
async function sendToGroup(groupId, message) {
  if (!isReady || !client) throw new Error('Bot non connecté')
  const chat = await client.getChatById(groupId)
  if (!chat || !chat.isGroup) throw new Error('Groupe introuvable: ' + groupId)
  await chat.sendMessage(message)
  stats.msgsSent++
  saveStats()
  return true
}

// ═══════════════════════════════════════════════════════════════════════════════
//  API ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// Middleware de log
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
  next()
})

// ── GET /api/status ──────────────────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  res.json({
    ready: isReady,
    groupsDetected: detectedGroups.length,
    groupsSelected: selectedGroupIds.length,
    msgsSent: stats.msgsSent,
    uptime: Date.now() - stats.startTime,
    qrPending: !!currentQR,
  })
})

// ── GET /api/qr ───────────────────────────────────────────────────────────────
app.get('/api/qr', (req, res) => {
  if (!currentQR) return res.json({ available: false, message: isReady ? 'Déjà connecté' : 'Pas de QR disponible' })
  res.json({ available: true, qr: currentQR })
})

// ── POST /api/connect ─────────────────────────────────────────────────────────
app.post('/api/connect', (req, res) => {
  const { number } = req.body || {}
  const clean = String(number || '').replace(/[^0-9]/g, '')

  if (!clean || clean.length < 9) {
    return res.status(400).json({ error: 'Numéro invalide' })
  }

  if (ADMIN_NUMBER && clean !== ADMIN_NUMBER) {
    return res.status(403).json({ error: 'Accès réservé à l\'administrateur' })
  }

  if (isReady) {
    return res.json({ success: true, message: '✅ Bot déjà connecté et opérationnel' })
  }

  if (currentQR) {
    return res.json({
      success: true,
      message: '📱 QR code disponible. Scannez-le dans la console du serveur ou appelez GET /api/qr',
      qrPending: true,
    })
  }

  // Lancer l'initialisation si pas encore fait
  if (!client) {
    initClient()
    return res.json({ success: true, message: '🔄 Initialisation du bot en cours… Le QR code apparaîtra dans la console.' })
  }

  res.json({ success: true, message: '🔄 Bot en cours de connexion…' })
})

// ── GET /api/groups ───────────────────────────────────────────────────────────
app.get('/api/groups', async (req, res) => {
  if (!isReady) {
    return res.json({ connected: false, groups: [], message: 'Bot non connecté' })
  }
  const groups = await refreshGroups()
  res.json({ connected: true, groups })
})

// ── POST /api/groups/select ───────────────────────────────────────────────────
app.post('/api/groups/select', (req, res) => {
  const { selected } = req.body || {}
  if (!Array.isArray(selected)) return res.status(400).json({ error: 'selected doit être un tableau' })
  selectedGroupIds = selected
  saveGroups()
  res.json({ success: true, selectedCount: selected.length })
})

// ── POST /api/send ────────────────────────────────────────────────────────────
app.post('/api/send', async (req, res) => {
  const { groupId, message } = req.body || {}
  if (!groupId || !message) return res.status(400).json({ error: 'groupId et message requis' })
  if (!isReady) return res.status(503).json({ error: 'Bot non connecté' })

  try {
    await sendToGroup(groupId, message)
    res.json({ success: true, message: 'Message envoyé' })
  } catch (err) {
    console.error('❌ Erreur envoi:', err)
    res.status(500).json({ error: err.message || 'Erreur interne' })
  }
})

// ── GET /api/scheduled ───────────────────────────────────────────────────────
app.get('/api/scheduled', (req, res) => {
  const items = scheduledMessages.map(s => ({
    ...s,
    groupName: detectedGroups.find(g => g.id === s.groupId)?.name || s.groupId,
  }))
  res.json({ items })
})

// ── POST /api/scheduled ──────────────────────────────────────────────────────
app.post('/api/scheduled', (req, res) => {
  const { groupId, time, message } = req.body || {}
  if (!groupId || !time || !message) return res.status(400).json({ error: 'groupId, time et message requis' })

  const item = { id: uuidv4(), groupId, time, message, active: true, createdAt: new Date().toISOString() }
  scheduledMessages.push(item)
  saveScheduled()
  res.json({ success: true, item })
})

// ── DELETE /api/scheduled ─────────────────────────────────────────────────────
app.delete('/api/scheduled', (req, res) => {
  const { id } = req.body || {}
  if (!id) return res.status(400).json({ error: 'id requis' })
  scheduledMessages = scheduledMessages.filter(s => s.id !== id)
  saveScheduled()
  res.json({ success: true })
})

// ── PATCH /api/scheduled/:id ──────────────────────────────────────────────────
app.patch('/api/scheduled/:id', (req, res) => {
  const { id } = req.params
  const idx = scheduledMessages.findIndex(s => s.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Non trouvé' })
  scheduledMessages[idx] = { ...scheduledMessages[idx], ...req.body }
  saveScheduled()
  res.json({ success: true, item: scheduledMessages[idx] })
})

// ── GET /health ───────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ ok: true, ready: isReady, uptime: process.uptime() })
})

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route non trouvée' })
})

// ─── Démarrage ────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║     DJOUSSE TECH EVOLUTION — WhatsApp Bot Server    ║
║                    Version 2.0.0                    ║
╚══════════════════════════════════════════════════════╝

🚀  Serveur démarré  →  http://localhost:${PORT}
📡  Health check     →  http://localhost:${PORT}/health
📊  Status API       →  http://localhost:${PORT}/api/status

📋  Configuration :
    • Admin number  : ${ADMIN_NUMBER || '⚠️  NON DÉFINI — ajouter dans .env'}
    • Frontend URL  : ${FRONTEND_URL}
    • Data dir      : ${DATA_DIR}

💡  Instructions :
    1. Copier .env.example → .env et remplir les valeurs
    2. Appeler POST /api/connect avec votre numéro
    3. Scanner le QR code qui apparaît dans cette console
    4. Le bot est prêt !
`)

  // Initialisation automatique si ADMIN_NUMBER est défini
  if (ADMIN_NUMBER) {
    console.log('🤖 Démarrage automatique du bot WhatsApp...\n')
    initClient()
  } else {
    console.log('⚠️  ADMIN_NUMBER non défini. Appelez POST /api/connect pour démarrer.\n')
  }
})

// ─── Graceful shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('\n⛔ Arrêt du serveur...')
  if (client) {
    try { await client.destroy() } catch {}
  }
  process.exit(0)
})

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ Unhandled rejection:', reason)
})
