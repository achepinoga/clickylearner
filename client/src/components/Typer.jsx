import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FallingText from './FallingText'
import { playBack, playChime, playClick, playToggle } from '../sounds'
import './Typer.css'

function computeBlackoutRanges(text, difficulty = 2) {
  const MONTHS = new Set([
    'january','february','march','april','may','june',
    'july','august','september','october','november','december'
  ])
  const DAYS = new Set([
    'monday','tuesday','wednesday','thursday','friday','saturday','sunday'
  ])
  const NUMBER_WORDS = new Set([
    'zero','one','two','three','four','five','six','seven','eight','nine','ten',
    'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen',
    'eighteen','nineteen','twenty','thirty','forty','fifty','sixty','seventy',
    'eighty','ninety','hundred','thousand','million','billion','trillion'
  ])
  const STOP_WORDS = new Set([
    'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
    'from','is','was','are','were','be','been','being','have','has','had','do',
    'does','did','will','would','shall','should','may','might','must','can',
    'could','this','that','these','those','it','its','they','their','there',
    'then','than','when','where','who','what','which','how','if','as','so',
    'not','no','nor','yet','both','either','neither','each','every','all','any',
    'few','more','most','other','some','such','only','own','same','just','about',
    'above','after','also','back','even','here','into','much','need','our','out',
    'over','said','time','up','very','well','your','his','her','him','she','he',
    'we','you','me','my','our','us','am','i'
  ])

  const scored = []
  const tokenRegex = /\b([A-Za-z0-9][A-Za-z0-9'-]*)\b/g
  let match

  while ((match = tokenRegex.exec(text)) !== null) {
    const word = match[0]
    const start = match.index
    const end = start + word.length
    const lower = word.toLowerCase()

    // Skip trivially short words and pure stop words
    if (word.length <= 2 && !/\d/.test(word)) continue
    if (STOP_WORDS.has(lower) && !/\d/.test(word)) continue

    // Detect sentence boundary (after . ! ? : \n or at text start)
    const before = text.slice(0, start).trimEnd()
    const atBoundary = before.length === 0 || /[.!?:\n]$/.test(before)

    let priority = 0

    // Pure numbers — years and stats are the most testable facts
    if (/^\d+$/.test(word)) {
      const n = parseInt(word, 10)
      priority = (n >= 1000 && n <= 2999) ? 100 : 90
    }
    // Mixed alphanumeric (e.g. 1st, 3rd, 20th, WWI, H2O)
    else if (/\d/.test(word) && word.length >= 2) {
      priority = 88
    }
    // Acronyms — all uppercase, 2+ letters
    else if (/^[A-Z]{2,}$/.test(word)) {
      priority = 95
    }
    // Proper nouns — capitalised but not at a sentence boundary
    else if (/^[A-Z]/.test(word) && !atBoundary) {
      priority = 85
    }
    // Month names
    else if (MONTHS.has(lower)) {
      priority = 82
    }
    // Day names
    else if (DAYS.has(lower)) {
      priority = 75
    }
    // Number words (hundred, million, etc.)
    else if (NUMBER_WORDS.has(lower)) {
      priority = 70
    }
    // Long content words (8+ chars)
    else if (word.length >= 8) {
      priority = 45 + word.length
    }
    // Medium content words (5–7 chars)
    else if (word.length >= 5) {
      priority = 25 + word.length
    }
    // Short content words (3–4 chars)
    else if (word.length >= 3) {
      priority = 10
    }

    if (priority > 0) scored.push({ start, end, priority })
  }

  // Sort highest priority first
  scored.sort((a, b) => b.priority - a.priority)

  // Difficulty controls the minimum priority threshold AND max fraction blacked out
  const thresholds = { 1: 70, 2: 40, 3: 22, 4: 10 }
  const fractions  = { 1: 0.30, 2: 0.55, 3: 0.78, 4: 0.95 }
  const minPriority = thresholds[difficulty] ?? 40
  const maxFraction = fractions[difficulty] ?? 0.55

  let eligible = scored.filter(w => w.priority >= minPriority)
  const cap = Math.max(1, Math.ceil(scored.length * maxFraction))
  // Fallback: if no words meet the threshold, take top-scored words so something always gets blacked out
  if (eligible.length === 0 && scored.length > 0) eligible = scored
  const chosen = eligible.slice(0, cap)

  // Return sorted by position for fast range lookup
  return chosen
    .sort((a, b) => a.start - b.start)
    .map(w => [w.start, w.end])
}

export default function Typer({ notes, onFinished, onBack, settings, flashcardDifficulty = 2, onDifficultyChange, isFlashcard }) {
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0)
  const fullText = useMemo(() => notes[currentNoteIndex] || '', [notes, currentNoteIndex])
  const [completedChars, setCompletedChars] = useState(0)

  const [typed, setTyped] = useState('')
  const [startTime, setStartTime] = useState(null)
  const [errors, setErrors] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [isFalling, setIsFalling] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [pendingWrong, setPendingWrong] = useState(false)
  const [failedIndices, setFailedIndices] = useState(() => new Set())
  const [encryptTick, setEncryptTick] = useState(0)
  const [cardPhase, setCardPhase] = useState('study') // 'study' | 'recall'
  const [flipped, setFlipped] = useState(false)
  const [cardSuccess, setCardSuccess] = useState(false)
  const [awaitingFlip, setAwaitingFlip] = useState(false) // waiting for manual flip/advance

  const inputRef = useRef()
  const cursorRef = useRef(null)
  const displayRef = useRef(null)
  const noteStartTimeRef = useRef(null)
  const noteErrorsRef = useRef(0)
  const noteResultsRef = useRef([])
  const typedRef = useRef('')
  const totalPausedRef = useRef(0)
  const pauseStartRef = useRef(null)

  const words = useMemo(() => {
    const parts = fullText.split(' ')
    let pos = 0
    return parts.map((w, i) => {
      const start = pos
      const wordEnd = pos + w.length
      const end = i < parts.length - 1 ? wordEnd + 1 : wordEnd
      pos = end
      return { word: w, start, wordEnd, end, index: i }
    })
  }, [fullText])

  useEffect(() => {
    if (isFalling || isTransitioning) return;
    const focusInput = () => inputRef.current?.focus();
    focusInput();
    const id = setTimeout(focusInput, 500);
    return () => clearTimeout(id);
  }, [isFalling, isTransitioning, currentNoteIndex]);

  // Re-focus whenever a click happens anywhere (e.g. closing the settings modal)
  useEffect(() => {
    const refocus = () => inputRef.current?.focus()
    document.addEventListener('click', refocus)
    return () => document.removeEventListener('click', refocus)
  }, []);

  // Accumulate paused time so WPM excludes transition delays
  useEffect(() => {
    const isPaused = isFalling || isTransitioning
    if (isPaused) {
      pauseStartRef.current = Date.now()
    } else {
      if (pauseStartRef.current !== null) {
        totalPausedRef.current += Date.now() - pauseStartRef.current
        pauseStartRef.current = null
      }
    }
  }, [isFalling, isTransitioning])

  // WPM ticker — pauses during falling/transitioning
  useEffect(() => {
    if (!startTime || isFalling || isTransitioning) return
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime - totalPausedRef.current) / 60000
      setWpm(elapsed > 0 ? Math.round(((completedChars + typed.length) / 5) / elapsed) : 0)
    }, 200)
    return () => clearInterval(interval)
  }, [startTime, typed, completedChars, isFalling, isTransitioning])

  const currentBlackout = useMemo(() => {
    if (!isFlashcard || cardPhase !== 'recall') return null
    return computeBlackoutRanges(fullText, flashcardDifficulty)
  }, [isFlashcard, cardPhase, fullText, flashcardDifficulty])

  // Scramble ticker for encrypted chars — pause during transitions
  useEffect(() => {
    if (!currentBlackout || isFalling || isTransitioning) return
    const id = setInterval(() => setEncryptTick(t => t + 1), 80)
    return () => clearInterval(id)
  }, [currentBlackout, isFalling, isTransitioning])

  const ENCRYPT_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&?!'
  const randChar = () => ENCRYPT_CHARS[(encryptTick + Math.floor(Math.random() * ENCRYPT_CHARS.length)) % ENCRYPT_CHARS.length]

  const isBlackedOut = (i) => {
    if (!currentBlackout) return false
    return currentBlackout.some(([s, e]) => i >= s && i < e)
  }

  const resetNote = useCallback(() => {
    typedRef.current = ''
    if (inputRef.current) inputRef.current.value = ''
    setTyped('')
    setPendingWrong(false)
    setFailedIndices(new Set())
    noteErrorsRef.current = 0
    noteStartTimeRef.current = null
  }, [])

  const advanceNote = useCallback((currentFullText, currentCompletedChars, currentErrors, currentStartTime) => {
    const noteElapsed = noteStartTimeRef.current ? (Date.now() - noteStartTimeRef.current) / 60000 : 0.001
    const noteWpm = Math.round((currentFullText.length / 5) / noteElapsed)
    const noteAcc = Math.max(0, Math.round(((currentFullText.length - noteErrorsRef.current) / currentFullText.length) * 100))
    const thisNoteResult = { wpm: noteWpm, accuracy: noteAcc, errors: noteErrorsRef.current, chars: currentFullText.length, ...(isFlashcard && { phase: cardPhase }) }
    noteResultsRef.current = [...noteResultsRef.current, thisNoteResult]

    if (isFlashcard) {
      const autoAdv = settings?.autoAdvance ?? true
      if (cardPhase === 'study') {
        setCardSuccess(true)
        if (settings?.completionSound ?? true) playChime()
        setCompletedChars(p => p + currentFullText.length)
        if (autoAdv) {
          setTimeout(() => {
            setCardSuccess(false)
            setIsTransitioning(true)
            setFlipped(true)
            setTimeout(() => { resetNote(); setCardPhase('recall') }, 300)
            setTimeout(() => setIsTransitioning(false), 650)
          }, 350)
        } else {
          setAwaitingFlip(true)
        }
      } else {
        setCardSuccess(true)
        if (settings?.completionSound ?? true) playChime()
        setCompletedChars(p => p + currentFullText.length)
        if (autoAdv) {
          setTimeout(() => {
            setCardSuccess(false)
            setIsTransitioning(true)
            if (currentNoteIndex < notes.length - 1) {
              setTimeout(() => {
                setCurrentNoteIndex(p => p + 1)
                setCardPhase('study')
                setFlipped(false)
                resetNote()
                setIsTransitioning(false)
              }, 550)
            } else {
              const finalTotalChars = currentCompletedChars + currentFullText.length
              const elapsed = currentStartTime ? (Date.now() - currentStartTime - totalPausedRef.current) / 60000 : 0.001
              const finalWpm = Math.round((finalTotalChars / 5) / elapsed)
              const accuracy = Math.max(0, Math.round(((finalTotalChars - currentErrors) / finalTotalChars) * 100))
              setTimeout(() => onFinished({ wpm: finalWpm, accuracy, errors: currentErrors, totalChars: finalTotalChars, notes: notes.length, noteResults: noteResultsRef.current }), 550)
            }
          }, 350)
        } else {
          setAwaitingFlip(true)
        }
      }
    } else {
      setCardSuccess(true)
      if (settings?.completionSound ?? true) playChime()
      setTimeout(() => {
        setCardSuccess(false)
        setIsFalling(true)
        setTimeout(() => {
          if (currentNoteIndex < notes.length - 1) {
            setIsFalling(false)
            setCompletedChars(p => p + currentFullText.length)
            setCurrentNoteIndex(p => p + 1)
            resetNote()
          } else {
            const finalTotalChars = currentCompletedChars + currentFullText.length
            const elapsed = currentStartTime ? (Date.now() - currentStartTime - totalPausedRef.current) / 60000 : 0.001
            const finalWpm = Math.round((finalTotalChars / 5) / elapsed)
            const accuracy = Math.max(0, Math.round(((finalTotalChars - currentErrors) / finalTotalChars) * 100))
            onFinished({ wpm: finalWpm, accuracy, errors: currentErrors, totalChars: finalTotalChars, notes: notes.length, noteResults: noteResultsRef.current })
          }
        }, 1500)
      }, 350)
    }
  }, [isFlashcard, cardPhase, currentNoteIndex, notes.length, onFinished, resetNote, settings])

  const handleInput = useCallback((e) => {
    if (isFalling || isTransitioning) return
    if (settings && !settings.allowBackspace) return
    const value = e.target.value

    if (!startTime && value.length > 0) setStartTime(Date.now())
    if (!noteStartTimeRef.current && value.length > 0) noteStartTimeRef.current = Date.now()

    if (value.length > typed.length) {
      if (value[typed.length] !== fullText[typed.length]) {
        setErrors(p => p + 1)
        noteErrorsRef.current++
      }
    }
    setTyped(value)
    if (value === fullText) {
      advanceNote(fullText, completedChars, errors, startTime)
    }
  }, [fullText, startTime, typed, errors, completedChars, advanceNote, settings, isFalling, isTransitioning])

  const advanceStrict = useCallback((key) => {
    if (isFalling || isTransitioning) return
    const pos = typedRef.current.length
    if (pos >= fullText.length) return

    if (!startTime) setStartTime(Date.now())
    if (!noteStartTimeRef.current) noteStartTimeRef.current = Date.now()

    if (key !== fullText[pos]) {
      setErrors(p => p + 1)
      noteErrorsRef.current++
      setPendingWrong(true)
      setFailedIndices(p => { const n = new Set(p); n.add(pos); return n })
      return
    }

    const next = typedRef.current + key
    typedRef.current = next
    setPendingWrong(false)
    setTyped(next)

    if (next.length >= fullText.length) {
      advanceNote(fullText, completedChars, errors, startTime)
    }
  }, [isFalling, isTransitioning, fullText, startTime, completedChars, errors, advanceNote])

  const doManualAdvance = useCallback(() => {
    setAwaitingFlip(false)
    setCardSuccess(false)
    inputRef.current?.focus()
    if (cardPhase === 'study') {
      setIsTransitioning(true)
      setFlipped(true)
      setTimeout(() => { resetNote(); setCardPhase('recall') }, 300)
      setTimeout(() => setIsTransitioning(false), 650)
    } else {
      setIsTransitioning(true)
      if (currentNoteIndex < notes.length - 1) {
        setTimeout(() => {
          setCurrentNoteIndex(p => p + 1)
          setCardPhase('study')
          setFlipped(false)
          resetNote()
          setIsTransitioning(false)
        }, 550)
      } else {
        const finalTotalChars = completedChars
        const elapsed = startTime ? (Date.now() - startTime - totalPausedRef.current) / 60000 : 0.001
        const finalWpm = Math.round((finalTotalChars / 5) / elapsed)
        const accuracy = Math.max(0, Math.round(((finalTotalChars - errors) / finalTotalChars) * 100))
        onFinished({ wpm: finalWpm, accuracy, errors, totalChars: finalTotalChars, notes: notes.length, noteResults: noteResultsRef.current })
      }
    }
  }, [cardPhase, currentNoteIndex, notes.length, completedChars, startTime, errors, onFinished, resetNote])

  const handleForgot = useCallback(() => {
    inputRef.current?.focus()
    setCompletedChars(p => Math.max(0, p - fullText.length))
    setFlipped(false)
    setIsTransitioning(true)
    setTimeout(() => {
      typedRef.current = ''
      if (inputRef.current) inputRef.current.value = ''
      setTyped('')
      setPendingWrong(false)
      setFailedIndices(new Set())
      noteErrorsRef.current = 0
      noteStartTimeRef.current = null
      setCardPhase('study')
    }, 300)
    setTimeout(() => {
      setIsTransitioning(false)
      inputRef.current?.focus()
    }, 650)
  }, [fullText.length])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && awaitingFlip) {
      e.preventDefault()
      playClick()
      doManualAdvance()
      return
    }

    const strict = settings && !settings.allowBackspace

    if (strict) {
      if (e.key === 'Backspace') { e.preventDefault(); return }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        advanceStrict(e.key)
      }
      return
    }

    if (e.key === 'Backspace' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      setTyped(prev => {
        if (prev.length === 0) return prev
        let deleteToIndex = prev.lastIndexOf(' ', prev.length - 1)
        if (prev.length > 0 && prev[prev.length - 1] === ' ') {
          deleteToIndex = prev.lastIndexOf(' ', prev.length - 2)
        }
        deleteToIndex = Math.max(0, deleteToIndex)
        if (deleteToIndex > 0 && prev[deleteToIndex] === ' ') deleteToIndex++
        return prev.slice(0, deleteToIndex)
      })
    }
  }, [settings, advanceStrict]);

  const renderText = () => {
    return words.map(({ word, start, wordEnd, index }) => {
      const chars = []
      for (let ci = 0; ci < word.length; ci++) {
        const i = start + ci
        const char = word[ci]
        if (i === typed.length) {
          const displayChar = isBlackedOut(i) ? '_' : char
          chars.push(<span key={i} className={pendingWrong ? 'char cursor wrong' : 'char cursor'} ref={cursorRef}>{displayChar}</span>)
        } else if (i < typed.length) {
          const wasFailed = failedIndices.has(i) || typed[i] !== fullText[i];
          const displayChar = isBlackedOut(i) && wasFailed ? typed[i] : char;
          chars.push(<span key={i} className={wasFailed ? 'char incorrect' : 'char correct'}>{displayChar}</span>)
        } else if (isBlackedOut(i)) {
          chars.push(<span key={i} className="char encrypted">{'_'}</span>)
        } else {
          chars.push(<span key={i} className="char pending">{char}</span>)
        }
      }
      if (index < words.length - 1) {
        const si = wordEnd
        if (si === typed.length) {
          chars.push(<span key="sp" className="char cursor" ref={cursorRef}>{' '}</span>)
        } else if (si < typed.length) {
          const wasFailed = failedIndices.has(si) || typed[si] !== fullText[si];
          chars.push(<span key="sp" className={wasFailed ? 'char incorrect' : 'char correct'}>{' '}</span>)
        } else {
          chars.push(<span key="sp" className="char pending">{' '}</span>)
        }
      }
      return <span key={index} className="word-unit">{chars}</span>
    })
  }

  const overallTotalChars = useMemo(() => notes.join('').length * (isFlashcard ? 2 : 1), [notes, isFlashcard])
  const progress = overallTotalChars > 0 ? ((completedChars + typed.length) / overallTotalChars) * 100 : 0
  const remainingCards = notes.length - currentNoteIndex - 1
  const ghostCount = Math.min(2, remainingCards)

  return (
    <div className="typer-container" onClick={() => inputRef.current?.focus()}>
      {/* Progress bar */}
      <div className="progress-track">
        <motion.div className="progress-fill" animate={{ width: `${progress}%` }} transition={{ duration: 0.3, ease: 'easeOut' }} />
      </div>

      {/* Stats row */}
      <motion.div className={`stats-row ${isFlashcard && cardPhase === 'recall' ? 'stats-row--recall' : ''}`} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        {isFlashcard && cardPhase === 'recall' && <span className="recall-badge">RECALL</span>}
        <div className="stat-item">
          <motion.span className="stat-num" key={wpm} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>{wpm}</motion.span>
          <span className="stat-lbl">wpm</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-num">{Math.round(progress)}<span className="stat-of">%</span></span>
          <span className="stat-lbl">done</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-num">
            {(completedChars + typed.length) > 0 ? Math.max(0, Math.round((((completedChars + typed.length) - errors) / (completedChars + typed.length)) * 100)) : 100}<span className="stat-of">%</span>
          </span>
          <span className="stat-lbl">acc</span>
        </div>
      </motion.div>

      {/* Text zone */}
      <div className="text-zone">
        {isFlashcard ? (
          <>
            <div className="flashcard-scene">
              {ghostCount >= 2 && <div className="flashcard-ghost ghost-2" />}
              {ghostCount >= 1 && <div className="flashcard-ghost ghost-1" />}
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={currentNoteIndex}
                  className="flashcard-card-wrapper"
                  initial={{ scale: 0.94, opacity: 0, y: 24 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ x: 700, rotate: 18, opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                >
                  <motion.div
                    className="flashcard-flip-inner"
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                  >
                    {/* Front face — STUDY */}
                    <div className={`flashcard-face flashcard-face--front${cardSuccess ? ' flashcard-face--success' : ''}`}>
                      <div className="flashcard-corner fc-tl" />
                      <div className="flashcard-corner fc-tr" />
                      <div className="flashcard-corner fc-bl" />
                      <div className="flashcard-corner fc-br" />
                      <div className="flashcard-meta">
                        <span className="flashcard-counter">{currentNoteIndex + 1} / {notes.length}</span>
                        <span className="flashcard-phase phase-study">[ STUDY ]</span>
                      </div>
                      <div className="flashcard-rule" />
                      <div ref={displayRef} className="note-display flashcard-text">
                        {renderText()}
                      </div>
                    </div>

                    {/* Back face — RECALL */}
                    <div className={`flashcard-face flashcard-face--back${cardSuccess ? ' flashcard-face--success' : ''}`}>
                      <div className="flashcard-corner fc-tl" />
                      <div className="flashcard-corner fc-tr" />
                      <div className="flashcard-corner fc-bl" />
                      <div className="flashcard-corner fc-br" />
                      <div className="flashcard-meta">
                        <span className="flashcard-counter">{currentNoteIndex + 1} / {notes.length}</span>
                        <span className="flashcard-phase phase-recall">[ RECALL ]</span>
                      </div>
                      <div className="flashcard-rule flashcard-rule--recall" />
                      <div className="note-display flashcard-text">
                        {renderText()}
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            </div>
            <AnimatePresence>
              {awaitingFlip && (
                <motion.button
                  className="btn-manual-advance"
                  onClick={(e) => { e.stopPropagation(); playClick(); doManualAdvance() }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                >
                  {cardPhase === 'study' ? 'Flip Card →' : currentNoteIndex < notes.length - 1 ? 'Next Card →' : 'Finish →'}
                </motion.button>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {cardPhase === 'recall' && !isTransitioning && !awaitingFlip && (
                <motion.button
                  className="btn-forgot"
                  tabIndex={-1}
                  onClick={(e) => { e.stopPropagation(); playBack(); handleForgot() }}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  ← didn't remember — retype study side
                </motion.button>
              )}
            </AnimatePresence>
            {onDifficultyChange && (
              <div className="fc-difficulty-inline">
                {[{v:1,l:'I'},{v:2,l:'II'},{v:3,l:'III'},{v:4,l:'IV'}].map(({v,l}) => (
                  <button
                    key={v}
                    className={`fc-diff-btn${flashcardDifficulty === v ? ' fc-diff-btn--active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); playToggle(); onDifficultyChange(v) }}
                    tabIndex={-1}
                  >{l}</button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="rows-viewport">
            {isFalling ? (
              <FallingText
                text={fullText}
                trigger="auto"
                fontSize="1.5rem"
                backgroundColor="transparent"
                highlightClass="char correct"
                highlightWords={fullText.split(' ')}
                gravity={0.3}
                initialTranslateY={0}
                targetClassName="note-display"
              />
            ) : (
              <div ref={displayRef} className={`note-display${cardSuccess ? ' note-display--success' : ''}`}>
                {renderText()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="typer-footer">
        <p className="hint-text">Click anywhere · type to match exactly</p>
        <button className="btn-back" onClick={(e) => { e.stopPropagation(); playBack(); onBack() }}>
          ← Back
        </button>
      </div>

      <input
        ref={inputRef}
        className="hidden-input"
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        maxLength={fullText.length + 1}
      />
    </div>
  )
}
