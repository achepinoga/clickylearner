import { motion } from 'framer-motion'
import './GameMode.css'

const MODES = [
  {
    id: 'standard',
    name: 'Standard',
    tag: '[ CLASSIC ]',
    description: 'Type through all your notes from start to finish. Backspace and settings apply as configured.',
    keys: ['A', 'B', 'C'],
    available: true,
  },
  {
    id: 'flashcards',
    name: 'Flashcards',
    tag: '[ RECALL ]',
    description: 'First pass: type all notes normally. Second pass: same notes again — but key words are blacked out. Forces active recall.',
    keys: ['A', '█', '?'],
    available: true,
  },
  {
    id: 'speed',
    name: 'Speed',
    tag: '[ ENDLESS ]',
    description: 'Pure speed training. Random words keep coming until you stop. No notes needed — just type as fast as you can.',
    keys: ['go', '→', '∞'],
    available: true,
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
            className={`mode-card ${!mode.available ? 'mode-card--disabled' : ''}`}
            onClick={() => mode.available && onSelect(mode.id)}
            disabled={!mode.available}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 + i * 0.09 }}
            whileHover={mode.available ? { y: -4 } : {}}
            whileTap={mode.available ? { scale: 0.97 } : {}}
          >
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
