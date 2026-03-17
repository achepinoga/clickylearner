import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Upload from './components/Upload'
import Typer from './components/Typer'
import Results from './components/Results'
import ShapeGrid from './components/ShapeGrid/ShapeGrid'
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

function BackgroundOrbs() {
  return (
    <div className="bg-orbs" aria-hidden="true">
      <motion.div
        className="orb orb-1"
        animate={{ x: [0, 55, 0], y: [0, -45, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="orb orb-2"
        animate={{ x: [0, -65, 0], y: [0, 50, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="orb orb-3"
        animate={{ x: [0, 35, 0], y: [0, -55, 0] }}
        transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

export default function App() {
  const [stage, setStage] = useState(STAGES.UPLOAD)
  const [notes, setNotes] = useState([])
  const [results, setResults] = useState(null)

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
      <BackgroundOrbs />
      <div className="shapegrid-bg">
        <ShapeGrid
          direction="diagonal"
          speed={0.15}
          squareSize={40}
          borderColor="rgba(255,255,255,0.06)"
          hoverFillColor="rgba(255,255,255,0.08)"
          shape="square"
          hoverTrailAmount={4}
        />
      </div>
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
            <span className="logo-text">StudyTyper</span>
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
        </motion.header>

        <main className="main">
          <AnimatePresence mode="wait">
            {stage === STAGES.UPLOAD && (
              <motion.div key="upload" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
                <Upload onNotesReady={handleNotesReady} />
              </motion.div>
            )}
            {stage === STAGES.TYPING && (
              <motion.div key="typing" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
                <Typer notes={notes} onFinished={handleFinished} onBack={handleRestart} />
              </motion.div>
            )}
            {stage === STAGES.RESULTS && (
              <motion.div key="results" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
                <Results stats={results} onRetry={handleRetry} onNew={handleRestart} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </>
  )
}
