import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CardSwap, { Card } from './CardSwap'
import './FlashcardShuffle.css'

export default function FlashcardShuffle({ notes, onComplete }) {
  const [phase, setPhase] = useState('pop') // 'pop' → 'shuffle' → 'label'

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('shuffle'), 800),
      setTimeout(() => setPhase('label'),   2600),
      setTimeout(onComplete,                3800),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  const lastNote = notes[notes.length - 1]
  const cardWidth = useMemo(() => Math.min(window.innerWidth - 96, 1104), [])
  const cardHeight = 280

  return (
    <motion.div
      className="shuffle-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="shuffle-scene">

        {/* Pop phase — last card as it was, flies off screen */}
        <AnimatePresence>
          {phase === 'pop' && (
            <div className="shuffle-pop-outer" style={{ width: cardWidth }}>
              <motion.div
                className="flashcard-card"
                animate={{
                  scale: [1, 1.05, 0.9],
                  y:     [0, -20, -900],
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 0.72, times: [0, 0.17, 1], ease: 'easeIn' }}
              >
                <div className="flashcard-corner fc-tl" />
                <div className="flashcard-corner fc-tr" />
                <div className="flashcard-corner fc-bl" />
                <div className="flashcard-corner fc-br" />
                <div className="flashcard-meta">
                  <span className="flashcard-counter">{notes.length} / {notes.length}</span>
                  <span className="flashcard-phase phase-study">[ STUDY ]</span>
                </div>
                <div className="note-display flashcard-text shuffle-completed-text">
                  {lastNote}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Shuffle phase — CardSwap with all notes */}
        <AnimatePresence>
          {phase !== 'pop' && (
            <motion.div
              className="shuffle-swap-wrapper"
              style={{ width: cardWidth, height: cardHeight + 80 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35 }}
            >
              <CardSwap
                width={cardWidth}
                height={cardHeight}
                cardDistance={40}
                verticalDistance={50}
                delay={1400}
                easing="power1"
                skewAmount={4}
                pauseOnHover={false}
              >
                {notes.map((note, i) => (
                  <Card key={i}>
                    <div className="sc-card-inner">
                      <div className="sc-card-corner sc-tl" />
                      <div className="sc-card-corner sc-tr" />
                      <div className="sc-card-corner sc-bl" />
                      <div className="sc-card-corner sc-br" />
                      <span className="sc-card-num">{i + 1} / {notes.length}</span>
                      <p className="sc-card-text">{note.slice(0, 160)}{note.length > 160 ? '…' : ''}</p>
                    </div>
                  </Card>
                ))}
              </CardSwap>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recall label */}
        <AnimatePresence>
          {phase === 'label' && (
            <motion.div
              className="shuffle-label-wrap"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="shuffle-label">[ RECALL PHASE ]</span>
              <span className="shuffle-sub">Keywords are now hidden — type from memory</span>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  )
}
