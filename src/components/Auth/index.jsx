import { useState } from 'react';
import { BookOpen, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Send, ArrowLeft, X } from 'lucide-react';
import { isSupabaseConfigured } from '../../services/supabase';

// ─── AwaitingConfirmScreen ────────────────────────────────────
function AwaitingConfirmScreen({ email, onBack, onResend }) {
  const [resending, setResending]   = useState(false);
  const [resendMsg, setResendMsg]   = useState('');
  const [resendErr, setResendErr]   = useState('');

  const handleResend = async () => {
    setResending(true);
    setResendMsg('');
    setResendErr('');
    try {
      await onResend(email);
      setResendMsg('Đã gửi lại email! Kiểm tra hộp thư (kể cả thư mục Spam).');
    } catch (err) {
      setResendErr(err.message || 'Không thể gửi lại. Thử lại sau ít phút.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 420, animation: 'fadeIn 0.4s ease' }}>
        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 80, height: 80, margin: '0 auto 20px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(67,56,202,0.15))',
            border: '2px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Mail size={38} style={{ color: 'var(--accent-400)' }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Kiểm tra email của bạn
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
            Chúng tôi đã gửi link xác nhận đến
          </p>
          <p style={{
            fontWeight: 700, fontSize: 15, color: 'var(--accent-300)',
            marginTop: 4, wordBreak: 'break-all',
          }}>
            {email}
          </p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {[
              { step: '1', text: 'Mở hộp thư của bạn (kể cả thư mục Spam / Junk)' },
              { step: '2', text: 'Tìm email từ Supabase hoặc Chunk Trainer' },
              { step: '3', text: 'Bấm vào link "Confirm your email" trong email' },
              { step: '4', text: 'Quay lại đây và đăng nhập' },
            ].map(({ step, text }) => (
              <div key={step} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(99,102,241,0.2)',
                  border: '1px solid rgba(99,102,241,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: 'var(--accent-300)',
                }}>
                  {step}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, paddingTop: 3 }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          {/* Success/error from resend */}
          {resendMsg && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: 'var(--success-bg)', border: '1px solid var(--success-border)',
              borderRadius: 'var(--radius-md)', padding: '10px 14px',
              fontSize: 13, color: 'var(--success-text)', marginBottom: 14,
            }}>
              <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {resendMsg}
            </div>
          )}
          {resendErr && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: 'var(--error-bg)', border: '1px solid var(--error-border)',
              borderRadius: 'var(--radius-md)', padding: '10px 14px',
              fontSize: 13, color: 'var(--error-text)', marginBottom: 14,
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {resendErr}
            </div>
          )}

          {/* Resend button */}
          <button
            id="resend-confirm-btn"
            className="btn btn-secondary w-full"
            onClick={handleResend}
            disabled={resending}
            style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}
          >
            {resending
              ? 'Đang gửi…'
              : <><Send size={14} /> Gửi lại email xác nhận</>
            }
          </button>

          {/* Back to login */}
          <button
            id="back-to-login-btn"
            className="btn btn-ghost w-full"
            onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', fontSize: 13 }}
          >
            <ArrowLeft size={14} /> Về trang đăng nhập
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
          Link xác nhận có hiệu lực trong 24 giờ.
        </p>
      </div>
    </div>
  );
}

// ─── AuthScreen ───────────────────────────────────────────────
export function AuthScreen({ onSignIn, onSignUp, onResendConfirm, onContinueAsGuest, onClose, isModal = false }) {
  const [mode, setMode]                   = useState('login'); // 'login' | 'register' | 'awaiting-confirm'
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirm, setConfirm]             = useState('');
  const [showPw, setShowPw]               = useState(false);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  // Track if the latest error is "email not confirmed" to show resend button
  const [showResendHint, setShowResendHint]   = useState(false);

  const supabaseReady = isSupabaseConfigured();

  const handleResend = async (targetEmail) => {
    if (!onResendConfirm) return;
    try {
      await onResendConfirm(targetEmail || email.trim());
      setSuccess('Đã gửi lại email xác nhận. Kiểm tra hộp thư của bạn.');
      setError('');
      setShowResendHint(false);
    } catch (err) {
      setError(err.message || 'Không thể gửi lại email.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setShowResendHint(false);

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
        // Chuyển sang màn chờ xác nhận thay vì chuyển sang login ngay
        setRegisteredEmail(email.trim());
        setMode('awaiting-confirm');
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
        setShowResendHint(true);
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

  // ── Màn chờ xác nhận email ───────────────────────────────────
  if (mode === 'awaiting-confirm') {
    return (
      <AwaitingConfirmScreen
        email={registeredEmail}
        onBack={() => { setMode('login'); setError(''); setSuccess(''); }}
        onResend={handleResend}
      />
    );
  }

  // ── Màn đăng nhập / đăng ký ──────────────────────────────────
  const content = (
    <div style={{ width: '100%', maxWidth: 420, animation: 'fadeIn 0.4s ease', position: 'relative' }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 60, height: 60,
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, var(--accent-500), var(--accent-700))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
          boxShadow: '0 8px 32px rgba(99,102,241,0.4)',
        }}>
          <BookOpen size={28} color="white" />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Chunk Trainer
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          Luyện nói TOEIC theo phương pháp chunking
        </p>
      </div>

      {/* Card */}
      <div className="card" style={{ padding: '28px 24px', position: 'relative' }}>
        {/* Close button if onClose is provided */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'transparent', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              padding: 4, borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        )}

        {/* Supabase not configured warning */}
        {!supabaseReady && (
          <div style={{
            background: 'var(--warning-bg)', border: '1px solid var(--warning-border)',
            borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 18,
            fontSize: 12.5, color: 'var(--warning-text)',
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
          borderRadius: 'var(--radius-md)', padding: 4, marginBottom: 20,
        }}>
          {[
            { key: 'login',    label: 'Đăng nhập' },
            { key: 'register', label: 'Đăng ký'   },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setMode(key); setError(''); setSuccess(''); setShowResendHint(false); }}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                fontWeight: 600, fontSize: 13.5, transition: 'all 0.2s',
                background: mode === key ? 'var(--bg-surface)' : 'transparent',
                color: mode === key ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: mode === key ? 'var(--shadow-sm)' : 'none',
                border: 'none', cursor: 'pointer',
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
                  color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer',
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
              display: 'flex', flexDirection: 'column', gap: 8,
              background: 'var(--error-bg)', border: '1px solid var(--error-border)',
              borderRadius: 'var(--radius-md)', padding: '10px 14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--error-text)' }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
              {/* Nút gửi lại khi lỗi chưa xác thực */}
              {showResendHint && onResendConfirm && (
                <button
                  id="resend-hint-btn"
                  type="button"
                  onClick={() => handleResend(email.trim())}
                  style={{
                    alignSelf: 'flex-start', marginLeft: 22,
                    fontSize: 12, fontWeight: 700,
                    color: 'var(--accent-300)',
                    background: 'rgba(99,102,241,0.12)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: 'var(--radius-full)',
                    padding: '3px 10px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <Send size={11} /> Gửi lại email xác nhận
                </button>
              )}
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
            style={{ padding: '12px 20px', fontSize: 14.5, fontWeight: 700, marginTop: 4 }}
          >
            {loading
              ? (mode === 'register' ? 'Đang đăng ký…' : 'Đang đăng nhập…')
              : (mode === 'register' ? 'Tạo tài khoản' : 'Đăng nhập')
            }
          </button>

          {/* Guest mode button */}
          {onContinueAsGuest && (
            <button
              type="button"
              className="btn btn-ghost w-full"
              onClick={onContinueAsGuest}
              style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}
            >
              Dùng thử không cần tài khoản →
            </button>
          )}
        </form>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
        Dữ liệu được lưu trên Supabase Cloud, đồng bộ mọi thiết bị.
      </p>
    </div>
  );

  if (isModal) {
    return (
      <div
        className="modal-overlay"
        onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
        style={{ zIndex: 1100 }}
      >
        {content}
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 20,
    }}>
      {content}
    </div>
  );
}
