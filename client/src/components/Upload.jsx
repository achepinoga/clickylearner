import { useState, useRef } from 'react'
import './Upload.css'

export default function Upload({ onNotesReady }) {
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState('idle') // idle | uploading | generating | error
  const [error, setError] = useState('')
  const inputRef = useRef()

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
      <div
        className={`dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt"
          hidden
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {file ? (
          <div className="file-preview">
            <span className="file-icon">{file.type === 'application/pdf' ? '📄' : '📝'}</span>
            <div className="file-info">
              <span className="file-name">{file.name}</span>
              <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
            <button className="remove-btn" onClick={(e) => { e.stopPropagation(); setFile(null) }}>✕</button>
          </div>
        ) : (
          <div className="dropzone-hint">
            <span className="drop-icon">📂</span>
            <p className="drop-title">Drop your study material here</p>
            <p className="drop-sub">or click to browse · PDF or TXT · max 10MB</p>
          </div>
        )}
      </div>

      {error && <p className="error-msg">⚠ {error}</p>}

      {file && !isLoading && (
        <button className="btn-primary" onClick={handleSubmit}>
          Generate Study Notes ✨
        </button>
      )}

      {isLoading && (
        <div className="loading-box">
          <div className="spinner" />
          <p>{status === 'uploading' ? 'Reading your file...' : 'AI is generating your study notes...'}</p>
        </div>
      )}
    </div>
  )
}
