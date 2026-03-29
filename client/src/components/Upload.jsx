import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useMotionValue, useMotionTemplate } from 'framer-motion'
import { playClick, playToggle, playBack } from '../sounds'
import './Upload.css'

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

function UploadIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="24" fill="currentColor" fillOpacity="0.04" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1.5" />
      <path d="M26 35V22M19 28l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 38h16" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function FileIcon({ type }) {
  if (type === 'application/pdf') {
    return (
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
        <rect x="6" y="3" width="26" height="32" rx="4" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
        <path d="M24 3v8a1 1 0 001 1h7" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round" />
        <text x="19" y="27" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7" fontWeight="700" fill="currentColor">PDF</text>
      </svg>
    )
  }
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
      <rect x="6" y="3" width="26" height="32" rx="4" fill="currentColor" fillOpacity="0.05" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" />
      <path d="M13 15h12M13 21h8M13 27h10" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const DIFFICULTY_LEVELS = [
  { value: 1, label: 'I', name: 'Light', pct: '~25%' },
  { value: 2, label: 'II', name: 'Standard', pct: '~50%' },
  { value: 3, label: 'III', name: 'Heavy', pct: '~75%' },
  { value: 4, label: 'IV', name: 'Brutal', pct: '~80%' },
]

export default function Upload({ onNotesReady, gameMode, difficulty, onDifficultyChange, onBack }) {
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [infoOpen, setInfoOpen] = useState(false)
  const [sizeWarning, setSizeWarning] = useState('')
  const [truncationWarning, setTruncationWarning] = useState(null)
  const [continuation, setContinuation] = useState(() => {
    try { const s = localStorage.getItem('cl_continuation'); return s ? JSON.parse(s) : null } catch { return null }
  })
  const pendingNotesRef = useRef(null)
  const inputRef = useRef()
  const infoRef = useRef()

  useEffect(() => {
    if (!infoOpen) return
    const handler = (e) => {
      if (infoRef.current && !infoRef.current.contains(e.target)) setInfoOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [infoOpen])

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const spotlightBg = useMotionTemplate`radial-gradient(300px circle at ${mouseX}px ${mouseY}px, rgba(255, 255, 255, 0.04), transparent 70%)`

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  const handleFile = (f) => {
    if (!f) return
    const allowed = ['application/pdf', 'text/plain']
    if (!allowed.includes(f.type)) {
      setError('Only PDF and .txt files are supported.')
      return
    }
    setError('')
    if (f.size > 4 * 1024 * 1024) {
      setSizeWarning('This file is large (over 4 MB). The upload may fail — try a smaller file if it does.')
    } else {
      setSizeWarning('')
    }
    setFile(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const splitRawText = (text) => {
    // Mark paragraph breaks, then collapse all other whitespace (handles PDF soft-wraps)
    const normalized = text
      .replace(/\r\n/g, '\n')
      .replace(/\n{2,}/g, '\x00')
      .replace(/\s+/g, ' ')
      .replace(/\x00/g, '\n\n')

    return normalized
      .split(/\n{2,}/)
      .flatMap(para => {
        const trimmed = para.trim()
        if (!trimmed) return []
        return trimmed.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 10)
      })
      .filter(s => s.length > 0)
  }

  const handleSubmit = async () => {
    if (!file) return
    setError('')
    try {
      setStatus('uploading')
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: formData })
      if (!uploadRes.ok) {
        if (uploadRes.status === 413) {
          throw new Error('File too large for the server to process. Please use a file under 4 MB.')
        }
        const ct = uploadRes.headers.get('content-type') || ''
        if (ct.includes('application/json')) {
          const errData = await uploadRes.json()
          throw new Error(errData.error || 'Upload failed')
        }
        throw new Error(`Upload failed (${uploadRes.status})`)
      }
      const uploadData = await uploadRes.json()

      // Standard mode: skip AI, split raw text directly
      if (gameMode === 'standard') {
        localStorage.removeItem('cl_continuation')
        setContinuation(null)
        onNotesReady(splitRawText(uploadData.text), file.name)
        return
      }

      setStatus('generating')
      const notesRes = await fetch(`${API_BASE}/api/notes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: uploadData.text })
      })
      const notesData = await notesRes.json()
      if (!notesRes.ok) throw new Error(notesData.error || 'Failed to generate notes')

      if (notesData.truncated) {
        // Flashcard mode: skip warning, pass remaining text to parent for post-session continuation
        localStorage.removeItem('cl_continuation')
        setContinuation(null)
        onNotesReady(notesData.notes, file.name, notesData.remainingText)
      } else {
        localStorage.removeItem('cl_continuation')
        setContinuation(null)
        onNotesReady(notesData.notes, file.name, null)
      }
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  const handleContinue = async () => {
    if (!continuation) return
    setError('')
    setStatus('generating')
    try {
      const notesRes = await fetch(`${API_BASE}/api/notes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: continuation.remainingText })
      })
      const notesData = await notesRes.json()
      if (!notesRes.ok) throw new Error(notesData.error || 'Failed to generate notes')

      if (notesData.truncated) {
        const cont = {
          filename: continuation.filename,
          nextPage: continuation.nextPage + notesData.cutoffPage,
          totalPages: continuation.totalPages,
          remainingText: notesData.remainingText,
        }
        localStorage.setItem('cl_continuation', JSON.stringify(cont))
        setContinuation(cont)
        pendingNotesRef.current = { notes: notesData.notes, name: continuation.filename }
        setTruncationWarning({
          cutoffPage: continuation.nextPage + notesData.cutoffPage - 1,
          totalPages: continuation.totalPages,
          cutoffPreview: notesData.cutoffPreview,
        })
        setStatus('idle')
      } else {
        localStorage.removeItem('cl_continuation')
        setContinuation(null)
        onNotesReady(notesData.notes, continuation.filename)
      }
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  const isLoading = status === 'uploading' || status === 'generating'

  return (
    <div className="upload-container">
      {onBack && (
        <motion.button
          className="upload-back-btn"
          onClick={() => { playBack(); onBack() }}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.96 }}
        >
          ← Back
        </motion.button>
      )}
      <div className="upload-eyebrow">Step 1 — Upload your material</div>

      <AnimatePresence>
        {continuation && !truncationWarning && !isLoading && (
          <motion.div
            className="continuation-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="cont-left">
              <span className="cont-label">// Previous session</span>
              <span className="cont-file">{continuation.filename.replace(/\.[^.]+$/, '')}</span>
              <span className="cont-pages">Page {continuation.nextPage} of ~{continuation.totalPages}</span>
            </div>
            <div className="cont-actions">
              <button className="cont-btn cont-btn--primary" onClick={() => { playClick(); handleContinue() }}>
                Continue →
              </button>
              <button className="cont-btn cont-btn--dismiss" onClick={() => { playBack(); localStorage.removeItem('cl_continuation'); setContinuation(null) }}>
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className={`dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
        style={{ background: spotlightBg }}
        onMouseMove={handleMouseMove}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !file && !isLoading && inputRef.current.click()}
        animate={{
          borderColor: dragging
            ? 'rgba(255,255,255,0.5)'
            : file
              ? 'rgba(255,255,255,0.25)'
              : 'rgba(255,255,255,0.1)',
          boxShadow: dragging
            ? '0 0 40px rgba(255,255,255,0.06), inset 0 0 30px rgba(255,255,255,0.02)'
            : '0 0 0px transparent',
        }}
        transition={{ duration: 0.2 }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          hidden
          onChange={(e) => handleFile(e.target.files[0])}
        />

        <AnimatePresence mode="wait">
          {file ? (
            <motion.div
              key="preview"
              className="file-preview"
              initial={{ opacity: 0, scale: 0.88, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: -8 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            >
              <FileIcon type={file.type} />
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <span className="file-meta">{(file.size / 1024).toFixed(1)} KB · ready to process</span>
              </div>
              <motion.button
                className="remove-btn"
                onClick={(e) => { e.stopPropagation(); playBack(); setFile(null); if (inputRef.current) inputRef.current.value = '' }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="hint"
              className="dropzone-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                animate={dragging ? { scale: 1.18, y: -6 } : { scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              >
                <UploadIcon />
              </motion.div>
              <p className="drop-title">Drop your study material here</p>
              <p className="drop-sub">PDF or TXT · up to 4 MB</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {gameMode === 'flashcards' && (
          <motion.div
            className="difficulty-section"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="difficulty-header">
              <span className="difficulty-label">Recall Difficulty</span>
              <div className="difficulty-info-wrap" ref={infoRef}>
                <button className="difficulty-info-btn" onClick={() => { playToggle(); setInfoOpen(v => !v) }} aria-label="How it works">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M7 6.3v3.4M7 4.5v.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </button>
                <AnimatePresence>
                  {infoOpen && (
                    <motion.div
                      className="difficulty-tooltip"
                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                      transition={{ duration: 0.18 }}
                    >
                      <p className="tooltip-title">How Flashcard Mode Works</p>
                      <p className="tooltip-body">
                        <strong>Pass 1</strong> — Type all your notes normally to build familiarity.<br />
                        <strong>Pass 2</strong> — The same notes reappear with key words blacked out. You must recall them from memory.
                      </p>
                      <p className="tooltip-tip">
                        Start on <strong>Light</strong> when the material is new, then work your way up to <strong>Brutal</strong> as you improve. Jumping straight to hard difficulty will only frustrate you.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="difficulty-scale">
              {DIFFICULTY_LEVELS.map((lvl) => (
                <button
                  key={lvl.value}
                  className={`diff-step ${difficulty === lvl.value ? 'diff-step--active' : ''}`}
                  onClick={() => { playToggle(); onDifficultyChange(lvl.value) }}
                >
                  <span className="diff-roman">{lvl.label}</span>
                  <span className="diff-name">{lvl.name}</span>
                  <span className="diff-pct">{lvl.pct}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sizeWarning && !error && (
          <motion.div
            className="size-warning-msg"
            initial={{ opacity: 0, y: -6, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1.5L13.5 13.5H1.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M7.5 6v3.5M7.5 11v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            {sizeWarning}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            className="error-msg"
            initial={{ opacity: 0, y: -6, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto', marginTop: 0 }}
            exit={{ opacity: 0, y: -6, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M7.5 4.5v4M7.5 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {file && !isLoading && (
          <motion.button
            className="btn-generate"
            onClick={() => { playClick(); handleSubmit() }}
            initial={{ opacity: 0, y: 10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.94 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <span>{gameMode === 'standard' ? 'Start Typing' : 'Generate Study Notes'}</span>
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
              <path d="M8.5 1.5l1.6 4.8L15 8.5l-4.9 2.2-1.6 4.8-1.6-4.8L2 8.5l4.9-2.2 1.6-4.8z" fill="currentColor" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {truncationWarning && (
          <motion.div
            className="truncation-warning"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="trunc-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L16.5 15H1.5L9 2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M9 7v4M9 13v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="trunc-body">
              <p className="trunc-title">Document too long — only the first ~{truncationWarning.cutoffPage} of ~{truncationWarning.totalPages} pages were processed.</p>
              <p className="trunc-advice">For better recall, we recommend studying in focused sessions rather than processing your entire document at once. Pick up from where this session ends for your next upload.</p>
              {truncationWarning.cutoffPreview && (
                <p className="trunc-cutoff">
                  <span className="trunc-cutoff-label">// This session ends at:</span>
                  <span className="trunc-cutoff-text">"{truncationWarning.cutoffPreview}"</span>
                </p>
              )}
              <button
                className="trunc-continue-btn"
                onClick={() => {
                  playClick()
                  const { notes, name } = pendingNotesRef.current
                  setTruncationWarning(null)
                  onNotesReady(notes, name)
                }}
              >
                Got it — Start Studying →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="loading-state"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }}
          >
            <div className="loading-dots">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="loading-dot"
                  animate={{ y: [0, -9, 0], opacity: [0.35, 1, 0.35] }}
                  transition={{ duration: 0.75, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                />
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={status}
                className="loading-text"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.22 }}
              >
                {status === 'uploading' ? 'Reading your file...' : gameMode === 'standard' ? 'Processing text...' : 'AI is crafting your study notes...'}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
