require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const uploadRoute = require('./routes/upload');
const notesRoute = require('./routes/notes');
const quizRoute = require('./routes/quiz');

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.ALLOWED_ORIGIN
      ? process.env.ALLOWED_ORIGIN.split(',').map(s => s.trim())
      : true)
  : ['http://localhost:5173', 'http://localhost:5174']

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '50mb' }));

const AI_MAX = 25
const UPLOAD_MAX = 10
const AI_WINDOW = 24 * 60 * 60 * 1000 // 24 hours (used by express-rate-limit)
const UPLOAD_WINDOW = 15 * 60 * 1000   // 15 minutes

// Returns the timestamp of the next 12:00 noon (local server time)
function getNextNoon() {
  const now = new Date()
  const noon = new Date(now)
  noon.setHours(12, 0, 0, 0)
  if (noon <= now) noon.setDate(noon.getDate() + 1)
  return noon.getTime()
}

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

// AI tracker resets at noon each day instead of a rolling window
function makeNoonTracker() {
  const store = new Map()
  return {
    increment(key) {
      const now = Date.now()
      const entry = store.get(key)
      if (entry && entry.resetAt > now) {
        entry.hits++
      } else {
        store.set(key, { hits: 1, resetAt: getNextNoon() })
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

const aiTracker = makeNoonTracker()
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

// 25 coin actions per IP per day, resets at noon (notes + quiz share this)
const aiLimiter = rateLimit({
  windowMs: AI_WINDOW,
  max: AI_MAX,
  handler: (req, res) => {
    res.status(429).json({
      error: 'No coins remaining. Your coins refill at noon.',
      resetTime: new Date(getNextNoon()).toISOString(),
    })
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Limit status — does not consume a token; reads from the parallel tracker
app.get('/api/limits', (req, res) => {
  const key = req.ip ?? ''
  const ai = aiTracker.peek(key)
  const upload = uploadTracker.peek(key)
  res.json({
    ai: {
      limit: AI_MAX,
      used: ai?.hits ?? 0,
      remaining: Math.max(0, AI_MAX - (ai?.hits ?? 0)),
      resetTime: ai ? new Date(ai.resetAt).toISOString() : null,
    },
    upload: {
      limit: UPLOAD_MAX,
      used: upload?.hits ?? 0,
      remaining: Math.max(0, UPLOAD_MAX - (upload?.hits ?? 0)),
      resetTime: upload ? new Date(upload.resetAt).toISOString() : null,
    },
  })
})

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
app.use('/api/notes',
  (req, res, next) => { aiTracker.increment(req.ip ?? ''); next() },
  aiLimiter,
  notesRoute,
)
app.use('/api/quiz',
  (req, res, next) => { aiTracker.increment(req.ip ?? ''); next() },
  aiLimiter,
  quizRoute,
)

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`StudyTyper server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
