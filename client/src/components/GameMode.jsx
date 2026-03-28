import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { playClick } from '../sounds'
import './GameMode.css'

const MODES = [
  {
    id: 'standard',
    name: 'Standard',
    tag: '[ CLASSIC ]',
    description: 'Upload any document and type through it directly. No AI, no tokens — your text exactly as it appears.',
    keys: ['A', 'B', 'C'],
    available: true,
    recommended: false,
  },
  {
    id: 'flashcards',
    name: 'Flashcards',
    tag: '[ RECALL ]',
    description: 'AI condenses your document — PDFs, slides, notes — into focused study cards. Type through them twice, with key terms blacked out on the second pass. Ends with an AI-generated quiz.',
    keys: ['A', '█', '?'],
    available: true,
    recommended: true,
  },
  {
    id: 'speed',
    name: 'Speed',
    tag: '[ ENDLESS ]',
    description: 'Pure typing practice. Random sentences keep coming until you stop. No upload needed.',
    keys: ['go', '→', '∞'],
    available: true,
    recommended: false,
  },
]

const AVAILABLE = MODES.filter(m => m.available)

export default function GameMode({ onSelect }) {
  const [focusedIndex, setFocusedIndex] = useState(null)
  const focusedRef = useRef(null)
  focusedRef.current = focusedIndex

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex(i => i === null ? 0 : (i + 1) % AVAILABLE.length)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex(i => i === null ? AVAILABLE.length - 1 : (i - 1 + AVAILABLE.length) % AVAILABLE.length)
      } else if (e.key === 'Enter' && focusedRef.current !== null) {
        playClick()
        onSelect(AVAILABLE[focusedRef.current].id)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onSelect])

  return (
    <div className="gamemode-container">
      <motion.p
        className="gamemode-sub"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        select a mode to begin
      </motion.p>

      <div className="gamemode-grid">
        {MODES.map((mode, i) => {
          const availIdx = AVAILABLE.indexOf(mode)
          const isFocused = availIdx !== -1 && focusedIndex === availIdx
          return (
          <motion.button
            key={mode.id}
            className={`mode-card ${!mode.available ? 'mode-card--disabled' : ''} ${mode.recommended ? 'mode-card--recommended' : ''} ${isFocused ? 'mode-card--focused' : ''}`}
            onClick={() => { if (mode.available) { playClick(); onSelect(mode.id) } }}
            disabled={!mode.available}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: isFocused ? -4 : 0 }}
            transition={{ duration: 0.35, delay: isFocused ? 0 : 0.08 + i * 0.09 }}
            whileHover={mode.available ? { y: -4 } : {}}
            whileTap={mode.available ? { scale: 0.97 } : {}}
          >
            <span className="mode-recommended-label">recommended</span>
            <div className="mode-keys">
              {mode.keys.map((k, j) => (
                <span key={j} className="mode-key">{k}</span>
              ))}
            </div>
            <span className="mode-tag">{mode.tag}</span>
            <h3 className="mode-name">{mode.name}</h3>
            <p className="mode-desc">{mode.description}</p>
            {mode.available && <span className="mode-arrow">→</span>}
          </motion.button>
          )
        })}
      </div>
    </div>
  )
}
