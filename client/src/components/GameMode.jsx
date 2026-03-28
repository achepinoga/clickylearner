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

export default function GameMode({ onSelect }) {
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
        {MODES.map((mode, i) => (
          <motion.button
            key={mode.id}
            className={`mode-card ${!mode.available ? 'mode-card--disabled' : ''} ${mode.recommended ? 'mode-card--recommended' : ''}`}
            onClick={() => { if (mode.available) { playClick(); onSelect(mode.id) } }}
            disabled={!mode.available}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 + i * 0.09 }}
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
        ))}
      </div>
    </div>
  )
}
