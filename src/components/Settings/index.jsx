import { useState } from 'react';
import { Key, CheckCircle, XCircle, AlertTriangle, Globe, FileCode, Database } from 'lucide-react';
import { Modal, Spinner } from '../ui';
import { testApiKey } from '../../services/ai';
import { isSpeechSupported } from '../../services/speech';
import { testSupabaseConnection } from '../../services/supabase';

const ENV_KEY = import.meta.env.VITE_API_KEY;
const hasEnvKey = ENV_KEY && !ENV_KEY.includes('your-key') && ENV_KEY.length > 10;

const ENV_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ENV_SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasEnvSupabase = ENV_SUPABASE_URL && ENV_SUPABASE_KEY && !ENV_SUPABASE_URL.includes('your-project') && ENV_SUPABASE_KEY.length > 20;

export function SettingsModal({ settings, onSave, onClose }) {
  const [apiKey, setApiKey]             = useState(settings.apiKey || '');
  const [supabaseUrl, setSupabaseUrl]   = useState(settings.supabaseUrl || '');
  const [supabaseKey, setSupabaseKey]   = useState(settings.supabaseKey || '');

  const [testingAi, setTestingAi]           = useState(false);
  const [aiTestResult, setAiTestResult]     = useState(null);

  const [testingDb, setTestingDb]           = useState(false);
  const [dbTestResult, setDbTestResult]     = useState(null);

  const speechOk = isSpeechSupported();

  const handleTestAi = async () => {
    if (!apiKey.trim()) return;
    setTestingAi(true);
    setAiTestResult(null);
    const ok = await testApiKey(apiKey.trim());
    setAiTestResult(ok);
    setTestingAi(false);
  };

  const handleTestDb = async () => {
    const url = hasEnvSupabase ? ENV_SUPABASE_URL : supabaseUrl.trim();
    const key = hasEnvSupabase ? ENV_SUPABASE_KEY : supabaseKey.trim();
    if (!url || !key) return;

    setTestingDb(true);
    setDbTestResult(null);
    const ok = await testSupabaseConnection(url, key);
    setDbTestResult(ok);
    setTestingDb(false);
  };

  const handleSave = () => {
    onSave({
      ...settings,
      apiKey: apiKey.trim(),
      supabaseUrl: supabaseUrl.trim(),
      supabaseKey: supabaseKey.trim(),
    });
    onClose();
  };

  return (
    <Modal
      title="Settings"
      description="Cấu hình Gemini API key và Supabase Cloud Storage."
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
      {/* ─── Section 1: AI Key ───────────────────────────────── */}
      <div className="mb-5">
        <label className="label">
          <Key size={12} style={{ display: 'inline', marginRight: 4 }} />
          Gemini API Key
        </label>

        {hasEnvKey ? (
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
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                id="api-key-input"
                type="password"
                className="input-field flex-1"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setAiTestResult(null); }}
                autoComplete="off"
              />
              <button
                id="test-api-key-btn"
                className="btn btn-secondary"
                onClick={handleTestAi}
                disabled={!apiKey.trim() || testingAi}
              >
                {testingAi ? <Spinner size={16} /> : 'Test'}
              </button>
            </div>

            {aiTestResult === true && (
              <div className="flex items-center gap-2 mt-2" style={{ color: 'var(--success-text)', fontSize: 13 }}>
                <CheckCircle size={14} /> API key hợp lệ!
              </div>
            )}
            {aiTestResult === false && (
              <div className="flex items-center gap-2 mt-2" style={{ color: 'var(--error-text)', fontSize: 13 }}>
                <XCircle size={14} /> API key không hợp lệ. Vui lòng kiểm tra lại.
              </div>
            )}
          </>
        )}
      </div>

      <div className="divider" />

      {/* ─── Section 2: Supabase Settings ─────────────────────── */}
      <div className="mb-5">
        <label className="label">
          <Database size={12} style={{ display: 'inline', marginRight: 4 }} />
          Supabase Database (Cloud Sync)
        </label>

        {hasEnvSupabase ? (
          <div
            className="card mb-3"
            style={{ background: 'var(--success-bg)', borderColor: 'var(--success-border)', padding: '12px 16px' }}
          >
            <div className="flex items-center gap-2 mb-1" style={{ color: 'var(--success-text)', fontWeight: 600, fontSize: 13 }}>
              <FileCode size={14} />
              Cấu hình Supabase đã load từ <code style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '1px 5px', borderRadius: 4 }}>.env</code>
            </div>
            <p className="text-sm" style={{ color: 'var(--success-text)', opacity: 0.75 }}>
              URL: {ENV_SUPABASE_URL}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mb-3">
            <input
              id="supabase-url-input"
              type="text"
              className="input-field"
              placeholder="Supabase Project URL (https://xyz.supabase.co)"
              value={supabaseUrl}
              onChange={(e) => { setSupabaseUrl(e.target.value); setDbTestResult(null); }}
            />
            <input
              id="supabase-key-input"
              type="password"
              className="input-field"
              placeholder="Supabase Anon Public Key (eyJhb...)"
              value={supabaseKey}
              onChange={(e) => { setSupabaseKey(e.target.value); setDbTestResult(null); }}
            />
          </div>
        )}

        <button
          id="test-supabase-btn"
          className="btn btn-secondary btn-sm"
          onClick={handleTestDb}
          disabled={testingDb || (!hasEnvSupabase && (!supabaseUrl.trim() || !supabaseKey.trim()))}
        >
          {testingDb ? <Spinner size={14} /> : 'Kiểm tra kết nối Supabase'}
        </button>

        {dbTestResult === true && (
          <div className="flex items-center gap-2 mt-2" style={{ color: 'var(--success-text)', fontSize: 13 }}>
            <CheckCircle size={14} /> Kết nối Supabase thành công! Dữ liệu đã sẵn sàng đồng bộ mây.
          </div>
        )}
        {dbTestResult === false && (
          <div className="flex items-center gap-2 mt-2" style={{ color: 'var(--error-text)', fontSize: 13 }}>
            <XCircle size={14} /> Chưa thể kết nối tới Supabase. Kiểm tra URL/Key hoặc câu lệnh SQL khởi tạo bảng.
          </div>
        )}
        {!hasEnvSupabase && !supabaseUrl && (
          <p className="text-muted text-xs mt-2">
            Nếu để trống, ứng dụng sẽ hoạt động ở chế độ <strong>LocalStorage</strong> (lưu trên trình duyệt này).
          </p>
        )}
      </div>

      <div className="divider" />

      {/* ─── Section 3: Browser Compatibility ───────────────── */}
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
