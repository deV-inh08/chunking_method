import { useState, useCallback, useEffect } from 'react';
import { Sidebar, Header, BottomNav } from './components/Layout';
import { TranscriptModule } from './components/TranscriptModule';
import { ChunkModule } from './components/ChunkModule';
import { PracticeModule } from './components/PracticeModule';
import { ProgressModule } from './components/ProgressModule';
import { SettingsModal } from './components/Settings';
import { Toast } from './components/ui';
import {
  useTranscripts,
  useSettings,
  useProgress,
} from './hooks/useStorage';
import * as storage from './store/storage';

// ─── Toast hook ───────────────────────────────────────────────
let toastId = 0;
function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

// ─── App ──────────────────────────────────────────────────────
export default function App() {
  const [page, setPage]                 = useState('transcripts');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTranscriptId, setSelectedTranscriptId] = useState(null);
  const [selectedChunks, setSelectedChunks] = useState(new Set());
  const [allChunks, setAllChunks]       = useState([]);

  const { transcripts, save: saveTranscript, remove: deleteTranscript } = useTranscripts();
  const { settings, save: saveSettings }  = useSettings();
  const { allProgress, update: updateProgress, refresh: refreshProgress } = useProgress();
  const { toasts, addToast, removeToast } = useToast();

  // Refresh all chunks from storage whenever transcripts change
  useEffect(() => {
    setAllChunks(storage.getAllChunks());
  }, [transcripts]);

  // Show settings on first load if no API key
  useEffect(() => {
    if (!storage.getApiKey()) {
      setTimeout(() => setShowSettings(true), 600);
    }
  }, []);

  // ── Transcript handlers ──────────────────────────────────────
  const handleSaveTranscript = useCallback((transcript) => {
    saveTranscript(transcript);
  }, [saveTranscript]);

  const handleDeleteTranscript = useCallback((id) => {
    deleteTranscript(id);
    setAllChunks(storage.getAllChunks());
    if (selectedTranscriptId === id) setSelectedTranscriptId(null);
    addToast('success', 'Đã xóa transcript.');
  }, [deleteTranscript, selectedTranscriptId, addToast]);

  const handleChunksExtracted = useCallback((transcriptId, chunks) => {
    storage.saveChunks(transcriptId, chunks);
    setAllChunks(storage.getAllChunks());
    setSelectedTranscriptId(transcriptId);
    setPage('chunks');
  }, []);

  const handleSelectTranscript = useCallback((id) => {
    setSelectedTranscriptId(id);
    setPage('chunks');
  }, []);

  // ── Chunk handlers ───────────────────────────────────────────
  const handleToggleChunk = useCallback((chunkId) => {
    setSelectedChunks(prev => {
      const next = new Set(prev);
      if (next.has(chunkId)) next.delete(chunkId);
      else next.add(chunkId);
      return next;
    });
  }, []);

  const handleSituationsGenerated = useCallback((chunkId, situations) => {
    storage.saveSituations(chunkId, situations);
  }, []);

  const handleStartPractice = useCallback(() => {
    setPage('practice');
  }, []);

  // ── Progress handler ─────────────────────────────────────────
  const handleProgressUpdate = useCallback((chunkId, matched) => {
    updateProgress(chunkId, matched);
    if (matched) {
      addToast('success', 'Chunk match! Tiến độ đã được lưu. 🎉');
    }
  }, [updateProgress, addToast]);

  // ── Nav badge counts ─────────────────────────────────────────
  const counts = {
    transcripts: transcripts.length,
    chunks:      allChunks.length,
    practice:    selectedChunks.size,
    progress:    Object.keys(allProgress).length,
  };

  // ── Chunk counts per transcript (for transcript list) ────────
  const chunkCounts = {};
  transcripts.forEach(t => {
    chunkCounts[t.id] = storage.getChunks(t.id).length;
  });

  // ── Chunks to display in chunk module ────────────────────────
  const displayChunks = selectedTranscriptId
    ? storage.getChunks(selectedTranscriptId)
    : allChunks;

  return (
    <div className="app-shell">
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        counts={counts}
        onSettingsClick={() => setShowSettings(true)}
      />

      <div className="main-content">
        <Header
          page={page}
          onSettingsClick={() => setShowSettings(true)}
          rightSlot={
            page === 'chunks' && allChunks.length > 0 && (
              <div className="flex items-center gap-2">
                {selectedTranscriptId && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSelectedTranscriptId(null)}
                  >
                    Xem tất cả
                  </button>
                )}
                <span className="badge badge-neutral">{displayChunks.length} chunks</span>
              </div>
            )
          }
        />

        <main className="page-content">
          {page === 'transcripts' && (
            <TranscriptModule
              transcripts={transcripts}
              onSave={handleSaveTranscript}
              onDelete={handleDeleteTranscript}
              onChunksExtracted={handleChunksExtracted}
              onSelectTranscript={handleSelectTranscript}
              chunkCounts={chunkCounts}
              onToast={addToast}
            />
          )}

          {page === 'chunks' && (
            <ChunkModule
              chunks={displayChunks}
              selectedTranscriptId={selectedTranscriptId}
              transcripts={transcripts}
              selectedChunks={selectedChunks}
              onToggleChunk={handleToggleChunk}
              onSituationsGenerated={handleSituationsGenerated}
              allProgress={allProgress}
              onToast={addToast}
              onStartPractice={handleStartPractice}
            />
          )}

          {page === 'practice' && (
            <PracticeModule
              selectedChunks={selectedChunks}
              chunks={allChunks}
              allProgress={allProgress}
              onProgressUpdate={handleProgressUpdate}
              onToast={addToast}
            />
          )}

          {page === 'progress' && (
            <ProgressModule
              allProgress={allProgress}
              chunks={allChunks}
            />
          )}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav
        activePage={page}
        onNavigate={setPage}
        counts={counts}
      />

      {/* Modals */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Toasts */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
