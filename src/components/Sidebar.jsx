import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Home, BookOpen, Code2, Trophy, ArrowRight,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { crestTitle, rankTitle, xpProgress } from '../utils/journey';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home, route: 'home' },
  { id: 'learn', label: 'Learn', icon: BookOpen, route: 'learn' },
  { id: 'build', label: 'CodeLab', icon: Code2, route: 'build' },
  { id: 'challenges', label: 'Challenges', icon: Trophy, route: 'challenges' },
];

/** Shield crest for the learner's current journey level; text and progress are live. */
function LevelCrest({ level, title, percent, onOpen, compact }) {
  return (
    <button type="button" className={`tk-crest ${compact ? 'is-compact' : ''}`} onClick={onOpen}
      aria-label={`Your current stage: Level ${level}, ${title}, ${percent}% complete. Open it.`}
      title={compact ? `Level ${level} · ${title}` : undefined}>
      <img src="/illustrations/level-crest.png" alt="" className="tk-crest__art" />
      <span className="tk-crest__text" aria-hidden="true">
        <strong>{compact ? `L${level}` : `Level ${level}`}</strong>
        {!compact && <span>{title}</span>}
        {!compact && <span className="tk-crest__bar"><span style={{ width: `${Math.max(3, percent)}%` }} /></span>}
      </span>
    </button>
  );
}

export default function Sidebar() {
  const {
    currentRoute,
    navigate,
    xp,
    gamification,
    dashboard,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileMenuOpen,
    setMobileMenuOpen,
    currentLevel = 1,
    levelProgress = 0,
  } = useApp();

  const currentPath = currentRoute.path;

  const isNavActive = (item) => {
    if (item.id === 'home') {
      return currentPath === 'home' || currentPath.startsWith('level/') || currentPath === 'discover' || currentPath.startsWith('path/')
        || currentPath.startsWith('tunnel/') || currentPath.startsWith('stage2');
    }
    return currentPath === item.route;
  };

  const go = (route) => {
    navigate(route);
    setMobileMenuOpen(false);
  };

  const progress = xpProgress({ ...gamification, totalXp: gamification?.totalXp ?? xp ?? 0 });
  const platformLevel = gamification?.platformLevel ?? 1;
  const title = gamification?.levelTitle || rankTitle(platformLevel);
  const event = dashboard?.featuredEvent ?? dashboard?.upcomingEvents?.[0] ?? null;

  return (
    <>
      {mobileMenuOpen && (
        <div className="sidebar-backdrop-overlay" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
      )}

      <aside
        className={`app-sidebar tk-sidebar ${sidebarCollapsed ? 'is-collapsed' : ''} ${mobileMenuOpen ? 'mobile-visible' : ''}`}
        aria-label="Main sidebar navigation"
      >
        <div className="sidebar-inner-scroll">
          <div className="tk-stagecard">
            <LevelCrest
              level={currentLevel}
              title={crestTitle(currentLevel)}
              percent={levelProgress}
              compact={sidebarCollapsed}
              onOpen={() => go(currentLevel === 1 ? 'level/1' : currentLevel === 2 ? 'stage2' : `level/${currentLevel}`)}
            />
            <div className="tk-stagecard__xp" title={`${progress.percent}% of the way to XP level ${platformLevel + 1}`}>
              <span>Lv. {platformLevel} · {title}</span>
              <small>{progress.xp.toLocaleString()} / {progress.to.toLocaleString()} XP</small>
            </div>
          </div>

          <nav className="sidebar-nav-list" aria-label="Primary sections">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isNavActive(item);
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`sidebar-nav-btn ${item.id === 'stage2' ? 'sidebar-stage2-btn' : ''} ${active ? 'is-active' : ''}`}
                  onClick={() => go(item.route)}
                  title={sidebarCollapsed ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={24} strokeWidth={2} className="nav-icon" />
                  <span className="nav-label">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="tk-promo">
            <img src="/illustrations/promo-trophy.png" alt="" className="tk-promo__art" />
            {event ? (
              <>
                <span className="tk-promo__tag">Live event</span>
                <strong>{event.title}</strong>
                <p>
                  {event.description || new Date(event.startsAt || event.starts_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
                <button type="button" className="tk-promo__btn" onClick={() => go('home')}>
                  See events <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <>
                <span className="tk-promo__tag">Hands-on</span>
                <strong>Teklozy CodeLab</strong>
                <p>Fix real bugs in your own sandbox with a terminal and live preview.</p>
                <button type="button" className="tk-promo__btn" onClick={() => go('build')}>
                  Open CodeLab <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="sidebar-footer-collapse">
          <button
            type="button"
            className="collapse-action-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : (<><PanelLeftClose size={18} /><span>Collapse Sidebar</span></>)}
          </button>
        </div>
      </aside>
    </>
  );
}
