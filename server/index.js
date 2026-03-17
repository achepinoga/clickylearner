require('dotenv').config();
const express = require('express');
const cors = require('cors');
const uploadRoute = require('./routes/upload');
const notesRoute = require('./routes/notes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/upload', uploadRoute);
app.use('/api/notes', notesRoute);

app.listen(PORT, () => {
  console.log(`StudyTyper server running on http://localhost:${PORT}`);
});
