const express = require('express');
const OpenAI = require('openai');

const router = express.Router();

router.post('/generate', async (req, res) => {
  const { text } = req.body;

  if (!text) return res.status(400).json({ error: 'No text provided' });
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured' });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const CHAR_LIMIT = 8000
  const CHARS_PER_PAGE = 2500
  const truncated = text.length > CHAR_LIMIT
  const processedText = text.slice(0, CHAR_LIMIT)

  // Find last sentence boundary and cutoff preview
  let cutoffPreview = ''
  let estimatedCutoffPage = Math.ceil(CHAR_LIMIT / CHARS_PER_PAGE)
  const estimatedTotalPages = Math.ceil(text.length / CHARS_PER_PAGE)
  if (truncated) {
    const sentenceEndRegex = /[.!?](\s|$)/g
    let lastEnd = 0
    let match
    while ((match = sentenceEndRegex.exec(processedText)) !== null) lastEnd = match.index + 1
    cutoffPreview = processedText.slice(Math.max(0, lastEnd - 120), lastEnd).trim()
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert flashcard writer and study material processor. Your job is to transform raw study content into optimized flashcard notes designed for active recall through typed repetition.

STEP 1 — DETECT SUBJECT:
Identify the domain of the material (e.g. history, biology, law, chemistry, computer science, economics, literature, medicine, philosophy, mathematics). This determines note style in Step 2.

STEP 2 — APPLY SUBJECT-AWARE NOTE STYLE:
- HISTORY: Lead with the event/person, end with the date or consequence. Example: "Napoleon was exiled to Saint Helena in 1815 after his defeat at Waterloo."
- SCIENCE/BIOLOGY/CHEMISTRY: State the concept, then its mechanism or function. Example: "Mitochondria produce ATP through oxidative phosphorylation, powering cellular processes."
- LAW: State the rule, then its condition or exception. Example: "Consideration is required for a contract to be enforceable under common law."
- COMPUTER SCIENCE: Define the term, then describe behaviour or complexity. Example: "A hash table achieves O(1) average lookup by mapping keys to indices via a hash function."
- ECONOMICS/FINANCE: State the relationship or principle, then the direction of effect. Example: "When interest rates rise, bond prices fall because future cash flows are discounted more heavily."
- MEDICINE: Name the condition or drug, then mechanism and key fact. Example: "Metformin reduces hepatic glucose production and improves insulin sensitivity in type 2 diabetes."
- MATHEMATICS: State the theorem or rule, then its condition. Example: "The Pythagorean theorem states that a squared plus b squared equals c squared for right-angled triangles."
- DEFAULT: Lead with the subject, end with the specific fact, date, name, or value being tested.

STEP 3 — RECALL STRUCTURE (CRITICAL):
Each note must be written so the most testable fact — the specific name, date, number, term, cause, or effect — appears AFTER the context that frames it. The reader should be able to predict a blank at the end. Structure: [context] → [specific fact].
Good: "The French Revolution began in 1789." (1789 is what gets tested)
Bad: "1789 saw the start of the French Revolution." (date appears first, kills the recall arc)

STEP 4 — FACTUAL DENSITY:
- Preserve every specific proper noun, date, number, percentage, chemical name, and technical term exactly as given.
- Do NOT generalise, summarise vaguely, or drop specifics. Every note must contain at least one concrete testable fact.
- If the source contains a list, break it into individual notes — one fact per card.

STEP 5 — FORMAT RULES:
- Each note must be 80–240 characters.
- Every note must be one or more COMPLETE sentences ending in a period, exclamation mark, or question mark.
- No bullet points, numbered lists, or special characters.
- Plain prose only.
- Return ONLY a JSON array of strings. No explanation, no preamble.
- Aim for 8–20 notes. Use more if needed to avoid dropping facts.

Example output (history): ["The Treaty of Versailles, signed in 1919, officially ended World War One and imposed heavy reparations on Germany.", "Germany lost 13 percent of its territory and all overseas colonies under the terms of the Versailles settlement."]
Example output (science): ["Photosynthesis converts carbon dioxide and water into glucose using light energy absorbed by chlorophyll.", "The light-dependent reactions of photosynthesis occur in the thylakoid membrane and produce ATP and NADPH."]`
        },
        {
          role: 'user',
          content: `Generate study notes from this material:\n\n${processedText}`
        }
      ],
      temperature: 0.3
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

    // Split only at sentence boundaries to avoid mid-sentence cuts
    const MAX_CHARS = 240;
    let notes = [];
    for (const note of rawNotes) {
      if (note.length <= MAX_CHARS) {
        notes.push(note);
        continue;
      }
      // Split into sentences first
      const sentences = note.match(/[^.!?]+[.!?]+(\s|$)/g) || [note];
      let currentChunk = '';
      for (const sentence of sentences) {
        const s = sentence.trim();
        const candidate = currentChunk ? currentChunk + ' ' + s : s;
        if (currentChunk && candidate.length > MAX_CHARS) {
          notes.push(currentChunk);
          currentChunk = s;
        } else {
          currentChunk = candidate;
        }
      }
      if (currentChunk) notes.push(currentChunk);
    }

    res.json({
      notes,
      truncated,
      ...(truncated && {
        cutoffPage: estimatedCutoffPage,
        totalPages: estimatedTotalPages,
        cutoffPreview,
        remainingText: text.slice(CHAR_LIMIT),
      })
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to generate notes' });
  }
});

module.exports = router;
