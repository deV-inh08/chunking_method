import React from 'react';
import {
  Headphones, BookOpen, BrainCircuit, Zap,
  Target, Mic2, BarChart3, Settings, ChevronRight, LogOut,
  Flame, Sparkles, Search, CircleHelp, Menu, X
} from 'lucide-react';

export const NAV_ITEMS = [
  { id: 'ai_listening', label: 'Listening Lab',  shortLabel: 'Nghe',      icon: Headphones },
  { id: 'reading',      label: 'Reading Lab',    shortLabel: 'Đọc',       icon: BookOpen   },
  { id: 'vocab',        label: 'Vocabulary',     shortLabel: 'Từ vựng',   icon: Zap },
  { id: 'chunks',       label: 'Chunk Library',  shortLabel: 'Chunks',    icon: BrainCircuit },
  { id: 'practice',     label: 'Practice Sets',  shortLabel: 'Luyện tập', icon: Target },
  { id: 'ai_speaking',  label: 'AI Speaking',    shortLabel: 'Nói AI',    icon: Mic2, isNew: true },
  { id: 'progress',     label: 'Progress',       shortLabel: 'Tiến độ',   icon: BarChart3 },
];

export const PAGE_TITLES = {
  ai_listening: { title: 'Listening Lab',        subtitle: 'Luyện nghe phản xạ, chép chính tả Dictation & phân tích hội thoại' },
  reading:      { title: 'Reading Lab',          subtitle: 'Ngữ pháp chuyên sâu TOEIC Part 5 & 6 cùng giải thích chi tiết' },
  vocab:        { title: 'Vocabulary',           subtitle: 'Học từ vựng Flashcard 3D & trích xuất Chunks ngữ cảnh' },
  chunks:       { title: 'Chunk Library',        subtitle: 'Kho lưu trữ cụm từ Collocation & Functional Chunks khoa học' },
  practice:     { title: 'Practice Sets',        subtitle: 'Luyện dịch câu đa cấp độ & chấm điểm phản hồi tức thì' },
  ai_speaking:  { title: 'AI Speaking',          subtitle: 'Phòng luyện nói giao tiếp 2 chiều & đánh giá âm học GOP' },
  progress:     { title: 'Progress',             subtitle: 'Theo dõi tiến độ học tập & chu kỳ lặp lại ngắt quãng SRS' },
};

// ─── Desktop Sidebar & Mobile Slide-Out Drawer ───────────────
export function Sidebar({
  activePage,
  onNavigate,
  counts = {},
  onSettingsClick,
  user,
  onSignOut,
  onLoginClick,
  dueCount = 0,
  mobileOpen = false,
  onCloseMobile,
}) {
  const userInitials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'AM';
  const userName = user?.email ? user.email.split('@')[0] : 'Alex Morgan';

  const handleItemClick = (id) => {
    onNavigate(id);
    if (onCloseMobile) onCloseMobile();
  };

  const handleSettings = () => {
    onSettingsClick();
    if (onCloseMobile) onCloseMobile();
  };

  const handleProfileClick = () => {
    if (user) {
      onSettingsClick();
    } else {
      onLoginClick();
    }
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="drawer-backdrop mobile-only"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="brand-mark">T</div>
            <div>
              <strong>TOEIC</strong>
              <span>ACADEMY</span>
            </div>
          </div>

          {onCloseMobile && (
            <button
              className="drawer-close-btn mobile-only"
              onClick={onCloseMobile}
              aria-label="Đóng menu"
              title="Đóng"
            >
              <X size={19} />
            </button>
          )}
        </div>

        {/* Workspace section */}
        <div className="workspace-label">WORKSPACE</div>
        <div
          className="workspace-card"
          onClick={handleProfileClick}
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
              className={`nav-item ${activePage === id ? 'active' : ''} ${id === 'ai_speaking' ? 'ai-speaking-nav-item' : ''}`}
              onClick={() => handleItemClick(id)}
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
          <button id="nav-settings" className="nav-item" onClick={handleSettings}>
            <Settings size={18} strokeWidth={1.75} className="nav-icon" />
            <span className="nav-label">Settings</span>
          </button>

          <div className="help-card" onClick={handleSettings} role="button" tabIndex={0}>
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
                onClick={() => {
                  onSignOut();
                  if (onCloseMobile) onCloseMobile();
                }}
                title="Đăng xuất"
                style={{ color: 'var(--text-muted)', padding: 4 }}
              >
                <LogOut size={14} strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

// ─── Mobile Bottom Navigation ─────────────────────────────────
export function BottomNav({ activePage, onNavigate, counts = {}, dueCount = 0 }) {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ id, label, shortLabel, icon: Icon, isNew }) => (
        <button
          key={id}
          id={`bottom-nav-${id}`}
          className={`bottom-nav-item ${activePage === id ? 'active' : ''} ${id === 'ai_speaking' ? 'ai-speaking-nav' : ''}`}
          onClick={() => onNavigate(id)}
        >
          {isNew ? (
            <span className="bottom-nav-badge ai-badge">
              AI
            </span>
          ) : id === 'practice' && dueCount > 0 ? (
            <span className="bottom-nav-badge" style={{ background: '#ef4444', color: '#fff' }}>
              {dueCount}
            </span>
          ) : counts[id] > 0 ? (
            <span className="bottom-nav-badge">{counts[id]}</span>
          ) : null}
          <Icon size={18} strokeWidth={1.75} />
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
  onOpenMobileDrawer,
  streakDays = 12,
}) {
  const info = PAGE_TITLES[page] || { title: 'Listening Lab', subtitle: '' };
  const userInitials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'AM';

  return (
    <header className="topbar">
      {/* Mobile Hamburger Toggle Button */}
      {onOpenMobileDrawer && (
        <button
          id="mobile-hamburger-btn"
          className="mobile-only icon-button mobile-menu-toggle"
          onClick={onOpenMobileDrawer}
          aria-label="Mở menu điều hướng"
          title="Mở menu"
        >
          <Menu size={20} strokeWidth={2} />
        </button>
      )}

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
          <>
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
            <button
              id="header-ai-speaking-btn-mobile"
              className="icon-button mobile-only"
              onClick={onOpenAiSpeaking}
              style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(56, 189, 248, 0.25))',
                borderColor: 'rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                padding: '5px',
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Luyện nói phản xạ với AI"
            >
              <Mic2 size={16} strokeWidth={2} />
            </button>
          </>
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
