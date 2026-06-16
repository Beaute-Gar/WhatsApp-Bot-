import Head from 'next/head'
import { useState, useEffect, useCallback, useRef } from 'react'
import styles from '../styles/Home.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────
type Lang = 'fr' | 'en'
type TabId = 'dashboard' | 'groups' | 'broadcast' | 'scheduled' | 'commands'
type BotStatus = { ready: boolean; groupsSelected: number; groupsDetected: number; uptime?: number }
type Group = { id: string; name: string; memberCount: number; isAdmin: boolean; selected: boolean }
type ScheduledMsg = { id: string; groupId: string; groupName: string; message: string; time: string; active: boolean }
type Toast = { id: number; msg: string; type: 'ok' | 'err' | 'info' }

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  fr: {
    tagline: 'Plateforme Admin Bot WhatsApp',
    heroTitle: 'Gérez vos groupes',
    heroEm: 'WhatsApp.',
    heroSub: "Administration centralisée de vos communautés WhatsApp. Automatisez, diffusez, planifiez — 24h/24.",
    connect: 'Connexion Bot',
    number: 'Numéro administrateur',
    placeholder: '+237 6XX XXX XXX',
    btnConnect: 'Connecter',
    connecting: 'Connexion en cours…',
    connected: '✓ Bot connecté',
    disconnected: 'Bot déconnecté',
    botOnline: 'Bot en ligne',
    botOffline: 'Bot hors ligne',
    tabs: { dashboard: 'Tableau de bord', groups: 'Groupes', broadcast: 'Diffusion', scheduled: 'Planifiés', commands: 'Commandes' },
    statsGroups: 'Groupes gérés',
    statsMembers: 'Membres totaux',
    statsUptime: 'Disponibilité',
    statsMsgs: 'Messages envoyés',
    groupsTitle: 'Vos groupes WhatsApp',
    groupsRefresh: 'Actualiser',
    groupsSave: 'Sauvegarder la sélection',
    groupsSaved: '✓ Sélection sauvegardée',
    groupsEmpty: 'Aucun groupe détecté. Assurez-vous que le bot est connecté.',
    groupAdmin: 'Admin',
    groupMembers: 'membres',
    broadcastTitle: 'Diffusion de message',
    broadcastTarget: 'Envoyer à',
    broadcastAll: 'Tous les groupes sélectionnés',
    broadcastMsg: 'Message à diffuser',
    broadcastBtn: 'Envoyer maintenant',
    broadcastSent: '✓ Message diffusé',
    scheduledTitle: 'Messages planifiés',
    scheduledAdd: 'Ajouter',
    scheduledGroup: 'Groupe cible',
    scheduledTime: 'Heure',
    scheduledMsg: 'Message',
    scheduledSave: 'Planifier',
    scheduledActive: 'Actif',
    scheduledDelete: 'Supprimer',
    commandsTitle: 'Commandes automatiques',
    commandsInfo: 'Ces commandes sont disponibles dans tous vos groupes gérés.',

    howTitle: 'Comment démarrer',
    how1: 'Le bot WhatsApp démarre automatiquement — un QR code apparaît dans la console Railway',
    how2: 'Scannez le QR code avec WhatsApp (Paramètres → Appareils liés → Lier un appareil)',
    how3: 'Le bot détecte automatiquement vos groupes — sélectionnez les cibles',
    how4: 'Diffusez des messages, planifiez des envois et gérez vos communautés',
    noServer: 'Serveur bot inaccessible. Configurez BOT_SERVER_URL.',
    errNumber: 'Numéro invalide. Format: +237XXXXXXXXX',
    errEmpty: 'Champ requis',
    errSend: 'Erreur envoi',
    copy: 'Copié !',
  },
  en: {
    tagline: 'WhatsApp Group Bot Admin Platform',
    heroTitle: 'Manage your',
    heroEm: 'WhatsApp groups.',
    heroSub: 'Centralized administration for your WhatsApp communities. Automate, broadcast, schedule — 24/7.',
    connect: 'Bot Connection',
    number: 'Admin number',
    placeholder: '+237 6XX XXX XXX',
    btnConnect: 'Connect',
    connecting: 'Connecting…',
    connected: '✓ Bot connected',
    disconnected: 'Bot disconnected',
    botOnline: 'Bot online',
    botOffline: 'Bot offline',
    tabs: { dashboard: 'Dashboard', groups: 'Groups', broadcast: 'Broadcast', scheduled: 'Scheduled', commands: 'Commands' },
    statsGroups: 'Managed groups',
    statsMembers: 'Total members',
    statsUptime: 'Uptime',
    statsMsgs: 'Messages sent',
    groupsTitle: 'Your WhatsApp groups',
    groupsRefresh: 'Refresh',
    groupsSave: 'Save selection',
    groupsSaved: '✓ Selection saved',
    groupsEmpty: 'No groups detected. Make sure the bot is connected.',
    groupAdmin: 'Admin',
    groupMembers: 'members',
    broadcastTitle: 'Broadcast message',
    broadcastTarget: 'Send to',
    broadcastAll: 'All selected groups',
    broadcastMsg: 'Message to broadcast',
    broadcastBtn: 'Send now',
    broadcastSent: '✓ Message broadcast',
    scheduledTitle: 'Scheduled messages',
    scheduledAdd: 'Add',
    scheduledGroup: 'Target group',
    scheduledTime: 'Time',
    scheduledMsg: 'Message',
    scheduledSave: 'Schedule',
    scheduledActive: 'Active',
    scheduledDelete: 'Delete',
    commandsTitle: 'Auto commands',
    commandsInfo: 'These commands are available in all your managed groups.',

    howTitle: 'How to get started',
    how1: 'The WhatsApp bot starts automatically — a QR code appears in the Railway console',
    how2: 'Scan the QR code with WhatsApp (Settings → Linked devices → Link a device)',
    how3: 'The bot auto-detects your groups — select your targets',
    how4: 'Broadcast messages, schedule sends, and manage your communities',
    noServer: 'Bot server unreachable. Configure BOT_SERVER_URL.',
    errNumber: 'Invalid number. Format: +237XXXXXXXXX',
    errEmpty: 'Required field',
    errSend: 'Send error',
    copy: 'Copied!',
  },
}

const COMMANDS = [
  { trigger: '/help', desc: { fr: 'Affiche la liste des commandes', en: 'Show commands list' } },
  { trigger: '/status', desc: { fr: 'Statut du bot', en: 'Bot status' } },
  { trigger: '/info', desc: { fr: 'Infos sur Djousse Tech Evolution', en: 'About Djousse Tech Evolution' } },
  { trigger: '/support', desc: { fr: 'Contacter le support', en: 'Contact support' } },
  { trigger: '/groupes', desc: { fr: 'Liste des groupes actifs', en: 'List active groups' } },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function Home() {
  const [lang, setLang] = useState<Lang | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [connecting, setConnecting] = useState(false)
  const [botStatus, setBotStatus] = useState<BotStatus>({ ready: false, groupsSelected: 0, groupsDetected: 0 })
  const [groups, setGroups] = useState<Group[]>([])
  const [broadcastMsg, setBroadcastMsg] = useState('')
  const [broadcastTarget, setBroadcastTarget] = useState('all')
  const [sending, setSending] = useState(false)
  const [scheduled, setScheduled] = useState<ScheduledMsg[]>([])
  const [newSched, setNewSched] = useState({ groupId: '', time: '09:00', message: '' })
  const [toasts, setToasts] = useState<Toast[]>([])
  const [msgsSent, setMsgsSent] = useState(0)
  const toastId = useRef(0)

  const t = lang ? T[lang] : T['fr']

  // ─── Toast system
  const toast = useCallback((msg: string, type: Toast['type'] = 'ok') => {
    const id = ++toastId.current
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  // ─── Fetch bot status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status')
      const data: BotStatus = await res.json()
      setBotStatus(data)
    } catch {
      setBotStatus(prev => ({ ...prev, ready: false }))
    }
  }, [])

  // ─── Fetch groups
  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/groups')
      const data: { groups: Group[] } = await res.json()
      if (data.groups) setGroups(data.groups)
    } catch {
      // silently fail
    }
  }, [])

  // ─── Fetch scheduled
  const fetchScheduled = useCallback(async () => {
    try {
      const res = await fetch('/api/scheduled')
      const data: { items: ScheduledMsg[] } = await res.json()
      if (data.items) setScheduled(data.items)
    } catch {
      // silently fail
    }
  }, [])

  // ─── Init
  useEffect(() => {
    const saved = localStorage.getItem('dte_lang') as Lang | null
    if (saved) setLang(saved)

    const msgs = parseInt(localStorage.getItem('dte_msgs_sent') || '0', 10)
    setMsgsSent(msgs)
  }, [])

  // ─── Polling
  useEffect(() => {
    if (!lang) return
    fetchStatus()
    const interval = setInterval(fetchStatus, 10000)
    return () => clearInterval(interval)
  }, [lang, fetchStatus])

  useEffect(() => {
    if (activeTab === 'groups') fetchGroups()
    if (activeTab === 'scheduled') fetchScheduled()
  }, [activeTab, fetchGroups, fetchScheduled])

  // ─── Select language
  const chooseLang = (l: Lang) => {
    setLang(l)
    localStorage.setItem('dte_lang', l)
    fetchStatus()
  }

  // ─── Save group selection
  const saveGroupSelection = async () => {
    const selected = groups.filter(g => g.selected).map(g => g.id)
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected }),
      })
      const data = await res.json()
      if (data.error) toast(data.error, 'err')
      else {
        toast(t.groupsSaved, 'ok')
        fetchStatus()
      }
    } catch {
      toast(t.noServer, 'err')
    }
  }

  // ─── Toggle group
  const toggleGroup = (id: string) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, selected: !g.selected } : g))
  }

  // ─── Broadcast
  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) { toast(t.errEmpty, 'err'); return }
    setSending(true)
    try {
      const targets = broadcastTarget === 'all'
        ? groups.filter(g => g.selected).map(g => g.id)
        : [broadcastTarget]

      let ok = 0
      for (const groupId of targets) {
        const res = await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId, message: broadcastMsg }),
        })
        const data = await res.json()
        if (!data.error) ok++
      }
      const sent = msgsSent + ok
      setMsgsSent(sent)
      localStorage.setItem('dte_msgs_sent', String(sent))
      toast(`${t.broadcastSent} (${ok}/${targets.length})`, 'ok')
      setBroadcastMsg('')
    } catch {
      toast(t.errSend, 'err')
    }
    setSending(false)
  }

  // ─── Add scheduled
  const handleAddScheduled = async () => {
    if (!newSched.groupId || !newSched.message.trim()) { toast(t.errEmpty, 'err'); return }
    try {
      const res = await fetch('/api/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSched),
      })
      const data = await res.json()
      if (data.error) toast(data.error, 'err')
      else {
        toast('✓ ' + (lang === 'fr' ? 'Message planifié' : 'Message scheduled'), 'ok')
        setNewSched({ groupId: '', time: '09:00', message: '' })
        fetchScheduled()
      }
    } catch {
      toast(t.noServer, 'err')
    }
  }

  // ─── Delete scheduled
  const handleDeleteScheduled = async (id: string) => {
    try {
      await fetch('/api/scheduled', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setScheduled(prev => prev.filter(s => s.id !== id))
    } catch {
      toast(t.noServer, 'err')
    }
  }

  const selectedCount = groups.filter(g => g.selected).length
  const totalMembers = groups.filter(g => g.selected).reduce((a, g) => a + g.memberCount, 0)

  // ─── Lang selection screen
  if (!lang) {
    return (
      <>
        <Head><title>Djousse Tech Evolution</title></Head>
        <div className={styles.langScreen}>
          <div className={styles.langWrap}>
            <div className={styles.langLogo}>
              <i className="fab fa-whatsapp" />
            </div>
            <div className={styles.langBrand}>
              DJOUSSE <span>TECH</span><br />
              <em>EVOLUTION</em>
            </div>
            <p className={styles.langSub}>WhatsApp Group Bot Admin Platform · v2.0</p>
            <div className={styles.langBtns}>
              <button onClick={() => chooseLang('fr')} className={styles.langBtn}>
                <span className={styles.langFlag}>🇫🇷</span>
                <span className={styles.langName}>Français</span>
              </button>
              <button onClick={() => chooseLang('en')} className={styles.langBtn}>
                <span className={styles.langFlag}>🇬🇧</span>
                <span className={styles.langName}>English</span>
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ─── Main app
  return (
    <>
      <Head>
        <title>Djousse Tech Evolution — WhatsApp Bot Admin</title>
      </Head>

      {/* Background orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Toast notifications */}
      <div className={styles.toastContainer}>
        {toasts.map(t => (
          <div key={t.id} className={`${styles.toast} ${styles[`toast_${t.type}`]}`}>
            {t.type === 'ok' && <i className="fas fa-check-circle" />}
            {t.type === 'err' && <i className="fas fa-triangle-exclamation" />}
            {t.type === 'info' && <i className="fas fa-info-circle" />}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerLogo}>
            <i className="fab fa-whatsapp" />
          </div>
          <div className={styles.headerWordmark}>
            DJOUSSE <span>TECH</span> EVOLUTION
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={`${styles.statusBadge} ${botStatus.ready ? styles.statusOnline : styles.statusOffline}`}>
            <span className={styles.statusDot} />
            <span>{botStatus.ready ? t.botOnline : t.botOffline}</span>
          </div>
          <button
            className={styles.langToggle}
            onClick={() => chooseLang(lang === 'fr' ? 'en' : 'fr')}
            title="Switch language"
          >
            {lang === 'fr' ? '🇬🇧' : '🇫🇷'}
          </button>
        </div>
      </header>

      <div className={styles.layout}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <nav className={styles.nav}>
            {(Object.keys(t.tabs) as TabId[]).map(tab => (
              <button
                key={tab}
                className={`${styles.navItem} ${activeTab === tab ? styles.navItemActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                <i className={`fas fa-${
                  tab === 'dashboard' ? 'chart-line' :
                  tab === 'groups' ? 'users' :
                  tab === 'broadcast' ? 'bullhorn' :
                  tab === 'scheduled' ? 'clock' :
                  tab === 'commands' ? 'terminal' :
                  'chart-line'
                }`} />
                <span>{t.tabs[tab]}</span>
                {tab === 'groups' && selectedCount > 0 && (
                  <span className={styles.navBadge}>{selectedCount}</span>
                )}
              </button>
            ))}
          </nav>


        </aside>

        {/* Main content */}
        <main className={styles.main}>

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <div className={styles.tabContent}>
              <div className={styles.heroSection}>
                <div className={styles.heroTag}>
                  <i className="fab fa-whatsapp" /> {t.tagline}
                </div>
                <h1 className={styles.heroTitle}>
                  {t.heroTitle}<br />
                  <em className={styles.heroEm}>{t.heroEm}</em>
                </h1>
                <p className={styles.heroSub}>{t.heroSub}</p>
              </div>

              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statValue} style={{ color: 'var(--acc)' }}>
                    {botStatus.groupsSelected || 0}
                  </div>
                  <div className={styles.statLabel}>{t.statsGroups}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{totalMembers.toLocaleString()}</div>
                  <div className={styles.statLabel}>{t.statsMembers}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue} style={{ color: 'var(--gold)' }}>99%</div>
                  <div className={styles.statLabel}>{t.statsUptime}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{msgsSent}</div>
                  <div className={styles.statLabel}>{t.statsMsgs}</div>
                </div>
              </div>

              {/* How to */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <i className="fas fa-rocket" /> {t.howTitle}
                </div>
                <div className={styles.steps}>
                  {[t.how1, t.how2, t.how3, t.how4].map((step, i) => (
                    <div key={i} className={styles.step}>
                      <div className={styles.stepNum}>0{i + 1}</div>
                      <div className={styles.stepText} dangerouslySetInnerHTML={{ __html: step }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Bot status card */}
              <div className={`${styles.card} ${botStatus.ready ? styles.cardOnline : styles.cardOffline}`}>
                <div className={styles.cardHeader}>
                  <i className={`fas fa-${botStatus.ready ? 'circle-check' : 'circle-xmark'}`} />
                  {botStatus.ready ? t.botOnline : t.botOffline}
                </div>
                <p className={styles.cardSub}>
                  {botStatus.ready
                    ? `${botStatus.groupsSelected} groupe(s) actif(s) · ${botStatus.groupsDetected} détecté(s)`
                    : t.noServer
                  }
                </p>
              </div>
            </div>
          )}

          {/* ── GROUPS ── */}
          {activeTab === 'groups' && (
            <div className={styles.tabContent}>
              <div className={styles.tabHeader}>
                <h2 className={styles.tabTitle}>{t.groupsTitle}</h2>
                <div className={styles.tabActions}>
                  <button className={styles.btnSecondary} onClick={fetchGroups}>
                    <i className="fas fa-rotate" /> {t.groupsRefresh}
                  </button>
                  <button className={styles.btnPrimary} onClick={saveGroupSelection} disabled={groups.length === 0}>
                    <i className="fas fa-floppy-disk" /> {t.groupsSave}
                  </button>
                </div>
              </div>

              {groups.length === 0 ? (
                <div className={styles.emptyState}>
                  <i className="fas fa-users-slash" />
                  <p>{t.groupsEmpty}</p>
                </div>
              ) : (
                <div className={styles.groupsList}>
                  {groups.map(g => (
                    <div
                      key={g.id}
                      className={`${styles.groupCard} ${g.selected ? styles.groupCardSelected : ''}`}
                      onClick={() => toggleGroup(g.id)}
                    >
                      <div className={styles.groupCheckbox}>
                        <div className={`${styles.checkbox} ${g.selected ? styles.checkboxChecked : ''}`}>
                          {g.selected && <i className="fas fa-check" />}
                        </div>
                      </div>
                      <div className={styles.groupAvatar}>
                        {g.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={styles.groupInfo}>
                        <div className={styles.groupName}>{g.name}</div>
                        <div className={styles.groupMeta}>
                          {g.memberCount} {t.groupMembers}
                          {g.isAdmin && <span className={styles.adminBadge}>{t.groupAdmin}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── BROADCAST ── */}
          {activeTab === 'broadcast' && (
            <div className={styles.tabContent}>
              <div className={styles.tabHeader}>
                <h2 className={styles.tabTitle}>{t.broadcastTitle}</h2>
              </div>

              <div className={styles.card}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <i className="fas fa-crosshairs" /> {t.broadcastTarget}
                  </label>
                  <select
                    className={styles.select}
                    value={broadcastTarget}
                    onChange={e => setBroadcastTarget(e.target.value)}
                  >
                    <option value="all">{t.broadcastAll} ({selectedCount})</option>
                    {groups.filter(g => g.selected).map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <i className="fas fa-comment" /> {t.broadcastMsg}
                  </label>
                  <textarea
                    className={styles.textarea}
                    rows={6}
                    placeholder={lang === 'fr' ? 'Rédigez votre message ici…' : 'Type your message here…'}
                    value={broadcastMsg}
                    onChange={e => setBroadcastMsg(e.target.value)}
                  />
                  <div className={styles.charCount}>{broadcastMsg.length} {lang === 'fr' ? 'caractères' : 'characters'}</div>
                </div>

                <button
                  className={styles.btnPrimary}
                  onClick={handleBroadcast}
                  disabled={sending || !botStatus.ready || selectedCount === 0}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {sending ? (
                    <><i className="fas fa-spinner fa-spin" /> {lang === 'fr' ? 'Envoi…' : 'Sending…'}</>
                  ) : (
                    <><i className="fas fa-paper-plane" /> {t.broadcastBtn}</>
                  )}
                </button>

                {!botStatus.ready && (
                  <p className={styles.warnText}><i className="fas fa-triangle-exclamation" /> {t.noServer}</p>
                )}
              </div>
            </div>
          )}

          {/* ── SCHEDULED ── */}
          {activeTab === 'scheduled' && (
            <div className={styles.tabContent}>
              <div className={styles.tabHeader}>
                <h2 className={styles.tabTitle}>{t.scheduledTitle}</h2>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}><i className="fas fa-plus" /> {t.scheduledAdd}</div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label className={styles.label}>{t.scheduledGroup}</label>
                    <select
                      className={styles.select}
                      value={newSched.groupId}
                      onChange={e => setNewSched(p => ({ ...p, groupId: e.target.value }))}
                    >
                      <option value="">{lang === 'fr' ? 'Choisir un groupe' : 'Choose a group'}</option>
                      {groups.filter(g => g.selected).map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup} style={{ width: '140px' }}>
                    <label className={styles.label}>{t.scheduledTime}</label>
                    <input
                      type="time"
                      className={styles.input}
                      value={newSched.time}
                      onChange={e => setNewSched(p => ({ ...p, time: e.target.value }))}
                    />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>{t.scheduledMsg}</label>
                  <textarea
                    className={styles.textarea}
                    rows={3}
                    value={newSched.message}
                    onChange={e => setNewSched(p => ({ ...p, message: e.target.value }))}
                    placeholder={lang === 'fr' ? 'Message à envoyer automatiquement…' : 'Message to send automatically…'}
                  />
                </div>
                <button className={styles.btnPrimary} onClick={handleAddScheduled}>
                  <i className="fas fa-clock" /> {t.scheduledSave}
                </button>
              </div>

              {scheduled.length > 0 && (
                <div className={styles.scheduledList}>
                  {scheduled.map(s => (
                    <div key={s.id} className={styles.scheduledCard}>
                      <div className={styles.scheduledTime}>{s.time}</div>
                      <div className={styles.scheduledInfo}>
                        <div className={styles.scheduledGroup}>{s.groupName}</div>
                        <div className={styles.scheduledMsg}>{s.message}</div>
                      </div>
                      <div className={styles.scheduledActions}>
                        <div className={`${styles.activeDot} ${s.active ? styles.activeDotOn : ''}`} />
                        <button className={styles.btnDanger} onClick={() => handleDeleteScheduled(s.id)}>
                          <i className="fas fa-trash" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── COMMANDS ── */}
          {activeTab === 'commands' && (
            <div className={styles.tabContent}>
              <div className={styles.tabHeader}>
                <h2 className={styles.tabTitle}>{t.commandsTitle}</h2>
              </div>
              <p className={styles.infoText}>{t.commandsInfo}</p>
              <div className={styles.commandsList}>
                {COMMANDS.map(cmd => (
                  <div key={cmd.trigger} className={styles.commandCard}>
                    <div className={styles.commandTrigger}>{cmd.trigger}</div>
                    <div className={styles.commandDesc}>{cmd.desc[lang]}</div>
                    <button
                      className={styles.btnCopy}
                      onClick={async () => {
                        await navigator.clipboard.writeText(cmd.trigger)
                        toast(t.copy, 'ok')
                      }}
                    >
                      <i className="fas fa-copy" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <span>Djousse Tech Evolution © 2024 — Djousse TECH</span>
        <span style={{ color: 'var(--dim)' }}>v2.0.0</span>
      </footer>
    </>
  )
}
