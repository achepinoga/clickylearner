import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './Typer.css'

export default function Typer({ notes, onFinished, onBack }) {
  const [noteIndex, setNoteIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [startTime, setStartTime] = useState(null)
  const [errors, setErrors] = useState(0)
  const [totalChars, setTotalChars] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [finished, setFinished] = useState(false)
  const [completing, setCompleting] = useState(false)

  // Typewriter intro state
  const [revealedChars, setRevealedChars] = useState(0)
  const [introComplete, setIntroComplete] = useState(false)

  const inputRef = useRef()
  const currentNote = notes[noteIndex] || ''

  // Typewriter + Star Wars: runs on every note change
  useEffect(() => {
    setRevealedChars(0)
    setIntroComplete(false)
    inputRef.current?.focus()

    const len = currentNote.length
    if (len === 0) { setIntroComplete(true); return }

    // ~12ms per char, clamped: min 350ms total, max 850ms total
    const totalMs = Math.min(Math.max(len * 12, 350), 850)
    const intervalMs = totalMs / len

    let i = 0
    const timer = setInterval(() => {
      i++
      setRevealedChars(i)
      if (i >= len) {
        clearInterval(timer)
        setIntroComplete(true)
      }
    }, intervalMs)

    return () => clearInterval(timer)
  }, [noteIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!startTime || finished) return
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 60000
      const words = (totalChars + typed.length) / 5
      setWpm(elapsed > 0 ? Math.round(words / elapsed) : 0)
    }, 500)
    return () => clearInterval(interval)
  }, [startTime, typed, totalChars, finished])

  const handleInput = useCallback((e) => {
    const value = e.target.value
    if (!startTime) setStartTime(Date.now())

    if (value.length > typed.length) {
      const idx = typed.length
      if (value[idx] !== currentNote[idx]) {
        setErrors(prev => prev + 1)
      }
    }

    setTyped(value)

    if (value === currentNote) {
      const charsTyped = currentNote.length
      setTotalChars(prev => prev + charsTyped)
      setTyped('')

      if (noteIndex + 1 >= notes.length) {
        setFinished(true)
        const elapsed = (Date.now() - startTime) / 60000
        const allChars = totalChars + charsTyped
        const finalWpm = Math.round((allChars / 5) / elapsed)
        const accuracy = Math.round(((allChars - errors) / allChars) * 100)
        onFinished({ wpm: finalWpm, accuracy, errors, totalChars: allChars, notes: notes.length })
      } else {
        setCompleting(true)
        setTimeout(() => {
          setCompleting(false)
          setNoteIndex(prev => prev + 1)
        }, 320)
      }
    }
  }, [typed, currentNote, noteIndex, notes, startTime, totalChars, errors, onFinished])

  const renderNote = () => {
    return currentNote.split('').map((char, i) => {
      // During intro: chars beyond the reveal cursor are invisible
      if (!introComplete && i >= revealedChars) {
        return (
          <span key={i} className="char intro-hidden">
            {char === ' ' ? '\u00A0' : char}
          </span>
        )
      }

      let cls = 'char pending'
      if (i < typed.length) {
        cls = typed[i] === char ? 'char correct' : 'char incorrect'
      } else if (i === typed.length) {
        cls = 'char cursor'
      }
      return (
        <span key={i} className={cls}>
          {char === ' ' ? '\u00A0' : char}
        </span>
      )
    })
  }

  const progress = (noteIndex / notes.length) * 100

  return (
    <div className="typer-container">
      <div className="progress-track">
        <motion.div
          className="progress-fill"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      <motion.div
        className="stats-row"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="stat-item">
          <motion.span
            className="stat-num"
            key={wpm}
            initial={{ opacity: 0.5, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            {wpm}
          </motion.span>
          <span className="stat-lbl">wpm</span>
        </div>

        <div className="stat-divider" />

        <div className="stat-item">
          <span className="stat-num">
            {noteIndex + 1}<span className="stat-of">/{notes.length}</span>
          </span>
          <span className="stat-lbl">note</span>
        </div>

        <div className="stat-divider" />

        <div className="stat-item">
          <motion.span
            className="stat-num"
            style={{ color: errors > 0 ? 'var(--incorrect)' : 'inherit' }}
            key={errors}
            initial={errors > 0 ? { scale: 1.3 } : {}}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            {errors}
          </motion.span>
          <span className="stat-lbl">errors</span>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={noteIndex}
          className={`type-card ${completing ? 'completing' : ''}`}
          onClick={() => inputRef.current?.focus()}
          initial={{ opacity: 0, x: 28, filter: 'blur(4px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: -28, filter: 'blur(4px)' }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          <div className="note-label">Note {noteIndex + 1}</div>

          {/* Star Wars crawl wrapper — perspective lives on this div, rotateX on the child */}
          <div className="note-3d-stage">
            <motion.div
              className="note-3d-inner"
              initial={{ rotateX: 22, y: 10, opacity: 0.4 }}
              animate={{ rotateX: 0, y: 0, opacity: 1 }}
              transition={{ duration: 1.1, ease: [0.15, 0.85, 0.35, 1] }}
            >
              <div className="note-display">{renderNote()}</div>
            </motion.div>
          </div>

          <input
            ref={inputRef}
            className="hidden-input"
            value={typed}
            onChange={handleInput}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={currentNote.length + 1}
          />
        </motion.div>
      </AnimatePresence>

      <div className="typer-footer">
        <p className="hint-text">Click the card and start typing · match exactly</p>
        <motion.button
          className="btn-back"
          onClick={onBack}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
        >
          ← New file
        </motion.button>
      </div>
    </div>
  )
}
