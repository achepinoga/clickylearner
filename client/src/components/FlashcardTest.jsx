import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playChime, playClick, playBack, playWrong } from '../sounds'
import './FlashcardTest.css'

export default function FlashcardTest({ notes, onBack, settings }) {
  const [phase, setPhase] = useState('loading') // loading | question | penalty | failed-intro | done | error
  const [loadError, setLoadError] = useState('')
  const [questions, setQuestions] = useState([])
  const [totalQuestions, setTotalQuestions] = useState(0) // never changes after load
  const [qIdx, setQIdx] = useState(0)
  const [failed, setFailed] = useState([])       // failed question objects to replay
  const [isFailedRound, setIsFailedRound] = useState(false)
  const [score, setScore] = useState({ correct: 0, wrong: 0 })
  const [feedback, setFeedback] = useState(null) // 'correct' | 'wrong' | null
  const [selected, setSelected] = useState(null) // selected option index

  // Penalty typing
  const [penTyped, setPenTyped] = useState('')
  const [penPendingWrong, setPenPendingWrong] = useState(false)
  const [penFailed, setPenFailed] = useState(() => new Set())
  const [penWrongBump, setPenWrongBump] = useState(0)
  const penTypedRef = useRef('')
  const penFailedRef = useRef(new Set())
  const inputRef = useRef()

  // Stable refs to avoid stale closures in callbacks
  const qIdxRef = useRef(0)
  const questionsRef = useRef([])
  const failedRef = useRef([])
  const isFailedRoundRef = useRef(false)
  const settingsRef = useRef(settings)

  useEffect(() => { qIdxRef.current = qIdx }, [qIdx])
  useEffect(() => { questionsRef.current = questions }, [questions])
  useEffect(() => { failedRef.current = failed }, [failed])
  useEffect(() => { isFailedRoundRef.current = isFailedRound }, [isFailedRound])
  useEffect(() => { settingsRef.current = settings }, [settings])

  const q = questions[qIdx]
  const penaltyText = q ? (notes[q.sourceNoteIndex] ?? notes[0] ?? '') : ''

  useEffect(() => { fetchQuiz() }, [])

  // Re-focus penalty input whenever a click happens anywhere during penalty phase
  useEffect(() => {
    if (phase !== 'penalty') return
    const refocus = () => inputRef.current?.focus()
    document.addEventListener('click', refocus)
    return () => document.removeEventListener('click', refocus)
  }, [phase])

  async function fetchQuiz() {
    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate quiz')
      setQuestions(data.questions)
      questionsRef.current = data.questions
      setTotalQuestions(data.questions.length)
      setPhase('question')
    } catch (err) {
      setLoadError(err.message)
      setPhase('error')
    }
  }

  const advance = useCallback((addToFailed) => {
    const qIdx = qIdxRef.current
    const questions = questionsRef.current
    const failed = failedRef.current
    const isFailedRound = isFailedRoundRef.current

    setFeedback(null)
    setSelected(null)

    const newFailed = (addToFailed && !isFailedRound)
      ? [...failed, questions[qIdx]]
      : failed
    if (addToFailed && !isFailedRound) {
      setFailed(newFailed)
      failedRef.current = newFailed
    }

    const next = qIdx + 1
    if (next < questions.length) {
      setQIdx(next)
      setPhase('question')
    } else if (!isFailedRound && newFailed.length > 0) {
      setPhase('failed-intro')
      setTimeout(() => {
        setQuestions(newFailed)
        questionsRef.current = newFailed
        setFailed([])
        failedRef.current = []
        setQIdx(0)
        qIdxRef.current = 0
        setIsFailedRound(true)
        isFailedRoundRef.current = true
        setPhase('question')
      }, 1800)
    } else {
      setPhase('done')
    }
  }, [])

  const advanceRef = useRef(advance)
  useEffect(() => { advanceRef.current = advance }, [advance])

  function handleAnswer(optIdx) {
    if (feedback || !q) return

    const isCorrect = q.type === 'true_false'
      ? (optIdx === 0) === q.correct
      : optIdx === q.correct

    setSelected(optIdx)
    setFeedback(isCorrect ? 'correct' : 'wrong')

    if (isCorrect) {
      if (settingsRef.current?.completionSound ?? true) playChime()
      setScore(s => ({ ...s, correct: s.correct + 1 }))
      setTimeout(() => advance(false), 1100)
    } else {
      playWrong()
      setScore(s => ({ ...s, wrong: s.wrong + 1 }))
      setTimeout(() => {
        setFeedback(null)
        setSelected(null)
        penTypedRef.current = ''
        setPenTyped('')
        setPenPendingWrong(false)
        penFailedRef.current = new Set()
        setPenFailed(new Set())
        setPenWrongBump(0)
        setPhase('penalty')
        setTimeout(() => inputRef.current?.focus(), 80)
      }, 1100)
    }
  }

  const handlePenaltyKey = useCallback((e) => {
    const freeMode = settingsRef.current?.allowBackspace ?? true

    if (e.key === 'Backspace') {
      e.preventDefault()
      if (freeMode && penTypedRef.current.length > 0) {
        const pos = penTypedRef.current.length - 1
        const next = penTypedRef.current.slice(0, -1)
        penTypedRef.current = next
        setPenTyped(next)
        setPenPendingWrong(false)
        penFailedRef.current = new Set(penFailedRef.current)
        penFailedRef.current.delete(pos)
        setPenFailed(prev => { const s = new Set(prev); s.delete(pos); return s })
      }
      return
    }
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return
    e.preventDefault()

    const target = penaltyText
    const pos = penTypedRef.current.length
    if (pos >= target.length) {
      // At end but errors remain — shake to signal
      if (freeMode && penFailedRef.current.size > 0) setPenWrongBump(n => n + 1)
      return
    }

    if (freeMode) {
      // Free mode: always advance, mark wrong chars in red
      const next = penTypedRef.current + e.key
      penTypedRef.current = next
      if (e.key !== target[pos]) {
        penFailedRef.current = new Set(penFailedRef.current)
        penFailedRef.current.add(pos)
        setPenFailed(prev => { const s = new Set(prev); s.add(pos); return s })
      }
      setPenTyped(next)
      setPenPendingWrong(false)

      if (next.length === target.length) {
        if (penFailedRef.current.size > 0) { setPenWrongBump(n => n + 1); return }
        if (settingsRef.current?.completionSound ?? true) playChime()
        setTimeout(() => advanceRef.current(true), 500)
      }
    } else {
      // Strict mode: block on wrong character
      if (e.key !== target[pos]) {
        setPenPendingWrong(true)
        penFailedRef.current = new Set(penFailedRef.current)
        penFailedRef.current.add(pos)
        setPenFailed(prev => { const s = new Set(prev); s.add(pos); return s })
        setPenWrongBump(n => n + 1)
        return
      }
      const next = penTypedRef.current + e.key
      penTypedRef.current = next
      setPenTyped(next)
      setPenPendingWrong(false)
      if (next.length === target.length) {
        if (settingsRef.current?.completionSound ?? true) playChime()
        setTimeout(() => advanceRef.current(true), 500)
      }
    }
  }, [penaltyText])

  function renderPenaltyText() {
    return penaltyText.split('').map((char, i) => {
      if (i === penTyped.length) {
        return <span key={penPendingWrong ? `w${penWrongBump}` : i} className={`char cursor${penPendingWrong ? ' wrong' : ''}`}>{char}</span>
      }
      if (i < penTyped.length) {
        return <span key={i} className={penFailed.has(i) ? 'char incorrect' : 'char correct'}>{char}</span>
      }
      return <span key={i} className="char pending">{char}</span>
    })
  }

  const total = totalQuestions || questions.length
  const progressPct = total > 0 ? (qIdx / total) * 100 : 0

  if (phase === 'loading') return (
    <div className="quiz-container quiz-center">
      <div className="quiz-spinner" />
      <p className="quiz-loading-label">generating questions...</p>
    </div>
  )

  if (phase === 'error') return (
    <div className="quiz-container quiz-center">
      <p className="quiz-error-msg">Failed to generate quiz: {loadError}</p>
      <button className="quiz-btn-back" onClick={() => { playBack(); onBack() }}>← Back</button>
    </div>
  )

  if (phase === 'failed-intro') return (
    <div className="quiz-container quiz-center">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="quiz-failed-intro-label">[ FAILED QUESTIONS ]</p>
        <p className="quiz-failed-intro-sub">retrying the ones you missed...</p>
      </motion.div>
    </div>
  )

  if (phase === 'done') return (
    <div className="quiz-container quiz-center">
      <motion.div
        className="quiz-done"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.4, 1] }}
      >
        <div className="done-pct" style={{ color: score.wrong === 0 ? '#34d399' : score.correct / totalQuestions >= 0.7 ? '#7c6aff' : '#fb7185' }}>
          {totalQuestions > 0 ? Math.round((score.correct / totalQuestions) * 100) : 0}%
        </div>
        <p className="done-title">Quiz Complete</p>
        <div className="done-breakdown">
          <span className="done-correct">{score.correct} correct</span>
          <span className="done-sep">·</span>
          <span className="done-wrong">{score.wrong} wrong</span>
          <span className="done-sep">·</span>
          <span className="done-total">{totalQuestions} total</span>
        </div>
        <button className="quiz-btn-back" onClick={() => { playBack(); onBack() }}>← Back</button>
      </motion.div>
    </div>
  )

  return (
    <div className="quiz-container" onClick={() => phase === 'penalty' && inputRef.current?.focus()}>
      {/* Progress + meta */}
      <div className="quiz-topbar">
        <div className="quiz-progress-track">
          <motion.div
            className="quiz-progress-fill"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
        <div className="quiz-meta-row">
          <span className="quiz-counter">{qIdx + 1} / {total}</span>
          {isFailedRound && <span className="quiz-retry-badge">RETRY</span>}
          <div className="quiz-score-row">
            <span className="qs-correct">{score.correct}✓</span>
            <span className="qs-wrong">{score.wrong}✗</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === 'question' && q && (
          <motion.div
            key={`q-${qIdx}-${isFailedRound}`}
            className="quiz-card"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.22 }}
          >
            <span className="quiz-type-tag">
              {q.type === 'true_false' ? '[ TRUE / FALSE ]' : '[ MULTIPLE CHOICE ]'}
            </span>
            <p className="quiz-question">{q.question}</p>

            <div className={`quiz-options ${q.type === 'true_false' ? 'quiz-options--tf' : 'quiz-options--mc'}`}>
              {q.type === 'true_false' ? (
                <>
                  <OptionBtn label="True"  idx={0} q={q} selected={selected} feedback={feedback} onAnswer={handleAnswer} />
                  <OptionBtn label="False" idx={1} q={q} selected={selected} feedback={feedback} onAnswer={handleAnswer} />
                </>
              ) : q.options.map((opt, i) => (
                <OptionBtn key={i} label={opt} idx={i} q={q} selected={selected} feedback={feedback} onAnswer={handleAnswer} letter={String.fromCharCode(65 + i)} />
              ))}
            </div>
          </motion.div>
        )}

        {phase === 'penalty' && (
          <motion.div
            key="penalty"
            className="quiz-penalty"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="penalty-header">
              <span className="penalty-tag">[ RETYPE TO CONTINUE ]</span>
              <p className="penalty-sub">Type out the source note to advance to the next question</p>
            </div>
            <div key={penWrongBump} className="penalty-text note-display pen-shake">
              {renderPenaltyText()}
            </div>
            <input
              ref={inputRef}
              className="hidden-input"
              onKeyDown={handlePenaltyKey}
              readOnly
            />
          </motion.div>
        )}
      </AnimatePresence>

      <button className="quiz-btn-back" onClick={() => { playBack(); onBack() }}>
        ← Back
      </button>
    </div>
  )
}

function OptionBtn({ label, idx, q, selected, feedback, onAnswer, letter }) {
  const correctIdx = q.type === 'true_false' ? (q.correct ? 0 : 1) : q.correct
  const isSelected = selected === idx
  const isCorrect = idx === correctIdx

  let cls = 'quiz-option'
  if (feedback) {
    if (isSelected && feedback === 'correct') cls += ' quiz-option--correct'
    else if (isSelected && feedback === 'wrong')  cls += ' quiz-option--wrong'
    else if (!isSelected && isCorrect)            cls += ' quiz-option--reveal'
  }

  return (
    <motion.button
      className={cls}
      onClick={() => { playClick(); onAnswer(idx) }}
      disabled={!!feedback}
      whileHover={!feedback ? { scale: 1.02 } : {}}
      whileTap={!feedback ? { scale: 0.97 } : {}}
    >
      {letter && <span className="option-letter">{letter}</span>}
      {label}
    </motion.button>
  )
}
