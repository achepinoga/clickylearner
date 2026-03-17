import './Results.css'

export default function Results({ stats, onRetry, onNew }) {
  const { wpm, accuracy, errors, totalChars, notes } = stats

  const grade = accuracy >= 98 ? 'S' : accuracy >= 95 ? 'A' : accuracy >= 88 ? 'B' : accuracy >= 75 ? 'C' : 'D'
  const gradeColor = { S: '#ffd700', A: '#4ade80', B: '#6c8eff', C: '#fb923c', D: '#f87171' }

  return (
    <div className="results-container">
      <div className="results-card">
        <div className="grade" style={{ color: gradeColor[grade] }}>{grade}</div>
        <h2 className="results-title">Session Complete!</h2>
        <p className="results-sub">You typed through all {notes} study notes</p>

        <div className="results-stats">
          <div className="res-stat">
            <span className="res-val">{wpm}</span>
            <span className="res-label">Words per minute</span>
          </div>
          <div className="res-stat">
            <span className="res-val">{accuracy}%</span>
            <span className="res-label">Accuracy</span>
          </div>
          <div className="res-stat">
            <span className="res-val">{totalChars}</span>
            <span className="res-label">Characters typed</span>
          </div>
          <div className="res-stat">
            <span className="res-val">{errors}</span>
            <span className="res-label">Total errors</span>
          </div>
        </div>

        <div className="results-actions">
          <button className="btn-retry" onClick={onRetry}>↺ Type Again</button>
          <button className="btn-new" onClick={onNew}>Upload New Material</button>
        </div>
      </div>
    </div>
  )
}
