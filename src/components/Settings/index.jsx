import { useState } from 'react';
import {
  Key, CheckCircle, AlertTriangle, Globe, BookOpen,
  User, LogIn, LogOut, Bell, Flame, Info, Send,
} from 'lucide-react';
import { Modal, Spinner, Badge } from '../ui';
import { isSpeechSupported } from '../../services/speech';
import { authUpdatePassword } from '../../services/supabase';
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  isNotificationSupported,
} from '../../services/notifications';
import { TRACK_CONFIGS } from '../../services/srs';

export function SettingsModal({ settings, onSave, onClose, user, onSignOut, onOpenAuth }) {
  const [srsTrack, setSrsTrack]         = useState(settings.srsTrack || 'track_a');
  const [notificationsEnabled, setNotificationsEnabled] = useState(Boolean(settings.notificationsEnabled));

  const [notifPermission, setNotifPermission] = useState(() => getNotificationPermission());
  const [requestingNotif, setRequestingNotif] = useState(false);
  const [sendingTestNotif, setSendingTestNotif] = useState(false);
  const [testNotifResult, setTestNotifResult] = useState(null);
  const [showLevelMapModal, setShowLevelMapModal] = useState(false);

  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [pwSuccessMsg, setPwSuccessMsg] = useState('');
  const [pwErrorMsg, setPwErrorMsg] = useState('');

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwErrorMsg('');
    setPwSuccessMsg('');
    if (!newPassword.trim()) {
      setPwErrorMsg('Vui lòng nhập mật khẩu mới.');
      return;
    }
    if (newPassword.length < 6) {
      setPwErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }
    setUpdatingPassword(true);
    try {
      await authUpdatePassword(newPassword.trim());
      setPwSuccessMsg('✓ Đã cập nhật mật khẩu mới thành công!');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setShowChangePassword(false), 2000);
    } catch (err) {
      setPwErrorMsg(err.message || 'Không thể đổi mật khẩu. Thử lại sau.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const speechOk = isSpeechSupported();
  const notifSupported = isNotificationSupported();

  const handleRequestNotification = async () => {
    setRequestingNotif(true);
    try {
      const p = await requestNotificationPermission();
      setNotifPermission(p);
      if (p === 'granted') {
        setNotificationsEnabled(true);
      }
    } catch (e) {
      console.error('Lỗi yêu cầu quyền thông báo:', e);
    } finally {
      setRequestingNotif(false);
    }
  };

  const handleSendTestNotif = async () => {
    setSendingTestNotif(true);
    setTestNotifResult(null);
    try {
      const ok = await sendTestNotification();
      setTestNotifResult(ok);
    } catch (e) {
      setTestNotifResult(false);
    } finally {
      setSendingTestNotif(false);
    }
  };

  const handleSave = () => {
    onSave({
      ...settings,
      srsTrack,
      notificationsEnabled,
    });
    onClose();
  };

  return (
    <Modal
      title="Cài đặt"
      description="Tùy chỉnh tài khoản, lộ trình lặp lại ngắt quãng (SRS) và thông báo nhắc nhở ôn tập."
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
          <button className="btn btn-primary" onClick={handleSave} id="settings-save-btn">
            Lưu cài đặt
          </button>
        </>
      }
    >
      {/* ─── Section 0: Account / Cloud Sync ─────────────────── */}
      <div className="mb-5">
        <label className="label">
          <User size={12} style={{ display: 'inline', marginRight: 4 }} />
          Tài khoản & Đồng bộ Cloud
        </label>
        {user ? (
          <div>
            <div className="card flex items-center justify-between" style={{ padding: '12px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ minWidth: 0, flex: 1, marginRight: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--success-text)', marginTop: 2 }}>
                  ✓ Đang đồng bộ Supabase Cloud
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowChangePassword(v => !v);
                    setPwErrorMsg('');
                    setPwSuccessMsg('');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Key size={13} />
                  {showChangePassword ? 'Đóng' : 'Đổi mật khẩu'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { onSignOut?.(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <LogOut size={13} />
                  Đăng xuất
                </button>
              </div>
            </div>

            {showChangePassword && (
              <form
                onSubmit={handleChangePassword}
                className="card animate-fade-in"
                style={{
                  marginTop: 8, padding: '14px 16px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Đổi mật khẩu tài khoản
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Mật khẩu mới (≥ 6 ký tự)"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    disabled={updatingPassword}
                    style={{ fontSize: 13 }}
                  />
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    disabled={updatingPassword}
                    style={{ fontSize: 13 }}
                  />
                </div>

                {pwErrorMsg && (
                  <div style={{ fontSize: 12, color: 'var(--error-text)' }}>
                    ⚠️ {pwErrorMsg}
                  </div>
                )}
                {pwSuccessMsg && (
                  <div style={{ fontSize: 12, color: 'var(--success-text)' }}>
                    {pwSuccessMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={updatingPassword}
                  style={{ alignSelf: 'flex-start', padding: '6px 16px', fontWeight: 600 }}
                >
                  {updatingPassword ? 'Đang lưu…' : 'Lưu mật khẩu mới'}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="card flex items-center justify-between" style={{ padding: '12px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ minWidth: 0, flex: 1, marginRight: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Chưa đăng nhập
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                Đăng nhập để đồng bộ tiến độ trên mọi thiết bị
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => { onClose(); onOpenAuth?.(); }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              <LogIn size={13} />
              Đăng nhập
            </button>
          </div>
        )}
      </div>

      <div className="divider" />

      {/* ─── Section: Spaced Repetition & Nhắc nhở thông báo ─── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="label" style={{ marginBottom: 0 }}>
            <Flame size={13} style={{ display: 'inline', marginRight: 4, color: '#f59e0b' }} />
            Lộ trình Lặp lại ngắt quãng (Spaced Repetition)
          </label>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowLevelMapModal(true)}
            style={{ fontSize: 11.5, color: 'var(--accent-300)', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Info size={12} /> Xem bảng Level Map
          </button>
        </div>

        {/* Track selection cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 14 }}>
          {Object.values(TRACK_CONFIGS).map((track) => {
            const isSelected = srsTrack === track.id;
            return (
              <button
                key={track.id}
                type="button"
                onClick={() => setSrsTrack(track.id)}
                className="card"
                style={{
                  textAlign: 'left', cursor: 'pointer', padding: '12px 14px',
                  borderColor: isSelected ? 'var(--accent-400)' : 'var(--border-subtle)',
                  background: isSelected ? 'rgba(99,102,241,0.12)' : 'var(--bg-surface)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span style={{ fontWeight: 700, fontSize: 13, color: isSelected ? 'var(--accent-300)' : 'var(--text-primary)' }}>
                    {track.shortName}
                  </span>
                  {isSelected && <Badge type="success">Đang dùng</Badge>}
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                  {track.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Notifications push setting */}
        <div className="card" style={{ padding: '14px 16px', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Bell size={16} style={{ color: notificationsEnabled ? 'var(--accent-400)' : 'var(--text-muted)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                  Thông báo nhắc nhở ôn tập (4 lần/ngày)
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  Nhắc nhở ôn chunk đến hạn vào 4 khung giờ vàng: <strong>08:00, 12:00, 18:00, 21:00</strong>
                </div>
              </div>
            </div>

            {notifSupported && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {notifPermission === 'granted' ? (
                  <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: 12.5, color: 'var(--success-text)', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={notificationsEnabled}
                      onChange={(e) => setNotificationsEnabled(e.target.checked)}
                      style={{ accentColor: 'var(--accent-500)', width: 16, height: 16 }}
                    />
                    {notificationsEnabled ? 'Bật nhắc nhở' : 'Đã tắt'}
                  </label>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleRequestNotification}
                    disabled={requestingNotif}
                    style={{ fontSize: 11.5, padding: '4px 10px' }}
                  >
                    {requestingNotif ? <Spinner size={12} /> : 'Cho phép thông báo'}
                  </button>
                )}
              </div>
            )}
          </div>

          {!notifSupported && (
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '6px 0 0' }}>
              Trình duyệt này không hỗ trợ Web Push Notification. (Trên iOS cần <em>Thêm vào Màn hình chính</em>).
            </p>
          )}

          {notifPermission === 'granted' && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleSendTestNotif}
                disabled={sendingTestNotif}
                style={{ fontSize: 11.5, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                {sendingTestNotif ? <Spinner size={11} /> : <Send size={11} />}
                Gửi thông báo thử nghiệm
              </button>
              {testNotifResult === true && (
                <span style={{ fontSize: 11.5, color: 'var(--success-text)' }}>✓ Đã gửi thông báo thử nghiệm!</span>
              )}
              {testNotifResult === false && (
                <span style={{ fontSize: 11.5, color: 'var(--error-text)' }}>✗ Không gửi được thông báo</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="divider" />

      {/* ─── Section 4: Browser Compatibility ───────────────── */}
      <div>
        <label className="label">Browser Compatibility</label>
        {speechOk ? (
          <div className="flex items-center gap-2" style={{ color: 'var(--success-text)', fontSize: 13 }}>
            <CheckCircle size={14} />
            <span>Trình duyệt hỗ trợ Web Speech API ✓</span>
          </div>
        ) : (
          <div
            className="card"
            style={{ background: 'var(--warning-bg)', borderColor: 'var(--warning-border)', padding: '12px 16px' }}
          >
            <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--warning-text)', fontWeight: 600, fontSize: 13 }}>
              <AlertTriangle size={14} /> Web Speech API không được hỗ trợ
            </div>
            <p className="text-sm" style={{ color: 'var(--warning-text)', opacity: 0.8 }}>
              Tính năng ghi âm yêu cầu Chrome hoặc Edge. Các tính năng khác vẫn hoạt động bình thường.
            </p>
            <div className="flex items-center gap-2 mt-2" style={{ fontSize: 12, color: 'var(--warning-text)' }}>
              <Globe size={12} /> Khuyến nghị: Google Chrome / Microsoft Edge
            </div>
          </div>
        )}
      </div>

      {/* ─── Level Map Info Modal ────────────────────────────── */}
      {showLevelMapModal && (
        <Modal
          title="Bảng lộ trình Lặp lại ngắt quãng (Level Map)"
          description="Khoảng cách thời gian ôn tập tự động theo phương pháp Spaced Repetition (Ebbinghaus Forgetting Curve)"
          onClose={() => setShowLevelMapModal(false)}
          footer={
            <button className="btn btn-primary" onClick={() => setShowLevelMapModal(false)}>
              Đã hiểu
            </button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Track A Table */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--accent-300)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Flame size={14} /> Track A — Người mới bắt đầu (Mặc định)
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '6px 10px' }}>Level</th>
                      <th style={{ padding: '6px 10px' }}>Khoảng cách ôn tiếp</th>
                      <th style={{ padding: '6px 10px' }}>Ghi chú thời điểm</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}><td style={{ padding: '6px 10px', fontWeight: 600 }}>0 → 1</td><td style={{ padding: '6px 10px', color: 'var(--accent-300)', fontWeight: 700 }}>15 phút</td><td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>Cùng buổi học</td></tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}><td style={{ padding: '6px 10px', fontWeight: 600 }}>1 → 2</td><td style={{ padding: '6px 10px', color: 'var(--accent-300)', fontWeight: 700 }}>1 giờ</td><td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>Cùng ngày</td></tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}><td style={{ padding: '6px 10px', fontWeight: 600 }}>2 → 3</td><td style={{ padding: '6px 10px', color: 'var(--accent-300)', fontWeight: 700 }}>4 giờ</td><td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>Cùng ngày, buổi tối</td></tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}><td style={{ padding: '6px 10px', fontWeight: 600 }}>3 → 4</td><td style={{ padding: '6px 10px', color: 'var(--accent-300)', fontWeight: 700 }}>1 ngày</td><td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>Sáng hôm sau</td></tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}><td style={{ padding: '6px 10px', fontWeight: 600 }}>4 → 5</td><td style={{ padding: '6px 10px', color: 'var(--accent-300)', fontWeight: 700 }}>2 ngày</td><td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>—</td></tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}><td style={{ padding: '6px 10px', fontWeight: 600 }}>5 → 6</td><td style={{ padding: '6px 10px', color: 'var(--accent-300)', fontWeight: 700 }}>4 ngày</td><td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>—</td></tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}><td style={{ padding: '6px 10px', fontWeight: 600 }}>6 → 7</td><td style={{ padding: '6px 10px', color: 'var(--accent-300)', fontWeight: 700 }}>7 ngày</td><td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>Sau 1 tuần</td></tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}><td style={{ padding: '6px 10px', fontWeight: 600 }}>7 → 8</td><td style={{ padding: '6px 10px', color: 'var(--accent-300)', fontWeight: 700 }}>12 ngày</td><td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>—</td></tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}><td style={{ padding: '6px 10px', fontWeight: 600 }}>8 → 9</td><td style={{ padding: '6px 10px', color: 'var(--accent-300)', fontWeight: 700 }}>20 ngày</td><td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>—</td></tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}><td style={{ padding: '6px 10px', fontWeight: 600 }}>9 → 10</td><td style={{ padding: '6px 10px', color: 'var(--accent-300)', fontWeight: 700 }}>30 ngày</td><td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>Sau 1 tháng</td></tr>
                    <tr><td style={{ padding: '6px 10px', fontWeight: 600 }}>10+</td><td style={{ padding: '6px 10px', color: 'var(--success-text)', fontWeight: 700 }}>×1.65 (Max 90d)</td><td style={{ padding: '6px 10px', color: 'var(--success-text)' }}>Đạt mức Thành thạo 🧠</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Track B Table */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#38bdf8', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <BookOpen size={14} /> Track B — Người đã có nền tảng
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '6px 10px' }}>Level</th>
                      <th style={{ padding: '6px 10px' }}>Khoảng cách ôn tiếp</th>
                      <th style={{ padding: '6px 10px' }}>Ghi chú thời điểm</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}><td style={{ padding: '6px 10px', fontWeight: 600 }}>0 → 1</td><td style={{ padding: '6px 10px', color: '#38bdf8', fontWeight: 700 }}>4 giờ</td><td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>Trong ngày</td></tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}><td style={{ padding: '6px 10px', fontWeight: 600 }}>1 → 2</td><td style={{ padding: '6px 10px', color: '#38bdf8', fontWeight: 700 }}>1 ngày</td><td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>Sáng hôm sau</td></tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}><td style={{ padding: '6px 10px', fontWeight: 600 }}>2 → 3</td><td style={{ padding: '6px 10px', color: '#38bdf8', fontWeight: 700 }}>3 ngày</td><td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>—</td></tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}><td style={{ padding: '6px 10px', fontWeight: 600 }}>3 → 4</td><td style={{ padding: '6px 10px', color: '#38bdf8', fontWeight: 700 }}>7 ngày</td><td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>Sau 1 tuần</td></tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}><td style={{ padding: '6px 10px', fontWeight: 600 }}>4 → 5</td><td style={{ padding: '6px 10px', color: '#38bdf8', fontWeight: 700 }}>14 ngày</td><td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>Sau 2 tuần</td></tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}><td style={{ padding: '6px 10px', fontWeight: 600 }}>5 → 6</td><td style={{ padding: '6px 10px', color: '#38bdf8', fontWeight: 700 }}>30 ngày</td><td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>Sau 1 tháng</td></tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}><td style={{ padding: '6px 10px', fontWeight: 600 }}>6 → 7</td><td style={{ padding: '6px 10px', color: '#38bdf8', fontWeight: 700 }}>60 ngày</td><td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>Sau 2 tháng</td></tr>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}><td style={{ padding: '6px 10px', fontWeight: 600 }}>7 → 8</td><td style={{ padding: '6px 10px', color: '#38bdf8', fontWeight: 700 }}>90 ngày</td><td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>Sau 3 tháng</td></tr>
                    <tr><td style={{ padding: '6px 10px', fontWeight: 600 }}>8+</td><td style={{ padding: '6px 10px', color: 'var(--success-text)', fontWeight: 700 }}>×2.0 (Max 180d)</td><td style={{ padding: '6px 10px', color: 'var(--success-text)' }}>Đạt mức Thành thạo 🧠</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Formula notice */}
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 11.5, color: 'var(--text-secondary)' }}>
              <strong>Quy tắc chấm điểm:</strong> Khi dịch đúng (Score từ 70đ trở lên), chunk sẽ tăng 1 level. Nếu dịch chưa đúng (Score dưới 70đ), chunk sẽ rớt level để được xếp lịch ôn lại sớm hơn.
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
