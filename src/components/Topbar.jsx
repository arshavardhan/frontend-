import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';

const NOTICE_TEXT = {
  CourseCompleted: 'You completed a course',
  CourseLessonCompleted: 'Lesson completed',
  LevelCompleted: 'You completed a level',
  Stage2Enrolled: 'You joined your Stage 2 batch',
  AssessmentEvaluated: 'Your knowledge check was graded',
  DiscoveryChallengeEvaluated: 'Your challenge was graded',
  CareerPathFinalized: 'Your career path is saved',
};
const noticeText = (type) => NOTICE_TEXT[type] || type.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[._]/g, ' ');
import { Menu, X, ChevronRight, ChevronDown, Flame, Zap, Bell, Settings, LogOut, BookOpen, Sparkles } from 'lucide-react';

export default function Topbar() {
  const {
    currentRoute,
    navigate,
    displayName,
    xp,
    selectedPath,
    gamification,
    dashboard,
    currentLevel,
    milestones,
    logout,
    mobileMenuOpen,
    setMobileMenuOpen,
    sidebarCollapsed,
    isDemo
  } = useApp();

  const [profileOpen, setProfileOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [notices, setNotices] = useState(null);
  const unread = dashboard?.identity?.unreadNotifications ?? 0;
  const streak = dashboard?.streak?.currentDays ?? gamification?.streakDays ?? 0;
  const isDungeon = ['tunnel/dsa', 'dsa/chapter', 'dsa/problem'].includes(currentRoute?.path);

  useEffect(() => {
    if (!noticeOpen) return;
    api.get('notifications', { limit: 10 }).then((d) => setNotices(d.items)).catch(() => setNotices([]));
  }, [noticeOpen]);
  const markRead = async (n) => {
    if (n.read_at) return;
    await api.patch('notifications/read', { id: n.id }).catch(() => undefined);
    setNotices((list) => list.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
  };

  const profileRef = useRef(null);
  const noticeRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (noticeRef.current && !noticeRef.current.contains(e.target)) {
        setNoticeOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Compute breadcrumbs
  const getBreadcrumbs = () => {
    const { path, query } = currentRoute;

    if (path === 'home') {
      return [{ label: 'Dashboard', route: 'home' }, { label: 'Career Journey', active: true }];
    }
    if (path === 'discover') {
      return [
        { label: 'Home', route: 'home' },
        { label: 'Level 1: Discover', route: 'level/1' },
        { label: 'Career Path Selection', active: true }
      ];
    }
    if (path.startsWith('path/')) {
      const pathName = selectedPath ? selectedPath.name + ' Path' : 'Career Path';
      return [
        { label: 'Home', route: 'home' },
        { label: 'Level 1: Discover', route: 'discover' },
        { label: pathName, active: true }
      ];
    }
    if (path === 'lesson') {
      return [
        { label: 'Home', route: 'home' },
        { label: 'Level 1: Discover', route: 'level/1' },
        { label: 'Course', route: query.path ? `path/${query.path}` : 'discover' },
        { label: 'Lesson', active: true }
      ];
    }
    if (path === 'stage2' || path === 'level/2') {
      return [
        { label: 'Home', route: 'home' },
        { label: 'Journey', route: 'home' },
        { label: 'Level 2', active: true }
      ];
    }
    if (path === 'stage2/ticket') {
      return [
        { label: 'Home', route: 'home' },
        { label: 'Stage 2', route: 'stage2' },
        { label: query.challenge || query.module || 'Ticket', active: true }
      ];
    }
    if (path === 'tunnel/dsa' || path === 'dsa/chapter' || path === 'dsa/problem') {
      const n = Math.max(1, milestones.findIndex((m) => m.status === 'current') + 1);
      const trail = [{ label: 'Home', route: 'home' }, { label: 'Journey', route: 'home' }, { label: `Level ${n}`, route: `level/${n}` }, { label: 'Side Quest', route: 'tunnel/dsa' }];
      if (path === 'tunnel/dsa') return [...trail, { label: 'DSA Dungeon', active: true }];
      const chapter = path === 'dsa/chapter' ? `Chapter ${Number(String(query.id ?? 'DSA01').replace(/\D/g, '')) || 1}` : 'Problem';
      return [...trail.slice(0, 1), trail[3], { label: 'DSA Dungeon', route: 'tunnel/dsa' }, { label: chapter, active: true }];
    }
    if (path.startsWith('tunnel/')) {
      const from = query.from === 'stage2' ? { label: 'Stage 2', route: 'stage2' } : { label: 'Home', route: 'home' };
      return [from, { label: path === 'tunnel/ai' ? 'AI Tunnel' : path === 'tunnel/dsa' ? 'DSA Tunnel' : 'Side quest', active: true }];
    }
    if (path === 'stage2/module' || path === 'stage2/lesson') {
      const parent = query.tunnel
        ? { label: query.tunnel === 'ai' ? 'AI Tunnel' : 'DSA Tunnel', route: `tunnel/${query.tunnel}` }
        : { label: 'Stage 2', route: 'stage2' };
      return [{ label: 'Home', route: 'home' }, parent, { label: query.module || 'Module', active: true }];
    }
    if (path === 'stage2/overview') {
      return [{ label: 'Home', route: 'home' }, { label: 'Level 2', route: 'stage2' }, { label: 'Learning Path', active: true }];
    }
    if (/^level\/\d+\/path$/.test(path)) {
      const n = Number(path.split('/')[1]);
      return [
        { label: 'Home', route: 'home' },
        { label: `Level ${n}: ${milestones[n - 1]?.name ?? 'Milestone'}`, route: `level/${n}` },
        { label: 'Learning Path', active: true }
      ];
    }
    if (path.startsWith('level/')) {
      const lvlNum = path.replace('level/', '');
      return [
        { label: 'Home', route: 'home' },
        { label: `Level ${lvlNum}: ${milestones[Number(lvlNum) - 1]?.name ?? 'Milestone'}`, active: true }
      ];
    }
    if (path === 'learn') {
      return [{ label: 'Home', route: 'home' }, { label: 'Learning Space', active: true }];
    }
    if (path === 'build') {
      return [{ label: 'Dashboard', route: 'home' }, { label: 'Teklozy CodeLab', active: true }];
    }
    if (path === 'challenges') {
      return [{ label: 'Home', route: 'home' }, { label: 'Challenges', active: true }];
    }
    if (path === 'profile') {
      return [{ label: 'Home', route: 'home' }, { label: 'Profile Settings', active: true }];
    }

    return [{ label: 'Teklozy', route: 'home' }, { label: path, active: true }];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className={`global-topbar ${isDungeon ? 'is-dungeon' : ''}`}>
      {/* Left branding & mobile trigger */}
      <div className={`topbar-brand-area ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
        <button
          className="mobile-nav-toggle-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <a href="#/home" className="topbar-logo-link" aria-label="Teklozy Home">
          <img src={isDungeon ? '/teklozy-logo-on-dark.png' : '/teklozy-logo-original.png'} alt="Teklozy" className="topbar-logo-img" />
        </a>
      </div>

      {/* Center contextual breadcrumbs */}
      <nav className="topbar-breadcrumbs" aria-label="Breadcrumb navigation">
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.label}>
            {idx > 0 && <ChevronRight size={13} className="bc-sep" />}
            {crumb.active ? (
              <span className="bc-item bc-active">{crumb.label}</span>
            ) : (
              <button className="bc-item bc-link" onClick={() => navigate(crumb.route, crumb.route.startsWith('tunnel/') ? { from: currentRoute.query.from } : {})}>
                {crumb.label}
              </button>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Right stats & profile actions */}
      <div className="topbar-actions-area">
        {isDemo && <span className="demo-pill" title="Guest preview: progress is saved in this browser only. Sign out to reset it.">Guest preview</span>}
        {/* Streak Pill */}
        <div className="stat-badge-pill streak-pill" title={`${streak} consecutive days of learning`}>
          <Flame size={15} className="streak-icon" />
          <span className="pill-text">{isDungeon ? 'Your pace. Your quest.' : `${streak} Day${streak === 1 ? '' : 's'} Streak`}</span>
        </div>

        {/* XP Pill */}
        <div className="stat-badge-pill xp-pill" title="Total experience points earned">
          <Zap size={15} className="xp-icon" />
          <span className="pill-text">{xp.toLocaleString()} XP</span>
        </div>

        {/* Notifications */}
        <div className="dropdown-wrapper" ref={noticeRef}>
          <button
            className="icon-action-btn notification-btn"
            onClick={() => { setNoticeOpen(!noticeOpen); setProfileOpen(false); }}
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unread > 0 && <span className="notification-dot" />}
          </button>

          {noticeOpen && (
            <div className="flyout-menu notice-flyout" role="dialog" aria-label="Notifications">
              <div className="flyout-header">
                <strong>Notifications</strong>
                {unread > 0 && <span className="unread-count">{unread} new</span>}
              </div>
              {notices === null && <p className="notice-empty">Loading…</p>}
              {notices?.length === 0 && <p className="notice-empty">No notifications yet.</p>}
              {notices?.map((n) => (
                <button key={n.id} className={`notice-item ${n.read_at ? '' : 'unread'}`} onClick={() => markRead(n)}>
                  <div className="notice-icon-box"><Sparkles size={14} /></div>
                  <div className="notice-body">
                    <b>{noticeText(n.type)}</b>
                    <small>{new Date(n.created_at).toLocaleString()}</small>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="dropdown-wrapper" ref={profileRef}>
          <button
            className="profile-trigger-btn"
            onClick={() => { setProfileOpen(!profileOpen); setNoticeOpen(false); }}
            aria-label="User account menu"
          >
            <div className="user-avatar-circle" aria-hidden="true">
              {displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'L'}
            </div>
            <span className="user-firstname-label">{displayName.split(' ')[0]}</span>
            <ChevronDown size={14} className="chevron-icon" />
          </button>

          {profileOpen && (
            <div className="flyout-menu profile-flyout" role="menu">
              <div className="profile-flyout-user">
                <strong>{displayName}</strong>
                <span className="role-tag">Level {currentLevel} · {milestones[currentLevel - 1]?.name}</span>
                <span className="xp-tag">{xp.toLocaleString()} Total XP</span>
              </div>

              <div className="flyout-divider" />

              <button className="flyout-action-item" role="menuitem" onClick={() => { setProfileOpen(false); navigate('profile'); }}>
                <Settings size={15} />
                <span>Profile Settings</span>
              </button>

              <button className="flyout-action-item" role="menuitem" onClick={() => { setProfileOpen(false); navigate('learn'); }}>
                <BookOpen size={15} />
                <span>My Courses</span>
              </button>

              <div className="flyout-divider" />

              <button className="flyout-action-item danger-item" role="menuitem" onClick={() => { setProfileOpen(false); logout(); }}>
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
