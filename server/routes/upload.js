const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'text/plain'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF and .txt files are allowed'));
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.post('/', upload.single('file'), async (req, res) => {
  let filePath = req.file?.path ?? null;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let text = '';

    if (req.file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text;
    } else {
      text = fs.readFileSync(req.file.path, 'utf8');
    }

    if (!text.trim()) return res.status(400).json({ error: 'Could not extract text from file' });

    res.json({ text: text.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to process file' });
  } finally {
    if (filePath) {
      try { fs.unlinkSync(filePath); } catch (e) { console.warn('Could not delete temp file', e); }
    }
  }
});

module.exports = router;
