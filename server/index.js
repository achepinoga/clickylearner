require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const uploadRoute = require('./routes/upload');
const notesRoute = require('./routes/notes');
const quizRoute = require('./routes/quiz');
const { router: stripeRouter, webhookHandler } = require('./routes/stripe');
const supabaseAdmin = require('./lib/supabaseAdmin');


const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.ALLOWED_ORIGIN
      ? process.env.ALLOWED_ORIGIN.split(',').map(s => s.trim())
      : [])
  : ['http://localhost:5173', 'http://localhost:5174']

app.use(cors({ origin: allowedOrigins, credentials: true }));

// ── Stripe webhook — must come before express.json() to receive raw body ──
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), webhookHandler)

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json({ limit: '50mb' }));

const AI_MAX = 10
const UPLOAD_MAX = 10
const UPLOAD_WINDOW = 15 * 60 * 1000   // 15 minutes

// Parallel hit tracker — mirrors express-rate-limit windows without touching its internals.
// Increments on every inbound request to a tracked route (same as the rate limiter does).
function makeTracker(windowMs) {
  const store = new Map()
  return {
    increment(key) {
      const now = Date.now()
      const entry = store.get(key)
      if (entry && entry.resetAt > now) {
        entry.hits++
      } else {
        store.set(key, { hits: 1, resetAt: now + windowMs })
      }
    },
    peek(key) {
      const now = Date.now()
      const entry = store.get(key)
      if (!entry || entry.resetAt <= now) return null
      return entry
    },
  }
}

// AI tracker — permanent, never resets. Users get AI_MAX coins total.
function makePermanentTracker() {
  const store = new Map()
  return {
    increment(key) {
      const entry = store.get(key)
      if (entry) {
        entry.hits++
      } else {
        store.set(key, { hits: 1 })
      }
    },
    peek(key) {
      return store.get(key) ?? null
    },
  }
}

const aiTracker = makePermanentTracker()
const uploadTracker = makeTracker(UPLOAD_WINDOW)

// 10 uploads per IP per 15 minutes
const uploadLimiter = rateLimit({
  windowMs: UPLOAD_WINDOW,
  max: UPLOAD_MAX,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many uploads. Please wait a few minutes and try again.',
      resetTime: req.rateLimit.resetTime,
    })
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Extract user from Supabase JWT (returns null if missing/invalid)
async function getUserFromRequest(req) {
  try {
    const auth = req.headers.authorization
    if (!auth?.startsWith('Bearer ')) return null
    const token = auth.slice(7)
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    return error ? null : user
  } catch { return null }
}

// Get purchased coin balance from DB
async function getPurchasedCoins(userId) {
  try {
    const { data } = await supabaseAdmin
      .from('user_coins')
      .select('balance')
      .eq('user_id', userId)
      .single()
    return data?.balance ?? 0
  } catch { return 0 }
}

// Check if user has an active subscription
async function hasActiveSubscription(userId) {
  try {
    const { data } = await supabaseAdmin
      .from('user_subscriptions')
      .select('status')
      .eq('user_id', userId)
      .single()
    return data?.status === 'active'
  } catch { return false }
}

// Deduct one purchased coin from DB
async function deductPurchasedCoin(userId) {
  try {
    await supabaseAdmin.rpc('decrement_user_coins', { p_user_id: userId })
  } catch { /* non-fatal */ }
}

// AI limiter — subscription → purchased coins → free trial
async function aiLimiter(req, res, next) {
  const user = await getUserFromRequest(req)

  if (user) {
    const purchased = await getPurchasedCoins(user.id)
    if (purchased > 0) {
      await deductPurchasedCoin(user.id)
      return next()
    }
  }

  // Free trial — IP-based, permanent
  const key = req.ip ?? ''
  const entry = aiTracker.peek(key)
  if (entry && entry.hits >= AI_MAX) {
    return res.status(429).json({
      error: 'No coins remaining. Purchase more to continue.',
      resetTime: null,
    })
  }
  aiTracker.increment(key)
  next()
}

const limitsRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
})

// Limit status — reads from parallel tracker + purchased coins for auth'd users
app.get('/api/limits', limitsRateLimit, async (req, res) => {
  const key = req.ip ?? ''
  const ai = aiTracker.peek(key)
  const upload = uploadTracker.peek(key)

  const trialRemaining = Math.max(0, AI_MAX - (ai?.hits ?? 0))
  let purchasedRemaining = 0

  const user = await getUserFromRequest(req)
  if (user) {
    purchasedRemaining = await getPurchasedCoins(user.id)
  }

  res.json({
    ai: {
      limit: AI_MAX,
      used: ai?.hits ?? 0,
      remaining: trialRemaining + purchasedRemaining,
      purchased: purchasedRemaining,
      resetTime: null,
    },
    upload: {
      limit: UPLOAD_MAX,
      used: upload?.hits ?? 0,
      remaining: Math.max(0, UPLOAD_MAX - (upload?.hits ?? 0)),
      resetTime: upload ? new Date(upload.resetAt).toISOString() : null,
    },
  })
})

app.use('/api/stripe', stripeRouter)

app.use('/api/upload',
  (req, res, next) => {
    if (req.query.mode === 'standard') return next()
    uploadTracker.increment(req.ip ?? '')
    next()
  },
  (req, res, next) => {
    if (req.query.mode === 'standard') return next()
    uploadLimiter(req, res, next)
  },
  uploadRoute,
)
app.use('/api/notes', aiLimiter, notesRoute)
app.use('/api/quiz', aiLimiter, quizRoute)

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`StudyTyper server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
