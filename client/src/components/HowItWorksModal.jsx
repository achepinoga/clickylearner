import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playClick, playBack, playToggle } from '../sounds'
import './HowItWorksModal.css'

const MODES = [
  {
    id: 'standard',
    name: 'Standard',
    tag: '[ CLASSIC ]',
    takeaway: 'Type out your document\'s text word for word.',
    available: true,
  },
  {
    id: 'flashcards',
    name: 'Flashcards',
    tag: '[ RECALL ]',
    takeaway: 'AI turns your notes into flashcards with recall testing.',
    available: true,
  },
  {
    id: 'speed',
    name: 'Speed',
    tag: '[ ENDLESS ]',
    takeaway: 'Pure typing practice — no uploads needed.',
    available: true,
  },
]

const STANDARD_SLIDES = [
  {
    step: '01',
    title: 'Upload Your Material',
    body: 'Drop any PDF or TXT file into the upload zone. Your document\'s text is used exactly as it appears — no AI, no processing. Just your words.',
    image: '/howto/standard-upload.png',
    imageAlt: 'Upload screen showing the drop zone',
  },
  {
    step: '02',
    title: 'Type It Out',
    body: 'Each passage from your document appears on screen. Type it out word for word. Live WPM, accuracy, and progress are tracked in real time as you go.',
    image: '/howto/standard-type.png',
    imageAlt: 'Typing screen with a passage to type',
  },
  {
    step: '03',
    title: 'Review Your Performance',
    body: 'When you finish, see a full breakdown — WPM, accuracy, errors, and a per-note grade. Hit Type Again to beat your score, or upload new material.',
    image: '/howto/standard-results.png',
    imageAlt: 'Results screen showing session stats',
  },
]

const FLASHCARD_SLIDES = [
  {
    step: '01',
    title: 'Your Flashcard Library',
    body: 'This is your personal set library. Every file you upload gets saved here. You can see how many sets and tests you have left, create folders to organise your sets, and upload new material at any time.',
    image: '/howto/fc-library.png',
    imageAlt: 'Flashcard sets library page',
  },
  {
    step: '02',
    title: 'Upload & Pick Difficulty',
    body: 'Drop your PDF or TXT and choose a recall difficulty before generating. The AI condenses your document into focused study cards. Higher difficulty means more words get blacked out during the recall pass.',
    image: '/howto/fc-upload.png',
    imageAlt: 'Upload screen with difficulty selector',
  },
  {
    step: '03',
    title: 'Study Pass — Type It All',
    body: 'First you type through every note in full. The card shows [ STUDY ] in the corner. This pass builds familiarity with the material before the real challenge begins.',
    image: '/howto/fc-study.png',
    imageAlt: 'Study pass typing screen',
  },
  {
    step: '04',
    title: 'Recall Pass — Fill the Blanks',
    body: 'The same notes come back with key terms replaced by blanks. You must recall and type the hidden words from memory. The card turns amber and shows [ RECALL ] — this is where the learning happens.',
    image: '/howto/fc-recall.png',
    imageAlt: 'Recall pass with blacked out words',
  },
  {
    step: '05',
    title: 'Session Results',
    body: 'After both passes you get a full breakdown. Study and Recall rounds are shown separately in the challenge breakdown. You can also adjust your difficulty for next time right from this screen.',
    image: '/howto/fc-results.png',
    imageAlt: 'Results screen with study and recall breakdown',
  },
  {
    step: '06',
    title: 'AI Quiz',
    body: 'Hit Take the Test to generate an AI quiz based on your notes. You get a mix of True/False and multiple choice questions that test exactly what you studied.',
    image: '/howto/fc-quiz.png',
    imageAlt: 'Quiz screen with a true/false question',
  },
  {
    step: '07',
    title: 'Wrong Answer? Retype to Continue',
    body: 'If you answer a question incorrectly, you must retype the source note in full before moving on. This forces active recall and makes the material stick — no skipping past your mistakes.',
    image: '/howto/fc-penalty.png',
    imageAlt: 'Penalty retype screen after a wrong answer',
  },
]

const SPEED_SLIDES = [
  {
    step: '01',
    title: 'Just Start Typing',
    body: 'No file upload needed. Random sentences appear on screen one after another and you type them out immediately. WPM, accuracy, screens completed, and elapsed time are tracked live in the top bar.',
    image: '/howto/sp-type.png',
    imageAlt: 'Speed mode typing screen with live stats',
  },
  {
    step: '02',
    title: 'Keep Going — or Finish Anytime',
    body: 'New sentences keep coming as fast as you type them. There is no end — you decide when to stop by hitting Finish. The timer keeps running so you can see how long your session lasted.',
    image: '/howto/sp-timer.png',
    imageAlt: 'Speed mode mid-session with timer and finish button',
  },
  {
    step: '03',
    title: 'Screen-by-Screen Breakdown',
    body: 'When you finish, every screen you typed is graded individually — SCR1, SCR2, and so on. See your WPM and accuracy per screen to find exactly where you slowed down or made mistakes.',
    image: '/howto/sp-results.png',
    imageAlt: 'Results screen with per-screen challenge breakdown',
  },
]

const SLIDES_BY_MODE = { standard: STANDARD_SLIDES, flashcards: FLASHCARD_SLIDES, speed: SPEED_SLIDES }

export default function HowItWorksModal({ isOpen, onClose }) {
  const [selectedMode, setSelectedMode] = useState(null) // null = mode picker
  const [slideIdx, setSlideIdx] = useState(0)
  const [direction, setDirection] = useState(1)

  const slides = selectedMode ? (SLIDES_BY_MODE[selectedMode] || []) : []
  const total = slides.length

  const goTo = useCallback((idx, dir) => {
    setDirection(dir)
    setSlideIdx(idx)
  }, [])

  const prev = () => { if (slideIdx > 0) { playToggle(); goTo(slideIdx - 1, -1) } }
  const next = () => { if (slideIdx < total - 1) { playToggle(); goTo(slideIdx + 1, 1) } }

  const selectMode = (id) => {
    playClick()
    setSlideIdx(0)
    setDirection(1)
    setSelectedMode(id)
  }

  const goBack = () => {
    playBack()
    setSelectedMode(null)
  }

  // Reset on close
  useEffect(() => {
    if (!isOpen) { setSelectedMode(null); setSlideIdx(0) }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (selectedMode) goBack()
        else { playBack(); onClose() }
      }
      if (selectedMode) {
        if (e.key === 'ArrowRight') next()
        if (e.key === 'ArrowLeft') prev()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, selectedMode, slideIdx, total])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="hiw-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => { playBack(); onClose() }}
          />
          <motion.div
            className="hiw-positioner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="hiw-panel"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.25, ease: [0.2, 0.8, 0.4, 1] }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="hiw-header">
                <div className="hiw-header-left">
                  {selectedMode && (
                    <button className="hiw-back-btn" onClick={goBack}>← Back</button>
                  )}
                  <div>
                    <p className="hiw-eyebrow">// How It Works</p>
                    <h2 className="hiw-title">
                      {selectedMode ? MODES.find(m => m.id === selectedMode)?.name : 'Pick a mode'}
                    </h2>
                  </div>
                </div>
                <button className="hiw-close" onClick={() => { playBack(); onClose() }} aria-label="Close">✕</button>
              </div>

              <AnimatePresence mode="wait">
                {/* ── Mode picker ── */}
                {!selectedMode && (
                  <motion.div
                    key="picker"
                    className="hiw-picker"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {MODES.map((mode) => (
                      <button
                        key={mode.id}
                        className={`hiw-mode-card ${!mode.available ? 'hiw-mode-card--soon' : ''}`}
                        onClick={() => mode.available && selectMode(mode.id)}
                        disabled={!mode.available}
                      >
                        <div className="hiw-mode-card-top">
                          <span className="hiw-mode-tag">{mode.tag}</span>
                          {!mode.available && <span className="hiw-soon-badge">Soon</span>}
                        </div>
                        <span className="hiw-mode-name">{mode.name}</span>
                        <p className="hiw-mode-takeaway">{mode.takeaway}</p>
                        {mode.available && <span className="hiw-mode-arrow">→</span>}
                      </button>
                    ))}
                  </motion.div>
                )}

                {/* ── Slideshow ── */}
                {selectedMode && slides.length > 0 && (
                  <motion.div
                    key="slideshow"
                    className="hiw-slideshow"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="hiw-img-wrap">
                      <AnimatePresence mode="wait" custom={direction}>
                        <motion.img
                          key={slideIdx}
                          src={slides[slideIdx].image}
                          alt={slides[slideIdx].imageAlt}
                          className="hiw-img"
                          custom={direction}
                          initial={{ opacity: 0, x: direction * 40 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: direction * -40 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                        />
                      </AnimatePresence>
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`text-${slideIdx}`}
                        className="hiw-text"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <span className="hiw-step">Step {slides[slideIdx].step}</span>
                        <h3 className="hiw-slide-title">{slides[slideIdx].title}</h3>
                        <p className="hiw-slide-body">{slides[slideIdx].body}</p>
                      </motion.div>
                    </AnimatePresence>

                    <div className="hiw-nav">
                      <button className="hiw-nav-btn" onClick={prev} disabled={slideIdx === 0}>←</button>
                      <div className="hiw-dots">
                        {slides.map((_, i) => (
                          <button
                            key={i}
                            className={`hiw-dot ${i === slideIdx ? 'hiw-dot--active' : ''}`}
                            onClick={() => { playToggle(); goTo(i, i > slideIdx ? 1 : -1) }}
                          />
                        ))}
                      </div>
                      <button className="hiw-nav-btn" onClick={next} disabled={slideIdx === total - 1}>→</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
