import { useEffect, useState } from 'react'
import { motion, animate } from 'framer-motion'
import './Results.css'

function useCountUp(target, duration = 1.3) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    const controls = animate(0, target, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setValue(Math.round(v)),
    })
    return () => controls.stop()
  }, [target, duration])
  return value
}

const CONFETTI = Array.from({ length: 30 }, (_, i) => ({
  id: i,
  x: (Math.random() - 0.5) * 360,
  y: -(Math.random() * 260 + 60),
  rotate: Math.random() * 540 - 270,
  scale: Math.random() * 0.55 + 0.3,
  color: ['#7c6aff', '#2dd4bf', '#f59e0b', '#fb7185', '#34d399', '#c084fc', '#60a5fa'][i % 7],
  size: Math.random() * 7 + 4,
  delay: Math.random() * 0.45,
}))

function getGrade(accuracy) {
  return accuracy >= 98 ? 'S' : accuracy >= 95 ? 'A' : accuracy >= 88 ? 'B' : accuracy >= 75 ? 'C' : 'D'
}

const gradeColor = { S: '#f59e0b', A: '#34d399', B: '#7c6aff', C: '#fb923c', D: '#fb7185' }

const DIFFICULTY_LEVELS = [
  { value: 1, label: 'I',   name: 'Light' },
  { value: 2, label: 'II',  name: 'Standard' },
  { value: 3, label: 'III', name: 'Heavy' },
  { value: 4, label: 'IV',  name: 'Brutal' },
]

export default function Results({ stats, onRetry, onUpload, onNew, isFlashcard, isSpeed, flashcardDifficulty, onDifficultyChange }) {
  const { wpm, accuracy, errors, totalChars, notes, noteResults = [] } = stats

  const grade = getGrade(accuracy)

  const animWpm = useCountUp(wpm)
  const animAccuracy = useCountUp(accuracy)
  const animChars = useCountUp(totalChars, 1.6)
  const animErrors = useCountUp(errors, 0.9)

  return (
    <div className="results-container">
      {/* Confetti burst */}
      <div className="confetti-origin" aria-hidden="true">
        {CONFETTI.map((p) => (
          <motion.span
            key={p.id}
            className="confetti-piece"
            style={{
              width: p.size,
              height: p.size,
              background: p.color,
              borderRadius: p.id % 3 === 0 ? '50%' : '2px',
            }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{ x: p.x, y: p.y, scale: p.scale, opacity: 0, rotate: p.rotate }}
            transition={{ duration: 1.3, delay: 0.15 + p.delay, ease: [0.2, 0.8, 0.4, 1] }}
          />
        ))}
      </div>

      <motion.div
        className="results-card"
        initial={{ opacity: 0, scale: 0.9, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.4, 1] }}
      >
        <div className="card-shimmer" />

        <div className="results-body">
          {/* LEFT — overall */}
          <div className="results-left">
            <motion.div
              className="grade-wrap"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 240, damping: 15 }}
            >
              <div
                className="grade"
                style={{ color: gradeColor[grade], '--grade-glow': gradeColor[grade] + '40' }}
              >
                {grade}
              </div>
              <motion.div
                className="grade-ring"
                style={{ borderColor: gradeColor[grade] + '30' }}
                animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.15, 0.5] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>

            <motion.h2
              className="results-title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.35 }}
            >
              Session Complete
            </motion.h2>

            <motion.p
              className="results-sub"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3 }}
            >
              {isSpeed ? `${notes} screens completed` : `${notes} notes typed through`}
            </motion.p>

            <motion.div
              className="stats-grid"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.4 }}
            >
              <div className="stat-box">
                <span className="sbox-val">{animWpm}</span>
                <span className="sbox-label">Words / min</span>
              </div>
              <div className="stat-box accent-box">
                <span className="sbox-val accent-val">{animAccuracy}%</span>
                <span className="sbox-label">Accuracy</span>
              </div>
              <div className="stat-box">
                <span className="sbox-val">{animChars}</span>
                <span className="sbox-label">Characters</span>
              </div>
              <div className="stat-box">
                <span
                  className="sbox-val"
                  style={{ color: errors > 0 ? 'var(--incorrect)' : 'var(--correct)' }}
                >
                  {animErrors}
                </span>
                <span className="sbox-label">Errors</span>
              </div>
            </motion.div>

            {isFlashcard && (
              <motion.div
                className="results-difficulty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.3 }}
              >
                <span className="results-difficulty-label">next recall difficulty</span>
                <div className="results-difficulty-steps">
                  {DIFFICULTY_LEVELS.map(lvl => (
                    <button
                      key={lvl.value}
                      className={`rdiff-btn ${flashcardDifficulty === lvl.value ? 'rdiff-btn--active' : ''}`}
                      onClick={() => onDifficultyChange(lvl.value)}
                    >
                      <span className="rdiff-roman">{lvl.label}</span>
                      <span className="rdiff-name">{lvl.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.div
              className="results-actions"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.72, duration: 0.35 }}
            >
              <motion.button
                className="btn-action"
                onClick={onRetry}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                Type Again
              </motion.button>
              {!isSpeed && (
                <motion.button
                  className="btn-action"
                  onClick={onUpload}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  Upload Notes
                </motion.button>
              )}
              <motion.button
                className="btn-action btn-action--primary"
                onClick={onNew}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                <span>Change Mode</span>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M3 7.5h9M8.5 3.5l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.button>
            </motion.div>
          </div>

          {/* RIGHT — per-challenge breakdown */}
          {noteResults.length > 0 && (
            <motion.div
              className="results-right"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              <div className="breakdown-label">challenge breakdown</div>
              <div className="breakdown-list">
                {noteResults.map((r, i) => {
                  const g = getGrade(r.accuracy)
                  const isRecall = r.phase === 'recall'
                  const isStudy = r.phase === 'study'
                  const rowColor = isRecall ? '#f59e0b' : isStudy ? 'rgba(255,255,255,0.55)' : gradeColor[g]
                  const cardNum = r.phase ? Math.floor(i / 2) + 1 : i + 1
                  const numLabel = isSpeed
                    ? `SCR${i + 1}${r.partial ? '*' : ''}`
                    : r.phase ? `${cardNum}${isRecall ? 'R' : 'S'}` : `#${i + 1}`
                  return (
                    <div key={i} className={`breakdown-row${isRecall ? ' breakdown-row--recall' : ''}`}>
                      <span className="breakdown-num">{numLabel}</span>
                      <span className="breakdown-grade" style={{ color: rowColor }}>{g}</span>
                      <span className="breakdown-stat">{r.wpm} <span className="breakdown-unit">wpm</span></span>
                      <span className="breakdown-stat">{r.accuracy}<span className="breakdown-unit">%</span></span>
                      <span className="breakdown-bar-wrap">
                        <span className="breakdown-bar" style={{ width: `${r.accuracy}%`, background: rowColor + '99' }} />
                      </span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
