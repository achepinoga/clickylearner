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

const UPLOAD_MAX = 10
const UPLOAD_WINDOW = 15 * 60 * 1000   // 15 minutes

// Parallel hit tracker — mirrors express-rate-limit windows without touching its internals.
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

const limitsRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
})

// Limit status
app.get('/api/limits', limitsRateLimit, async (req, res) => {
  const key = req.ip ?? ''
  const upload = uploadTracker.peek(key)

  let isSubscribed = false
  const user = await getUserFromRequest(req)
  if (user) {
    isSubscribed = await hasActiveSubscription(user.id)
  }

  res.json({
    isSubscribed,
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
app.use('/api/notes', notesRoute)
app.use('/api/quiz', quizRoute)

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`StudyTyper server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
