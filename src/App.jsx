import { useState, useCallback, useEffect, useMemo } from 'react';
import { Sidebar, Header, BottomNav } from './components/Layout';
import { TranscriptModule } from './components/TranscriptModule';
import { ChunkModule } from './components/ChunkModule';
import { VocabModule } from './components/VocabModule';
import { PracticeModule } from './components/PracticeModule';
import { ProgressModule } from './components/ProgressModule';
import { SettingsModal } from './components/Settings';
import { AuthScreen, ResetPasswordModal } from './components/Auth';
import { Toast, Spinner, ErrorBoundary } from './components/ui';
import { useTranscripts, useSettings, useProgress } from './hooks/useStorage';
import { useAuth } from './hooks/useAuth';
import { generateWritingExercises } from './services/ai';
import { getDueChunks } from './services/srs';
import { registerServiceWorker, sendDueNotification } from './services/notifications';
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [guestMode, setGuestMode]       = useState(false);
  const [selectedTranscriptId, setSelectedTranscriptId] = useState(null);
  const [selectedChunks, setSelectedChunks] = useState(new Set());
  const [allChunks, setAllChunks]       = useState([]);

  // Auto-generate state
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoGenProgress, setAutoGenProgress] = useState({ done: 0, total: 0 });

  const { transcripts, save: saveTranscript, remove: deleteTranscript } = useTranscripts();
  const { settings, save: saveSettings }  = useSettings();
  const { allProgress, update: updateProgress, refresh: refreshProgress } = useProgress();
  const { toasts, addToast, removeToast } = useToast();

  // Auth state
  const {
    user, loading: authLoading,
    signIn, signUp, signOut: authSignOut, resendConfirm,
    resetPassword, updatePassword, isPasswordRecovery, clearPasswordRecovery,
  } = useAuth();

  const handleSignOut = useCallback(async () => {
    await authSignOut();
    setGuestMode(false);
    addToast('info', 'Đã đăng xuất.');
  }, [authSignOut, addToast]);

  // Refresh all chunks whenever transcripts change
  useEffect(() => {
    setAllChunks(storage.getAllChunks());
  }, [transcripts]);

  // Register Service Worker on mount & listen for notification click messages
  useEffect(() => {
    registerServiceWorker();

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const handler = (event) => {
        if (event.data && event.data.type === 'NAVIGATE') {
          setPage(event.data.page || 'practice');
        }
      };
      navigator.serviceWorker.addEventListener('message', handler);
      return () => navigator.serviceWorker.removeEventListener('message', handler);
    }
  }, []);

  // Initial Cloud Sync when user is logged in
  useEffect(() => {
    if (!user) return;
    storage.syncFromSupabase().then(synced => {
      if (synced) {
        setAllChunks(storage.getAllChunks());
        refreshProgress();
      }
    });
  }, [user, refreshProgress]);

  // Spaced Repetition: Calculate Due Chunks
  const dueChunks = useMemo(() => {
    return getDueChunks(allChunks, allProgress);
  }, [allChunks, allProgress]);

  // Web Notification: 4 khung giờ vàng nhắc nhở trong ngày (8h, 12h, 18h, 21h)
  useEffect(() => {
    if (!settings.notificationsEnabled || dueChunks.length === 0) return;
    
    // Check ngay khi số lượng dueChunks thay đổi hoặc app khởi động
    sendDueNotification(dueChunks.length, dueChunks[0]?.phrase || '');

    // Định kỳ mỗi 1 phút kiểm tra lại xem đã tới khung giờ tiếp theo chưa
    const interval = setInterval(() => {
      sendDueNotification(dueChunks.length, dueChunks[0]?.phrase || '');
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [settings.notificationsEnabled, dueChunks.length]);

  // Show settings on first load if no API key (only after auth resolved)
  useEffect(() => {
    if (!authLoading && !storage.getApiKey()) {
      setTimeout(() => setShowSettings(true), 600);
    }
  }, [authLoading]);

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

  // ── Auto-generate situations after analysis ──────────────────
  const handleChunksExtracted = useCallback(async (transcriptId, chunks) => {
    storage.saveChunks(transcriptId, chunks);
    setAllChunks(storage.getAllChunks());
    setSelectedTranscriptId(transcriptId);

    // Auto-select all new chunks
    setSelectedChunks(new Set(chunks.map(c => c.id)));

    // Auto-generate writing exercises for all chunks
    const apiKey = storage.getApiKey();
    if (apiKey && chunks.length > 0) {
      setAutoGenerating(true);
      setAutoGenProgress({ done: 0, total: chunks.length });
      setPage('practice');

      // Sequential with progress (avoids rate-limit issues)
      for (const chunk of chunks) {
        try {
          const result = await generateWritingExercises(chunk, apiKey);
          const exercises = (result.exercises || []).map((ex, i) => ({
            ...ex,
            id: ex.id || `ex_${chunk.id}_${i}`,
            chunkId: chunk.id,
          }));
          storage.saveSituations(chunk.id, exercises);
        } catch (err) {
          console.error(`Auto-gen failed for "${chunk.phrase}":`, err);
        }
        setAutoGenProgress(prev => ({ ...prev, done: prev.done + 1 }));
      }

      setAutoGenerating(false);
    } else {
      setPage('practice');
    }
  }, []);

  // ── Vocab: chunks được sinh từ 1 từ (không auto-navigate sang practice) ──
  const handleVocabChunksExtracted = useCallback((wordId, chunks) => {
    storage.saveChunks(wordId, chunks);
    setAllChunks(storage.getAllChunks());
    // Không set selectedTranscriptId — vocab chunks hiển chung trong "Tất cả"
    // Auto-select các chunk mới để có thể luyện ngay
    setSelectedChunks(prev => {
      const next = new Set(prev);
      chunks.forEach(c => next.add(c.id));
      return next;
    });
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

  const handleStartVocabPractice = useCallback(async (chunksToPractice) => {
    if (!chunksToPractice || chunksToPractice.length === 0) return;

    // Refresh allChunks from storage
    const all = storage.getAllChunks();
    setAllChunks(all);

    // Auto-select these chunks
    setSelectedChunks(new Set(chunksToPractice.map(c => c.id)));

    // Switch to Practice tab
    setPage('practice');

    // Auto-generate writing exercises for any chunks that don't have them yet
    const apiKey = storage.getApiKey();
    const chunksNeedingExercises = chunksToPractice.filter(c => storage.getSituations(c.id).length === 0);

    if (apiKey && chunksNeedingExercises.length > 0) {
      setAutoGenerating(true);
      setAutoGenProgress({ done: 0, total: chunksNeedingExercises.length });

      for (const chunk of chunksNeedingExercises) {
        try {
          const result = await generateWritingExercises(chunk, apiKey);
          const exercises = (result.exercises || []).map((ex, i) => ({
            ...ex,
            id: ex.id || `ex_${chunk.id}_${i}`,
            chunkId: chunk.id,
          }));
          storage.saveSituations(chunk.id, exercises);
        } catch (err) {
          console.error(`Auto-gen failed for "${chunk.phrase}":`, err);
        }
        setAutoGenProgress(prev => ({ ...prev, done: prev.done + 1 }));
      }
      setAutoGenerating(false);
    }
  }, []);

  const handleStartDueReview = useCallback(async () => {
    if (dueChunks.length === 0) return;

    // Refresh allChunks
    const all = storage.getAllChunks();
    setAllChunks(all);

    // Select all due chunks
    setSelectedChunks(new Set(dueChunks.map(c => c.id)));
    setPage('practice');

    // Auto-generate writing exercises for any chunks that don't have them
    const apiKey = storage.getApiKey();
    const chunksNeedingExercises = dueChunks.filter(c => storage.getSituations(c.id).length === 0);

    if (apiKey && chunksNeedingExercises.length > 0) {
      setAutoGenerating(true);
      setAutoGenProgress({ done: 0, total: chunksNeedingExercises.length });

      for (const chunk of chunksNeedingExercises) {
        try {
          const result = await generateWritingExercises(chunk, apiKey);
          const exercises = (result.exercises || []).map((ex, i) => ({
            ...ex,
            id: ex.id || `ex_${chunk.id}_${i}`,
            chunkId: chunk.id,
          }));
          storage.saveSituations(chunk.id, exercises);
        } catch (err) {
          console.error(`Auto-gen failed for "${chunk.phrase}":`, err);
        }
        setAutoGenProgress(prev => ({ ...prev, done: prev.done + 1 }));
      }
      setAutoGenerating(false);
    }
  }, [dueChunks]);

  const handleRepractice = useCallback((chunkId) => {
    setSelectedChunks(new Set([chunkId]));
    setPage('practice');
  }, []);

  // ── Progress handler ─────────────────────────────────
  const handleProgressUpdate = useCallback((chunkId, success, score = null, feedback = null) => {
    updateProgress(chunkId, success, score, feedback);
    if (success) {
      addToast('success', 'Dịch đúng chunk! Tiến độ đã được lưu. 🎉');
    }
  }, [updateProgress, addToast]);

  // ── Nav badge counts ─────────────────────────────────────────
  const counts = {
    transcripts: transcripts.length,
    chunks:      allChunks.length,
    practice:    selectedChunks.size,
    progress:    Object.keys(allProgress).length,
  };

  const chunkCounts = {};
  transcripts.forEach(t => {
    chunkCounts[t.id] = storage.getChunks(t.id).length;
  });

  const displayChunks = selectedTranscriptId
    ? storage.getChunks(selectedTranscriptId)
    : allChunks;

  // ── Auth guard ───────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-base)',
      }}>
        <Spinner size={32} />
      </div>
    );
  }

  // Reset password modal if user landed with recovery token
  if (isPasswordRecovery) {
    return (
      <>
        <ResetPasswordModal
          onUpdatePassword={updatePassword}
          onSuccess={() => {
            clearPasswordRecovery();
            addToast('success', '🎉 Đã cập nhật mật khẩu mới thành công!');
          }}
          onClose={() => clearPasswordRecovery()}
        />
        <Toast toasts={toasts} removeToast={removeToast} />
      </>
    );
  }

  // Show auth screen on initial load if user is not logged in AND has not opted for guest mode
  if (!user && !guestMode) {
    return (
      <>
        <AuthScreen
          onSignIn={signIn}
          onSignUp={signUp}
          onResendConfirm={resendConfirm}
          onResetPassword={resetPassword}
          onContinueAsGuest={() => setGuestMode(true)}
        />
        <Toast toasts={toasts} removeToast={removeToast} />
      </>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        activePage={page}
        onNavigate={setPage}
        counts={counts}
        dueCount={dueChunks.length}
        user={user}
        onSignOut={handleSignOut}
        onLoginClick={() => setShowAuthModal(true)}
        onSettingsClick={() => setShowSettings(true)}
      />

      <div className="main-content">
        <Header
          page={page}
          user={user}
          dueCount={dueChunks.length}
          onDueClick={handleStartDueReview}
          onSignOut={handleSignOut}
          onLoginClick={() => setShowAuthModal(true)}
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

        {/* Auto-generate progress banner */}
        {autoGenerating && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 50,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(67,56,202,0.12))',
            borderBottom: '1px solid rgba(99,102,241,0.3)',
            padding: '10px 24px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Spinner size={16} />
            <span style={{ fontSize: 13, color: 'var(--accent-300)', fontWeight: 600 }}>
              Đang sinh bài luyện viết…
            </span>
            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 99 }}>
              <div style={{
                height: '100%',
                width: `${(autoGenProgress.done / autoGenProgress.total) * 100}%`,
                background: 'linear-gradient(90deg, var(--accent-500), var(--accent-400))',
                borderRadius: 99,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {autoGenProgress.done} / {autoGenProgress.total} chunk
            </span>
          </div>
        )}

        <main className="page-content">
          <ErrorBoundary>
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

            {/* VocabModule: luôn mounted, chỉ ẩn bằng CSS khi không active
                → giữ nguyên state sinh chunk khi user đổi tab rồi quay lại */}
            <div style={{ display: page === 'vocab' ? 'block' : 'none' }}>
              <VocabModule onToast={addToast} onStartPractice={handleStartVocabPractice} />
            </div>

            {/* PracticeModule: luôn mounted, chỉ ẩn bằng CSS khi không active
                → giữ nguyên câu đang viết dở & state khi user chuyển tab */}
            <div style={{ display: page === 'practice' ? 'block' : 'none' }}>
              <PracticeModule
                selectedChunks={selectedChunks}
                chunks={allChunks}
                allProgress={allProgress}
                transcripts={transcripts}
                onProgressUpdate={handleProgressUpdate}
                onToast={addToast}
                autoGenerating={autoGenerating}
                autoGenProgress={autoGenProgress}
                onStartDueReview={handleStartDueReview}
              />
            </div>

            {page === 'progress' && (
              <ProgressModule
                allProgress={allProgress}
                chunks={allChunks}
                transcripts={transcripts}
                onRepractice={handleRepractice}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <BottomNav activePage={page} onNavigate={setPage} counts={counts} dueCount={dueChunks.length} />

      {/* Modals */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
          user={user}
          onSignOut={handleSignOut}
          onOpenAuth={() => setShowAuthModal(true)}
        />
      )}

      {/* Auth Modal (when triggered from header / sidebar / settings) */}
      {showAuthModal && !user && (
        <AuthScreen
          isModal={true}
          onSignIn={async (...args) => {
            const res = await signIn(...args);
            setShowAuthModal(false);
            return res;
          }}
          onSignUp={async (...args) => {
            const res = await signUp(...args);
            return res;
          }}
          onResendConfirm={resendConfirm}
          onResetPassword={resetPassword}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* Reset Password Modal (khi user click link recovery từ email) */}
      {isPasswordRecovery && (
        <ResetPasswordModal
          onUpdatePassword={updatePassword}
          onSuccess={() => {
            clearPasswordRecovery();
            addToast('success', '🎉 Đã cập nhật mật khẩu mới thành công!');
          }}
          onClose={() => clearPasswordRecovery()}
        />
      )}

      {/* Toasts */}
      <Toast toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
