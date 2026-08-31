import { createClient } from '@supabase/supabase-js';

// ─── Credentials ───────────────────────────────────────────────
export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

  const rows = situations.map(s => ({
    id: s.id,
    user_id: userId,
    chunk_id: s.chunkId,
    context: s.context || '',
    example_sentence: s.exampleSentence || s.exampleResponse || '',
    // Keep old fields for backward compat
    prompt: s.prompt || '',
    hint: s.hint || '',
    example_response: s.exampleResponse || '',
  }));

  const { error } = await client.from('situations').upsert(rows);
  if (error) console.error('Supabase save situations error:', error);
}

// ─── Data — Progress ───────────────────────────────────────────
export async function dbSaveProgress(progressItem) {
  const client = getSupabaseClient();
  if (!client || !progressItem) return;
  const userId = await getCurrentUserId();
  if (!userId) return; // không lưu khi chưa đăng nhập

  const { error } = await client.from('progress').upsert({
    chunk_id:       progressItem.chunkId,
    user_id:        userId,
    practice_count: progressItem.practiceCount,
    success_count:  progressItem.successCount,
    last_practiced: progressItem.lastPracticed,
    last_result:    progressItem.lastResult,
    last_score:     progressItem.lastScore    ?? null,
    last_feedback:  progressItem.lastFeedback
      ? JSON.stringify(progressItem.lastFeedback)
      : null,
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
      if (!chunksMap[c.transcript_id]) chunksMap[c.transcript_id] = [];
      chunksMap[c.transcript_id].push({
        id: c.id, transcriptId: c.transcript_id,
        phrase: c.phrase, type: c.type,
        meaningVi: c.meaning_vi || '', usageNote: c.usage_note || '',
        originalSentence: c.original_sentence || '',
        anotherExample: c.another_example || '',
        formality: c.formality || 'neutral',
        groupId: c.group_id || '', groupName: c.group_name || '',
      });
    });

    const situationsMap = {};
    (sRes.data || []).forEach(s => {
      if (!situationsMap[s.chunk_id]) situationsMap[s.chunk_id] = [];
      situationsMap[s.chunk_id].push({
        id: s.id, chunkId: s.chunk_id,
        context: s.context || '',
        exampleSentence: s.example_sentence || s.example_response || '',
        // legacy
        prompt: s.prompt || '', hint: s.hint || '',
        exampleResponse: s.example_response || '',
      });
    });

    const progressMap = {};
    (pRes.data || []).forEach(p => {
      progressMap[p.chunk_id] = {
        chunkId: p.chunk_id,
        practiceCount: p.practice_count || 0,
        successCount: p.success_count || 0,
        lastPracticed: p.last_practiced ? Number(p.last_practiced) : null,
        lastResult: p.last_result,
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
