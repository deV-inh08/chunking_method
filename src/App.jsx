import { useState, useCallback, useEffect, useMemo } from 'react';
import { Sidebar, Header, BottomNav, MobileFloatingMenuBtn } from './components/Layout';
import { ListeningAiModule } from './components/ListeningAiModule';
import { ReadingModule } from './components/ReadingModule';
import { ChunkModule } from './components/ChunkModule';
import { VocabModule } from './components/VocabModule';
import { VisualVocabModule } from './components/VisualVocabModule';
import { WordBasketModule } from './components/WordBasketModule';
import { PracticeModule } from './components/PracticeModule';
import { ProgressModule } from './components/ProgressModule';
import { SettingsModal } from './components/Settings';
import { AuthScreen, ResetPasswordModal } from './components/Auth';
import { ConversationalSpeakingModal } from './components/ConversationalSpeaking';
import { Toast, Spinner, ErrorBoundary } from './components/ui';
import { useTranscripts, useSettings, useProgress } from './hooks/useStorage';
import { useAuth } from './hooks/useAuth';
import { generateWritingExercises } from './services/ai';
import { getDueChunks } from './services/srs';
import { registerServiceWorker, sendDueNotification } from './services/notifications';
import { dbSaveUserSettings } from './services/supabase';
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
  const [page, setPage]                 = useState(() => {
    try {
      const p = localStorage.getItem('toeic_active_page');
      if (p === 'transcripts' || p === 'overview') return 'ai_listening';
      return p || 'ai_listening';
    } catch {
      return 'ai_listening';
    }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAiSpeakingModal, setShowAiSpeakingModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [guestMode, setGuestMode]       = useState(() => {
    try {
      return localStorage.getItem('toeic_guest_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [selectedTranscriptId, setSelectedTranscriptId] = useState(() => {
    try {
      return localStorage.getItem('toeic_active_transcript_id') || null;
    } catch {
      return null;
    }
  });
  const [selectedChunks, setSelectedChunks] = useState(() => {
    try {
      const raw = localStorage.getItem('toeic_selected_chunks');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0) {
          return new Set(arr);
        }
      }
    } catch { /* ignore */ }
    return new Set();
  });
  const [allChunks, setAllChunks]       = useState(() => storage.getAllChunks());

  // Kiểm tra URL query param (mở tab từ Extension)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tab = urlParams.get('tab');
      if (tab === 'basket' || tab === 'word_basket') {
        setPage('word_basket');
      }
    } catch { /* ignore */ }
  }, []);

  // Lưu active states vào localStorage để sống sót qua các lần F5
  useEffect(() => {
    try {
      localStorage.setItem('toeic_active_page', page);
    } catch { /* ignore */ }
  }, [page]);

  useEffect(() => {
    try {
      localStorage.setItem('toeic_guest_mode', guestMode ? 'true' : 'false');
    } catch { /* ignore */ }
  }, [guestMode]);

  useEffect(() => {
    try {
      if (selectedTranscriptId) {
        localStorage.setItem('toeic_active_transcript_id', selectedTranscriptId);
      } else {
        localStorage.removeItem('toeic_active_transcript_id');
      }
    } catch { /* ignore */ }
  }, [selectedTranscriptId]);

  useEffect(() => {
    try {
      localStorage.setItem('toeic_selected_chunks', JSON.stringify([...selectedChunks]));
    } catch { /* ignore */ }
  }, [selectedChunks]);

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
    try {
      localStorage.removeItem('toeic_guest_mode');
    } catch { /* ignore */ }
    addToast('info', 'Đã đăng xuất.');
  }, [authSignOut, addToast]);

  // Tự động đồng bộ Gemini API key lên Supabase khi user đã đăng nhập
  useEffect(() => {
    if (user && (settings.apiKey || settings.apiKey2)) {
      dbSaveUserSettings(settings).catch(() => {});
    }
  }, [user, settings.apiKey, settings.apiKey2]);

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

  // Helper: batch generate exercises with retry and delay to prevent 429 rate limit
  const runBatchExerciseGen = useCallback(async (chunksNeedingExercises, apiKey) => {
    if (!apiKey || !chunksNeedingExercises || chunksNeedingExercises.length === 0) return;
    setAutoGenerating(true);
    setAutoGenProgress({ done: 0, total: chunksNeedingExercises.length });

    let failedCount = 0;
    for (let i = 0; i < chunksNeedingExercises.length; i++) {
      const chunk = chunksNeedingExercises[i];
      let success = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await generateWritingExercises(chunk, apiKey);
          const exercises = (result.exercises || []).map((ex, exIdx) => ({
            ...ex,
            id: ex.id || `ex_${chunk.id}_${exIdx}`,
            chunkId: chunk.id,
          }));
          if (exercises.length > 0) {
            storage.saveSituations(chunk.id, exercises);
            success = true;
            break;
          }
        } catch (err) {
          console.warn(`[Auto-gen] Chunk "${chunk.phrase}" thử lại (${attempt + 1}/2):`, err.message);
          if (attempt < 1) {
            await new Promise(r => setTimeout(r, 2500));
          }
        }
      }
      if (!success) {
        failedCount++;
        // Nghỉ 2s tránh spam liên tục khi vừa chạm 429
        await new Promise(r => setTimeout(r, 2000));
      }
      setAutoGenProgress(prev => ({ ...prev, done: i + 1 }));
    }

    setAutoGenerating(false);
    if (failedCount > 0) {
      addToast('info', `Đã chuẩn bị xong ${chunksNeedingExercises.length - failedCount}/${chunksNeedingExercises.length} chunk. Chunk còn lại bạn có thể bấm "Tạo bài luyện" trực tiếp.`);
    }
  }, [addToast]);

  // ── Auto-generate situations after analysis ──────────────────
  const handleChunksExtracted = useCallback(async (transcriptId, chunks) => {
    storage.saveChunks(transcriptId, chunks);
    setAllChunks(storage.getAllChunks());
    setSelectedTranscriptId(transcriptId);

    // Auto-select all new chunks
    setSelectedChunks(new Set(chunks.map(c => c.id)));

    // Auto-generate writing exercises for all chunks
    const apiKey = storage.getApiKey();
    setPage('practice');
    if (apiKey && chunks.length > 0) {
      runBatchExerciseGen(chunks, apiKey);
    }
  }, [runBatchExerciseGen]);

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

  // ── Grammar Reading: chunks được lưu từ câu hỏi ngữ pháp ──
  const handleSaveGrammarChunk = useCallback(() => {
    setAllChunks(storage.getAllChunks());
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
      runBatchExerciseGen(chunksNeedingExercises, apiKey);
    }
  }, [runBatchExerciseGen]);

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
      runBatchExerciseGen(chunksNeedingExercises, apiKey);
    }
  }, [dueChunks, runBatchExerciseGen]);

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

  const handleRemoveChunksFromPractice = useCallback((chunkIdsToRemove) => {
    if (!chunkIdsToRemove || chunkIdsToRemove.length === 0) return;
    setSelectedChunks(prev => {
      const next = new Set(prev);
      chunkIdsToRemove.forEach(id => next.delete(id));
      return next;
    });
    addToast('info', `Đã dọn dẹp ${chunkIdsToRemove.length} bài đã ôn xong khỏi tab Practice.`);
  }, [addToast]);

  const handleStartBasketPractice = useCallback((chunkIds) => {
    if (!chunkIds || chunkIds.length === 0) return;
    const freshAll = storage.getAllChunks();
    setAllChunks(freshAll);
    setSelectedChunks(new Set(chunkIds));
    setPage('practice');
    addToast('success', `⚡ Đã tạo thành công ${chunkIds.length} Chunks và bài luyện từ giỏ từ!`);
  }, [addToast]);

  // ── Nav badge counts ─────────────────────────────────────────
  const learnedVocabCount = useMemo(() => {
    try {
      return Object.keys(storage.getLearnedVocab()).length;
    } catch {
      return 0;
    }
  }, []);

  const basketPendingCount = useMemo(() => {
    try {
      return storage.getSavedWords().filter(w => w.status === 'pending').length;
    } catch {
      return 0;
    }
  }, []);

  const counts = {
    ai_listening: transcripts.length,
    reading:      24,
    vocab:        learnedVocabCount,
    word_basket:  basketPendingCount,
    visual_vocab: 10,
    chunks:       allChunks.length,
    practice:     selectedChunks.size,
    progress:     Object.keys(allProgress).length,
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
        onNavigate={(p) => {
          setMobileMenuOpen(false);
          if (p === 'ai_speaking') {
            setShowAiSpeakingModal(true);
          } else {
            setPage(p);
          }
        }}
        counts={counts}
        dueCount={dueChunks.length}
        user={user}
        onSignOut={handleSignOut}
        onLoginClick={() => setShowAuthModal(true)}
        onSettingsClick={() => setShowSettings(true)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Floating Menu Trigger Button (Bottom-Left for Mobile) */}
      <MobileFloatingMenuBtn
        onClick={() => setMobileMenuOpen(true)}
        isOpen={mobileMenuOpen}
      />

      <div className="main-content">
        <Header
          page={page}
          user={user}
          dueCount={dueChunks.length}
          onDueClick={handleStartDueReview}
          onOpenAiSpeaking={() => setShowAiSpeakingModal(true)}
          onOpenMobileDrawer={() => setMobileMenuOpen(true)}
          onSignOut={handleSignOut}
          onLoginClick={() => setShowAuthModal(true)}
          onSettingsClick={() => setShowSettings(true)}
          rightSlot={
            page === 'chunks' && allChunks.length > 0 && (
              <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="badge badge-neutral">{allChunks.length} chunks</span>
              </div>
            )
          }
        />

        {/* Auto-generate progress banner */}
        {autoGenerating && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 50,
            background: 'linear-gradient(135deg, rgba(53,106,230,0.15), rgba(37,99,235,0.12))',
            borderBottom: '1px solid rgba(53,106,230,0.3)',
            padding: '10px 24px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Spinner size={16} />
            <span style={{ fontSize: 13, color: 'var(--accent-400)', fontWeight: 600 }}>
              Đang sinh bài luyện viết…
            </span>
            <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 99 }}>
              <div style={{
                height: '100%',
                width: `${(autoGenProgress.done / autoGenProgress.total) * 100}%`,
                background: 'var(--primary)',
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
            {(page === 'ai_listening' || page === 'transcripts') && (
              <ListeningAiModule
                transcripts={transcripts}
                onSave={handleSaveTranscript}
                onDelete={handleDeleteTranscript}
                onChunksExtracted={handleChunksExtracted}
                allProgress={allProgress}
                onToast={addToast}
                onStartPractice={(transcriptId) => {
                  setSelectedTranscriptId(transcriptId);
                  const tChunks = storage.getChunks(transcriptId);
                  if (tChunks.length > 0) {
                    setSelectedChunks(new Set(tChunks.map(c => c.id)));
                    setPage('practice');
                  } else {
                    setPage('chunks');
                  }
                }}
              />
            )}

            {page === 'reading' && (
              <ReadingModule
                onSaveChunk={handleSaveGrammarChunk}
                onNavigate={setPage}
                addToast={addToast}
              />
            )}

            {page === 'chunks' && (
              <ChunkModule
                chunks={displayChunks}
                allChunks={allChunks}
                selectedTranscriptId={selectedTranscriptId}
                onSelectTranscript={setSelectedTranscriptId}
                transcripts={transcripts}
                selectedChunks={selectedChunks}
                onToggleChunk={handleToggleChunk}
                onSelectMultipleChunks={(chunkIds, shouldSelect) => {
                  setSelectedChunks(prev => {
                    const next = new Set(prev);
                    if (shouldSelect) {
                      chunkIds.forEach(id => next.add(id));
                    } else {
                      chunkIds.forEach(id => next.delete(id));
                    }
                    return next;
                  });
                }}
                onClearSelectedChunks={() => setSelectedChunks(new Set())}
                onSituationsGenerated={handleSituationsGenerated}
                allProgress={allProgress}
                onToast={addToast}
                onStartPractice={handleStartPractice}
                onOpenAiSpeaking={(chunkIds = null) => {
                  if (chunkIds && chunkIds.length > 0) {
                    setSelectedChunks(new Set(chunkIds));
                  }
                  setShowAiSpeakingModal(true);
                }}
              />
            )}

            {/* VocabModule: luôn mounted, chỉ ẩn bằng CSS khi không active
                → giữ nguyên state sinh chunk khi user đổi tab rồi quay lại */}
            <div style={{ display: page === 'vocab' ? 'block' : 'none' }}>
              <VocabModule
                onToast={addToast}
                onStartPractice={handleStartVocabPractice}
                onNavigate={setPage}
              />
            </div>

            {/* WordBasketModule: Giỏ từ vựng lưu từ Chrome Extension */}
            <div style={{ display: page === 'word_basket' ? 'block' : 'none' }}>
              <WordBasketModule
                onStartPractice={handleStartBasketPractice}
                onOpenSettings={() => setShowSettings(true)}
              />
            </div>

            {/* VisualVocabModule: luôn mounted, giữ nguyên state khám phá khi chuyển tab */}
            <div style={{ display: page === 'visual_vocab' ? 'block' : 'none' }}>
              <VisualVocabModule
                onToast={addToast}
                onStartPractice={handleStartVocabPractice}
                onNavigate={setPage}
              />
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
                onRefreshProgress={refreshProgress}
                onRemoveChunksFromPractice={handleRemoveChunksFromPractice}
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
                onNavigate={setPage}
                onStartDueReview={handleStartDueReview}
              />
            )}
          </ErrorBoundary>
        </main>
      </div>


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

      {/* AI Conversational Speaking Modal (Phòng Luyện Nói Giao Tiếp AI) */}
      {showAiSpeakingModal && (
        <ConversationalSpeakingModal
          isOpen={showAiSpeakingModal}
          onClose={() => setShowAiSpeakingModal(false)}
          onNavigateToProgress={() => {
            setShowAiSpeakingModal(false);
            setPage('progress');
          }}
          initialChunks={Array.from(selectedChunks).map(id => allChunks.find(c => c.id === id)).filter(Boolean)}
          onChunkMastered={(chunkPhrase) => {
            addToast('success', `🎉 Đã kích hoạt phản xạ tự nhiên: "${chunkPhrase}"!`);
          }}
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
