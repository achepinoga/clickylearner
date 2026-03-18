import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import FallingText from './FallingText'
import './Typer.css'

const LINE_HEIGHT = 40   // px — must match CSS

export default function Typer({ notes, onFinished, onBack, settings }) {
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0)
  const fullText = useMemo(() => notes[currentNoteIndex] || '', [notes, currentNoteIndex])
  const [completedChars, setCompletedChars] = useState(0)

  const [typed, setTyped] = useState('')
  const [startTime, setStartTime] = useState(null)
  const [errors, setErrors] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [isFalling, setIsFalling] = useState(false)
  const [translateY, setTranslateY] = useState(0)
  const [visibleRows, setVisibleRows] = useState(3)
  const [failedIndices, setFailedIndices] = useState(() => new Set())

  const inputRef = useRef()
  const cursorRef = useRef(null)
  const displayRef = useRef(null)
  const textZoneRef = useRef(null)  // flex:1 area below stats — measured for row count

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

  // Row count computation
  useEffect(() => {
    if (!textZoneRef.current) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const h = entry.contentRect.height
        const rows = Math.min(4, Math.max(3, Math.floor((h - 140) / LINE_HEIGHT)))
        setVisibleRows(rows)
      }
    })
    observer.observe(textZoneRef.current)
    return () => observer.disconnect()
  }, [])

  // WPM ticker
  useEffect(() => {
    if (!startTime) return
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 60000
      setWpm(elapsed > 0 ? Math.round(((completedChars + typed.length) / 5) / elapsed) : 0)
    }, 500)
    return () => clearInterval(interval)
  }, [startTime, typed, completedChars])

  // Keep cursor on the middle visible row
  useEffect(() => {
    const cursor = cursorRef.current
    const display = displayRef.current
    if (!cursor || !display) return
    const cursorRow = Math.floor(cursor.offsetTop / LINE_HEIGHT)
    const middleRow = Math.floor(visibleRows / 2)
    setTranslateY(Math.max(0, (cursorRow - middleRow)) * LINE_HEIGHT)
  }, [typed.length, visibleRows])

  const handleInput = useCallback((e) => {
    if (isFalling) return;

    const value = e.target.value

    // Strict mode when backspace is disabled
    if (settings && !settings.allowBackspace) {
      if (value.length < typed.length) return
      
      const isAddition = value.length > typed.length;
      if (isAddition) {
        const addedChar = value[value.length - 1];
        const expectedChar = fullText[typed.length];
        
        if (addedChar !== expectedChar) {
          setErrors(p => p + 1);
          setFailedIndices(p => {
            const next = new Set(p);
            next.add(typed.length);
            return next;
          });
          return;
        }
      }
    }

    if (!startTime && value.length > 0) setStartTime(Date.now())
    if (value.length > typed.length) {
      if (value[typed.length] !== fullText[typed.length]) {
        setErrors(p => p + 1)
      }
    }
    setTyped(value)
    if (value.length >= fullText.length) {
      setIsFalling(true);
      setTimeout(() => {
        if (currentNoteIndex < notes.length - 1) {
          setIsFalling(false);
          setCompletedChars(p => p + fullText.length)
          setCurrentNoteIndex(p => p + 1)
          setTranslateY(0)
          setTyped('')
        } else {
          // Leave isFalling true on the last note so it animates fully away while the new screen loads in!
          const finalTotalChars = completedChars + fullText.length
          const elapsed = (Date.now() - startTime) / 60000
          const finalWpm = Math.round((finalTotalChars / 5) / elapsed)
          const accuracy = Math.max(0, Math.round(((finalTotalChars - errors) / finalTotalChars) * 100))
          onFinished({ wpm: finalWpm, accuracy, errors, totalChars: finalTotalChars, notes: notes.length })
        }
      }, 1500);
    }
  }, [typed, fullText, startTime, errors, notes.length, currentNoteIndex, completedChars, onFinished, settings, isFalling])

  const handleKeyDown = useCallback((e) => {
    // Intercept Ctrl+Backspace to delete only the last word
    if (e.key === 'Backspace' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      
      setTyped(prev => {
        if (settings && !settings.allowBackspace) return prev; // Block in hard mode
        if (prev.length === 0) return prev;

        // Find the last space before the current position
        let deleteToIndex = prev.lastIndexOf(' ', prev.length - 1);
        
        // If the cursor is exactly on a space, find the space before the word we just finished
        if (prev.length > 0 && prev[prev.length - 1] === ' ') {
          deleteToIndex = prev.lastIndexOf(' ', prev.length - 2);
        }

        // If no space found, delete everything (it's the first word)
        deleteToIndex = Math.max(0, deleteToIndex);
        
        // If we are deleting a space at the end of the new string, keep it because we want to jump to the start of the word
        if (deleteToIndex > 0 && prev[deleteToIndex] === ' ') {
          deleteToIndex++;
        }

        return prev.slice(0, deleteToIndex);
      });
    }
  }, [settings]);

  const renderText = () => {
    return words.map(({ word, start, wordEnd, index }) => {
      const chars = []
      for (let ci = 0; ci < word.length; ci++) {
        const i = start + ci
        const char = word[ci]
        if (i === typed.length) {
          chars.push(<span key={i} className="char cursor" ref={cursorRef}>{char}</span>)
        } else if (i < typed.length) {
          const isFailed = settings && !settings.allowBackspace && failedIndices.has(i);
          chars.push(<span key={i} className={isFailed ? 'char incorrect' : (typed[i] === char ? 'char correct' : 'char incorrect')}>{char}</span>)
        } else {
          chars.push(<span key={i} className="char pending">{char}</span>)
        }
      }
      if (index < words.length - 1) {
        const si = wordEnd
        if (si === typed.length) {
          chars.push(<span key="sp" className="char cursor" ref={cursorRef}>{' '}</span>)
        } else if (si < typed.length) {
          const isFailed = settings && !settings.allowBackspace && failedIndices.has(si);
          chars.push(<span key="sp" className={isFailed ? 'char incorrect' : (typed[si] === ' ' ? 'char correct' : 'char incorrect')}>{' '}</span>)
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
      <motion.div className="stats-row" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
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
      <div className="text-zone" ref={textZoneRef}>
        <div className="rows-viewport" style={{ height: visibleRows * LINE_HEIGHT, position: 'relative' }}>
          {isFalling ? (
            <FallingText 
              text={fullText} 
              trigger="auto" 
              fontSize="1rem"
              backgroundColor="transparent"
              highlightClass="char correct"
              highlightWords={fullText.split(' ')}
              gravity={0.3}
              initialTranslateY={translateY}
              targetClassName="note-display"
            />
          ) : (
            <div
              ref={displayRef}
              className="note-display"
              style={{ transform: `translateY(-${translateY}px)`, transition: 'transform 0.22s ease' }}
            >
              {renderText()}
            </div>
          )}
        </div>

        {/* Footer sits directly below the typing box */}
        <div className="typer-footer">
          <p className="hint-text">Click anywhere · type to match exactly</p>
          <button className="btn-back" onClick={(e) => { e.stopPropagation(); onBack() }}>
            ← New file
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        className="hidden-input"
        value={typed}
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
