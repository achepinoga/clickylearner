const express = require('express')
const OpenAI = require('openai')

const router = express.Router()

router.post('/generate', async (req, res) => {
  const { notes } = req.body
  if (!notes || !Array.isArray(notes) || notes.length === 0)
    return res.status(400).json({ error: 'No notes provided' })
  if (!process.env.OPENAI_API_KEY)
    return res.status(500).json({ error: 'OpenAI API key not configured' })

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const notesText = notes.map((n, i) => `[${i}] ${n}`).join('\n')

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a quiz generator for a flashcard typing study app. Generate quiz questions from numbered study notes.

RULES:
1. Generate 1-2 questions per note, maximum 20 questions total.
2. Mix: ~60% multiple_choice, ~40% true_false.
3. TRUE/FALSE: "correct" is a boolean. False statements must be subtly wrong — change a date, name, number, or key term. Never make false statements obviously wrong.
4. MULTIPLE CHOICE: exactly 4 options in "options" array. "correct" is the 0-based index. All 3 distractors must be plausible and from the same domain.
5. Questions must be directly answerable from the note they reference.
6. "sourceNoteIndex" is the integer in the [N] prefix of the note the question comes from.
7. Keep questions concise and factual — test specific names, dates, numbers, definitions, causes, effects.
8. Return JSON with a "questions" key containing the array.

Format exactly:
{"questions":[
  {"type":"true_false","question":"...","correct":true,"sourceNoteIndex":0},
  {"type":"multiple_choice","question":"...","options":["A","B","C","D"],"correct":1,"sourceNoteIndex":0}
]}`
        },
        {
          role: 'user',
          content: `Generate quiz questions from these study notes:\n\n${notesText}`
        }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const raw = completion.choices[0].message.content.trim()
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) parsed = JSON.parse(match[0])
      else throw new Error('Could not parse quiz response')
    }

    const questions = Array.isArray(parsed) ? parsed : (parsed.questions || [])
    if (!questions.length) throw new Error('No questions generated')

    res.json({ questions })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message || 'Failed to generate quiz' })
  }
})

module.exports = router
