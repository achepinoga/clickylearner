import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import './HistoryPanel.css'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function getGrade(accuracy) {
  if (accuracy >= 98) return 'S'
  if (accuracy >= 95) return 'A'
  if (accuracy >= 88) return 'B'
  if (accuracy >= 75) return 'C'
  return 'D'
}

export default function HistoryPanel({ isOpen, onClose }) {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchRuns = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setRuns(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (isOpen) fetchRuns()
  }, [isOpen, fetchRuns])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="history-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            className="history-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="history-header">
              <span className="history-title">// Run History</span>
              <button className="history-close" onClick={onClose} aria-label="Close">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M1.5 1.5l10 10M11.5 1.5l-10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="history-body">
              {loading ? (
                <div className="history-loading">
                  {[0, 1, 2].map(i => (
                    <motion.span key={i} className="history-dot"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              ) : runs.length === 0 ? (
                <p className="history-empty">&gt; No runs yet. Complete a session to record it.</p>
              ) : (
                <div className="history-list">
                  {runs.map(run => {
                    const grade = getGrade(run.accuracy)
                    return (
                      <div key={run.id} className="run-entry">
                        <span className={`run-mode-badge mode-${run.mode}`}>{run.mode}</span>
                        <div className="run-stats">
                          <span className="run-wpm">{run.wpm}<small>wpm</small></span>
                          <span className="run-acc">{run.accuracy}%</span>
                        </div>
                        <span className={`run-grade grade-${grade}`}>{grade}</span>
                        <span className="run-time">{timeAgo(run.created_at)}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
