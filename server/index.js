require('dotenv').config();
const express = require('express');
const cors = require('cors');
const uploadRoute = require('./routes/upload');
const notesRoute = require('./routes/notes');
const quizRoute = require('./routes/quiz');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.use('/api/upload', uploadRoute);
app.use('/api/notes', notesRoute);
app.use('/api/quiz', quizRoute);

app.listen(PORT, () => {
  console.log(`StudyTyper server running on http://localhost:${PORT}`);
});
