import { useState } from 'react';
import { Key, CheckCircle, XCircle, AlertTriangle, Globe, FileCode } from 'lucide-react';
import { Modal, Spinner } from '../ui';
import { testApiKey } from '../../services/ai';
import { isSpeechSupported } from '../../services/speech';

const ENV_KEY = import.meta.env.VITE_API_KEY;
const hasEnvKey = ENV_KEY && !ENV_KEY.includes('your-key') && ENV_KEY.length > 10;

export function SettingsModal({ settings, onSave, onClose }) {
  const [apiKey, setApiKey]       = useState(settings.apiKey || '');
  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState(null); // null | true | false
  const speechOk = isSpeechSupported();

  const handleTest = async () => {
    if (!apiKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    const ok = await testApiKey(apiKey.trim());
    setTestResult(ok);
    setTesting(false);
  };

  const handleSave = () => {
    onSave({ ...settings, apiKey: apiKey.trim() });
    onClose();
  };

  return (
    <Modal
      title="Settings"
      description="Cấu hình Gemini API key (miễn phí) để sử dụng tính năng AI."
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} id="settings-save-btn">
            Save Settings
          </button>
        </>
      }
    >
      {/* API Key */}
      <div className="mb-5">
        <label className="label">
          <Key size={12} style={{ display: 'inline', marginRight: 4 }} />
          API Key
        </label>

        {hasEnvKey ? (
          /* Key đang được load từ .env */
          <div
            className="card"
            style={{ background: 'var(--success-bg)', borderColor: 'var(--success-border)', padding: '12px 16px' }}
          >
            <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--success-text)', fontWeight: 600, fontSize: 13 }}>
              <FileCode size={14} />
              Key đã được load từ <code style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '1px 5px', borderRadius: 4 }}>.env</code>
            </div>
            <p className="text-sm" style={{ color: 'var(--success-text)', opacity: 0.75 }}>
              {ENV_KEY.slice(0, 12)}{'•'.repeat(16)}
            </p>
            <p className="text-muted text-xs mt-2">
              Để thay đổi, chỉnh sửa file <code style={{ fontFamily: 'monospace' }}>.env</code> rồi restart dev server.
            </p>
          </div>
        ) : (
          /* Nhập thủ công */
          <>
            <div className="flex gap-2">
              <input
                id="api-key-input"
                type="password"
                className="input-field flex-1"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }}
                autoComplete="off"
              />
              <button
                id="test-api-key-btn"
                className="btn btn-secondary"
                onClick={handleTest}
                disabled={!apiKey.trim() || testing}
              >
                {testing ? <Spinner size={16} /> : 'Test'}
              </button>
            </div>

            {testResult === true && (
              <div className="flex items-center gap-2 mt-2" style={{ color: 'var(--success-text)', fontSize: 13 }}>
                <CheckCircle size={14} /> API key hợp lệ!
              </div>
            )}
            {testResult === false && (
              <div className="flex items-center gap-2 mt-2" style={{ color: 'var(--error-text)', fontSize: 13 }}>
                <XCircle size={14} /> API key không hợp lệ. Vui lòng kiểm tra lại.
              </div>
            )}

            <p className="text-muted text-xs mt-2">
              Hoặc thêm vào file <code style={{ fontFamily: 'monospace' }}>.env</code>: <code style={{ fontFamily: 'monospace', color: 'var(--accent-300)' }}>VITE_API_KEY=AIzaSy...</code>
            </p>
          </>
        )}
      </div>

      {/* Browser compatibility */}
      <div className="divider" />
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
    </Modal>
  );
}
