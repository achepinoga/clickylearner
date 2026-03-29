import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import './IntroOverlay.css'

export default function IntroOverlay({ onComplete }) {
  const prefersReducedMotion = useReducedMotion()
  const [isExiting, setIsExiting] = useState(false)

  const handleSkip = useCallback(() => {
    if (isExiting) return
    setIsExiting(true)
  }, [isExiting])

  // Any keypress skips
  useEffect(() => {
    const onKey = () => handleSkip()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSkip])

  if (prefersReducedMotion) {
    return (
      <AnimatePresence onExitComplete={onComplete}>
        {!isExiting && (
          <motion.div
            className="intro-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleSkip}
          >
            <div className="intro-center">
              <div className="intro-logo">
                <img src="/logo.png" alt="" className="intro-logo-img" />
              </div>
              <div className="intro-wordmark">Clickylearner</div>
              <div className="intro-tagline">type to remember</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {!isExiting && (
        <motion.div
          className="intro-overlay"
          exit={{ opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          onClick={handleSkip}
        >
          {/* Subtle radial background glow */}
          <motion.div
            className="intro-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          />

          {/* Scanline grid */}
          <motion.div
            className="intro-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          />

          <div className="intro-center">
            {/* Logo mark */}
            <motion.div
              className="intro-logo"
              initial={{ opacity: 0, scale: 0.7, filter: 'blur(6px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.45, delay: 0.25, ease: [0.2, 0, 0.2, 1] }}
            >
              <img src="/logo.png" alt="" className="intro-logo-img" />
            </motion.div>

            {/* Wordmark */}
            <motion.div
              className="intro-wordmark"
              initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.45, delay: 0.5, ease: [0.2, 0, 0.2, 1] }}
            >
              Clickylearner
            </motion.div>

            {/* Accent sweep line */}
            <motion.div
              className="intro-line"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.85, ease: [0.4, 0, 0.2, 1] }}
            />

            {/* Tagline */}
            <motion.div
              className="intro-tagline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 1.0 }}
            >
              type to remember
            </motion.div>

            {/* Prompt */}
            <motion.div
              className="intro-prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 1.3 }}
            >
              click or press any key
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
