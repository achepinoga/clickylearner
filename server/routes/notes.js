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
          content: `You are a study assistant. Given study material, generate clear, concise study notes.
Format the notes as 8-15 key points or sentences that capture the most important concepts.
Each note should be 1-2 sentences max, easy to read and type.
Return ONLY the notes as a JSON array of strings, no extra text or markdown.
Example: ["Note one here.", "Note two here.", "Note three here."]`
        },
        {
          role: 'user',
          content: `Generate study notes from this material:\n\n${text.slice(0, 8000)}`
        }
      ],
      temperature: 0.5
    });

    const raw = completion.choices[0].message.content.trim();
    let notes;

    try {
      notes = JSON.parse(raw);
    } catch {
      // Fallback: extract array from response
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) notes = JSON.parse(match[0]);
      else throw new Error('Could not parse notes from AI response');
    }

    res.json({ notes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to generate notes' });
  }
});

module.exports = router;
