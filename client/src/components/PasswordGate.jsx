import { useState } from 'react'
import { motion } from 'framer-motion'

const CORRECT = 'elrondo'
const SESSION_KEY = 'cl_unlocked'

export default function PasswordGate({ onUnlock }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  const attempt = () => {
    if (value === CORRECT) {
      try { sessionStorage.setItem(SESSION_KEY, '1') } catch {}
      onUnlock()
    } else {
      setError(true)
      setValue('')
    }
  }

  const handleKey = (e) => {
    if (error) setError(false)
    if (e.key === 'Enter') attempt()
  }

  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'var(--bg, #000)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '1.5rem',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <img src="/logo.png" alt="Clickylearner" style={{ width: 48, height: 48, objectFit: 'contain', opacity: 0.9 }} />
      <span style={{ color: 'var(--text, #fff)', fontSize: '1.1rem', letterSpacing: '0.04em', opacity: 0.7 }}>
        Enter password to continue
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <input
          autoFocus
          type="password"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder="password"
          style={{
            background: 'var(--surface, #080808)',
            border: `1px solid ${error ? 'var(--incorrect, #ff4444)' : 'var(--border, rgba(255,255,255,0.12))'}`,
            color: 'var(--text, #fff)',
            borderRadius: 8,
            padding: '0.6rem 1rem',
            fontSize: '1rem',
            outline: 'none',
            width: 220,
            textAlign: 'center',
            transition: 'border-color 0.15s',
          }}
        />
        {error && (
          <span style={{ color: 'var(--incorrect, #ff4444)', fontSize: '0.8rem' }}>
            Incorrect password
          </span>
        )}
      </div>
      <button
        onClick={attempt}
        style={{
          background: 'transparent',
          border: '1px solid var(--border, rgba(255,255,255,0.12))',
          color: 'var(--text, #fff)',
          borderRadius: 8,
          padding: '0.5rem 1.5rem',
          fontSize: '0.9rem',
          cursor: 'pointer',
          letterSpacing: '0.03em',
        }}
      >
        Unlock
      </button>
    </motion.div>
  )
}
