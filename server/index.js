require('dotenv').config();
const express = require('express');
const cors = require('cors');
const uploadRoute = require('./routes/upload');
const notesRoute = require('./routes/notes');
const quizRoute = require('./routes/quiz');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : [])
  : ['http://localhost:5173', 'http://localhost:5174']

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '50mb' }));

app.use('/api/upload', uploadRoute);
app.use('/api/notes', notesRoute);
app.use('/api/quiz', quizRoute);

app.listen(PORT, () => {
  console.log(`StudyTyper server running on http://localhost:${PORT}`);
});
