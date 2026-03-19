import { motion, AnimatePresence } from 'framer-motion'
import './SettingsModal.css'

export default function SettingsModal({ isOpen, onClose, settings, setSettings }) {
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
            <button className="btn-close" onClick={onClose}>×</button>
          </div>

          <div className="settings-group">
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Allow Backspace</span>
                <span className="setting-desc">Let you delete mistakes (Hard mode)</span>
              </div>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.allowBackspace}
                  onChange={(e) => setSettings({ ...settings, allowBackspace: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="setting-row">
              <div className="setting-info">
                <span className="setting-label">Punctuation</span>
                <span className="setting-desc">Include capitals, symbols and numbers in text</span>
              </div>
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={settings.punctuation ?? true}
                  onChange={(e) => setSettings({ ...settings, punctuation: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
