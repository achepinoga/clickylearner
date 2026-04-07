import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { playClick, playBack } from '../sounds'
import './FlashcardsPage.css'

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

function FolderIcon({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      {open
        ? <path d="M1 4h12v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4zM1 4V3a1 1 0 011-1h3.5l1 1.5H13a1 1 0 011 1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        : <path d="M1 3a1 1 0 011-1h3.5l1 1.5H12a1 1 0 011 1V11a1 1 0 01-1 1H2a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      }
    </svg>
  )
}

function SetRow({ set, folders, onStudy, onTest, onDelete, onMove }) {
  const [showMove, setShowMove] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef()
  const dropdownRef = useRef()

  useEffect(() => {
    if (!showMove) return
    const handler = (e) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) setShowMove(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMove])

  const handleMoveClick = () => {
    if (!showMove && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setShowMove(v => !v)
  }

  const title = set.title.replace(/\.[^.]+$/, '')

  return (
    <div className="set-row">
      <div className="set-row-info">
        <span className="set-row-title">&gt; {title}</span>
        <span className="set-row-meta">{set.notes.length} notes · {timeAgo(set.created_at)}</span>
      </div>
      <div className="set-row-actions">
        <button className="set-btn set-btn-study" onClick={() => { playClick(); onStudy(set) }}>
          Study →
        </button>
        <button className="set-btn set-btn-test" onClick={() => { playClick(); onTest(set) }} title="Generate a quiz on this set (uses 1 AI action)">
          Test
        </button>
        {folders.length > 0 && (
          <>
            <button ref={btnRef} className="set-btn set-btn-move" onClick={handleMoveClick} title="Move to folder">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 3a1 1 0 011-1h2.5l.8 1.2H10a1 1 0 011 1V9a1 1 0 01-1 1H2a1 1 0 01-1-1V3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
            <AnimatePresence>
              {showMove && (
                <motion.div
                  ref={dropdownRef}
                  className="move-dropdown"
                  style={{ top: dropdownPos.top, right: dropdownPos.right }}
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                >
                  {set.folder_id && (
                    <button className="move-option" onClick={() => { onMove(set.id, null); setShowMove(false) }}>
                      Remove from folder
                    </button>
                  )}
                  {folders.filter(f => f.id !== set.folder_id).map(folder => (
                    <button key={folder.id} className="move-option" onClick={() => { onMove(set.id, folder.id); setShowMove(false) }}>
                      → {folder.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
        <button className="set-btn set-btn-delete" onClick={() => onDelete(set.id)} aria-label="Delete">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function FlashcardsPage({ user, onNewFile, onStudySet, onTestSet, onBack, onSignIn }) {
  const [folders, setFolders] = useState([])
  const [sets, setSets] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState(new Set())
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const newFolderInputRef = useRef()

  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([
      supabase.from('folders').select('*').order('created_at', { ascending: true }),
      supabase.from('flashcard_sets').select('id, title, notes, folder_id, created_at').order('created_at', { ascending: false })
    ]).then(([fRes, sRes]) => {
      const folderData = fRes.data || []
      setFolders(folderData)
      setSets(sRes.data || [])
      setExpandedFolders(new Set(folderData.map(f => f.id)))
    }).finally(() => setLoading(false))
  }, [user])

  useEffect(() => {
    if (showNewFolder) newFolderInputRef.current?.focus()
  }, [showNewFolder])

  const toggleFolder = (id) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const createFolder = async () => {
    if (!newFolderName.trim() || creatingFolder) return
    setCreatingFolder(true)
    const { data } = await supabase
      .from('folders')
      .insert({ user_id: user.id, name: newFolderName.trim() })
      .select().single()
    if (data) {
      setFolders(prev => [...prev, data])
      setExpandedFolders(prev => new Set([...prev, data.id]))
    }
    setNewFolderName('')
    setShowNewFolder(false)
    setCreatingFolder(false)
  }

  const deleteFolder = async (id) => {
    await supabase.from('flashcard_sets').update({ folder_id: null }).eq('folder_id', id)
    await supabase.from('folders').delete().eq('id', id)
    setFolders(prev => prev.filter(f => f.id !== id))
    setSets(prev => prev.map(s => s.folder_id === id ? { ...s, folder_id: null } : s))
  }

  const deleteSet = async (id) => {
    await supabase.from('flashcard_sets').delete().eq('id', id)
    setSets(prev => prev.filter(s => s.id !== id))
  }

  const moveSet = async (setId, folderId) => {
    await supabase.from('flashcard_sets').update({ folder_id: folderId }).eq('id', setId)
    setSets(prev => prev.map(s => s.id === setId ? { ...s, folder_id: folderId } : s))
  }

  const uncategorized = sets.filter(s => !s.folder_id)
  const folderSets = (folderId) => sets.filter(s => s.folder_id === folderId)

  return (
    <div className="fc-page">
      <div className="fc-header">
        <div className="fc-title-row">
          <span className="fc-eyebrow">// Flashcard Sets</span>
          <motion.button
            className="fc-new-btn"
            onClick={() => { playClick(); onNewFile() }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1.5v10M1.5 6.5h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            Upload New File
          </motion.button>
        </div>
      </div>

      <div className="fc-body">
        {!user ? (
          <div className="fc-guest">
            <p className="fc-guest-msg">&gt; Sign in to save, organize and replay your flashcard sets.</p>
            <button className="fc-signin-btn" onClick={onSignIn}>Sign In →</button>
          </div>
        ) : loading ? (
          <div className="fc-loading">
            {[0,1,2].map(i => (
              <motion.span key={i} className="fc-dot"
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        ) : (
          <>
            {/* Folders section */}
            <div className="fc-section">
              <div className="fc-section-header">
                <span className="fc-section-label">// Folders</span>
                <button
                  className="fc-add-folder-btn"
                  onClick={() => setShowNewFolder(v => !v)}
                >
                  {showNewFolder ? 'Cancel' : '+ New Folder'}
                </button>
              </div>

              <AnimatePresence>
                {showNewFolder && (
                  <motion.div
                    className="fc-new-folder-row"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <input
                      ref={newFolderInputRef}
                      className="fc-folder-input"
                      placeholder="Folder name..."
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName('') } }}
                    />
                    <button className="fc-folder-create-btn" onClick={createFolder} disabled={!newFolderName.trim()}>
                      Create →
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {folders.length === 0 && !showNewFolder && (
                <p className="fc-empty-hint">&gt; No folders yet. Create one to organize your sets.</p>
              )}

              <div className="fc-folders-list">
                {folders.map(folder => {
                  const folderSetList = folderSets(folder.id)
                  const isOpen = expandedFolders.has(folder.id)
                  return (
                    <div key={folder.id} className="fc-folder">
                      <div className="fc-folder-header" onClick={() => toggleFolder(folder.id)}>
                        <div className="fc-folder-left">
                          <span className={`fc-folder-arrow ${isOpen ? 'open' : ''}`}>▶</span>
                          <FolderIcon open={isOpen} />
                          <span className="fc-folder-name">{folder.name}</span>
                          <span className="fc-folder-count">{folderSetList.length}</span>
                        </div>
                        <button
                          className="fc-folder-delete"
                          onClick={e => { e.stopPropagation(); deleteFolder(folder.id) }}
                          aria-label="Delete folder"
                        >
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                            <path d="M1.5 1.5l8 8M9.5 1.5l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </div>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            className="fc-folder-sets"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            {folderSetList.length === 0 ? (
                              <p className="fc-folder-empty">&gt; No sets in this folder.</p>
                            ) : (
                              folderSetList.map(set => (
                                <SetRow
                                  key={set.id}
                                  set={set}
                                  folders={folders}
                                  onStudy={onStudySet}
                                  onTest={onTestSet}
                                  onDelete={deleteSet}
                                  onMove={moveSet}
                                />
                              ))
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Uncategorized section */}
            {uncategorized.length > 0 && (
              <div className="fc-section">
                <div className="fc-section-header">
                  <span className="fc-section-label">// Uncategorized</span>
                  <span className="fc-section-count">{uncategorized.length}</span>
                </div>
                <div className="fc-uncategorized-list">
                  {uncategorized.map(set => (
                    <SetRow
                      key={set.id}
                      set={set}
                      folders={folders}
                      onStudy={onStudySet}
                      onTest={onTestSet}
                      onDelete={deleteSet}
                      onMove={moveSet}
                    />
                  ))}
                </div>
              </div>
            )}

            {sets.length === 0 && (
              <p className="fc-empty-hint" style={{ marginTop: 24 }}>
                &gt; No saved sets yet. Upload a file to get started.
              </p>
            )}
          </>
        )}
      </div>

      <div className="fc-footer">
        <button className="fc-back-btn" onClick={() => { playBack(); onBack() }}>← Back</button>
      </div>
    </div>
  )
}
