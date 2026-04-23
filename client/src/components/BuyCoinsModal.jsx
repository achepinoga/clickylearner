import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { playClick, playBack, playChime } from '../sounds'
import './BuyCoinsModal.css'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null

// ── Payment form (used for both coins and subscription) ──────────────────────
function PaymentForm({ summary, onSuccess, onBack }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [error, setError]   = useState('')
  const [ready, setReady]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements || paying) return
    setError('')
    setPaying(true)

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}?payment=success` },
      redirect: 'if_required',
    })

    if (stripeError) {
      setError(stripeError.message || 'Payment failed.')
      setPaying(false)
    } else if (paymentIntent?.status === 'succeeded') {
      playChime()
      onSuccess()
    }
  }

  return (
    <form className="bcm-payment-form" onSubmit={handleSubmit}>
      <div className="bcm-pkg-summary">
        <span className="bcm-pkg-summary-label">Purchasing</span>
        <span className="bcm-pkg-summary-val">{summary}</span>
      </div>

      <div className={`bcm-elements-wrap ${ready ? 'bcm-elements-wrap--ready' : ''}`}>
        <PaymentElement onReady={() => setReady(true)} options={{ layout: 'tabs' }} />
      </div>

      {error && <p className="bcm-error">{error}</p>}

      <div className="bcm-form-actions">
        <button type="button" className="bcm-btn-back" onClick={onBack} disabled={paying}>← back</button>
        <button type="submit" className="bcm-btn-pay" disabled={!stripe || !ready || paying}>
          {paying ? 'processing...' : 'Confirm payment'}
        </button>
      </div>

      <p className="bcm-secure">🔒 Secured by Stripe — we never see your card details.</p>
    </form>
  )
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function BuyCoinsModal({ isOpen, onClose, userId, userEmail, coinsRemaining, onCoinsAdded }) {
  const [packages, setPackages]         = useState({ subscription: null, coins: [] })
  const [clientSecret, setClientSecret] = useState(null)
  const [activeSummary, setActiveSummary] = useState('')
  const [loadingId, setLoadingId]       = useState(null)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState(null) // 'coins' | 'subscription'
  const [coinsToAdd, setCoinsToAdd]     = useState(0)

  useEffect(() => {
    if (!isOpen) return
    fetch(`${API_BASE}/api/stripe/packages`)
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.coins)) {
          setPackages(data)
        } else if (Array.isArray(data)) {
          // old array format fallback
          setPackages({ subscription: null, coins: data })
        } else {
          setError('Could not load packages.')
        }
      })
      .catch(() => setError('Could not load packages.'))
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setClientSecret(null)
      setLoadingId(null)
      setError('')
      setSuccess(null)
      setCoinsToAdd(0)
    }
  }, [isOpen])

  const initPayment = async (clientSecretValue, summary) => {
    setClientSecret(clientSecretValue)
    setActiveSummary(summary)
  }

  const handleSelectCoin = async (pkg) => {
    if (!userId) { setError('Sign in first to purchase coins.'); return }
    setError('')
    setLoadingId(pkg.id)
    playClick()
    try {
      const res  = await fetch(`${API_BASE}/api/stripe/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg.id, userId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return }
      setCoinsToAdd(pkg.coins)
      initPayment(data.clientSecret, `🪙 ${pkg.coins} coins — ${pkg.displayPrice}`)
    } catch {
      setError('Failed to connect to payment provider.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleSelectSubscription = async () => {
    if (!userId) { setError('Sign in first to subscribe.'); return }
    setError('')
    setLoadingId('monthly')
    playClick()
    try {
      const res  = await fetch(`${API_BASE}/api/stripe/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userEmail }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return }
      initPayment(data.clientSecret, `∞ Unlimited — ${packages.subscription?.displayPrice}`)
    } catch {
      setError('Failed to connect to payment provider.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleSuccess = () => {
    if (coinsToAdd > 0) {
      setSuccess('coins')
      onCoinsAdded?.(coinsToAdd)
    } else {
      setSuccess('subscription')
    }
  }

  const appearance = {
    theme: 'night',
    variables: {
      colorBackground: '#0f0f0f', colorText: '#ffffff', colorTextSecondary: '#888888',
      colorDanger: '#ff4444', colorPrimary: '#ffffff',
      fontFamily: '"JetBrains Mono", monospace', fontSizeBase: '13px',
      borderRadius: '0px', spacingUnit: '4px',
    },
    rules: {
      '.Input': { border: '1px solid rgba(255,255,255,0.12)', backgroundColor: '#080808', color: '#ffffff', boxShadow: 'none' },
      '.Input:focus': { border: '1px solid rgba(255,255,255,0.35)', boxShadow: 'none' },
      '.Label': { color: '#888888', fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase' },
      '.Tab': { border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#0a0a0a' },
      '.Tab--selected': { border: '1px solid rgba(255,255,255,0.35)', backgroundColor: '#111111' },
    },
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div className="bcm-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => { playBack(); onClose() }} />
          <div className="bcm-positioner">
          <motion.div
            className="bcm-panel"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            role="dialog" aria-modal="true" aria-label="Buy coins"
          >
            <div className="bcm-header">
              <div>
                <p className="bcm-label">[ CLICKYCOINS ]</p>
                <h2 className="bcm-title">
                  {success ? 'Payment successful' : clientSecret ? 'Enter payment details' : 'Top up your coins'}
                </h2>
              </div>
              <button className="bcm-close" onClick={() => { playBack(); onClose() }} aria-label="Close">✕</button>
            </div>

            {/* Success */}
            {success === 'coins' && (
              <div className="bcm-success">
                <p className="bcm-success-icon">🪙</p>
                <p className="bcm-success-msg">{coinsToAdd} coins added to your account.</p>
                <p className="bcm-success-sub">Your balance has been updated.</p>
                <button className="bcm-btn-pay" onClick={() => { playClick(); onClose() }}>Done</button>
              </div>
            )}

            {success === 'subscription' && (
              <div className="bcm-success">
                <p className="bcm-success-icon">∞</p>
                <p className="bcm-success-msg">You're subscribed.</p>
                <p className="bcm-success-sub">Unlimited AI actions are now active on your account. It may take a moment to reflect.</p>
                <button className="bcm-btn-pay" onClick={() => { playClick(); onClose() }}>Done</button>
              </div>
            )}

            {/* Payment form */}
            {!success && clientSecret && (
              <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
                <PaymentForm
                  summary={activeSummary}
                  onSuccess={handleSuccess}
                  onBack={() => { setClientSecret(null); setCoinsToAdd(0) }}
                />
              </Elements>
            )}

            {/* Package selection */}
            {!success && !clientSecret && (
              <>
                <p className="bcm-current">Balance: <span className="bcm-balance">{coinsRemaining} coins</span></p>

                {!userId && <p className="bcm-signin-note">Sign in to purchase coins and keep your balance across sessions.</p>}
                {error && <p className="bcm-error">{error}</p>}

                {/* Subscription */}
                {packages.subscription && (
                  <div className="bcm-section">
                    <p className="bcm-section-label">[ SUBSCRIPTION ]</p>
                    <div className="bcm-sub-wrap">
                      <span className="bcm-best-value">best value</span>
                    <button
                      className="bcm-package bcm-package--sub"
                      onClick={handleSelectSubscription}
                      disabled={!!loadingId || !userId}
                    >
                      <div className="bcm-pkg-left">
                        <span className="bcm-pkg-coins bcm-pkg-coins--sub">🪙 {packages.subscription.coins}</span>
                        <span className="bcm-pkg-label">coins / month</span>
                      </div>
                      <span className="bcm-pkg-price bcm-pkg-price--sub">
                        {loadingId === 'monthly' ? '...' : packages.subscription.displayPrice}
                      </span>
                    </button>
                    </div>
                  </div>
                )}

                {/* Coin packs */}
                <div className="bcm-section">
                  <p className="bcm-section-label">[ ONE-TIME ]</p>
                  <div className="bcm-packages">
                    {(packages.coins ?? []).length === 0 && !error && <div className="bcm-loading">loading...</div>}
                    {(packages.coins ?? []).map(pkg => (
                      <button
                        key={pkg.id}
                        className="bcm-package"
                        onClick={() => handleSelectCoin(pkg)}
                        disabled={!!loadingId || !userId}
                      >
                        <div className="bcm-pkg-left">
                          <span className="bcm-pkg-coins">🪙 {pkg.coins}</span>
                          <span className="bcm-pkg-label">coins</span>
                        </div>
                        <span className="bcm-pkg-price">
                          {loadingId === pkg.id ? '...' : pkg.displayPrice}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <p className="bcm-secure">🔒 Payments processed securely by Stripe.</p>
              </>
            )}
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
