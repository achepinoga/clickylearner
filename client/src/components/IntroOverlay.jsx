import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import './IntroOverlay.css'

const DEMO_WORDS = [
  { text: 'The',          hidden: false },
  { text: 'mitochondria', hidden: true  },
  { text: 'is',           hidden: false },
  { text: 'the',          hidden: false },
  { text: 'powerhouse',   hidden: true  },
  { text: 'of',           hidden: false },
  { text: 'the',          hidden: false },
  { text: 'cell.',        hidden: false },
]

function DemoLine() {
  const [typed, setTyped] = useState('')
  const [wordIdx, setWordIdx] = useState(0)
  const [done, setDone] = useState(false)
  const hiddenWords = DEMO_WORDS.filter(w => w.hidden)

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => { setTyped(''); setWordIdx(0); setDone(false) }, 2200)
      return () => clearTimeout(t)
    }
    const target = hiddenWords[wordIdx]?.text || ''
    if (typed === target) {
      const t = setTimeout(() => {
        if (wordIdx + 1 >= hiddenWords.length) setDone(true)
        else { setWordIdx(i => i + 1); setTyped('') }
      }, 400)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setTyped(target.slice(0, typed.length + 1)), 90)
    return () => clearTimeout(t)
  }, [typed, wordIdx, done, hiddenWords])

  let hiddenSeen = 0
  return (
    <div className="lp-demo-wrap">
      <span className="lp-demo-label">see how it works</span>
      <div className="lp-demo-line">
      {DEMO_WORDS.map((w, i) => {
        if (!w.hidden) return <span key={i} className="lp-demo-word">{w.text}</span>
        const idx = hiddenSeen++
        const isActive = !done && idx === wordIdx
        const isComplete = done || idx < wordIdx
        return (
          <span key={i} className={`lp-demo-blank ${isComplete ? 'lp-demo-blank--done' : ''}`}>
            {isActive
              ? <span className="lp-demo-typing">{typed}<span className="lp-demo-cursor" /></span>
              : isComplete ? w.text : '█'.repeat(w.text.length)
            }
          </span>
        )
      })}
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.4 }}
              >
                <DemoLine />
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
