import React, { Component, useEffect, useRef } from 'react';
import { X, AlertTriangle, RotateCcw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

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

export function Modal({ title, description, children, footer, onClose }) {
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
      <div className="modal-box">
        <div className="flex items-center justify-between mb-2">
          <h2 className="modal-title">{title}</h2>
          {onClose && (
            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          )}
        </div>
        {description && <p className="modal-description">{description}</p>}
        {children}
        {footer && <div className="modal-footer">{footer}</div>}
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

  return <span className={`badge ${cls}`}>{children}</span>;
}

export function Toast({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)}>
          <span style={{ fontSize: 16 }}>
            {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
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
