require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const uploadRoute = require('./routes/upload');
const notesRoute = require('./routes/notes');
const quizRoute = require('./routes/quiz');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : true)
  : ['http://localhost:5173', 'http://localhost:5174']

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// 10 uploads per IP per 15 minutes
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many uploads. Please wait a few minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// 20 AI calls per IP per hour (notes + quiz share this)
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests. Please wait an hour and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/upload', uploadLimiter, uploadRoute);
app.use('/api/notes', aiLimiter, notesRoute);
app.use('/api/quiz', aiLimiter, quizRoute);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`StudyTyper server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
