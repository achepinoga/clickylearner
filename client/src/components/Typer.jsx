import { useState, useEffect, useRef, useCallback } from 'react'
import './Typer.css'

export default function Typer({ notes, onFinished, onBack }) {
  const [noteIndex, setNoteIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [startTime, setStartTime] = useState(null)
  const [noteStartTime, setNoteStartTime] = useState(null)
  const [errors, setErrors] = useState(0)
  const [totalChars, setTotalChars] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [finished, setFinished] = useState(false)
  const inputRef = useRef()

  const currentNote = notes[noteIndex] || ''

  // Focus input on mount and note change
  useEffect(() => {
    inputRef.current?.focus()
    setNoteStartTime(Date.now())
  }, [noteIndex])

  // WPM ticker
  useEffect(() => {
    if (!startTime || finished) return
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 60000
      const words = (totalChars + typed.length) / 5
      setWpm(elapsed > 0 ? Math.round(words / elapsed) : 0)
    }, 500)
    return () => clearInterval(interval)
  }, [startTime, typed, totalChars, finished])

  const handleInput = useCallback((e) => {
    const value = e.target.value

    if (!startTime) setStartTime(Date.now())

    // Count errors on new character typed
    if (value.length > typed.length) {
      const idx = typed.length
      if (value[idx] !== currentNote[idx]) {
        setErrors(prev => prev + 1)
      }
    }

    setTyped(value)

    // Check completion
    if (value === currentNote) {
      const charsTyped = currentNote.length
      setTotalChars(prev => prev + charsTyped)
      setTyped('')

      if (noteIndex + 1 >= notes.length) {
        setFinished(true)
        const elapsed = (Date.now() - startTime) / 60000
        const allChars = totalChars + charsTyped
        const finalWpm = Math.round((allChars / 5) / elapsed)
        const accuracy = Math.round(((allChars - errors) / allChars) * 100)
        onFinished({ wpm: finalWpm, accuracy, errors, totalChars: allChars, notes: notes.length })
      } else {
        setNoteIndex(prev => prev + 1)
      }
    }
  }, [typed, currentNote, noteIndex, notes, startTime, totalChars, errors, onFinished])

  // Render character-by-character highlighting
  const renderNote = () => {
    return currentNote.split('').map((char, i) => {
      let cls = 'char pending'
      if (i < typed.length) {
        cls = typed[i] === char ? 'char correct' : 'char incorrect'
      } else if (i === typed.length) {
        cls = 'char cursor'
      }
      return <span key={i} className={cls}>{char}</span>
    })
  }

  const progress = ((noteIndex) / notes.length) * 100

  return (
    <div className="typer-container">
      {/* Progress */}
      <div className="progress-bar-wrap">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>

      {/* Stats row */}
      <div className="stats-row">
        <div className="stat">
          <span className="stat-val">{wpm}</span>
          <span className="stat-label">WPM</span>
        </div>
        <div className="stat">
          <span className="stat-val">{noteIndex + 1}/{notes.length}</span>
          <span className="stat-label">Note</span>
        </div>
        <div className="stat">
          <span className="stat-val">{errors}</span>
          <span className="stat-label">Errors</span>
        </div>
      </div>

      {/* Typing area */}
      <div className="type-card" onClick={() => inputRef.current?.focus()}>
        <div className="note-display">{renderNote()}</div>
        <input
          ref={inputRef}
          className="hidden-input"
          value={typed}
          onChange={handleInput}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={currentNote.length + 1}
        />
      </div>

      <p className="hint-text">Click the box and start typing — match the text above exactly</p>

      <button className="btn-back" onClick={onBack}>← Upload New File</button>
    </div>
  )
}
