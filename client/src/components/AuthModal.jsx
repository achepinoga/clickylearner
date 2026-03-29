import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import './AuthModal.css'

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor" opacity=".7"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor" opacity=".7"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="currentColor" opacity=".7"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor" opacity=".7"/>
    </svg>
  )
}


export default function AuthModal({ isOpen, onClose }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const reset = () => { setError(''); setMessage(''); setConfirmPassword('') }

  const handleSubmit = async (e) => {
    e.preventDefault()
    reset()
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onClose()
      } else {
        if (password !== confirmPassword) throw new Error('Passwords do not match')
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email to confirm your account, then sign in.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider) => {
    setOauthLoading(provider)
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin }
    })
    setOauthLoading('')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
            className="auth-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          >
          <motion.div
            className="auth-modal"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            onClick={e => e.stopPropagation()}
          >
            <div className="auth-modal-header">
              <span className="auth-modal-title">
                // {mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
              </span>
              <button className="auth-modal-close" onClick={onClose} aria-label="Close">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M1.5 1.5l10 10M11.5 1.5l-10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="auth-oauth-group">
              <button
                className="auth-oauth-btn"
                onClick={() => handleOAuth('google')}
                disabled={!!oauthLoading}
              >
                <GoogleIcon />
                {oauthLoading === 'google' ? '...' : 'Continue with Google'}
              </button>
            </div>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label className="auth-label">// EMAIL</label>
                <input
                  className="auth-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>
              <div className="auth-field">
                <label className="auth-label">// PASSWORD</label>
                <input
                  className="auth-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
              </div>
              {mode === 'signup' && (
                <div className="auth-field">
                  <label className="auth-label">// CONFIRM PASSWORD</label>
                  <input
                    className="auth-input"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              )}

              <AnimatePresence mode="wait">
                {error && (
                  <motion.p key="err" className="auth-error"
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    [ERR] {error}
                  </motion.p>
                )}
                {message && (
                  <motion.p key="msg" className="auth-message"
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {message}
                  </motion.p>
                )}
              </AnimatePresence>

              <button className="auth-submit" type="submit" disabled={loading || !!oauthLoading}>
                {loading ? '...' : mode === 'signin' ? 'Sign In →' : 'Continue →'}
              </button>
              {mode === 'signup' && (
                <p className="auth-legal">
                  By clicking 'Continue', you agree to our{' '}
                  <a href="/terms.html" target="_blank" rel="noopener noreferrer">Terms of Service</a>{' '}
                  and{' '}
                  <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
                </p>
              )}
            </form>

            <p className="auth-toggle">
              {mode === 'signin' ? (
                <>No account?{' '}
                  <button onClick={() => { setMode('signup'); reset() }}>Sign Up</button>
                </>
              ) : (
                <>Have an account?{' '}
                  <button onClick={() => { setMode('signin'); reset() }}>Sign In</button>
                </>
              )}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
