import {
  FileText, Layers, Mic, BarChart2,
  Settings, ChevronRight, BookOpen, LogOut, User
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'transcripts', label: 'Transcripts', icon: FileText },
  { id: 'chunks',      label: 'Chunks',      icon: Layers   },
  { id: 'practice',   label: 'Practice',    icon: Mic      },
  { id: 'progress',   label: 'Progress',    icon: BarChart2 },
];

const PAGE_TITLES = {
  transcripts: { title: 'Transcripts',       subtitle: 'Nhập transcript TOEIC và trích xuất chunk' },
  chunks:      { title: 'Chunks',            subtitle: 'Danh sách cụm từ đã phân tích' },
  practice:    { title: 'Speaking Practice', subtitle: 'Luyện nói theo câu mẫu' },
  progress:    { title: 'Progress',          subtitle: 'Theo dõi tiến độ học tập' },
};

// ─── Desktop Sidebar ──────────────────────────────────────────
export function Sidebar({ activePage, onNavigate, counts = {}, onSettingsClick }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <BookOpen size={16} color="white" />
        </div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">Chunk Trainer</span>
          <span className="sidebar-logo-subtitle">TOEIC Speaking</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`nav-${id}`}
            className={`nav-item ${activePage === id ? 'active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={17} className="nav-icon" />
            <span className="nav-label">{label}</span>
            {counts[id] > 0 && (
              <span className="nav-badge">{counts[id]}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          id="nav-settings"
          className="nav-item"
          style={{ width: '100%' }}
          onClick={onSettingsClick}
        >
          <Settings size={17} className="nav-icon" />
          <span className="nav-label">Settings</span>
          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>
    </aside>
  );
}

// ─── Mobile Bottom Navigation ─────────────────────────────────
export function BottomNav({ activePage, onNavigate, counts = {} }) {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          id={`bottom-nav-${id}`}
          className={`bottom-nav-item ${activePage === id ? 'active' : ''}`}
          onClick={() => onNavigate(id)}
        >
          {counts[id] > 0 && (
            <span className="bottom-nav-badge">{counts[id]}</span>
          )}
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── Header ───────────────────────────────────────────────────
export function Header({ page, rightSlot, onSettingsClick, user, onSignOut }) {
  const info = PAGE_TITLES[page] || {};
  return (
    <header className="main-header">
      <div>
        <div className="main-header-title">{info.title}</div>
        {info.subtitle && <div className="main-header-subtitle">{info.subtitle}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {rightSlot && <div>{rightSlot}</div>}

        {/* User info + logout */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
            }}>
              <User size={13} style={{ color: 'var(--accent-400)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </span>
            </div>
            <button
              id="logout-btn"
              className="btn btn-ghost btn-icon"
              onClick={onSignOut}
              title="Đăng xuất"
              style={{ color: 'var(--text-muted)' }}
            >
              <LogOut size={15} />
            </button>
          </div>
        )}

        {/* Settings button — mobile only */}
        {onSettingsClick && (
          <button
            id="mobile-settings-btn"
            className="mobile-settings-btn"
            onClick={onSettingsClick}
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
        )}
      </div>
    </header>
  );
}
