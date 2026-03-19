import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import FallingText from './FallingText'
import './Typer.css'


export default function Typer({ notes, onFinished, onBack, settings, flashcardRanges }) {
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0)
  const fullText = useMemo(() => notes[currentNoteIndex] || '', [notes, currentNoteIndex])
  const [completedChars, setCompletedChars] = useState(0)

  const [typed, setTyped] = useState('')
  const [startTime, setStartTime] = useState(null)
  const [errors, setErrors] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [isFalling, setIsFalling] = useState(false)
  const [pendingWrong, setPendingWrong] = useState(false)
  const [failedIndices, setFailedIndices] = useState(() => new Set())

  const inputRef = useRef()
  const cursorRef = useRef(null)
  const displayRef = useRef(null)
  const noteStartTimeRef = useRef(null)
  const noteErrorsRef = useRef(0)
  const noteResultsRef = useRef([])
  const typedRef = useRef('')

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
    if (isFalling) return;
    const focusInput = () => inputRef.current?.focus();
    focusInput();
    const id = setTimeout(focusInput, 500); // Trigger again after Framer Motion page transition completes
    return () => clearTimeout(id);
  }, [isFalling, currentNoteIndex]);

  // WPM ticker
  useEffect(() => {
    if (!startTime) return
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 60000
      setWpm(elapsed > 0 ? Math.round(((completedChars + typed.length) / 5) / elapsed) : 0)
    }, 200)
    return () => clearInterval(interval)
  }, [startTime, typed, completedChars])

  const handleInput = useCallback((e) => {
    if (isFalling) return
    // Strict mode is handled entirely in handleKeyDown — ignore onChange
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
    if (value.length >= fullText.length) {
      setIsFalling(true);
      const noteElapsed = noteStartTimeRef.current ? (Date.now() - noteStartTimeRef.current) / 60000 : 0.001
      const noteWpm = Math.round((fullText.length / 5) / noteElapsed)
      const noteAcc = Math.max(0, Math.round(((fullText.length - noteErrorsRef.current) / fullText.length) * 100))
      const thisNoteResult = { wpm: noteWpm, accuracy: noteAcc, errors: noteErrorsRef.current, chars: fullText.length }
      noteResultsRef.current = [...noteResultsRef.current, thisNoteResult]
      setTimeout(() => {
        if (currentNoteIndex < notes.length - 1) {
          setIsFalling(false);
          setCompletedChars(p => p + fullText.length)
          setCurrentNoteIndex(p => p + 1)

          typedRef.current = ''
          if (inputRef.current) inputRef.current.value = ''
          setTyped('')
          setPendingWrong(false)
          setFailedIndices(new Set())
          noteErrorsRef.current = 0
          noteStartTimeRef.current = null
        } else {
          // Leave isFalling true on the last note so it animates fully away while the new screen loads in!
          const finalTotalChars = completedChars + fullText.length
          const elapsed = (Date.now() - startTime) / 60000
          const finalWpm = Math.round((finalTotalChars / 5) / elapsed)
          const accuracy = Math.max(0, Math.round(((finalTotalChars - errors) / finalTotalChars) * 100))
          onFinished({ wpm: finalWpm, accuracy, errors, totalChars: finalTotalChars, notes: notes.length, noteResults: noteResultsRef.current })
        }
      }, 1500);
    }
  }, [fullText, startTime, typed, errors, notes.length, currentNoteIndex, completedChars, onFinished, settings, isFalling])

  const advanceStrict = useCallback((key) => {
    if (isFalling) return
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
      setIsFalling(true)
      const noteElapsed = noteStartTimeRef.current ? (Date.now() - noteStartTimeRef.current) / 60000 : 0.001
      const noteWpm = Math.round((fullText.length / 5) / noteElapsed)
      const noteAcc = Math.max(0, Math.round(((fullText.length - noteErrorsRef.current) / fullText.length) * 100))
      const thisNoteResult = { wpm: noteWpm, accuracy: noteAcc, errors: noteErrorsRef.current, chars: fullText.length }
      noteResultsRef.current = [...noteResultsRef.current, thisNoteResult]
      setTimeout(() => {
        if (currentNoteIndex < notes.length - 1) {
          setIsFalling(false)
          setCompletedChars(p => p + fullText.length)
          setCurrentNoteIndex(p => p + 1)
          typedRef.current = ''
          if (inputRef.current) inputRef.current.value = ''
          setTyped('')
          setPendingWrong(false)
          setFailedIndices(new Set())
          noteErrorsRef.current = 0
          noteStartTimeRef.current = null
        } else {
          const finalTotalChars = completedChars + fullText.length
          const elapsed = (Date.now() - startTime) / 60000
          const finalWpm = Math.round((finalTotalChars / 5) / elapsed)
          const accuracy = Math.max(0, Math.round(((finalTotalChars - errors) / finalTotalChars) * 100))
          onFinished({ wpm: finalWpm, accuracy, errors, totalChars: finalTotalChars, notes: notes.length, noteResults: noteResultsRef.current })
        }
      }, 1500)
    }
  }, [isFalling, fullText, startTime, currentNoteIndex, notes.length, completedChars, errors, onFinished])

  const handleKeyDown = useCallback((e) => {
    const strict = settings && !settings.allowBackspace

    if (strict) {
      // Block everything from reaching the input — we handle all input manually
      if (e.key === 'Backspace') { e.preventDefault(); return }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        advanceStrict(e.key)
      }
      return
    }

    // Normal mode — Ctrl+Backspace deletes last word
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

  const currentBlackout = flashcardRanges ? flashcardRanges[currentNoteIndex] : null

  const isBlackedOut = (i) => {
    if (!currentBlackout) return false
    return currentBlackout.some(([s, e]) => i >= s && i < e)
  }

  const renderText = () => {
    return words.map(({ word, start, wordEnd, index }) => {
      const chars = []
      for (let ci = 0; ci < word.length; ci++) {
        const i = start + ci
        const char = word[ci]
        if (i === typed.length) {
          chars.push(<span key={i} className={pendingWrong ? 'char cursor wrong' : 'char cursor'} ref={cursorRef}>{char}</span>)
        } else if (i < typed.length) {
          const wasFailed = failedIndices.has(i) || typed[i] !== fullText[i];
          chars.push(<span key={i} className={wasFailed ? 'char incorrect' : 'char correct'}>{char}</span>)
        } else if (isBlackedOut(i)) {
          chars.push(<span key={i} className="char blackout">█</span>)
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

  const overallTotalChars = useMemo(() => notes.join('').length, [notes])
  const progress = overallTotalChars > 0 ? ((completedChars + typed.length) / overallTotalChars) * 100 : 0

  return (
    <div className="typer-container" onClick={() => inputRef.current?.focus()}>
      {/* Progress bar */}
      <div className="progress-track">
        <motion.div className="progress-fill" animate={{ width: `${progress}%` }} transition={{ duration: 0.3, ease: 'easeOut' }} />
      </div>

      {/* Stats row — horizontal, at top */}
      <motion.div className={`stats-row ${flashcardRanges ? 'stats-row--recall' : ''}`} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
        {flashcardRanges && <span className="recall-badge">RECALL</span>}
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

      {/* Text zone — flex:1 fills remaining space */}
      <div className="text-zone">
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
            <div
              ref={displayRef}
              className="note-display"
            >
              {renderText()}
            </div>
          )}
        </div>
      </div>

      {/* Footer anchored at bottom of typer-container */}
      <div className="typer-footer">
        <p className="hint-text">Click anywhere · type to match exactly</p>
        <button className="btn-back" onClick={(e) => { e.stopPropagation(); onBack() }}>
          ← New file
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
