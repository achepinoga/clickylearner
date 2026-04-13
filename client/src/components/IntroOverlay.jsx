import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { playChime } from '../sounds'
import './Typer.css'
import './IntroOverlay.css'

// Pre-computed blackout ranges (character index [start, end))
const DEMO_CARDS = [
  {
    label: 'Biology',
    text: 'The mitochondria is the powerhouse of the cell.',
    blackout: [[4, 16], [24, 34]],   // mitochondria, powerhouse
  },
  {
    label: 'History',
    text: 'The French Revolution began in 1789, ending the monarchy.',
    blackout: [[31, 35], [48, 56]],  // 1789, monarchy
  },
  {
    label: 'Chemistry',
    text: 'The chemical formula for water is H2O, made of hydrogen and oxygen.',
    blackout: [[34, 37], [47, 55], [60, 66]],  // H2O, hydrogen, oxygen
  },
]

function FlashcardDemo() {
  const [cardIdx, setCardIdx]             = useState(0)
  const [phase, setPhase]                 = useState('study') // 'study' | 'recall'
  const [typed, setTyped]                 = useState('')
  const [pendingWrong, setPendingWrong]   = useState(false)
  const [failedIndices, setFailedIndices] = useState(() => new Set())
  const [cardSuccess, setCardSuccess]     = useState(false)
  const [flipped, setFlipped]             = useState(false)
  const [autoTyping, setAutoTyping]       = useState(false)

  const demoRef      = useRef(null)
  const idleTimer    = useRef(null)
  const typedRef     = useRef('')
  const completingRef = useRef(false)

  const card     = DEMO_CARDS[cardIdx]
  const fullText = card.text
  const blackout = phase === 'recall' ? card.blackout : null

  const isBlackedOut = useCallback((i) =>
    blackout?.some(([s, e]) => i >= s && i < e) ?? false
  , [blackout])

  // Focus when card or phase changes
  useEffect(() => { demoRef.current?.focus() }, [cardIdx, phase])

  // Schedule idle → auto-type
  const scheduleIdle = useCallback(() => {
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setAutoTyping(true), 2800)
  }, [])

  useEffect(() => {
    scheduleIdle()
    return () => clearTimeout(idleTimer.current)
  }, [cardIdx, phase, scheduleIdle])

  const completePhase = useCallback(() => {
    if (completingRef.current) return
    completingRef.current = true
    setCardSuccess(true)
    playChime()
    if (phase === 'study') {
      setTimeout(() => {
        setCardSuccess(false)
        setFlipped(true)
        setTimeout(() => {
          typedRef.current = ''
          setTyped('')
          setPendingWrong(false)
          setFailedIndices(new Set())
          setPhase('recall')
          setAutoTyping(false)
          completingRef.current = false
        }, 320)
      }, 380)
    } else {
      setTimeout(() => {
        setCardSuccess(false)
        setFlipped(false)
        setCardIdx(c => (c + 1) % DEMO_CARDS.length)
        typedRef.current = ''
        setTyped('')
        setPendingWrong(false)
        setFailedIndices(new Set())
        setPhase('study')
        setAutoTyping(false)
        completingRef.current = false
      }, 650)
    }
  }, [phase])

  // Auto-type tick
  useEffect(() => {
    if (!autoTyping || cardSuccess) return
    const cur = typedRef.current
    if (cur.length >= fullText.length) { completePhase(); return }
    const t = setTimeout(() => {
      const next = fullText.slice(0, cur.length + 1)
      typedRef.current = next
      setTyped(next)
    }, 85)
    return () => clearTimeout(t)
  }, [autoTyping, typed, fullText, cardSuccess, completePhase])

  const handleKeyDown = useCallback((e) => {
    if (cardSuccess) return
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (typedRef.current.length === 0) return
      const deletedIdx = typedRef.current.length - 1
      const next = typedRef.current.slice(0, -1)
      typedRef.current = next
      setTyped(next)
      setPendingWrong(false)
      setFailedIndices(prev => { const n = new Set(prev); n.delete(deletedIdx); return n })
      setAutoTyping(false)
      scheduleIdle()
      return
    }
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey) return
    e.preventDefault()
    setAutoTyping(false)
    scheduleIdle()
    const pos = typedRef.current.length
    if (pos >= fullText.length) return
    if (e.key === fullText[pos]) {
      const next = typedRef.current + e.key
      typedRef.current = next
      setPendingWrong(false)
      setTyped(next)
      if (next.length >= fullText.length) completePhase()
    } else {
      setPendingWrong(true)
      setFailedIndices(prev => { const n = new Set(prev); n.add(pos); return n })
    }
  }, [cardSuccess, fullText, completePhase, scheduleIdle])

  const renderText = () =>
    fullText.split('').map((char, i) => {
      if (i === typed.length) {
        return (
          <span key={i} className={pendingWrong ? 'char cursor wrong' : 'char cursor'}>
            {isBlackedOut(i) ? '_' : char}
          </span>
        )
      }
      if (i < typed.length) {
        const bad = failedIndices.has(i) || typed[i] !== fullText[i]
        const sp  = char === ' '
        return <span key={i} className={bad ? `char incorrect${sp ? ' is-space' : ''}` : 'char correct'}>{char}</span>
      }
      if (isBlackedOut(i)) return <span key={i} className="char encrypted">_</span>
      return <span key={i} className="char pending">{char}</span>
    })

  const faceClass = (side) => {
    const base = `flashcard-face flashcard-face--${side}`
    const ok   = cardSuccess && phase === (side === 'front' ? 'study' : 'recall')
    return ok ? `${base} flashcard-face--success` : base
  }

  return (
    <div
      ref={demoRef}
      className="lp-fc-demo"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={() => { demoRef.current?.focus(); setAutoTyping(false); scheduleIdle() }}
    >
      <div className="flashcard-scene">
        <div className="flashcard-ghost ghost-2" />
        <div className="flashcard-ghost ghost-1" />
        <AnimatePresence mode="popLayout">
          <motion.div
            key={cardIdx}
            className="flashcard-card-wrapper"
            initial={{ scale: 0.94, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ x: 500, rotate: 12, opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.div
              className="flashcard-flip-inner"
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* STUDY face */}
              <div className={faceClass('front')}>
                <div className="flashcard-corner fc-tl" />
                <div className="flashcard-corner fc-tr" />
                <div className="flashcard-corner fc-bl" />
                <div className="flashcard-corner fc-br" />
                <div className="flashcard-meta">
                  <span className="flashcard-counter">{card.label}</span>
                  <span className="flashcard-phase phase-study">[ STUDY ]</span>
                </div>
                <div className="flashcard-rule" />
                <div className="note-display flashcard-text">{renderText()}</div>
              </div>

              {/* RECALL face */}
              <div className={faceClass('back')}>
                <div className="flashcard-corner fc-tl" />
                <div className="flashcard-corner fc-tr" />
                <div className="flashcard-corner fc-bl" />
                <div className="flashcard-corner fc-br" />
                <div className="flashcard-meta">
                  <span className="flashcard-counter">{card.label}</span>
                  <span className="flashcard-phase phase-recall">[ RECALL ]</span>
                </div>
                <div className="flashcard-rule flashcard-rule--recall" />
                <div className="note-display flashcard-text">{renderText()}</div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="lp-fc-footer">
        {autoTyping
          ? <span className="lp-fc-auto">· click to take over ·</span>
          : phase === 'recall'
          ? <span className="lp-fc-hint lp-fc-hint--recall">recall — type from memory</span>
          : <span className="lp-fc-hint">type the card</span>
        }
      </div>
    </div>
  )
}

const VALUE_PROPS = [
  {
    icon: '◈',
    title: 'Your notes, your words',
    desc: 'Upload any document — PDFs, lecture slides, handwritten notes. ClickyLearner works with whatever you already have, not generic content.',
  },
  {
    icon: '▣',
    title: 'Active recall, not passive reading',
    desc: 'Typing forces your brain to retrieve information. Research consistently shows active recall doubles long-term retention compared to re-reading or highlighting.',
  },
  {
    icon: '◎',
    title: 'AI flashcards + quiz',
    desc: 'Key terms are automatically identified and blacked out on the second pass. A final AI-generated quiz closes the loop — real learning, not busywork.',
  },
]

export default function IntroOverlay({ onComplete }) {
  const prefersReducedMotion = useReducedMotion()
  const [isExiting, setIsExiting] = useState(false)

  const handleStart = () => {
    if (isExiting) return
    setIsExiting(true)
  }

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {!isExiting && (
        <motion.div
          className="lp-overlay"
          exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 1.018 }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Background layers */}
          <div className="lp-backdrop" />
          <div className="lp-grid" />

          {/* Nav */}
          <motion.nav
            className="lp-nav"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="lp-nav-brand">
              <img src="/logo.png" alt="cL" className="lp-nav-logo" />
              <span className="lp-nav-wordmark">ClickyLearner</span>
            </div>
            <button className="lp-nav-cta" onClick={handleStart}>
              Start free →
            </button>
          </motion.nav>

          {/* Scrollable content */}
          <div className="lp-scroll">

            {/* ── Hero ── */}
            <section className="lp-hero">
              <motion.p
                className="lp-eyebrow"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.4 }}
              >
                [ active recall · spaced repetition · real retention ]
              </motion.p>

              <motion.h1
                className="lp-headline"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
              >
                Type it.<br />Actually remember it.
              </motion.h1>

              <motion.p
                className="lp-sub"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                Upload your notes. ClickyLearner hides the key terms and makes you type them back — the most effective way to move information from short-term into long-term memory.
              </motion.p>

              <motion.div
                className="lp-demo-wrap"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.4 }}
              >
                <p className="lp-demo-label">↓ try typing the card below</p>
                <FlashcardDemo />
              </motion.div>

              <motion.div
                className="lp-cta-row"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
              >
                <button className="lp-cta-btn" onClick={handleStart}>
                  Start learning  →
                </button>
                <span className="lp-free-note">free · no account required · works on any device</span>
              </motion.div>
            </section>

            {/* ── Divider ── */}
            <motion.div
              className="lp-divider"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.9, duration: 0.5 }}
            />

            {/* ── Value props ── */}
            <motion.section
              className="lp-props"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.5 }}
            >
              <p className="lp-section-label">why it works</p>
              <div className="lp-props-grid">
                {VALUE_PROPS.map((p, i) => (
                  <div key={i} className="lp-prop">
                    <span className="lp-prop-icon">{p.icon}</span>
                    <h3 className="lp-prop-title">{p.title}</h3>
                    <p className="lp-prop-desc">{p.desc}</p>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* ── How it works ── */}
            <motion.section
              className="lp-how"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.05, duration: 0.5 }}
            >
              <p className="lp-section-label">how it works</p>
              <div className="lp-steps">
                <div className="lp-step">
                  <span className="lp-step-num">01</span>
                  <div>
                    <h4 className="lp-step-title">Upload your material</h4>
                    <p className="lp-step-desc">Drop in a PDF, paste text, or let the AI condense your document into focused study cards.</p>
                  </div>
                </div>
                <div className="lp-step-arrow">→</div>
                <div className="lp-step">
                  <span className="lp-step-num">02</span>
                  <div>
                    <h4 className="lp-step-title">Type through it</h4>
                    <p className="lp-step-desc">Key terms are hidden. You type them back from memory — no clicking, no multiple choice, no shortcuts.</p>
                  </div>
                </div>
                <div className="lp-step-arrow">→</div>
                <div className="lp-step">
                  <span className="lp-step-num">03</span>
                  <div>
                    <h4 className="lp-step-title">Quiz and review</h4>
                    <p className="lp-step-desc">An AI quiz tests your knowledge after each session. Review what you missed and lock it in.</p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* ── Bottom CTA ── */}
            <motion.section
              className="lp-bottom-cta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1, duration: 0.5 }}
            >
              <h2 className="lp-bottom-headline">
                Stop re-reading. Start remembering.
              </h2>
              <p className="lp-bottom-sub">
                Join students who've switched from passive review to the only study method that actually sticks.
              </p>
              <button className="lp-cta-btn lp-cta-btn--large" onClick={handleStart}>
                Get started — it's free  →
              </button>
            </motion.section>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
