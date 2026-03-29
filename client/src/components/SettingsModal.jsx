import { motion, AnimatePresence } from 'framer-motion'
import { playBack, playToggle } from '../sounds'
import './SettingsModal.css'

export default function SettingsModal({ isOpen, onClose, settings, setSettings, theme, setTheme }) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        className="modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modal-content"
          initial={{ y: 20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2 className="modal-title">Settings</h2>
            <button className="btn-close" onClick={() => { playBack(); onClose() }}>×</button>
          </div>

          <div className="settings-group">
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Allow Backspace</span>
                <span className="setting-desc">Lets you delete mistakes</span>
              </div>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.allowBackspace}
                  onChange={(e) => { playToggle(); setSettings({ ...settings, allowBackspace: e.target.checked }) }}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Punctuation</span>
                <span className="setting-desc">Include capitals, symbols and numbers</span>
              </div>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.punctuation ?? true}
                  onChange={(e) => { playToggle(); setSettings({ ...settings, punctuation: e.target.checked }) }}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Menu Sounds</span>
                <span className="setting-desc">Click sounds on buttons and navigation</span>
              </div>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.menuSounds ?? true}
                  onChange={(e) => { playToggle(); setSettings({ ...settings, menuSounds: e.target.checked }) }}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Completion Sound</span>
                <span className="setting-desc">Chime when a note or screen is completed</span>
              </div>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.completionSound ?? true}
                  onChange={(e) => { playToggle(); setSettings({ ...settings, completionSound: e.target.checked }) }}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Automatic Flashcards</span>
                <span className="setting-desc">Flashcards flip by themselves</span>
              </div>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.autoAdvance ?? true}
                  onChange={(e) => { playToggle(); setSettings({ ...settings, autoAdvance: e.target.checked }) }}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Theme</span>
                <span className="setting-desc">Interface color scheme</span>
              </div>
              <div className="theme-toggle-group">
                <button
                  className={`theme-btn${theme === 'dark' ? ' theme-btn--active' : ''}`}
                  onClick={() => { playToggle(); setTheme('dark') }}
                >Dark</button>
                <button
                  className={`theme-btn${theme === 'light' ? ' theme-btn--active' : ''}`}
                  onClick={() => { playToggle(); setTheme('light') }}
                >Light</button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
