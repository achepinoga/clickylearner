import { useState } from 'react'
import Upload from './components/Upload'
import Typer from './components/Typer'
import Results from './components/Results'
import './App.css'

const STAGES = { UPLOAD: 'upload', TYPING: 'typing', RESULTS: 'results' }

export default function App() {
  const [stage, setStage] = useState(STAGES.UPLOAD)
  const [notes, setNotes] = useState([])
  const [results, setResults] = useState(null)

  const handleNotesReady = (generatedNotes) => {
    setNotes(generatedNotes)
    setStage(STAGES.TYPING)
  }

  const handleFinished = (stats) => {
    setResults(stats)
    setStage(STAGES.RESULTS)
  }

  const handleRestart = () => {
    setStage(STAGES.UPLOAD)
    setNotes([])
    setResults(null)
  }

  const handleRetry = () => {
    setResults(null)
    setStage(STAGES.TYPING)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">⌨️</span>
          <span className="logo-text">StudyTyper</span>
        </div>
        <p className="tagline">Upload. Learn. Type.</p>
      </header>

      <main className="main">
        {stage === STAGES.UPLOAD && <Upload onNotesReady={handleNotesReady} />}
        {stage === STAGES.TYPING && (
          <Typer notes={notes} onFinished={handleFinished} onBack={handleRestart} />
        )}
        {stage === STAGES.RESULTS && (
          <Results stats={results} onRetry={handleRetry} onNew={handleRestart} />
        )}
      </main>
    </div>
  )
}
