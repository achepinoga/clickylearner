import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { playBack, playChime } from '../sounds'
import './Typer.css'
import './SpeedTyper.css'

const SENTENCES = [
  'the sun sets slowly over the quiet hills',
  'she walked along the river path at dawn',
  'the old clock on the wall stopped ticking',
  'he found a note tucked under the front door',
  'the coffee shop was busy on monday morning',
  'rain tapped softly against the window glass',
  'they drove through the mountains as night fell',
  'the library was empty except for two readers',
  'her dog barked once then fell back asleep',
  'a single candle lit the whole dark room',
  'the train left the station right on time',
  'he opened the book and began to read',
  'the garden was full of color in spring',
  'she typed quickly without looking at the keys',
  'the storm knocked out the power for three hours',
  'he made tea and stared out at the window',
  'the cat sat on the warm stone step',
  'they finished the last chapter just before midnight',
  'the road ahead curved into the distant fog',
  'she kept all her letters in a small box',
  'the waves broke hard against the rocky shore',
  'he closed the laptop and went for a walk',
  'the meeting ran long and ended after dark',
  'she pressed the button and waited for a reply',
  'the old bridge creaked under the weight of traffic',
  'he wrote his name at the top of the page',
  'the stars were bright on the cold winter night',
  'she left a tip on the edge of the table',
  'the bus arrived ten minutes early for once',
  'he packed his bag and locked the door behind him',
  'the smell of fresh bread filled the whole house',
  'she sat down at the piano and played one note',
  'the dog slept under the table through the storm',
  'he drew a map of the town from memory',
  'the window was open and the curtain moved slowly',
  'she reached into her coat pocket for the key',
  'the kids ran down the hall and into the yard',
  'he counted the steps from the door to the fence',
  'the fog rolled in off the water before sunrise',
  'she answered the call and said she was on her way',
  'the fire burned low in the stone fireplace',
  'he read the letter twice before setting it down',
  'the path wound through the trees and into the field',
  'she pulled her scarf tight against the morning wind',
  'the market opened early on the last day of summer',
  'he leaned against the wall and crossed his arms',
  'the snow fell all night and covered everything white',
  'she ordered the same thing she always ordered',
  'the house at the end of the road was dark',
  'he carried the box up three flights of stairs',
  'the morning light came in through the tall windows',
  'she turned off the lamp and lay still in the dark',
  'the last train of the night was nearly empty',
  'he woke up early and made coffee before anyone else',
  'the door swung open before she could knock',
  'she watched the clock for the last ten minutes',
  'the river was low after three weeks without rain',
  'he stood at the edge of the platform and waited',
  'the notebook was full so she started a new one',
  'she drove past the town and kept going north',
  'the wind picked up just before the rain started',
  'he sat in the back row and took careful notes',
  'the sound of music drifted out from the open window',
  'she packed everything she needed into one small bag',
  'the hill was steeper than it had looked from below',
  'he checked his watch and then checked it again',
  'the shop was closed but the lights were still on',
  'she looked at the map and chose the longer route',
  'the ball rolled under the bench and stopped',
  'he pressed his face against the cold glass',
  'the first page of the report was blank',
  'she noticed the crack in the ceiling for the first time',
  'the road was empty for as far as he could see',
  'he finished his coffee and pushed back from the table',
  'the old house had thick walls and small windows',
  'she ran her hand along the wooden rail of the stairs',
  'the field was quiet after the last car drove away',
  'he turned the corner and nearly walked into her',
  'the cat knocked the glass off the counter',
  'she left the engine running while she ran inside',
  'the water in the bay was flat and dark at low tide',
  'he forgot the name of the street as soon as he read it',
  'the calendar on the wall was still on last month',
  'she closed her eyes and counted slowly to ten',
  'the shelf above the desk held nothing but old books',
  'he tied his shoes twice and went out the side door',
  'the afternoon light made everything look golden and still',
  'she stopped at the top of the stairs and listened',
]

function generateScreen(punctuation = true) {
  const pick = () => SENTENCES[Math.floor(Math.random() * SENTENCES.length)]
  const parts = [pick(), pick()]
  if (!punctuation) return parts.join(' ')
  return parts.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('. ') + '.'
}

export default function SpeedTyper({ onFinished, onBack, settings }) {
  const [currentScreen, setCurrentScreen] = useState(() => generateScreen(settings?.punctuation ?? true))
  const [nextScreen, setNextScreen] = useState(() => generateScreen(settings?.punctuation ?? true))
  const [screenIdx, setScreenIdx] = useState(0)
  const [screenCount, setScreenCount] = useState(0)
  const [typed, setTyped] = useState('')
  const [startTime, setStartTime] = useState(null)
  const [errors, setErrors] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const [pendingWrong, setPendingWrong] = useState(false)
  const [failedIndices, setFailedIndices] = useState(() => new Set())
  const [screenSuccess, setScreenSuccess] = useState(false)
  const [timerLabel, setTimerLabel] = useState('TIMER')
  const [timerUnlocked, setTimerUnlocked] = useState(false)
  const [timerInput, setTimerInput] = useState('')
  const [timerDuration, setTimerDuration] = useState(null) // seconds, null = unlimited
  const [timeRemaining, setTimeRemaining] = useState(null)
  const timerInputRef = useRef()

  const inputRef = useRef()
  const screenStartRef = useRef(null)
  const screenErrorsRef = useRef(0)
  const screenResultsRef = useRef([])
  const typedRef = useRef('')
  const totalPausedRef = useRef(0)
  const pauseStartRef = useRef(null)
  const startTimeRef = useRef(null)
  const errorsRef = useRef(0)
  const currentScreenRef = useRef(currentScreen)
  currentScreenRef.current = currentScreen

  // Focus on mount
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [])

  // Re-focus after transitions
  useEffect(() => {
    if (!isTransitioning) {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [isTransitioning])

  // Re-focus whenever a click happens anywhere (e.g. closing the settings modal)
  useEffect(() => {
    const refocus = () => inputRef.current?.focus()
    document.addEventListener('click', refocus)
    return () => document.removeEventListener('click', refocus)
  }, [])

  // Pause time tracking
  useEffect(() => {
    if (isTransitioning || isCompleting) {
      pauseStartRef.current = Date.now()
    } else {
      if (pauseStartRef.current !== null) {
        totalPausedRef.current += Date.now() - pauseStartRef.current
        pauseStartRef.current = null
      }
    }
  }, [isTransitioning, isCompleting])

  // WPM ticker
  useEffect(() => {
    if (!startTime || isTransitioning || isCompleting) return
    const id = setInterval(() => {
      const completedChars = screenResultsRef.current.reduce((s, r) => s + r.chars, 0)
      const totalChars = completedChars + typedRef.current.length
      const el = (Date.now() - startTime - totalPausedRef.current) / 60000
      setWpm(el > 0 ? Math.round((totalChars / 5) / el) : 0)
    }, 200)
    return () => clearInterval(id)
  }, [startTime, isTransitioning, isCompleting])

  // Elapsed timer
  useEffect(() => {
    if (!startTime) return
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime - totalPausedRef.current) / 1000))
    }, 500)
    return () => clearInterval(id)
  }, [startTime])

  // Countdown timer
  useEffect(() => {
    if (!startTime || timerDuration === null) return
    const id = setInterval(() => {
      const el = Math.floor((Date.now() - startTime - totalPausedRef.current) / 1000)
      const remaining = timerDuration - el
      if (remaining <= 0) {
        setTimeRemaining(0)
        clearInterval(id)
        handleStop()
      } else {
        setTimeRemaining(remaining)
      }
    }, 200)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, timerDuration])

  const advanceScreen = useCallback((screenText) => {
    const screenElapsed = screenStartRef.current
      ? (Date.now() - screenStartRef.current) / 60000
      : 0.001
    const totalCharsBeforeReset = screenResultsRef.current.reduce((s, r) => s + r.chars, 0) + screenText.length
    const overallElapsed = startTimeRef.current
      ? (Date.now() - startTimeRef.current - totalPausedRef.current) / 60000
      : 0.001
    setWpm(Math.round((totalCharsBeforeReset / 5) / overallElapsed))
    setIsCompleting(true)
    const result = {
      wpm: Math.round((screenText.length / 5) / screenElapsed),
      accuracy: Math.max(0, Math.round(((screenText.length - screenErrorsRef.current) / screenText.length) * 100)),
      errors: screenErrorsRef.current,
      chars: screenText.length,
    }
    screenResultsRef.current = [...screenResultsRef.current, result]
    setScreenCount(c => c + 1)

    setScreenSuccess(true)
    if (settings?.completionSound ?? true) playChime()

    setTimeout(() => {
      setScreenSuccess(false)
      setIsTransitioning(true)
      // Change screen content — AnimatePresence keeps old element frozen for its exit
      setScreenIdx(i => i + 1)
      setCurrentScreen(nextScreen)
      setNextScreen(generateScreen(settings?.punctuation ?? true))
      typedRef.current = ''
      if (inputRef.current) inputRef.current.value = ''
      setTyped('')
      setPendingWrong(false)
      setFailedIndices(new Set())
      screenErrorsRef.current = 0
      screenStartRef.current = null
      setTimeout(() => {
        setIsTransitioning(false)
        setIsCompleting(false)
      }, 320)
    }, 350)
  }, [nextScreen, settings])

  const handleStop = useCallback(() => {
    if (!startTimeRef.current) { onBack(); return }

    const results = [...screenResultsRef.current]
    if (typedRef.current.length > 0 && screenStartRef.current) {
      const screenElapsed = (Date.now() - screenStartRef.current) / 60000
      const chars = typedRef.current.length
      results.push({
        wpm: Math.round((chars / 5) / screenElapsed),
        accuracy: Math.max(0, Math.round(((chars - screenErrorsRef.current) / chars) * 100)),
        errors: screenErrorsRef.current,
        chars,
        partial: true,
      })
    }

    if (results.length === 0) { onBack(); return }

    const totalChars = results.reduce((s, r) => s + r.chars, 0)
    const totalErrors = results.reduce((s, r) => s + r.errors, 0)
    const el = (Date.now() - startTimeRef.current - totalPausedRef.current) / 60000
    const finalWpm = Math.round((totalChars / 5) / el)
    const accuracy = Math.max(0, Math.round(((totalChars - totalErrors) / totalChars) * 100))

    onFinished({
      wpm: finalWpm,
      accuracy,
      errors: totalErrors,
      totalChars,
      notes: results.filter(r => !r.partial).length,
      noteResults: results,
    })
  }, [onFinished, onBack])

  const advanceStrict = useCallback((key) => {
    if (isTransitioning) return
    const pos = typedRef.current.length
    if (pos >= currentScreenRef.current.length) return

    if (!startTimeRef.current) {
      const now = Date.now()
      startTimeRef.current = now
      setStartTime(now)
    }
    if (!screenStartRef.current) screenStartRef.current = Date.now()

    if (key !== currentScreenRef.current[pos]) {
      errorsRef.current++
      setErrors(p => p + 1)
      screenErrorsRef.current++
      setPendingWrong(true)
      setFailedIndices(prev => new Set(prev).add(pos))
      return
    }

    const next = typedRef.current + key
    typedRef.current = next
    setPendingWrong(false)
    setTyped(next)

    if (next === currentScreenRef.current) {
      advanceScreen(currentScreenRef.current)
    }
  }, [isTransitioning, advanceScreen])

  const handleInput = useCallback((e) => {
    if (isTransitioning) return
    if (settings && !settings.allowBackspace) return
    const value = e.target.value

    if (!startTimeRef.current && value.length > 0) {
      const now = Date.now()
      startTimeRef.current = now
      setStartTime(now)
    }
    if (!screenStartRef.current && value.length > 0) {
      screenStartRef.current = Date.now()
    }

    if (value.length > typedRef.current.length) {
      const pos = value.length - 1
      if (value[pos] !== currentScreenRef.current[pos]) {
        errorsRef.current++
        setErrors(p => p + 1)
        screenErrorsRef.current++
      }
    }

    typedRef.current = value
    setTyped(value)

    if (value === currentScreenRef.current) {
      advanceScreen(currentScreenRef.current)
    }
  }, [isTransitioning, advanceScreen, settings])

  const handleKeyDown = useCallback((e) => {
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
      const prev = typedRef.current
      if (!prev) return
      let end = prev.length - 1
      if (prev[end] === ' ') end--
      const spaceIdx = prev.lastIndexOf(' ', end)
      const newVal = prev.slice(0, spaceIdx + 1)
      typedRef.current = newVal
      setTyped(newVal)
      if (inputRef.current) inputRef.current.value = newVal
    }
  }, [settings, advanceStrict])

  const words = useMemo(() => {
    const parts = currentScreen.split(' ')
    let pos = 0
    return parts.map((w, i) => {
      const start = pos
      const wordEnd = pos + w.length
      const end = i < parts.length - 1 ? wordEnd + 1 : wordEnd
      pos = end
      return { word: w, start, wordEnd, end, index: i }
    })
  }, [currentScreen])

  const renderText = () => {
    return words.map(({ word, start, wordEnd, index }) => {
      const chars = []
      for (let ci = 0; ci < word.length; ci++) {
        const i = start + ci
        const char = word[ci]
        if (i === typed.length) {
          chars.push(<span key={i} className={pendingWrong ? 'char cursor wrong' : 'char cursor'}>{char}</span>)
        } else if (i < typed.length) {
          const wrong = failedIndices.has(i) || typed[i] !== currentScreen[i]
          chars.push(<span key={i} className={wrong ? 'char incorrect' : 'char correct'}>{char}</span>)
        } else {
          chars.push(<span key={i} className="char pending">{char}</span>)
        }
      }
      if (index < words.length - 1) {
        const si = wordEnd
        if (si === typed.length) {
          chars.push(<span key="sp" className="char cursor">{' '}</span>)
        } else if (si < typed.length) {
          const wrong = typed[si] !== currentScreen[si]
          chars.push(<span key="sp" className={wrong ? 'char incorrect' : 'char correct'}>{' '}</span>)
        } else {
          chars.push(<span key="sp" className="char pending">{' '}</span>)
        }
      }
      return <span key={index} className="word-unit">{chars}</span>
    })
  }

  const completedChars = screenResultsRef.current.reduce((s, r) => s + r.chars, 0)
  const totalTyped = completedChars + typed.length
  const accuracy = totalTyped > 0
    ? Math.max(0, Math.round(((totalTyped - errors) / totalTyped) * 100))
    : 100

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`
  }

  const parseHMS = (str) => {
    const parts = str.trim().split(':').map(p => parseInt(p, 10))
    if (parts.some(isNaN)) return null
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    if (parts.length === 2) return parts[0] * 60 + parts[1]
    if (parts.length === 1) return parts[0]
    return null
  }

  const formatTimeHMS = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div className="speed-container" onClick={() => inputRef.current?.focus()}>
      <motion.div
        className="stats-row"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="stat-item">
          <motion.span className="stat-num" key={wpm} initial={{ opacity: 0.5 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>{wpm}</motion.span>
          <span className="stat-lbl">wpm</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-num">{accuracy}<span className="stat-of">%</span></span>
          <span className="stat-lbl">acc</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-num">{screenCount}</span>
          <span className="stat-lbl">screens</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-num">{formatTime(elapsed)}</span>
          <span className="stat-lbl">time</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item stat-item--timer">
          {startTime && timerDuration !== null && timeRemaining !== null ? (
            <span className={`stat-num${timeRemaining <= 10 ? ' stat-num--urgent' : ''}`}>{formatTimeHMS(timeRemaining)}</span>
          ) : !timerUnlocked ? (
            <input
              ref={timerInputRef}
              className="timer-input timer-input--locked"
              type="text"
              value={timerLabel}
              readOnly
              disabled={!!startTime}
              onClick={e => { e.stopPropagation(); timerInputRef.current?.focus() }}
              onKeyDown={e => {
                if (e.key === 'Backspace') {
                  e.preventDefault()
                  e.stopPropagation()
                  const next = timerLabel.slice(0, -1)
                  if (next.length === 0) {
                    setTimerUnlocked(true)
                    setTimeout(() => timerInputRef.current?.focus(), 0)
                  } else {
                    setTimerLabel(next)
                  }
                }
              }}
            />
          ) : (
            <input
              ref={timerInputRef}
              className="timer-input"
              type="text"
              value={timerInput}
              disabled={!!startTime}
              onChange={e => {
                const val = e.target.value
                setTimerInput(val)
                const secs = parseHMS(val)
                if (secs !== null && secs > 0) {
                  setTimerDuration(secs)
                  setTimeRemaining(secs)
                } else {
                  setTimerDuration(null)
                  setTimeRemaining(null)
                }
              }}
            />
          )}
        </div>
      </motion.div>

      <div className="speed-text-zone">
        <AnimatePresence mode="wait">
          <motion.div
            key={screenIdx}
            className={`note-display${screenSuccess ? ' note-display--success' : ''}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
          >
            {renderText()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="typer-footer">
        <button className="btn-stop" onClick={(e) => { e.stopPropagation(); playBack(); handleStop() }}>
          {startTime ? 'Finish' : '← Back'}
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
        maxLength={currentScreen.length + 1}
      />
    </div>
  )
}
