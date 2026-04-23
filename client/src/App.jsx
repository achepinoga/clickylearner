import { useState, useEffect, useRef, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { playBack, playClick, playToggle, updateSoundSettings } from './sounds'
import { supabase } from './lib/supabase'
import Upload from './components/Upload'
import Typer from './components/Typer'
import SpeedTyper from './components/SpeedTyper'
import Results from './components/Results'
import GameMode from './components/GameMode'
import SettingsModal from './components/SettingsModal'
import FlashcardTest from './components/FlashcardTest'
import AuthModal from './components/AuthModal'
import HistoryPanel from './components/HistoryPanel'
import FlashcardsPage from './components/FlashcardsPage'
import IntroOverlay from './components/IntroOverlay'
import PasswordGate from './components/PasswordGate'
import RateLimitToast from './components/RateLimitToast'
import BuyCoinsModal from './components/BuyCoinsModal'
import './App.css'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const STAGES = { GAMEMODE: 'gamemode', FLASHCARDS: 'flashcards', UPLOAD: 'upload', TYPING: 'typing', RESULTS: 'results', TEST: 'test' }

function numberToWords(n) {
  if (n < 0) return 'negative ' + numberToWords(-n)
  const ones = ['zero','one','two','three','four','five','six','seven','eight','nine',
                'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen']
  const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety']
  if (n < 20) return ones[n]
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
  if (n < 1000) return ones[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + numberToWords(n % 100) : '')
  if (n < 1000000) return numberToWords(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + numberToWords(n % 1000) : '')
  return String(n)
}

function stripPunctuation(text) {
  return text
    .replace(/\d+/g, n => numberToWords(parseInt(n, 10)))
    .replace(/[^a-zA-Z\s]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const STAGE_LABELS_DEFAULT    = ['Mode', 'Upload',     'Practice', 'Results']
const STAGE_KEYS_DEFAULT      = [STAGES.GAMEMODE, STAGES.UPLOAD,     STAGES.TYPING, STAGES.RESULTS]
const STAGE_LABELS_FLASHCARDS = ['Mode', 'Upload',     'Practice', 'Results']
const STAGE_KEYS_FLASHCARDS   = [STAGES.GAMEMODE, STAGES.FLASHCARDS, STAGES.TYPING, STAGES.RESULTS]

const pageVariants = {
  initial: { opacity: 0, y: 22, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -22, filter: 'blur(6px)' },
}

const pageTransition = { duration: 0.4, ease: [0.4, 0, 0.2, 1] }

export default function App() {
  const [unlocked, setUnlocked] = useState(() => {
    try { return sessionStorage.getItem('cl_unlocked') === '1' } catch { return false }
  })

  const [rawNotes, setRawNotes] = useState(() => {
    try { const s = localStorage.getItem('cl_raw_notes'); return s ? JSON.parse(s) : [] } catch { return [] }
  })
  const [stage, setStageRaw] = useState(() => {
    try {
      const savedMode = localStorage.getItem('cl_game_mode')
      if (savedMode === 'speed') return STAGES.GAMEMODE
      const saved = localStorage.getItem('cl_raw_notes')
      return saved && JSON.parse(saved).length > 0 ? STAGES.TYPING : STAGES.GAMEMODE
    } catch { return STAGES.GAMEMODE }
  })
  const isPopState = useRef(false)
  const stageRef = useRef(stage)
  const currentSetIdRef = useRef(null)

  const setStage = (newStage) => {
    stageRef.current = newStage
    setStageRaw(newStage)
    if (!isPopState.current) history.pushState({ stage: newStage }, '')
  }

  const [results, setResults] = useState(() => {
    try { const s = localStorage.getItem('cl_results'); return s ? JSON.parse(s) : null } catch { return null }
  })
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('cl_theme') || 'dark' } catch { return 'dark' }
  })
  const [showIntro, setShowIntro] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)
  const [user, setUser] = useState(null)
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('cl_settings')
      return saved ? JSON.parse(saved) : { allowBackspace: true, punctuation: true, menuSounds: true, completionSound: true, autoAdvance: true }
    } catch { return { allowBackspace: true, punctuation: true, menuSounds: true, completionSound: true, autoAdvance: true } }
  })
  const [typingKey, setTypingKey] = useState(0)
  const [gameMode, setGameMode] = useState(() => {
    try { return localStorage.getItem('cl_game_mode') || 'standard' } catch { return 'standard' }
  })
  const [flashcardDifficulty, setFlashcardDifficulty] = useState(2)
  const [pendingRemainingText, setPendingRemainingText] = useState(null)
  const [isContinuing, setIsContinuing] = useState(false)
  const [continueError, setContinueError] = useState('')
  const currentDocTitleRef = useRef('')
  const settingsInitialized = useRef(false)
  const [limits, setLimits] = useState({ ai: { limit: 10, used: 0, remaining: 10, resetTime: null }, upload: { limit: 10, used: 0, remaining: 10, resetTime: null } })
  const [rateLimitError, setRateLimitError] = useState(null)
  const [testBackStage, setTestBackStage] = useState(STAGES.RESULTS)
  const [showCoinInfo, setShowCoinInfo] = useState(false)
  const [coinInfoPos, setCoinInfoPos] = useState({ top: 0, right: 0 })
  const coinInfoBtnRef = useRef(null)
  const [showBuyCoins, setShowBuyCoins] = useState(false)
  const [sessionToken, setSessionToken] = useState(null)

  const notes = useMemo(
    () => settings.punctuation ? rawNotes : rawNotes.map(stripPunctuation),
    [rawNotes, settings.punctuation]
  )

  // Fetch initial limit state on mount (re-runs when sessionToken is set)
  useEffect(() => {
    fetch(`${API_BASE}/api/limits`, {
      headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setLimits(data) })
      .catch(() => {})
  }, [sessionToken])

  const handleApiUsed = (type) => {
    const bucket = (type === 'ai-notes' || type === 'ai-quiz') ? 'ai' : type
    setLimits(prev => {
      const b = prev[bucket]
      const used = Math.min(b.limit, b.used + 1)
      return { ...prev, [bucket]: { ...b, used, remaining: Math.max(0, b.limit - used) } }
    })
  }

  const handleRateLimit = (type, resetTime) => {
    setRateLimitError({ type, resetTime })
    fetch(`${API_BASE}/api/limits`, {
      headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setLimits(data) })
      .catch(() => {})
  }

  const handleTestSet = (set) => {
    setRawNotes(set.notes)
    setTestBackStage(STAGES.FLASHCARDS)
    setStage(STAGES.TEST)
  }

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const resolvedUser = session?.user ?? null
      setUser(resolvedUser)
      setSessionToken(session?.access_token ?? null)
      if (!resolvedUser) setShowIntro(true)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setSessionToken(session?.access_token ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Handle Stripe redirect back to app
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') {
      window.history.replaceState({}, '', window.location.pathname)
      // Refresh coin balance from server
      fetch(`${API_BASE}/api/limits`, {
        headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {},
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setLimits(data) })
        .catch(() => {})
    }
  }, [sessionToken])

  useEffect(() => {
    if (!showMenu) return
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])


  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('cl_theme', theme) } catch {}
  }, [theme])

  useEffect(() => { localStorage.setItem('cl_settings', JSON.stringify(settings)) }, [settings])
  useEffect(() => { updateSoundSettings(settings) }, [settings])
  useEffect(() => { try { localStorage.removeItem('cl_stage') } catch {} }, [])
  useEffect(() => { history.replaceState({ stage: stageRef.current }, '') }, [])
  useEffect(() => {
    const handlePopState = (e) => {
      const prevStage = e.state?.stage
      if (!prevStage) { history.pushState({ stage: stageRef.current }, ''); return }
      isPopState.current = true
      setStageRaw(prevStage)
      isPopState.current = false
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])
  useEffect(() => { localStorage.setItem('cl_raw_notes', JSON.stringify(rawNotes)) }, [rawNotes])
  useEffect(() => { localStorage.setItem('cl_results', JSON.stringify(results)) }, [results])
  useEffect(() => {
    if (!settingsInitialized.current) { settingsInitialized.current = true; return }
    setTypingKey(k => k + 1)
  }, [settings])

  const stageLabels = gameMode === 'flashcards' ? STAGE_LABELS_FLASHCARDS : STAGE_LABELS_DEFAULT
  const stageKeys   = gameMode === 'flashcards' ? STAGE_KEYS_FLASHCARDS   : STAGE_KEYS_DEFAULT
  const navStage = (gameMode === 'flashcards' && stage === STAGES.UPLOAD) ? STAGES.FLASHCARDS : stage
  const currentStageIndex = stageKeys.indexOf(navStage)

  const chunkNotes = (incoming) => {
    const MAX_CHARS = 240
    const MIN_CHARS = 80
    const result = []
    for (const note of incoming) {
      const splitByNumber = note.split(/\s*\d+\.\s+/).filter(s => s.trim().length > 0)
      const items = splitByNumber.length > 1 ? splitByNumber.map(s => s.trim()) : [note.trim()]
      for (const item of items) {
        if (item.length <= MAX_CHARS) { result.push(item); continue }
        const words = item.split(' ')
        let chunk = ''
        for (const word of words) {
          const cand = chunk ? chunk + ' ' + word : word
          if (cand.length > MAX_CHARS) { if (chunk) result.push(chunk); chunk = word } else { chunk = cand }
        }
        if (chunk) result.push(chunk)
      }
    }
    const merged = []
    for (const chunk of result) {
      if (merged.length > 0) {
        const prev = merged[merged.length - 1]
        const combined = prev + ' ' + chunk
        if (prev.length < MIN_CHARS && combined.length <= MAX_CHARS) {
          merged[merged.length - 1] = combined
          continue
        }
      }
      merged.push(chunk)
    }
    return merged
  }

  const handleNotesReady = async (generatedNotes, title = 'Untitled Set', remainingText = null) => {
    const chunked = chunkNotes(generatedNotes)
    setRawNotes(chunked)
    setPendingRemainingText(remainingText)
    currentDocTitleRef.current = title
    setStage(STAGES.TYPING)
    currentSetIdRef.current = null

    if (user && gameMode === 'flashcards') {
      const { data, error } = await supabase
        .from('flashcard_sets')
        .insert({ user_id: user.id, title, notes: chunked, remaining_text: remainingText || null })
        .select('id')
        .single()
      if (!error && data) currentSetIdRef.current = data.id
    }
  }

  const handleContinueDocument = async () => {
    if (!pendingRemainingText) return
    setIsContinuing(true)
    setContinueError('')
    try {
      const res = await fetch(`${API_BASE}/api/notes/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({ text: pendingRemainingText })
      })
      const data = await res.json()
      if (res.status === 429) { handleRateLimit('ai', data.resetTime); return }
      if (!res.ok) throw new Error(data.error || 'Failed to generate notes')
      handleApiUsed('ai-notes')
      // Clear remaining_text from old set in Supabase
      if (user && currentSetIdRef.current) {
        await supabase.from('flashcard_sets').update({ remaining_text: null }).eq('id', currentSetIdRef.current)
      }
      setTypingKey(k => k + 1)
      await handleNotesReady(data.notes, currentDocTitleRef.current + ' (cont.)', data.truncated ? data.remainingText : null)
    } catch (err) {
      setContinueError(err.message)
    } finally {
      setIsContinuing(false)
    }
  }

  const handleDiscardContinuation = async () => {
    if (user && currentSetIdRef.current) {
      await supabase.from('flashcard_sets').update({ remaining_text: null }).eq('id', currentSetIdRef.current)
    }
    setPendingRemainingText(null)
  }

  const handleFinished = async (stats) => {
    setResults(stats)
    setStage(STAGES.RESULTS)

    if (user) {
      await supabase.from('runs').insert({
        user_id: user.id,
        mode: gameMode,
        wpm: Math.round(stats.wpm || 0),
        accuracy: parseFloat((stats.accuracy || 0).toFixed(2)),
        errors: stats.errors || 0,
        total_chars: stats.totalChars || 0,
        note_results: stats.noteResults || null,
        flashcard_set_id: currentSetIdRef.current || null,
      })
      currentSetIdRef.current = null
    }
  }

  const handleModeSelect = (modeId) => {
    try { localStorage.setItem('cl_game_mode', modeId) } catch {}
    setGameMode(modeId)
    setFlashcardDifficulty(2)
    if (modeId === 'speed') setStage(STAGES.TYPING)
    else if (modeId === 'flashcards') setStage(STAGES.FLASHCARDS)
    else setStage(STAGES.UPLOAD)
  }

  const handleRestart = () => {
    try { localStorage.removeItem('cl_game_mode') } catch {}
    setStage(STAGES.GAMEMODE)
    setRawNotes([])
    setResults(null)
    setGameMode('standard')
    currentSetIdRef.current = null
    setPendingRemainingText(null)
  }

  const handleRetry = () => {
    setResults(null)
    setTypingKey(k => k + 1)
    setStage(STAGES.TYPING)
  }

  const handleUpload = () => {
    setResults(null)
    setStage(STAGES.UPLOAD)
  }

  const handleTest = () => { setTestBackStage(STAGES.RESULTS); setStage(STAGES.TEST) }

  const handleReplaySet = (notes) => {
    setRawNotes(notes)
    setGameMode('flashcards')
    try { localStorage.setItem('cl_game_mode', 'flashcards') } catch {}
    setTypingKey(k => k + 1)
    setStage(STAGES.TYPING)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setShowHistory(false)
  }

  const displayEmail = user?.email
    ? user.email.length > 18 ? user.email.slice(0, 15) + '…' : user.email
    : null

  if (!unlocked) return <PasswordGate onUnlock={() => setUnlocked(true)} />

  return (
    <>
      <motion.div
        className="app"
        initial={{ opacity: 0 }}
        animate={{ opacity: authLoading || showIntro ? 0 : 1 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      >
        <motion.header
          className="header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="header-inner">
            {/* Hamburger menu — left side */}
            <div className="header-menu-wrap" ref={menuRef}>
              <button className="btn-hamburger" onClick={() => { playToggle(); setShowMenu(v => !v) }} aria-label="Menu">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    className="header-dropdown"
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                  >
                    {user ? (
                      <>
                        <span className="dropdown-email">{user.email}</span>
                        <div className="dropdown-divider" />
                        <button className="dropdown-item" onClick={() => { playClick(); setShowMenu(false); setShowHistory(true) }}>History</button>
                        <button className="dropdown-item dropdown-item--danger" onClick={() => { playBack(); setShowMenu(false); handleSignOut() }}>Sign Out</button>
                      </>
                    ) : (
                      <button className="dropdown-item dropdown-item--accent" onClick={() => { playClick(); setShowMenu(false); setShowAuth(true) }}>Sign In</button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="logo" onClick={() => { playBack(); handleRestart() }} style={{ cursor: 'pointer' }} title="Return Home">
              <div className="logo-mark">
                <img src="/logo.png" alt="cL" className="logo-img" />
              </div>
              <span className="logo-text">Clickylearner</span>
              <span className="logo-beta">beta</span>
            </div>

            <nav className="stage-nav" aria-label="Progress">
              {stageLabels.map((label, i) => (
                <div key={label} className="stage-nav-item">
                  {i > 0 && (
                    <div className={`stage-connector ${i <= currentStageIndex ? 'active' : ''}`} />
                  )}
                  <motion.div
                    className={`stage-dot ${i < currentStageIndex ? 'done' : i === currentStageIndex ? 'current' : 'upcoming'}`}
                    animate={i === currentStageIndex ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <span className={`stage-label ${i === currentStageIndex ? 'active' : ''}`}>{label}</span>
                </div>
              ))}
            </nav>

            <div className="header-right">
              <div className="limit-badge-wrap">
                <button
                  className={`limit-badge${limits.ai.remaining === 0 ? ' limit-badge--exhausted' : ''}`}
                  title="Buy coins"
                  onClick={() => { playClick(); setShowBuyCoins(true) }}
                >
                  <span className="limit-badge-coin">🪙</span>
                  <span className="limit-badge-val">{limits.ai.remaining}</span>
                </button>
                <button
                  ref={coinInfoBtnRef}
                  className="coin-info-btn"
                  aria-label="What are Clickycoins?"
                  onMouseEnter={() => {
                    if (coinInfoBtnRef.current) {
                      const r = coinInfoBtnRef.current.getBoundingClientRect()
                      setCoinInfoPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
                    }
                    setShowCoinInfo(true)
                  }}
                  onMouseLeave={() => setShowCoinInfo(false)}
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M7 6.3v3.4M7 4.5v.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <button className="btn-settings" aria-label="Settings" onClick={() => { playToggle(); setShowSettings(true) }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
            </div>
          </div>
        </motion.header>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            {stage === STAGES.GAMEMODE && (
              <motion.div key="gamemode" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden auto' }}>
                <GameMode onSelect={handleModeSelect} />
              </motion.div>
            )}
            {stage === STAGES.FLASHCARDS && (
              <motion.div key="flashcards" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden auto' }}>
                <FlashcardsPage
                  user={user}
                  onNewFile={() => setStage(STAGES.UPLOAD)}
                  onStudySet={(set) => {
                    setRawNotes(set.notes)
                    currentSetIdRef.current = set.id
                    setTypingKey(k => k + 1)
                    setStage(STAGES.TYPING)
                  }}
                  onTestSet={handleTestSet}
                  onBack={handleRestart}
                  onSignIn={() => setShowAuth(true)}
                  coinsRemaining={limits.ai.remaining}
                />
              </motion.div>
            )}
            {stage === STAGES.UPLOAD && (
              <motion.div key="upload" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden auto' }}>
                <Upload
                  onNotesReady={handleNotesReady}
                  gameMode={gameMode}
                  difficulty={flashcardDifficulty}
                  onDifficultyChange={setFlashcardDifficulty}
                  onBack={() => gameMode === 'flashcards' ? setStage(STAGES.FLASHCARDS) : handleRestart()}
                  onRateLimit={handleRateLimit}
                  onApiUsed={handleApiUsed}
                  uploadLimits={limits.ai}
                  coinsRemaining={limits.ai.remaining}
                  authToken={sessionToken}
                />
              </motion.div>
            )}
            {stage === STAGES.TYPING && (
              <motion.div key="typing" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden auto' }}>
                {gameMode === 'speed'
                  ? <SpeedTyper key={typingKey} onFinished={handleFinished} onBack={handleRestart} settings={settings} />
                  : <Typer key={typingKey} notes={notes} onFinished={handleFinished} onBack={handleRestart} settings={settings} flashcardDifficulty={flashcardDifficulty} onDifficultyChange={setFlashcardDifficulty} isFlashcard={gameMode === 'flashcards'} />
                }
              </motion.div>
            )}
            {stage === STAGES.RESULTS && (
              <motion.div key="results" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden auto' }}>
                <Results stats={results} onRetry={handleRetry} onUpload={() => { handleDiscardContinuation(); handleUpload() }} onNew={() => { handleDiscardContinuation(); handleRestart() }} onTest={handleTest} isFlashcard={gameMode === 'flashcards'} isSpeed={gameMode === 'speed'} flashcardDifficulty={flashcardDifficulty} onDifficultyChange={setFlashcardDifficulty} hasContinuation={!!pendingRemainingText} onContinueDocument={handleContinueDocument} isContinuing={isContinuing} continueError={continueError} coinsRemaining={limits.ai.remaining} />
              </motion.div>
            )}
            {stage === STAGES.TEST && (
              <motion.div key="test" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden auto' }}>
                <FlashcardTest notes={notes} onBack={() => setStage(testBackStage)} settings={settings} onRateLimit={handleRateLimit} onApiUsed={handleApiUsed} coinsRemaining={limits.ai.remaining} authToken={sessionToken} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <footer className="app-footer">
          <span>© 2026 Clickylearner. All rights reserved.</span>
          <span className="app-footer-links">
            <a href="/privacy.html">Privacy Policy</a>
            <span className="app-footer-dot">·</span>
            <a href="/terms.html">Terms of Service</a>
          </span>
        </footer>
      </motion.div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        setSettings={setSettings}
        theme={theme}
        setTheme={setTheme}
      />

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
      />

      <HistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        user={user}
      />

      {showIntro && (
        <IntroOverlay
          onComplete={() => setShowIntro(false)}
        />
      )}

      <RateLimitToast error={rateLimitError} onDismiss={() => setRateLimitError(null)} />

      <BuyCoinsModal
        isOpen={showBuyCoins}
        onClose={() => setShowBuyCoins(false)}
        userId={user?.id ?? null}
        userEmail={user?.email ?? null}
        coinsRemaining={limits.ai.remaining}
        onCoinsAdded={(coins) => setLimits(prev => ({
          ...prev,
          ai: { ...prev.ai, remaining: prev.ai.remaining + coins },
        }))}
      />

      <AnimatePresence>
        {showCoinInfo && (
          <motion.div
            className="coin-info-tooltip"
            style={{ top: coinInfoPos.top, right: coinInfoPos.right }}
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
          >
            <span className="coin-info-title">Clickycoins</span>
            <span className="coin-info-body">Coins are the currency for AI actions. Generating flashcards or running a test each costs 1 coin. You get 10 free coins to try the app.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
