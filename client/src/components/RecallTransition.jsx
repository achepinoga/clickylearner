import { useEffect } from 'react'
import { motion } from 'framer-motion'
import './RecallTransition.css'

const LABEL = '[ RECALL PHASE ]'

export default function RecallTransition({ onComplete }) {
  useEffect(() => {
    const t = setTimeout(onComplete, 2200)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <motion.div
      className="recall-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Scan line */}
      <motion.div
        className="recall-scanline"
        initial={{ top: '-2px' }}
        animate={{ top: '100%' }}
        transition={{ duration: 1.1, ease: 'linear', delay: 0.2 }}
      />

      <div className="recall-content">
        {/* Staggered letters */}
        <div className="recall-title" aria-label={LABEL}>
          {LABEL.split('').map((char, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: 0.3 + i * 0.035 }}
            >
              {char === ' ' ? '\u00A0' : char}
            </motion.span>
          ))}
        </div>

        <motion.div
          className="recall-divider"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: 1.0, ease: 'easeOut' }}
        />

        <motion.p
          className="recall-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.2 }}
        >
          keywords obscured — type from memory
        </motion.p>
      </div>
    </motion.div>
  )
}
