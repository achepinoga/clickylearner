const express = require('express');
const OpenAI = require('openai');

const router = express.Router();

router.post('/generate', async (req, res) => {
  const { text } = req.body;

  if (!text) return res.status(400).json({ error: 'No text provided' });
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured' });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a typing-test formatter. Your job is to take study material and rewrite it into short, clean typing challenges.

RULES:
1. Preserve all essential information — do not remove key facts, but you CAN rewrite sentences to be cleaner and easier to read/type.
2. Each chunk must be between 100 and 280 characters (roughly 2 to 4 lines on a typing screen).
3. Do NOT use numbered lists, bullet points, or special characters. Write in plain prose.
4. Return ONLY a JSON array of strings. Each string is one independent typing challenge.
5. Aim for 8 to 15 chunks total.

Example output: ["The relational model organizes data into tables called relations.", "Each relation has rows called tuples and columns called attributes."]`
        },
        {
          role: 'user',
          content: `Generate study notes from this material:\n\n${text.slice(0, 8000)}`
        }
      ],
      temperature: 0.5
    });

    const raw = completion.choices[0].message.content.trim();
    let parsedNotes;

    try {
      parsedNotes = JSON.parse(raw);
    } catch {
      // Fallback: extract array from response
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) parsedNotes = JSON.parse(match[0]);
      else throw new Error('Could not parse notes from AI response');
    }

    // Pre-process: flatten and split on numbered patterns like "1.", "2." in case AI returned one big blob
    let rawNotes = [];
    for (const note of parsedNotes) {
      const splitByNumber = note.split(/\s*\d+\.\s+/).filter(s => s.trim().length > 0);
      if (splitByNumber.length > 1) {
        rawNotes.push(...splitByNumber.map(s => s.trim()));
      } else {
        rawNotes.push(note.trim());
      }
    }

    // Hard-split at word boundaries — 160 chars max (~50 chars/line × 3-4 lines)
    const MAX_CHARS = 160;
    let notes = [];
    for (const note of rawNotes) {
      if (note.length <= MAX_CHARS) {
        notes.push(note);
        continue;
      }
      const words = note.split(' ');
      let currentChunk = '';
      for (const word of words) {
        const candidate = currentChunk ? currentChunk + ' ' + word : word;
        if (candidate.length > MAX_CHARS) {
          if (currentChunk) notes.push(currentChunk);
          currentChunk = word;
        } else {
          currentChunk = candidate;
        }
      }
      if (currentChunk) notes.push(currentChunk);
    }

    res.json({ notes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to generate notes' });
  }
});

module.exports = router;
