import { CONFIG } from './config.js';

/**
 * Tương tác thuần REST API với Supabase (Zero dependency, tối ưu cho Extension)
 */

export async function supabaseSignIn(email, password) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': CONFIG.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.msg || data.message || 'Đăng nhập thất bại');
  }
  return data; // { access_token, refresh_token, user: { id, email, ... } }
}

export async function supabaseSignUp(email, password) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'apikey': CONFIG.SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.msg || data.message || 'Đăng ký thất bại');
  }
  return data;
}

export async function supabaseGetUserSettings(accessToken, userId) {
  try {
    const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/user_settings?user_id=eq.${userId}&select=*`, {
      headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) return null;
    const list = await res.json();
    return list && list.length > 0 ? list[0] : null;
  } catch (err) {
    console.warn('Get user settings error:', err);
    return null;
  }
}

export async function supabaseSaveWord(accessToken, userId, wordData) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/saved_words`, {
    method: 'POST',
    headers: {
      'apikey': CONFIG.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      user_id: userId,
      word: wordData.word,
      meaning_vi: wordData.meaningVi,
      context_sentence: wordData.contextSentence || '',
      part_of_speech: wordData.partOfSpeech || '',
      ipa: wordData.ipa || '',
      source_url: wordData.sourceUrl || '',
      source_title: wordData.sourceTitle || '',
      status: 'pending',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Không thể lưu từ vào database');
  }
  return Array.isArray(data) ? data[0] : data;
}

export async function supabaseGetSavedWordsCount(accessToken, userId) {
  try {
    const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/saved_words?user_id=eq.${userId}&select=id`, {
      headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Prefer': 'count=exact',
      },
    });
    const range = res.headers.get('content-range');
    if (range) {
      const parts = range.split('/');
      if (parts[1]) return parseInt(parts[1], 10);
    }
    const data = await res.json();
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}

export async function supabaseSaveUserSettings(accessToken, userId, settings) {
  try {
    const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/user_settings`, {
      method: 'POST',
      headers: {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        user_id: userId,
        api_key: settings.api_key,
        updated_at: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('supabaseSaveUserSettings error:', err);
    return false;
  }
}
