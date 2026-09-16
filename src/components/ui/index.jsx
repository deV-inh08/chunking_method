import React, { Component, useEffect, useRef } from 'react';
import { X, AlertTriangle, RotateCcw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, Check, CheckCircle2, XCircle, Link2, MessageSquare, ArrowRightLeft, Loader2 } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, textAlign: 'center', maxWidth: 480, margin: '40px auto' }} className="card">
          <AlertTriangle size={36} color="var(--error-text)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Đã có lỗi xảy ra trong phần này
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            {this.state.error?.message || 'Lỗi không xác định'}
          </p>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReset) this.props.onReset();
              else window.location.reload();
            }}
            style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RotateCcw size={14} /> Thử lại / Tải lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function Modal({ title, description, children, footer, onClose, maxWidth, style }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={(e) => { if (e.target === overlayRef.current) onClose?.(); }}
    >
      <div
        className="modal-box"
        style={{
          ...(maxWidth ? { maxWidth } : {}),
          ...style,
        }}
      >
        <div className="flex items-center justify-between mb-2" style={{ flexShrink: 0 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{title}</h2>
          {onClose && (
            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          )}
        </div>
        {description && <p className="modal-description" style={{ flexShrink: 0 }}>{description}</p>}
        <div style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: 0, paddingRight: 4 }}>
          {children}
        </div>
        {footer && (
          <div className="modal-footer" style={{ flexShrink: 0, borderTop: '1px solid var(--border-subtle)', paddingTop: 14, marginTop: 14 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Spinner({ size = 20, className = '' }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
      className={`animate-spin ${className}`}
      style={{ color: 'var(--accent-400)' }}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Button({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, style, ...props }) {
  return (
    <button
      type="button"
      className={`btn btn-${variant} btn-${size} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
      style={{ minWidth: loading ? '6rem' : undefined, ...style }}
    >
      {loading ? <Spinner size={16} /> : children}
    </button>
  );
}

export function Input({ error, className = '', id, ...props }) {
  return (
    <div className="field-control">
      <input id={id} className={`input-field ${error ? 'input-error' : ''} ${className}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${id || 'input'}-error` : undefined} {...props} />
      {error && <p id={`${id || 'input'}-error`} className="field-error"><AlertCircle size={14} />{error}</p>}
    </div>
  );
}

export function Textarea({ error, className = '', id, ...props }) {
  return (
    <div className="field-control">
      <textarea id={id} className={`textarea-field ${error ? 'input-error' : ''} ${className}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${id || 'textarea'}-error` : undefined} {...props} />
      {error && <p id={`${id || 'textarea'}-error`} className="field-error"><AlertCircle size={14} />{error}</p>}
    </div>
  );
}

export function DraftSaveIndicator({ visible = false }) {
  const [shown, setShown] = React.useState(visible);
  useEffect(() => {
    setShown(visible);
    if (!visible) return undefined;
    const timer = window.setTimeout(() => setShown(false), 1500);
    return () => window.clearTimeout(timer);
  }, [visible]);
  return <span className={`draft-save-indicator ${shown ? 'is-visible' : ''}`} aria-live="polite"><Check size={14} /> Đã lưu bản nháp</span>;
}

export function ScoreRing({ score = 0, size = 112 }) {
  const normalized = Math.min(100, Math.max(0, score));
  const tone = normalized >= 80 ? 'success' : normalized >= 60 ? 'warning' : 'error';
  const Icon = tone === 'success' ? CheckCircle2 : tone === 'warning' ? AlertTriangle : XCircle;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  return <div className={`score-ring score-ring-${tone}`} style={{ width: size, height: size, '--score-progress': `${circumference - (normalized / 100) * circumference}px` }} role="img" aria-label={`Điểm ${normalized} trên 100`}>
    <svg viewBox="0 0 112 112" aria-hidden="true"><circle className="score-ring-track" cx="56" cy="56" r={radius} /><circle className="score-ring-value" cx="56" cy="56" r={radius} /></svg>
    <span className="score-ring-label"><span><Icon size={14} />{normalized}</span><small>/ 100</small></span>
  </div>;
}

export function AudioWaveVisualizer({ analyser, isRecording = false, className = '' }) {
  const [quiet, setQuiet] = React.useState(false);
  const quietSince = useRef(null);
  useEffect(() => {
    if (!isRecording || !analyser) { quietSince.current = null; setQuiet(false); return undefined; }
    const data = new Uint8Array(analyser.fftSize);
    const check = () => {
      analyser.getByteTimeDomainData(data);
      const amplitude = data.reduce((max, value) => Math.max(max, Math.abs(value - 128)), 0);
      if (amplitude < 4) { quietSince.current ??= Date.now(); if (Date.now() - quietSince.current >= 3000) setQuiet(true); }
      else { quietSince.current = null; setQuiet(false); }
    };
    const timer = window.setInterval(check, 250);
    return () => window.clearInterval(timer);
  }, [analyser, isRecording]);
  return <div className={`audio-wave-wrap ${className}`}><div className="audio-wave-visualizer" aria-label={isRecording ? 'Đang ghi âm' : 'Trình hiển thị âm thanh'}>{Array.from({ length: 24 }, (_, i) => <span key={i} style={{ '--wave-delay': `${i * 35}ms` }} />)}</div>{quiet && <p className="audio-wave-hint">Không nghe thấy giọng nói, hãy nói to hơn</p>}</div>;
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div>
        <p className="empty-state-title">{title}</p>
        {description && <p className="empty-state-description mt-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="skeleton" style={{ height: 18, width: '60%' }} />
      <div className="skeleton" style={{ height: 13, width: '40%' }} />
      {Array.from({ length: lines - 2 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 13, width: `${80 - i * 10}%` }} />
      ))}
    </div>
  );
}

export function Badge({ type, children }) {
  const cls = {
    collocation: 'badge-collocation',
    functional:  'badge-functional',
    connector:   'badge-connector',
    success:     'badge-success',
    error:       'badge-error',
    warning:     'badge-warning',
    neutral:     'badge-neutral',
    part3:       'badge-part3',
    part4:       'badge-part4',
  }[type] || 'badge-neutral';

  const icons = { collocation: Link2, functional: MessageSquare, connector: ArrowRightLeft };
  const Icon = icons[type];
  return <span className={`badge ${cls}`}>{Icon && <Icon size={12} aria-hidden="true" />}{children}</span>;
}

export function Toast({ toasts = [], removeToast }) {
  const icons = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, loading: Loader2 };
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => {
        const Icon = icons[t.type] || AlertCircle;
        return <div key={t.id} className={`toast toast-${t.type}`}>
          <Icon size={17} className={t.type === 'loading' ? 'animate-spin' : ''} aria-hidden="true" />
          <span className="toast-message">{t.message}</span>
          {t.type === 'error' && t.onRetry && <button type="button" className="toast-retry" onClick={t.onRetry}>Thử lại</button>}
          <button type="button" className="toast-dismiss" onClick={() => removeToast?.(t.id)} aria-label="Đóng thông báo"><X size={14} /></button>
        </div>;
      })}
    </div>
  );
}

export function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  totalItems,
  startIndex,
  endIndex,
  itemLabel = 'mục',
}) {
  if (totalPages <= 1 && (!totalItems || totalItems <= (pageSizeOptions[0] || 10))) {
    return null;
  }

  // Calculate pages to show
  const getPages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pages = getPages();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 20,
        paddingTop: 16,
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* Left info & page size */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {totalItems != null && (
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Đang hiển thị{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {startIndex != null && endIndex != null ? `${startIndex + 1}–${endIndex}` : totalItems}
            </strong>{' '}
            trong <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> {itemLabel}
          </span>
        )}

        {onPageSizeChange && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <span>Số lượng:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="select-field"
              style={{
                height: 30,
                padding: '2px 8px',
                fontSize: 12,
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-primary)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
              }}
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>{opt} / trang</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right navigation buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {/* First page button */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          style={{ padding: '5px 8px', height: 32, minWidth: 32 }}
          title="Trang đầu"
        >
          <ChevronsLeft size={15} />
        </button>

        {/* Previous page button */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          style={{ padding: '5px 10px', height: 32, display: 'inline-flex', alignItems: 'center', gap: 3 }}
          title="Trang trước"
        >
          <ChevronLeft size={15} />
          <span style={{ fontSize: 12 }}>Trước</span>
        </button>

        {/* Page numbers */}
        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 28,
                  height: 32,
                  color: 'var(--text-muted)',
                  fontSize: 13,
                }}
              >
                …
              </span>
            );
          }

          const isCurrent = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              className={isCurrent ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
              onClick={() => onPageChange(p)}
              style={{
                minWidth: 32,
                height: 32,
                padding: '0 6px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: isCurrent ? 800 : 500,
                fontSize: 13,
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {p}
            </button>
          );
        })}

        {/* Next page button */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          style={{ padding: '5px 10px', height: 32, display: 'inline-flex', alignItems: 'center', gap: 3 }}
          title="Trang sau"
        >
          <span style={{ fontSize: 12 }}>Sau</span>
          <ChevronRight size={15} />
        </button>

        {/* Last page button */}
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          style={{ padding: '5px 8px', height: 32, minWidth: 32 }}
          title="Trang cuối"
        >
          <ChevronsRight size={15} />
        </button>
      </div>
    </div>
  );
}
