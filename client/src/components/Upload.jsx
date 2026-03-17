import { useState, useRef } from 'react'
import { motion, AnimatePresence, useMotionValue, useMotionTemplate } from 'framer-motion'
import './Upload.css'

function UploadIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
      <circle cx="26" cy="26" r="24" fill="rgba(124,106,255,0.08)" stroke="rgba(124,106,255,0.18)" strokeWidth="1.5" />
      <path d="M26 35V22M19 28l7-7 7 7" stroke="#7c6aff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 38h16" stroke="rgba(124,106,255,0.35)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function FileIcon({ type }) {
  if (type === 'application/pdf') {
    return (
      <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
        <rect x="6" y="3" width="26" height="32" rx="4" fill="rgba(124,106,255,0.1)" stroke="rgba(124,106,255,0.4)" strokeWidth="1.5" />
        <path d="M24 3v8a1 1 0 001 1h7" stroke="rgba(124,106,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
        <text x="19" y="27" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7" fontWeight="700" fill="#7c6aff">PDF</text>
      </svg>
    )
  }
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
      <rect x="6" y="3" width="26" height="32" rx="4" fill="rgba(45,212,191,0.08)" stroke="rgba(45,212,191,0.35)" strokeWidth="1.5" />
      <path d="M13 15h12M13 21h8M13 27h10" stroke="rgba(45,212,191,0.65)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export default function Upload({ onNotesReady }) {
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const inputRef = useRef()

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const spotlightBg = useMotionTemplate`radial-gradient(300px circle at ${mouseX}px ${mouseY}px, rgba(124, 106, 255, 0.1), transparent 70%)`

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
    setFile(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleSubmit = async () => {
    if (!file) return
    setError('')
    try {
      setStatus('uploading')
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed')

      setStatus('generating')
      const notesRes = await fetch('/api/notes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: uploadData.text })
      })
      const notesData = await notesRes.json()
      if (!notesRes.ok) throw new Error(notesData.error || 'Failed to generate notes')

      onNotesReady(notesData.notes)
    } catch (err) {
      setError(err.message)
      setStatus('idle')
    }
  }

  const isLoading = status === 'uploading' || status === 'generating'

  return (
    <div className="upload-container">
      <div className="upload-eyebrow">Step 1 — Upload your material</div>

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
            ? 'rgba(124,106,255,0.65)'
            : file
              ? 'rgba(124,106,255,0.3)'
              : 'rgba(255,255,255,0.07)',
          boxShadow: dragging
            ? '0 0 60px rgba(124,106,255,0.12), inset 0 0 40px rgba(124,106,255,0.04)'
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
                onClick={(e) => { e.stopPropagation(); setFile(null) }}
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
              <p className="drop-sub">PDF or TXT · up to 10 MB</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

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
            onClick={handleSubmit}
            initial={{ opacity: 0, y: 10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.94 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <span>Generate Study Notes</span>
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
              <path d="M8.5 1.5l1.6 4.8L15 8.5l-4.9 2.2-1.6 4.8-1.6-4.8L2 8.5l4.9-2.2 1.6-4.8z" fill="currentColor" />
            </svg>
          </motion.button>
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
                {status === 'uploading' ? 'Reading your file...' : 'AI is crafting your study notes...'}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
