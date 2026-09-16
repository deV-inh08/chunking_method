import React from 'react';
import {
  LayoutDashboard, Headphones, BookOpen, BrainCircuit, Zap,
  Target, Mic2, BarChart3, Settings, ChevronRight, LogOut,
  LogIn, User, Flame, Sparkles, Search, CircleHelp,
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'overview',     label: 'Overview',       shortLabel: 'Tổng quan', icon: LayoutDashboard },
  { id: 'ai_listening', label: 'Listening Lab',  shortLabel: 'Nghe',      icon: Headphones },
  { id: 'reading',      label: 'Reading Lab',    shortLabel: 'Đọc',       icon: BookOpen   },
  { id: 'chunks',       label: 'Chunk Library',  shortLabel: 'Chunks',    icon: BrainCircuit },
  { id: 'vocab',        label: 'Vocabulary',     shortLabel: 'Từ vựng',   icon: Zap },
  { id: 'practice',     label: 'Practice Sets',  shortLabel: 'Luyện tập', icon: Target },
  { id: 'ai_speaking',  label: 'AI Speaking',    shortLabel: 'Nói AI',    icon: Mic2, isNew: true },
  { id: 'progress',     label: 'Progress',       shortLabel: 'Tiến độ',   icon: BarChart3 },
];

export const PAGE_TITLES = {
  overview:     { title: 'Overview',             subtitle: 'Không gian học tập cá nhân hóa & tổng quan tiến độ' },
  ai_listening: { title: 'Listening Lab',        subtitle: 'Luyện nghe phản xạ, chép chính tả Dictation & phân tích hội thoại' },
  reading:      { title: 'Reading Lab',          subtitle: 'Ngữ pháp chuyên sâu TOEIC Part 5 & 6 cùng giải thích chi tiết' },
  chunks:       { title: 'Chunk Library',        subtitle: 'Kho lưu trữ cụm từ Collocation & Functional Chunks khoa học' },
  vocab:        { title: 'Vocabulary',           subtitle: '5000 từ vựng cốt lõi theo chủ đề — trích xuất chunk ngữ cảnh' },
  practice:     { title: 'Practice Sets',        subtitle: 'Luyện dịch câu đa cấp độ & chấm điểm phản hồi tức thì' },
  ai_speaking:  { title: 'AI Speaking',          subtitle: 'Phòng luyện nói giao tiếp 2 chiều & đánh giá âm học GOP' },
  progress:     { title: 'Progress',             subtitle: 'Theo dõi tiến độ học tập & chu kỳ lặp lại ngắt quãng SRS' },
};

// ─── Desktop Sidebar ──────────────────────────────────────────
export function Sidebar({ activePage, onNavigate, counts = {}, onSettingsClick, user, onSignOut, onLoginClick, dueCount = 0 }) {
  const userInitials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'AM';
  const userName = user?.email ? user.email.split('@')[0] : 'Alex Morgan';

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="brand">
        <div className="brand-mark">T</div>
        <div>
          <strong>TOEIC</strong>
          <span>ACADEMY</span>
        </div>
      </div>

      {/* Workspace section */}
      <div className="workspace-label">WORKSPACE</div>
      <div
        className="workspace-card"
        onClick={user ? onSettingsClick : onLoginClick}
        title={user ? 'Cài đặt tài khoản' : 'Đăng nhập / Đăng ký tài khoản'}
      >
        <div className="avatar">{userInitials}</div>
        <div>
          <b>{userName}</b>
          <span>{user ? 'Cloud sync active' : 'Personal workspace'}</span>
        </div>
        <ChevronRight size={15} strokeWidth={1.75} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_ITEMS.map(({ id, label, icon: Icon, isNew }) => (
          <button
            key={id}
            id={`nav-${id}`}
            className={`nav-item ${activePage === id ? 'active' : ''}`}
            onClick={() => onNavigate(id)}
          >
            <Icon size={18} strokeWidth={1.75} className="nav-icon" />
            <span className="nav-label">{label}</span>
            {isNew ? (
              <span className="new-badge">NEW</span>
            ) : id === 'practice' && dueCount > 0 ? (
              <span className="nav-badge" style={{ background: '#ef4444', color: '#fff', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                <Flame size={10} strokeWidth={1.75} /> {dueCount}
              </span>
            ) : counts[id] > 0 ? (
              <span className="nav-badge" style={{ marginLeft: 'auto' }}>{counts[id]}</span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-bottom">
        <button id="nav-settings" className="nav-item" onClick={onSettingsClick}>
          <Settings size={18} strokeWidth={1.75} className="nav-icon" />
          <span className="nav-label">Settings</span>
        </button>

        <div className="help-card" onClick={onSettingsClick} role="button" tabIndex={0}>
          <CircleHelp size={18} strokeWidth={1.75} />
          <span>
            <b>Need help?</b>
            <small>View study guides</small>
          </span>
          <ChevronRight size={14} strokeWidth={1.75} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </span>
            <button
              id="sidebar-logout-btn"
              className="btn btn-ghost btn-icon"
              onClick={onSignOut}
              title="Đăng xuất"
              style={{ color: 'var(--text-muted)', padding: 4 }}
            >
              <LogOut size={14} strokeWidth={1.75} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── Mobile Bottom Navigation ─────────────────────────────────
export function BottomNav({ activePage, onNavigate, counts = {}, dueCount = 0 }) {
  // Mobile only shows 5 primary items for optimal spacing and touch area
  const mobileItems = NAV_ITEMS.filter(item =>
    ['overview', 'ai_listening', 'reading', 'practice', 'progress'].includes(item.id)
  );

  return (
    <nav className="bottom-nav">
      {mobileItems.map(({ id, label, shortLabel, icon: Icon }) => (
        <button
          key={id}
          id={`bottom-nav-${id}`}
          className={`bottom-nav-item ${activePage === id ? 'active' : ''}`}
          onClick={() => onNavigate(id)}
        >
          {id === 'practice' && dueCount > 0 ? (
            <span className="bottom-nav-badge" style={{ background: '#ef4444', color: '#fff' }}>
              {dueCount}
            </span>
          ) : counts[id] > 0 ? (
            <span className="bottom-nav-badge">{counts[id]}</span>
          ) : null}
          <Icon size={19} strokeWidth={1.75} />
          <span>{shortLabel || label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── Topbar / Header ──────────────────────────────────────────
export function Header({
  page,
  rightSlot,
  onSettingsClick,
  user,
  onSignOut,
  onLoginClick,
  dueCount = 0,
  onDueClick,
  onOpenAiSpeaking,
  streakDays = 12,
}) {
  const info = PAGE_TITLES[page] || { title: 'Overview', subtitle: '' };
  const userInitials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'AM';

  return (
    <header className="topbar">
      {/* Breadcrumb navigation */}
      <div className="breadcrumb">
        <span>Learning workspace</span>
        <ChevronRight size={14} strokeWidth={1.75} />
        <b>{info.title}</b>
      </div>

      {/* Top right actions */}
      <div className="top-actions">
        {/* Search icon button */}
        <button className="icon-button desktop-only" aria-label="Search" title="Tìm kiếm nhanh">
          <Search size={18} strokeWidth={1.75} />
        </button>

        {/* Due review button */}
        {dueCount > 0 && onDueClick && (
          <button
            id="header-due-btn"
            className="btn btn-sm"
            onClick={onDueClick}
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              borderColor: 'rgba(239, 68, 68, 0.35)',
              color: '#ef4444',
              fontWeight: 700,
              fontSize: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 9px',
            }}
            title="Chạm để ôn tập các chunk đến hạn"
          >
            <Flame size={13} strokeWidth={1.75} color="#ef4444" />
            <span className="desktop-only">Ôn tập ({dueCount})</span>
            <span className="mobile-only">{dueCount}</span>
          </button>
        )}

        {/* Quick AI Speaking button */}
        {onOpenAiSpeaking && (
          <button
            id="header-ai-speaking-btn"
            className="primary-button btn-sm desktop-only"
            onClick={onOpenAiSpeaking}
            style={{ padding: '5px 12px', fontSize: 12, gap: 5 }}
            title="Luyện nói phản xạ với AI & Chấm âm vị IPA"
          >
            <Sparkles size={14} strokeWidth={1.75} />
            <span>Nói với AI</span>
          </button>
        )}

        {/* Study Streak Badge */}
        <div className="streak" title="Chuỗi ngày học tập liên tục">
          <Zap size={15} strokeWidth={1.75} fill="currentColor" />
          <b>{streakDays}</b>
          <span className="desktop-only">day streak</span>
        </div>

        {rightSlot && <div>{rightSlot}</div>}

        {/* User Profile Avatar */}
        <div
          className="profile-avatar"
          onClick={user ? onSettingsClick : onLoginClick}
          title={user ? `${user.email} (Bấm để mở Cài đặt)` : 'Bấm để đăng nhập'}
          style={{ cursor: 'pointer' }}
        >
          {userInitials}
        </div>

        {onSettingsClick && (
          <button
            id="mobile-settings-btn"
            className="mobile-settings-btn mobile-only"
            onClick={onSettingsClick}
            aria-label="Settings"
            title="Cài đặt & Tài khoản"
          >
            <Settings size={18} strokeWidth={1.75} />
          </button>
        )}
      </div>
    </header>
  );
}
