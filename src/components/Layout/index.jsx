import React, { useState, useEffect } from 'react';
import {
  Headphones, BookOpen, BrainCircuit, Zap,
  Target, Mic2, BarChart3, Settings, ChevronRight, LogOut,
  Flame, Sparkles, Search, CircleHelp, Menu, X, Eye, ShoppingBag
} from 'lucide-react';
import { StreakPopover } from './StreakPopover';
import { getStreakData } from '../../services/streakService';

export const NAV_ITEMS = [
  { id: 'ai_listening', label: 'Listening Lab',  shortLabel: 'Nghe',      icon: Headphones },
  { id: 'reading',      label: 'Reading Lab',    shortLabel: 'Đọc',       icon: BookOpen   },
  { id: 'vocab',        label: 'Vocabulary',     shortLabel: 'Từ vựng',   icon: Zap },
  { id: 'word_basket',  label: 'Giỏ từ Extension', shortLabel: 'Giỏ từ',   icon: ShoppingBag, isNew: true },
  { id: 'visual_vocab', label: 'Không gian thị giác', shortLabel: 'Thị giác', icon: Eye, isNew: true },
  { id: 'chunks',       label: 'Chunk Library',  shortLabel: 'Chunks',    icon: BrainCircuit },
  { id: 'practice',     label: 'Practice Sets',  shortLabel: 'Luyện tập', icon: Target },
  { id: 'ai_speaking',  label: 'AI Speaking',    shortLabel: 'Nói AI',    icon: Mic2, isNew: true },
  { id: 'progress',     label: 'Progress',       shortLabel: 'Tiến độ',   icon: BarChart3 },
];

export const PAGE_TITLES = {
  ai_listening: { title: 'Listening Lab', shortTitle: 'Listening', subtitle: 'Luyện nghe phản xạ, chép chính tả Dictation & phân tích hội thoại' },
  reading:      { title: 'Reading Lab',   shortTitle: 'Reading',   subtitle: 'Ngữ pháp chuyên sâu TOEIC Part 5 & 6 cùng giải thích chi tiết' },
  vocab:        { title: 'Vocabulary',    shortTitle: 'Vocab',     subtitle: 'Học từ vựng Flashcard 3D & trích xuất Chunks ngữ cảnh' },
  word_basket:  { title: 'Giỏ từ Extension', shortTitle: 'Giỏ từ', subtitle: 'Các từ bôi đen lưu từ Chrome Extension và chuyển hóa thành Chunks học' },
  visual_vocab: { title: 'Không gian thị giác', shortTitle: 'Thị giác', subtitle: 'Khám phá từ vựng & phản xạ bối cảnh qua hình ảnh thực tế (Visual Learning)' },
  chunks:       { title: 'Chunk Library', shortTitle: 'Chunk',     subtitle: 'Kho lưu trữ cụm từ Collocation & Functional Chunks khoa học' },
  practice:     { title: 'Practice Sets', shortTitle: 'Practice',  subtitle: 'Luyện dịch câu đa cấp độ & chấm điểm phản hồi tức thì' },
  ai_speaking:  { title: 'AI Speaking',   shortTitle: 'Speaking',  subtitle: 'Phòng luyện nói giao tiếp 2 chiều & đánh giá âm học GOP' },
  progress:     { title: 'Progress',      shortTitle: 'Progress',  subtitle: 'Theo dõi tiến độ học tập & chu kỳ lặp lại ngắt quãng SRS' },
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
}) {
  const info = PAGE_TITLES[page] || { title: 'Listening Lab', subtitle: '' };
  const userInitials = user?.email ? user.email.slice(0, 2).toUpperCase() : 'AM';

  const [streakData, setStreakData] = useState(() => getStreakData());
  const [showStreakPopover, setShowStreakPopover] = useState(false);

  useEffect(() => {
    const handleStreakUpdate = (e) => {
      if (e.detail) {
        setStreakData(e.detail);
      } else {
        setStreakData(getStreakData());
      }
    };

    window.addEventListener('toeic_streak_updated', handleStreakUpdate);
    return () => window.removeEventListener('toeic_streak_updated', handleStreakUpdate);
  }, []);

  const currentStreak = streakData?.currentStreak || 0;
  const isLearnedToday = Boolean(streakData?.isLearnedToday);

  return (
    <header className="topbar">
      {/* Breadcrumb navigation */}
      <div className="breadcrumb">
        <span>Workspace</span>
        <ChevronRight size={14} strokeWidth={1.75} />
        <b>{info.shortTitle || info.title}</b>
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

        {/* Quick AI Speaking button (desktop only) */}
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

        {/* Study Streak Badge with Popover */}
        <div style={{ position: 'relative' }}>
          <button
            id="header-streak-btn"
            type="button"
            className="streak"
            onClick={() => setShowStreakPopover(s => !s)}
            title="Nhấp để xem lịch tuần và tiến độ chuỗi ngày học"
            style={{
              cursor: 'pointer',
              border: isLearnedToday ? '1px solid rgba(249, 115, 22, 0.45)' : undefined,
              background: isLearnedToday
                ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(239, 68, 68, 0.14) 100%)'
                : undefined,
              color: isLearnedToday ? '#f97316' : undefined,
              boxShadow: isLearnedToday ? '0 0 14px rgba(249, 115, 22, 0.25)' : undefined,
              transition: 'all 0.25s ease',
            }}
          >
            {isLearnedToday ? (
              <Flame size={15} strokeWidth={1.75} fill="#f97316" color="#f97316" />
            ) : (
              <Zap size={15} strokeWidth={1.75} fill="currentColor" />
            )}
            <b>{currentStreak}</b>
            <span className="desktop-only">day streak</span>
          </button>

          <StreakPopover
            isOpen={showStreakPopover}
            onClose={() => setShowStreakPopover(false)}
          />
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
      </div>
    </header>
  );
}

// ─── Floating Menu Trigger Button for Mobile (Bottom-Left) ───
export function MobileFloatingMenuBtn({ onClick, isOpen }) {
  return (
    <button
      id="mobile-floating-menu-btn"
      className={`mobile-floating-menu-btn mobile-only ${isOpen ? 'drawer-open' : ''}`}
      onClick={onClick}
      aria-label="Mở menu điều hướng"
      title="Mở menu"
    >
      <Menu size={22} strokeWidth={2.2} />
    </button>
  );
}
