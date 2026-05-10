import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { playClick, playBack, playChime } from '../sounds'
import './PremiumModal.css'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null

const BENEFITS = [
  'Unlimited flashcard sets',
  'Unlimited AI-generated tests',
  'Priority AI generation',
]

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
    <form className="pm-payment-form" onSubmit={handleSubmit}>
      <div className="pm-pkg-summary">
        <span className="pm-pkg-summary-label">Subscribing to</span>
        <span className="pm-pkg-summary-val">{summary}</span>
      </div>

      <div className={`pm-elements-wrap ${ready ? 'pm-elements-wrap--ready' : ''}`}>
        <PaymentElement onReady={() => setReady(true)} options={{ layout: 'tabs' }} />
      </div>

      {error && <p className="pm-error">{error}</p>}

      <div className="pm-form-actions">
        <button type="button" className="pm-btn-back" onClick={onBack} disabled={paying}>← back</button>
        <button type="submit" className="pm-btn-pay" disabled={!stripe || !ready || paying}>
          {paying ? 'processing...' : 'Confirm payment'}
        </button>
      </div>

      <p className="pm-secure">🔒 Secured by Stripe — we never see your card details.</p>
    </form>
  )
}

export default function PremiumModal({ isOpen, onClose, userId, userEmail, onSubscribed }) {
  const [clientSecret, setClientSecret] = useState(null)
  const [subscriptionPrice, setSubscriptionPrice] = useState('$9.99 / mo')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    fetch(`${API_BASE}/api/stripe/packages`)
      .then(r => r.json())
      .then(data => {
        if (data?.subscription?.displayPrice) {
          setSubscriptionPrice(data.subscription.displayPrice)
        }
      })
      .catch(() => {})
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setClientSecret(null)
      setLoading(false)
      setError('')
      setSuccess(false)
    }
  }, [isOpen])

  const handleSubscribe = async () => {
    if (!userId) { setError('Sign in first to subscribe.'); return }
    setError('')
    setLoading(true)
    playClick()
    try {
      const res  = await fetch(`${API_BASE}/api/stripe/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userEmail }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong.'); return }
      setClientSecret(data.clientSecret)
    } catch {
      setError('Failed to connect to payment provider.')
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    setSuccess(true)
    onSubscribed?.()
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
          <motion.div className="pm-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => { playBack(); onClose() }} />
          <div className="pm-positioner">
            <motion.div
              className="pm-panel"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              role="dialog" aria-modal="true" aria-label="Get Premium"
            >
              <div className="pm-header">
                <div>
                  <p className="pm-label">[ CLICKYLEARNER ]</p>
                  <h2 className="pm-title">
                    {success ? 'Welcome to Premium' : clientSecret ? 'Enter payment details' : 'Get Premium'}
                  </h2>
                </div>
                <button className="pm-close" onClick={() => { playBack(); onClose() }} aria-label="Close">✕</button>
              </div>

              {/* Success */}
              {success && (
                <div className="pm-success">
                  <p className="pm-success-icon">✦</p>
                  <p className="pm-success-msg">You're now a premium member.</p>
                  <p className="pm-success-sub">Unlimited flashcard sets and tests are now active. It may take a moment to reflect.</p>
                  <button className="pm-btn-pay" onClick={() => { playClick(); onClose() }}>Done</button>
                </div>
              )}

              {/* Payment form */}
              {!success && clientSecret && (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
                  <PaymentForm
                    summary={`Premium — ${subscriptionPrice}`}
                    onSuccess={handleSuccess}
                    onBack={() => setClientSecret(null)}
                  />
                </Elements>
              )}

              {/* Plan selection */}
              {!success && !clientSecret && (
                <>
                  <ul className="pm-benefits">
                    {BENEFITS.map(b => (
                      <li key={b} className="pm-benefit-item">
                        <span className="pm-benefit-check">✓</span>
                        {b}
                      </li>
                    ))}
                  </ul>

                  {!userId && <p className="pm-signin-note">Sign in to subscribe and keep your access across sessions.</p>}
                  {error && <p className="pm-error">{error}</p>}

                  <button
                    className="pm-subscribe-btn"
                    onClick={handleSubscribe}
                    disabled={loading || !userId}
                  >
                    <span className="pm-subscribe-label">{loading ? 'loading...' : 'Subscribe'}</span>
                    <span className="pm-subscribe-price">{subscriptionPrice}</span>
                  </button>

                  <p className="pm-secure">🔒 Payments processed securely by Stripe. Cancel anytime.</p>
                </>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
