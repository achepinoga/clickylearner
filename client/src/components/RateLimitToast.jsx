import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './RateLimitToast.css'

function formatCountdown(ms) {
  if (ms <= 0) return '0:00'
  const totalSec = Math.ceil(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function RateLimitToast({ error, onDismiss }) {
  const [remaining, setRemaining] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    clearInterval(intervalRef.current)
    if (!error?.resetTime) { setRemaining(null); return }

    const update = () => {
      const ms = new Date(error.resetTime) - Date.now()
      setRemaining(ms)
      if (ms <= 0) { clearInterval(intervalRef.current); onDismiss() }
    }
    update()
    intervalRef.current = setInterval(update, 1000)
    return () => clearInterval(intervalRef.current)
  }, [error?.resetTime])

  const isUpload = error?.type === 'upload'
  const title = isUpload ? 'Upload limit reached' : 'AI limit reached'
  const windowHint = isUpload ? '15 minutes' : '1 hour'

  return (
    <AnimatePresence>
      {error && (
        <motion.div
          className="rl-toast"
          initial={{ opacity: 0, y: -14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -14, scale: 0.97 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          role="alert"
        >
          <span className="rl-toast-icon">!</span>
          <div className="rl-toast-body">
            <span className="rl-toast-title">{title}</span>
            <span className="rl-toast-sub">
              {remaining != null && remaining > 0
                ? `Resets in ${formatCountdown(remaining)}`
                : `Resets in ${windowHint}`}
            </span>
          </div>
          <button className="rl-toast-close" onClick={onDismiss} aria-label="Dismiss">×</button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
