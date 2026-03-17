import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Upload from './components/Upload'
import Typer from './components/Typer'
import Results from './components/Results'
import SettingsModal from './components/SettingsModal'
import './App.css'

const STAGES = { UPLOAD: 'upload', TYPING: 'typing', RESULTS: 'results' }
const STAGE_LABELS = ['Upload', 'Practice', 'Results']
const STAGE_KEYS = [STAGES.UPLOAD, STAGES.TYPING, STAGES.RESULTS]

const pageVariants = {
  initial: { opacity: 0, y: 22, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -22, filter: 'blur(6px)' },
}

const pageTransition = { duration: 0.4, ease: [0.4, 0, 0.2, 1] }


export default function App() {
  const [stage, setStage] = useState(STAGES.UPLOAD)
  const [notes, setNotes] = useState([])
  const [results, setResults] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState({
    allowBackspace: true
  })

  const currentStageIndex = STAGE_KEYS.indexOf(stage)

  const handleNotesReady = (generatedNotes) => {
    setNotes(generatedNotes)
    setStage(STAGES.TYPING)
  }

  const handleFinished = (stats) => {
    setResults(stats)
    setStage(STAGES.RESULTS)
  }

  const handleRestart = () => {
    setStage(STAGES.UPLOAD)
    setNotes([])
    setResults(null)
  }

  const handleRetry = () => {
    setResults(null)
    setStage(STAGES.TYPING)
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
          <div className="logo">
            <div className="logo-mark">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="1" y="5" width="20" height="13" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 9h2M9 9h2M13 9h2M17 9h2M5 13h2M9 13h2M13 13h2M5 17h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <span className="logo-text">Clickylearner</span>
          </div>

          <button className="btn-settings" aria-label="Settings" onClick={() => setShowSettings(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

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
        </motion.header>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            {stage === STAGES.UPLOAD && (
              <motion.div key="upload" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
                <Upload onNotesReady={handleNotesReady} />
              </motion.div>
            )}
            {stage === STAGES.TYPING && (
              <motion.div key="typing" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition} style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Typer notes={notes} onFinished={handleFinished} onBack={handleRestart} settings={settings} />
              </motion.div>
            )}
            {stage === STAGES.RESULTS && (
              <motion.div key="results" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
                <Results stats={results} onRetry={handleRetry} onNew={handleRestart} />
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
