import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import TextType from './TextType/TextType'
import './Typer.css'

export default function Typer({ notes, onFinished, onBack }) {
  // All notes joined into one single challenge
  const fullText = useMemo(() => notes.join(' '), [notes])

  const [typed, setTyped] = useState('')
  const [startTime, setStartTime] = useState(null)
  const [errors, setErrors] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [fallenWords, setFallenWords] = useState(new Set())
  const inputRef = useRef()
  const cursorRef = useRef(null)

  // Parse fullText into word segments (each includes its trailing space)
  const words = useMemo(() => {
    const parts = fullText.split(' ')
    let pos = 0
    return parts.map((w, i) => {
      const start = pos
      const wordEnd = pos + w.length
      const end = i < parts.length - 1 ? wordEnd + 1 : wordEnd
      pos = end
      return { word: w, start, wordEnd, end, index: i }
    })
  }, [fullText])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Scroll cursor into view as user types
  useEffect(() => {
    cursorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [typed.length])

  // Detect newly completed words and trigger fall animation
  useEffect(() => {
    let changed = false
    const next = new Set(fallenWords)
    words.forEach(({ start, end, index }) => {
      if (!next.has(index) && typed.length >= end) {
        if (typed.slice(start, end) === fullText.slice(start, end)) {
          next.add(index)
          changed = true
        }
      }
    })
    if (changed) setFallenWords(next)
  }, [typed])

  // WPM ticker
  useEffect(() => {
    if (!startTime) return
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 60000
      const words = typed.length / 5
      setWpm(elapsed > 0 ? Math.round(words / elapsed) : 0)
    }, 500)
    return () => clearInterval(interval)
  }, [startTime, typed])

  const handleInput = useCallback((e) => {
    const value = e.target.value
    if (!startTime) setStartTime(Date.now())

    if (value.length > typed.length) {
      const idx = typed.length
      if (value[idx] !== fullText[idx]) {
        setErrors(prev => prev + 1)
      }
    }

    setTyped(value)

    if (value.length >= fullText.length) {
      const elapsed = (Date.now() - startTime) / 60000
      const finalWpm = Math.round((fullText.length / 5) / elapsed)
      const accuracy = Math.round(((fullText.length - errors) / fullText.length) * 100)
      onFinished({
        wpm: finalWpm,
        accuracy,
        errors,
        totalChars: fullText.length,
        notes: notes.length,
      })
    }
  }, [typed, fullText, startTime, errors, notes.length, onFinished])

  const renderText = () => {
    return words.map(({ word, start, wordEnd, index }) => {
      const isFallen = fallenWords.has(index)

      const chars = []
      for (let ci = 0; ci < word.length; ci++) {
        const i = start + ci
        const char = word[ci]
        if (i === typed.length) {
          chars.push(<span key={i} className="char cursor" ref={cursorRef}>{char}</span>)
        } else if (i < typed.length) {
          chars.push(<span key={i} className={typed[i] === char ? 'char correct' : 'char incorrect'}>{char}</span>)
        } else {
          chars.push(<span key={i} className="char pending">{char}</span>)
        }
      }

      // Trailing space (not for last word)
      if (index < words.length - 1) {
        const si = wordEnd
        if (si === typed.length) {
          chars.push(<span key="sp" className="char cursor" ref={cursorRef}>{'\u00A0'}</span>)
        } else if (si < typed.length) {
          chars.push(<span key="sp" className={typed[si] === ' ' ? 'char correct' : 'char incorrect'}>{'\u00A0'}</span>)
        } else {
          chars.push(<span key="sp" className="char pending">{'\u00A0'}</span>)
        }
      }

      return (
        <motion.span
          key={index}
          className="word-unit"
          animate={isFallen
            ? { y: 24, opacity: 0, filter: 'blur(3px)' }
            : { y: 0, opacity: 1, filter: 'blur(0px)' }
          }
          transition={isFallen
            ? { duration: 0.45, ease: [0.4, 0, 1, 1] }
            : { duration: 0 }
          }
        >
          {chars}
        </motion.span>
      )
    })
  }

  const progress = fullText.length > 0 ? (typed.length / fullText.length) * 100 : 0

  return (
    <div className="typer-container">
      {/* Progress */}
      <div className="progress-track">
        <motion.div
          className="progress-fill"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Stats */}
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
            {Math.round(progress)}<span className="stat-of">%</span>
          </span>
          <span className="stat-lbl">done</span>
        </div>

        <div className="stat-divider" />

        <div className="stat-item">
          <motion.span
            className="stat-num"
            style={{ color: errors > 0 ? 'var(--incorrect)' : 'inherit' }}
            key={errors}
            initial={errors > 0 ? { scale: 1.35 } : {}}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            {errors}
          </motion.span>
          <span className="stat-lbl">errors</span>
        </div>
      </motion.div>

      {/* Typing card with Star Wars crawl */}
      <motion.div
        className="type-card"
        onClick={() => inputRef.current?.focus()}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="card-header">
          <TextType
            as="span"
            text={['TERMINAL://INPUT', 'TYPE TO MATCH', 'FOCUS_MODE.EXE', 'INITIALIZING...']}
            typingSpeed={55}
            deletingSpeed={35}
            pauseDuration={2500}
            cursorCharacter="_"
            cursorBlinkDuration={0.4}
            className="card-header-text"
          />
        </div>

        {/* The perspective stage — vanishing point sits above the card */}
        <div className="crawl-stage">
          <motion.div
            className="crawl-inner"
            initial={{ rotateX: 28, y: 90, opacity: 0 }}
            animate={{ rotateX: 0, y: 0, opacity: 1 }}
            transition={{
              duration: 1.5,
              ease: [0.1, 0.9, 0.3, 1],
              opacity: { duration: 0.5, ease: 'easeIn' },
            }}
          >
            <div className="note-display">{renderText()}</div>
          </motion.div>

          {/* Gradient fades — top simulates text disappearing into deep space */}
          <div className="crawl-fade-top" />
          <div className="crawl-fade-bottom" />
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
          maxLength={fullText.length + 1}
        />
      </motion.div>

      <div className="typer-footer">
        <p className="hint-text">Click the card · type to match exactly</p>
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
