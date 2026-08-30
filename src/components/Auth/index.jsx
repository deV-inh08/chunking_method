import { useState } from 'react';
import { BookOpen, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { isSupabaseConfigured } from '../../services/supabase';

// ─── AuthScreen ───────────────────────────────────────────────
export function AuthScreen({ onSignIn, onSignUp }) {
  const [mode, setMode]             = useState('login'); // 'login' | 'register'
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const supabaseReady = isSupabaseConfigured();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password.trim()) {
      setError('Vui lòng nhập email và mật khẩu.');
      return;
    }
    if (mode === 'register' && password !== confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await onSignUp(email.trim(), password);
        setSuccess('Đăng ký thành công! Kiểm tra email để xác nhận tài khoản (nếu được yêu cầu).');
        setMode('login');
      } else {
        await onSignIn(email.trim(), password);
        // App will re-render via useAuth onAuthStateChange
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('Invalid login credentials')) {
        setError('Email hoặc mật khẩu không đúng.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Tài khoản chưa xác thực. Kiểm tra hộp thư email của bạn.');
      } else if (msg.includes('User already registered')) {
        setError('Email này đã được đăng ký. Hãy đăng nhập.');
        setMode('login');
      } else {
        setError(msg || 'Có lỗi xảy ra, vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        animation: 'fadeIn 0.4s ease',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--accent-500), var(--accent-700))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
          }}>
            <BookOpen size={30} color="white" />
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Chunk Trainer
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Luyện nói TOEIC theo phương pháp chunking
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>

          {/* Supabase not configured warning */}
          {!supabaseReady && (
            <div style={{
              background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
              borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20,
              fontSize: 13, color: 'var(--warning-text)',
            }}>
              <strong>⚠️ Chưa cấu hình Supabase.</strong><br />
              Thêm <code style={{ fontFamily: 'monospace' }}>VITE_SUPABASE_URL</code> và{' '}
              <code style={{ fontFamily: 'monospace' }}>VITE_SUPABASE_ANON_KEY</code> vào file <code>.env</code>,
              rồi restart dev server.
            </div>
          )}

          {/* Mode toggle */}
          <div style={{
            display: 'flex', background: 'var(--bg-base)',
            borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 24,
          }}>
            {[
              { key: 'login',    label: 'Đăng nhập' },
              { key: 'register', label: 'Đăng ký'   },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setMode(key); setError(''); setSuccess(''); }}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                  fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
                  background: mode === key ? 'var(--bg-surface)' : 'transparent',
                  color: mode === key ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: mode === key ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Email */}
            <div>
              <label className="label" style={{ marginBottom: 6 }}>
                <Mail size={12} style={{ display: 'inline', marginRight: 4 }} />
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                className="input-field w-full"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div>
              <label className="label" style={{ marginBottom: 6 }}>
                <Lock size={12} style={{ display: 'inline', marginRight: 4 }} />
                Mật khẩu
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="auth-password"
                  type={showPw ? 'text' : 'password'}
                  className="input-field w-full"
                  placeholder="Ít nhất 6 ký tự"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  disabled={loading}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (register only) */}
            {mode === 'register' && (
              <div>
                <label className="label" style={{ marginBottom: 6 }}>
                  <Lock size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Xác nhận mật khẩu
                </label>
                <input
                  id="auth-confirm"
                  type="password"
                  className="input-field w-full"
                  placeholder="Nhập lại mật khẩu"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                background: 'var(--error-bg)', border: '1px solid var(--error-border)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
                fontSize: 13, color: 'var(--error-text)',
              }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                background: 'var(--success-bg)', border: '1px solid var(--success-border)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
                fontSize: 13, color: 'var(--success-text)',
              }}>
                <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {success}
              </div>
            )}

            {/* Submit */}
            <button
              id="auth-submit-btn"
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading || !supabaseReady}
              style={{ padding: '12px 20px', fontSize: 15, fontWeight: 700, marginTop: 4 }}
            >
              {loading
                ? (mode === 'register' ? 'Đang đăng ký…' : 'Đang đăng nhập…')
                : (mode === 'register' ? 'Tạo tài khoản' : 'Đăng nhập')
              }
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
          Dữ liệu được lưu trên Supabase Cloud, đồng bộ mọi thiết bị.
        </p>
      </div>
    </div>
  );
}
