import {
  FileText, Layers, Mic, BarChart2,
  Settings, ChevronRight, BookOpen, LogOut, LogIn, User, BookMarked
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'transcripts', label: 'Transcripts', icon: FileText   },
  { id: 'chunks',      label: 'Chunks',      icon: Layers     },
  { id: 'vocab',       label: 'Từ vựng',    icon: BookMarked },
  { id: 'practice',   label: 'Practice',    icon: Mic        },
  { id: 'progress',   label: 'Progress',    icon: BarChart2  },
];

const PAGE_TITLES = {
  transcripts: { title: 'Transcripts',       subtitle: 'Nhập transcript TOEIC và trích xuất chunk' },
  chunks:      { title: 'Chunks',            subtitle: 'Danh sách cụm từ đã phân tích' },
  vocab:       { title: 'Từ vựng',          subtitle: 'Học 5000 từ theo chủ đề — phân tích chunk & luyện viết' },
  practice:    { title: 'Speaking Practice', subtitle: 'Luyện nói theo câu mẫu' },
  progress:    { title: 'Progress',          subtitle: 'Theo dõi tiến độ học tập' },
};

// ─── Desktop Sidebar ──────────────────────────────────────────
export function Sidebar({ activePage, onNavigate, counts = {}, onSettingsClick, user, onSignOut, onLoginClick }) {
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

      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {user ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 10px', borderRadius: 'var(--radius-md)',
            background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
              <User size={13} style={{ color: 'var(--accent-400)', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </span>
            </div>
            <button
              id="sidebar-logout-btn"
              className="btn btn-ghost btn-icon"
              onClick={onSignOut}
              title="Đăng xuất"
              style={{ color: 'var(--text-muted)', padding: 4, width: 24, height: 24 }}
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <button
            id="sidebar-login-btn"
            className="nav-item"
            style={{ width: '100%', color: 'var(--accent-400)', fontWeight: 600 }}
            onClick={onLoginClick}
          >
            <LogIn size={17} className="nav-icon" />
            <span className="nav-label">Đăng nhập / Đăng ký</span>
            <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
          </button>
        )}

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
export function Header({ page, rightSlot, onSettingsClick, user, onSignOut, onLoginClick }) {
  const info = PAGE_TITLES[page] || {};
  return (
    <header className="main-header">
      <div style={{ minWidth: 0, flex: '1 1 auto' }}>
        <div className="main-header-title">{info.title}</div>
        {info.subtitle && <div className="main-header-subtitle">{info.subtitle}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {rightSlot && <div>{rightSlot}</div>}

        {/* User info + logout if logged in */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 8px', borderRadius: 'var(--radius-md)',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
            }}>
              <User size={13} style={{ color: 'var(--accent-400)', flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
        ) : (
          /* Login button if not logged in */
          onLoginClick && (
            <button
              id="header-login-btn"
              className="btn btn-primary btn-sm"
              onClick={onLoginClick}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              <LogIn size={13} />
              <span>Đăng nhập</span>
            </button>
          )
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
