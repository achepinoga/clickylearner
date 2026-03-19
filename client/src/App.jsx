import { useState, useEffect, useRef, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Upload from './components/Upload'
import Typer from './components/Typer'
import Results from './components/Results'
import GameMode from './components/GameMode'
import SettingsModal from './components/SettingsModal'
import './App.css'

const STAGES = { GAMEMODE: 'gamemode', UPLOAD: 'upload', TYPING: 'typing', RESULTS: 'results' }

function computeBlackoutRanges(text, difficulty = 2) {
  const ranges = []
  const wordRegex = /\b[a-zA-Z]{5,}\b/g
  let match
  let count = 0
  const shouldBlackout = (n) => {
    if (difficulty === 1) return n % 4 === 0        // ~25%
    if (difficulty === 2) return n % 2 === 0        // ~50%
    if (difficulty === 3) return n % 4 !== 0        // ~75%
    if (difficulty === 4) return n % 5 !== 0        // ~80%
    return n % 2 === 0
  }
  while ((match = wordRegex.exec(text)) !== null) {
    count++
    if (shouldBlackout(count)) ranges.push([match.index, match.index + match[0].length])
  }
  return ranges
}

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

const STAGE_LABELS = ['Mode', 'Upload', 'Practice', 'Results']
const STAGE_KEYS = [STAGES.GAMEMODE, STAGES.UPLOAD, STAGES.TYPING, STAGES.RESULTS]

const pageVariants = {
  initial: { opacity: 0, y: 22, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -22, filter: 'blur(6px)' },
}

const pageTransition = { duration: 0.4, ease: [0.4, 0, 0.2, 1] }


export default function App() {
  const [stage, setStage] = useState(() => {
    try { return localStorage.getItem('cl_stage') || STAGES.GAMEMODE } catch { return STAGES.GAMEMODE }
  })
  // rawNotes = chunked but not punctuation-processed (source of truth)
  const [rawNotes, setRawNotes] = useState(() => {
    try { const s = localStorage.getItem('cl_raw_notes'); return s ? JSON.parse(s) : [] } catch { return [] }
  })
  const [results, setResults] = useState(() => {
    try { const s = localStorage.getItem('cl_results'); return s ? JSON.parse(s) : null } catch { return null }
  })
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('cl_settings')
      return saved ? JSON.parse(saved) : { allowBackspace: true, punctuation: true }
    } catch { return { allowBackspace: true, punctuation: true } }
  })
  // Incremented to force-remount Typer whenever settings change
  const [typingKey, setTypingKey] = useState(0)
  const [gameMode, setGameMode] = useState('standard')
  const [flashcardDifficulty, setFlashcardDifficulty] = useState(2)
  const [flashcardRanges, setFlashcardRanges] = useState(null) // null = standard or phase 1; array = recall phase 2
  const settingsInitialized = useRef(false)

  // Derive final notes from raw + current punctuation setting
  const notes = useMemo(
    () => settings.punctuation ? rawNotes : rawNotes.map(stripPunctuation),
    [rawNotes, settings.punctuation]
  )

  useEffect(() => { localStorage.setItem('cl_settings', JSON.stringify(settings)) }, [settings])
  useEffect(() => { localStorage.setItem('cl_stage', stage) }, [stage])
  useEffect(() => { localStorage.setItem('cl_raw_notes', JSON.stringify(rawNotes)) }, [rawNotes])
  useEffect(() => { localStorage.setItem('cl_results', JSON.stringify(results)) }, [results])

  // Reset typing progress whenever any setting changes (skip on first mount)
  useEffect(() => {
    if (!settingsInitialized.current) { settingsInitialized.current = true; return }
    setTypingKey(k => k + 1)
  }, [settings])

  const currentStageIndex = STAGE_KEYS.indexOf(stage)

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

  const handleNotesReady = (generatedNotes) => {
    setRawNotes(chunkNotes(generatedNotes))
    setStage(STAGES.TYPING)
  }

  const handleFinished = (stats) => {
    if (gameMode === 'flashcards' && flashcardRanges === null) {
      // Phase 1 done — start recall phase with blackouts
      const ranges = notes.map(note => computeBlackoutRanges(note, flashcardDifficulty))
      setFlashcardRanges(ranges)
      setTypingKey(k => k + 1)
    } else {
      setResults(stats)
      setFlashcardRanges(null)
      setStage(STAGES.RESULTS)
    }
  }

  const handleModeSelect = (modeId) => {
    setGameMode(modeId)
    setFlashcardRanges(null)
    setFlashcardDifficulty(2)
    setStage(STAGES.UPLOAD)
  }

  const handleRestart = () => {
    setStage(STAGES.GAMEMODE)
    setRawNotes([])
    setResults(null)
    setFlashcardRanges(null)
    setGameMode('standard')
  }

  const handleRetry = () => {
    setResults(null)
    setTypingKey(k => k + 1)
    setStage(STAGES.TYPING)
  }

  const handleUpload = () => {
    setResults(null)
    setFlashcardRanges(null)
    setStage(STAGES.UPLOAD)
  }

  return (
    <>
      <div className="app">
        <motion.header
          className="header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="header-inner">
            <div className="logo" onClick={handleRestart} style={{ cursor: 'pointer' }} title="Return Home">
              <div className="logo-mark">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <rect x="1" y="5" width="20" height="13" rx="3" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M5 9h2M9 9h2M13 9h2M17 9h2M5 13h2M9 13h2M13 13h2M5 17h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </div>
              <span className="logo-text">Clickylearner</span>
            </div>

            <nav className="stage-nav" aria-label="Progress">
              {STAGE_LABELS.map((label, i) => (
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

            <button className="btn-settings" aria-label="Settings" onClick={() => setShowSettings(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </motion.header>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            {stage === STAGES.GAMEMODE && (
              <motion.div key="gamemode" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden auto' }}>
                <GameMode onSelect={handleModeSelect} />
              </motion.div>
            )}
            {stage === STAGES.UPLOAD && (
              <motion.div key="upload" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
                <Upload onNotesReady={handleNotesReady} gameMode={gameMode} difficulty={flashcardDifficulty} onDifficultyChange={setFlashcardDifficulty} />
              </motion.div>
            )}
            {stage === STAGES.TYPING && (
              <motion.div key="typing" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Typer key={typingKey} notes={notes} onFinished={handleFinished} onBack={handleRestart} settings={settings} flashcardRanges={flashcardRanges} />
              </motion.div>
            )}
            {stage === STAGES.RESULTS && (
              <motion.div key="results" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Results stats={results} onRetry={handleRetry} onUpload={handleUpload} onNew={handleRestart} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        setSettings={setSettings}
      />
    </>
  )
}
