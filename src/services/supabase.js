import { createClient } from '@supabase/supabase-js';

// ─── Supabase Project Fallback Credentials ─────────────────────
// Fallback publishable key and URL for client-side cloud sync
const FALLBACK_SUPABASE_URL = 'https://htbphzjxjdupigxkrdfk.supabase.co';
const FALLBACK_SUPABASE_KEY = 'sb_publishable_xjwDQf0UQ4KEsqWsWrsqwg_fAIvvN4g';

// ─── Credentials ───────────────────────────────────────────────
export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  // Supabase mới đổi tên: PUBLISHABLE_KEY = ANON_KEY (cùng 1 key)
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY
              || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (envUrl && envKey && !envUrl.includes('your-project') && envKey.length > 20) {
    return { url: envUrl, key: envKey, source: 'env' };
  }

  try {
    const raw = localStorage.getItem('toeic_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.supabaseUrl && parsed.supabaseKey) {
        return { url: parsed.supabaseUrl, key: parsed.supabaseKey, source: 'settings' };
      }
    }
  } catch { /* ignore */ }

  if (FALLBACK_SUPABASE_URL && FALLBACK_SUPABASE_KEY) {
    return { url: FALLBACK_SUPABASE_URL, key: FALLBACK_SUPABASE_KEY, source: 'fallback' };
  }

  return { url: '', key: '', source: 'none' };
}

let cachedClient = null;
let cachedCombo = null;

export function getSupabaseClient() {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) return null;
  const combo = `${url}:${key}`;
  if (cachedClient && cachedCombo === combo) return cachedClient;
  try {
    cachedClient = createClient(url, key);
    cachedCombo = combo;
    return cachedClient;
  } catch (err) {
    console.error('Supabase client error:', err);
    return null;
  }
}

export function isSupabaseConfigured() {
  return !!getSupabaseClient();
}

// ─── Auth helpers ──────────────────────────────────────────────
async function getCurrentUserId() {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  return session?.user?.id || null;
}

// ─── Auth API ──────────────────────────────────────────────────
export async function authSignUp(email, password) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase chưa được cấu hình. Vào Settings để nhập URL & Key.');
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function authSignIn(email, password) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase chưa được cấu hình. Vào Settings để nhập URL & Key.');
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function authSignOut() {
  const client = getSupabaseClient();
  if (!client) return;
  await client.auth.signOut();
}

// Resend xác nhận email (khi user chưa confirm sau khi đăng ký)
export async function authResend(email) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase chưa được cấu hình. Vào Settings để nhập URL & Key.');
  const { error } = await client.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

// Gửi email đặt lại mật khẩu
export async function authResetPasswordForEmail(email) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase chưa được cấu hình. Vào Settings để nhập URL & Key.');
  const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
  const { data, error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) throw error;
  return data;
}

// Cập nhật mật khẩu mới
export async function authUpdatePassword(newPassword) {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase chưa được cấu hình. Vào Settings để nhập URL & Key.');
  const { data, error } = await client.auth.updateUser({ password: newPassword });
  if (error) throw error;
  return data;
}

export async function authGetSession() {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  return session;
}

export function authOnChange(callback) {
  const client = getSupabaseClient();
  if (!client) return () => { };
  const { data: { subscription } } = client.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

// ─── Data — Transcripts ────────────────────────────────────────
export async function dbSaveTranscript(transcript) {
  const client = getSupabaseClient();
  if (!client) return null;
  const userId = await getCurrentUserId();

  const { data, error } = await client.from('transcripts').upsert({
    id: transcript.id,
    user_id: userId,
    text: transcript.text,
    part: transcript.part,
    theme: transcript.theme || '',
    theme_vi: transcript.themeVi || '',
    theme_description: transcript.themeDescription || '',
    created_at: transcript.createdAt,
  });
  if (error) console.error('Supabase save transcript error:', error);
  return data;
}

export async function dbDeleteTranscript(id) {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from('transcripts').delete().eq('id', id);
  if (error) console.error('Supabase delete transcript error:', error);
}

// ─── Data — Chunks ─────────────────────────────────────────────
export async function dbSaveChunks(chunks) {
  const client = getSupabaseClient();
  if (!client || !chunks?.length) return;
  const userId = await getCurrentUserId();

  const rows = chunks.map(c => ({
    id: c.id,
    user_id: userId,
    transcript_id: c.transcriptId || null,
    phrase: c.phrase,
    type: c.type,
    meaning_vi: c.meaningVi || '',
    usage_note: c.usageNote || '',
    original_sentence: c.originalSentence || '',
    another_example: c.anotherExample || '',
    formality: c.formality || 'neutral',
    group_id: c.groupId || '',
    group_name: c.groupName || '',
    // Vocab fields (null for transcript chunks)
    source_type:    c.sourceType    || 'transcript',
    source_word_id: c.sourceWordId  || null,
    topic:          c.topic         || null,
  }));

  const { error } = await client.from('chunks').upsert(rows);
  if (error) console.error('Supabase save chunks error:', error);
}

// ─── Data — Situations ─────────────────────────────────────────
export async function dbSaveSituations(situations) {
  const client = getSupabaseClient();
  if (!client || !situations?.length) return;
  const userId = await getCurrentUserId();

  const rows = situations.map(s => {
    const viSentence = s.vietnameseSentence || s.context || s.prompt || '';
    const sampleTrans = s.sampleTranslation || s.exampleSentence || s.exampleResponse || '';
    return {
      id: s.id,
      user_id: userId,
      chunk_id: s.chunkId,
      context: viSentence,
      example_sentence: sampleTrans,
      // Backward compat & rich fields
      prompt: viSentence,
      hint: s.tenseExplanation || s.hint || '',
      example_response: sampleTrans,
      level: s.level ?? 1,
      level_label: s.levelLabel || '',
      vietnamese_sentence: viSentence,
      sample_translation: sampleTrans,
      tense_used: s.tenseUsed || '',
      tense_explanation: s.tenseExplanation || '',
      vocab_hints: s.vocabHints ? (typeof s.vocabHints === 'string' ? s.vocabHints : JSON.stringify(s.vocabHints)) : '[]',
      sentence_breakdown: s.sentenceBreakdown ? (typeof s.sentenceBreakdown === 'string' ? s.sentenceBreakdown : JSON.stringify(s.sentenceBreakdown)) : '[]',
    };
  });

  const { error } = await client.from('situations').upsert(rows);
  if (error) console.error('Supabase save situations error:', error);
}

// ─── Data — Progress ───────────────────────────────────────────
export async function dbSaveProgress(progressItem) {
  const client = getSupabaseClient();
  if (!client || !progressItem) return;
  const userId = await getCurrentUserId();
  if (!userId) return; // không lưu khi chưa đăng nhập

  const srsPayload = {
    feedback: progressItem.lastFeedback || null,
    srsLevel: progressItem.srsLevel,
    srsTrack: progressItem.srsTrack,
    easeFactor: progressItem.easeFactor,
    intervalMinutes: progressItem.intervalMinutes,
    nextReviewAt: progressItem.nextReviewAt,
    status: progressItem.status,
  };

  const { error } = await client.from('progress').upsert({
    chunk_id:       progressItem.chunkId,
    user_id:        userId,
    practice_count: progressItem.practiceCount,
    success_count:  progressItem.successCount,
    last_practiced: progressItem.lastPracticed,
    last_result:    progressItem.lastResult,
    last_score:     progressItem.lastScore    ?? null,
    last_feedback:  JSON.stringify(srsPayload),
  }, { onConflict: 'user_id,chunk_id' }); // composite PK sau migration
  if (error) console.error('Supabase save progress error:', error);
}

// ─── Fetch all data for current user ──────────────────────────
export async function dbFetchAllData() {
  const client = getSupabaseClient();
  if (!client) return null;

  const userId = await getCurrentUserId();
  if (!userId) return null; // Not logged in — skip cloud fetch

  try {
    const [tRes, cRes, sRes, pRes] = await Promise.all([
      client.from('transcripts').select('*').eq('user_id', userId),
      client.from('chunks').select('*').eq('user_id', userId),
      client.from('situations').select('*').eq('user_id', userId),
      client.from('progress').select('*').eq('user_id', userId),
    ]);

    if (tRes.error) throw tRes.error;
    if (cRes.error) throw cRes.error;
    if (sRes.error) throw sRes.error;
    if (pRes.error) throw pRes.error;

    const transcriptsMap = {};
    (tRes.data || []).forEach(t => {
      transcriptsMap[t.id] = {
        id: t.id, text: t.text, part: t.part,
        theme: t.theme || '', themeVi: t.theme_vi || '',
        themeDescription: t.theme_description || '',
        createdAt: Number(t.created_at),
      };
    });

    const chunksMap = {};
    (cRes.data || []).forEach(c => {
      const key = c.transcript_id || c.source_word_id || (c.group_id ? c.group_id.replace(/^vocab_/, '') : '__vocab__');
      if (!chunksMap[key]) chunksMap[key] = [];
      chunksMap[key].push({
        id: c.id,
        transcriptId: c.transcript_id || null,
        phrase: c.phrase,
        type: c.type,
        meaningVi: c.meaning_vi || '',
        usageNote: c.usage_note || '',
        originalSentence: c.original_sentence || '',
        anotherExample: c.another_example || '',
        formality: c.formality || 'neutral',
        groupId: c.group_id || '',
        groupName: c.group_name || '',
        sourceType: c.source_type || (c.transcript_id ? 'transcript' : 'vocab'),
        sourceWordId: c.source_word_id || null,
        sourceWord: c.source_word || c.group_name || '',
        topic: c.topic || null,
      });
    });

    const situationsMap = {};
    (sRes.data || []).forEach(s => {
      if (!situationsMap[s.chunk_id]) situationsMap[s.chunk_id] = [];

      let hints = [];
      if (s.vocab_hints) {
        try {
          hints = typeof s.vocab_hints === 'string' ? JSON.parse(s.vocab_hints) : s.vocab_hints;
        } catch { hints = []; }
      }

      let breakdown = [];
      if (s.sentence_breakdown) {
        try {
          breakdown = typeof s.sentence_breakdown === 'string' ? JSON.parse(s.sentence_breakdown) : s.sentence_breakdown;
        } catch { breakdown = []; }
      }

      const viSentence = s.vietnamese_sentence || s.vietnameseSentence || s.context || s.prompt || '';
      const sampleTrans = s.sample_translation || s.sampleTranslation || s.example_sentence || s.example_response || '';

      situationsMap[s.chunk_id].push({
        id: s.id,
        chunkId: s.chunk_id,
        level: s.level ?? 1,
        levelLabel: s.level_label || s.levelLabel || `Tình huống`,
        vietnameseSentence: viSentence,
        sampleTranslation: sampleTrans,
        tenseUsed: s.tense_used || s.tenseUsed || '',
        tenseExplanation: s.tense_explanation || s.tenseExplanation || s.hint || '',
        vocabHints: Array.isArray(hints) ? hints : [],
        sentenceBreakdown: Array.isArray(breakdown) ? breakdown : [],
        context: viSentence,
        exampleSentence: sampleTrans,
        prompt: viSentence,
        hint: s.hint || '',
        exampleResponse: s.example_response || sampleTrans,
      });
    });

    const progressMap = {};
    (pRes.data || []).forEach(p => {
      let feedback = null;
      let srsLevel = null;
      let srsTrack = null;
      let easeFactor = null;
      let intervalMinutes = null;
      let nextReviewAt = null;
      let status = null;

      if (p.last_feedback) {
        try {
          const parsed = JSON.parse(p.last_feedback);
          if (parsed && typeof parsed === 'object') {
            if ('srsLevel' in parsed || 'nextReviewAt' in parsed || 'feedback' in parsed) {
              feedback = parsed.feedback ?? null;
              srsLevel = parsed.srsLevel ?? null;
              srsTrack = parsed.srsTrack ?? null;
              easeFactor = parsed.easeFactor ?? null;
              intervalMinutes = parsed.intervalMinutes ?? null;
              nextReviewAt = parsed.nextReviewAt ? Number(parsed.nextReviewAt) : null;
              status = parsed.status ?? null;
            } else {
              feedback = parsed;
            }
          }
        } catch {
          feedback = p.last_feedback;
        }
      }

      progressMap[p.chunk_id] = {
        chunkId: p.chunk_id,
        practiceCount: p.practice_count || 0,
        successCount: p.success_count || 0,
        lastPracticed: p.last_practiced ? Number(p.last_practiced) : null,
        lastResult: p.last_result,
        lastScore: p.last_score != null ? Number(p.last_score) : null,
        lastFeedback: feedback,
        srsLevel,
        srsTrack,
        easeFactor,
        intervalMinutes,
        nextReviewAt,
        status,
      };
    });

    return { transcripts: transcriptsMap, chunks: chunksMap, situations: situationsMap, progress: progressMap };
  } catch (err) {
    console.error('Supabase fetch error:', err);
    return null;
  }
}

// ─── Test connection ───────────────────────────────────────────
export async function testSupabaseConnection(url, key) {
  try {
    const testClient = createClient(url, key);
    const { error } = await testClient.from('transcripts').select('id').limit(1);
    if (error && error.code !== 'PGRST116' && error.code !== '42501') {
      console.warn('Supabase test:', error);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ─── Data — Saved Words (Extension Sync) ────────────────────────
export async function dbFetchSavedWords() {
  const client = getSupabaseClient();
  if (!client) return [];
  const userId = await getCurrentUserId();
  if (!userId) return [];

  try {
    const { data, error } = await client
      .from('saved_words')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch saved_words error:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Supabase fetch saved_words error:', err);
    return [];
  }
}

export async function dbSaveWord(wordItem) {
  const client = getSupabaseClient();
  if (!client) return null;
  const userId = await getCurrentUserId();
  if (!userId) return null;

  try {
    const { data, error } = await client.from('saved_words').insert({
      user_id: userId,
      word: wordItem.word,
      meaning_vi: wordItem.meaningVi || wordItem.meaning_vi || '',
      context_sentence: wordItem.contextSentence || wordItem.context_sentence || '',
      part_of_speech: wordItem.partOfSpeech || wordItem.part_of_speech || '',
      ipa: wordItem.ipa || '',
      source_url: wordItem.sourceUrl || wordItem.source_url || '',
      source_title: wordItem.sourceTitle || wordItem.source_title || '',
      status: wordItem.status || 'pending',
    }).select().single();

    if (error) {
      console.error('Supabase save word error:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Supabase save word error:', err);
    return null;
  }
}

export async function dbUpdateSavedWordStatus(id, status) {
  const client = getSupabaseClient();
  if (!client || !id) return;
  const userId = await getCurrentUserId();
  if (!userId) return;

  try {
    const { error } = await client
      .from('saved_words')
      .update({ status })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) console.error('Supabase update saved_word status error:', error);
  } catch (err) {
    console.error('Supabase update saved_word status error:', err);
  }
}

export async function dbDeleteSavedWord(id) {
  const client = getSupabaseClient();
  if (!client || !id) return;
  const userId = await getCurrentUserId();
  if (!userId) return;

  try {
    const { error } = await client
      .from('saved_words')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) console.error('Supabase delete saved_word error:', error);
  } catch (err) {
    console.error('Supabase delete saved_word error:', err);
  }
}

// ─── Data — User Settings Sync ─────────────────────────────────
export async function dbSaveUserSettings(settings) {
  const client = getSupabaseClient();
  if (!client || !settings) return;
  const userId = await getCurrentUserId();
  if (!userId) return;

  try {
    const payload = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };
    if (settings.apiKey !== undefined) payload.api_key = settings.apiKey;
    if (settings.apiKey2 !== undefined) payload.api_key_2 = settings.apiKey2;
    if (settings.speakingVoice !== undefined) payload.speaking_voice = settings.speakingVoice;
    if (settings.srsTrack !== undefined) payload.srs_track = settings.srsTrack;

    const { error } = await client.from('user_settings').upsert(payload);
    if (error) console.warn('Supabase save user_settings warn:', error.message);
  } catch (err) {
    console.warn('Supabase save user_settings error:', err);
  }
}

export async function dbFetchUserSettings() {
  const client = getSupabaseClient();
  if (!client) return null;
  const userId = await getCurrentUserId();
  if (!userId) return null;

  try {
    const { data, error } = await client
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Supabase fetch user_settings warn:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Supabase fetch user_settings error:', err);
    return null;
  }
}
