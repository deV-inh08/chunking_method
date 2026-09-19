// Cấu hình chung cho Chrome Extension đồng bộ với Web App speaking_chunk
export const CONFIG = {
  // Supabase Project Credentials (trùng khớp với Web App)
  SUPABASE_URL: 'https://htbphzjxjdupigxkrdfk.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_xjwDQf0UQ4KEsqWsWrsqwg_fAIvvN4g',

  // URL mở Web App để luyện tập
  WEB_APP_URL: 'http://localhost:5173',

  // Gemini API Base & Fast Models
  GEMINI_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
  GEMINI_DEFAULT_MODEL: 'gemini-3.5-flash-lite',
  GEMINI_MODELS: ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash'],
};
