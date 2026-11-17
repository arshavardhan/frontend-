import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Compass, Layers, Check, Lock, Sparkles, ArrowRight,
  ChevronRight, Zap, MapPin, Trophy, Flag, Bell, Calendar,
  Users, ChevronDown, ChevronUp, X, Award, ExternalLink, RefreshCw, AlertCircle
} from 'lucide-react';

export default function MountainMap() {
  const { milestones, selectedPath, navigate, displayName, xp, triggerToast, dashboard, career, switchPath, finalizedPathId, currentLevel, paths } = useApp();
  const announcements = dashboard?.announcements ?? [];
  const events = dashboard?.upcomingEvents ?? [];
  const board = dashboard?.leaderboard ?? { items: [], me: null };
  const switchTarget = paths.find((p) => p.id === career?.switchTargets?.[0]?.id) ?? null;
  const shortDate = (value) => (value ? new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '');
  const [viewMode, setViewMode] = useState(() => dashboard?.preferences?.journey_view || 'map');
  const [activeTooltip, setActiveTooltip] = useState(null);

  // Travel / Zoom Animation State (Requirement 7)
  const [isTraveling, setIsTraveling] = useState(false);
  const [travelingLevel, setTravelingLevel] = useState(null);
  const [travelOffset, setTravelOffset] = useState({ x: 0, y: 0 });
  const [lockedShakeIndex, setLockedShakeIndex] = useState(null);

  // Floating Right-Side Panels State (Requirement 6)
  // Default: clean floating dock pills so mountain is fully visible
  const [panels, setPanels] = useState(() => {
    try {
      const saved = localStorage.getItem('teklozy_home_panels');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      announcements: false,
      events: false,
      leaderboard: false
    };
  });

  // Track Switch Confirmation Modal (Requirement 11)
  const [switchModalOpen, setSwitchModalOpen] = useState(false);

  // Persist panel preferences
  const togglePanel = (panelName) => {
    setPanels(prev => {
      const next = { ...prev, [panelName]: !prev[panelName] };
      localStorage.setItem('teklozy_home_panels', JSON.stringify(next));
      return next;
    });
  };

  const closePanel = (panelName) => {
    setPanels(prev => {
      const next = { ...prev, [panelName]: false };
      localStorage.setItem('teklozy_home_panels', JSON.stringify(next));
      return next;
    });
  };

  // Exact coordinates (% left, % top) mapped with sub-pixel precision to the 3D mountain landscape artwork
  const nodePositions = [
    { left: 12.8, top: 80.6 },   // Level 1: Discover (Basecamp tent with green completed disc)
    { left: 21.5, top: 70.8 },   // Level 2: Learn Basics (Current waypoint with pin platform)
    { left: 36.1, top: 60.8 },   // Level 3: Learn Advanced (Academy / villa platform)
    { left: 50.2, top: 54.8 },   // Level 4: Start Building (Waterfall canyon bridge platform)
    { left: 51.3, top: 42.2 },   // Level 5: Networking (Observatory cliff platform)
    { left: 63.1, top: 38.5 },   // Level 6: Showcase (High ridge mountain pass)
    { left: 73.1, top: 33.7 },   // Level 7: Interview Prep (Alpine stone chalet waypoint)
    { left: 78.6, top: 47.4 },   // Level 8: Apply & Match (Lower switchback cliff terrace)
    { left: 80.4, top: 27.6 },   // Level 9: Premium Access (Upper glacial ice bridge)
    { left: 87.6, top: 22.9 }    // Level 10: Alumni Connect (Summit gateway platform)
  ];

  const isCompleted = (index) => milestones[index]?.status === 'completed';
  const isCurrent = (index) => milestones[index]?.status === 'current';

  // Interactive milestone click with smooth travel/zoom transition
  const handleNodeClick = (index) => {
    const done = isCompleted(index);
    const current = isCurrent(index);
    const locked = !done && !current;

    // Requirement 7: Do not make locked milestones navigable; show unlock requirement
    if (locked) {
      setLockedShakeIndex(index);
      setTimeout(() => setLockedShakeIndex(null), 600);
      triggerToast(`🔒 Level ${index + 1}: ${milestones[index]?.name || ''} is locked. Complete Level ${index} milestones to ascend!`);
      return;
    }

    if (isTraveling) return;
    const destination = index === 1 ? 'stage2' : `level/${index + 1}`;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      navigate(destination);
      return;
    }

    // Unlocked milestone: Trigger smooth zoom & camera travel transition
    const pos = nodePositions[index];
    const offsetX = (50 - pos.left) * 0.45;
    const offsetY = (50 - pos.top) * 0.45;

    setIsTraveling(true);
    setTravelingLevel(index + 1);
    setTravelOffset({ x: offsetX, y: offsetY });

    // After animation duration, navigate to the target
    setTimeout(() => {
      setIsTraveling(false);
      navigate(destination);
    }, 550);
  };

  const completedCount = milestones.filter((m) => m.status === 'completed').length;
  const progressPercent = Math.round((completedCount / 10) * 100);

  return (
    <div className="mountain-card full-viewport-mountain">
      {/* =====================================================================
          1. INTEGRATED WELCOME & CAREER ROADMAP HEADER (Requirement 3 & 4)
          ===================================================================== */}
      <div className="mountain-card-header integrated-welcome-header">
        <div className="mountain-header-left">
          <div className="header-meta-row">
            <span className="kicker-pill">
              <Sparkles size={11} className="kicker-sparkle" />
              <span>LEVEL {currentLevel} · {milestones[currentLevel - 1]?.name?.toUpperCase()}</span>
            </span>

            {selectedPath && finalizedPathId && (
              <div className="career-trajectory-pill" title="Current Career Specialization">
                <span className="dot-active" />
                <span className="trajectory-title">{selectedPath.title}</span>
                {career?.switchAvailable && (
                  <button
                    className="btn-change-track-inline"
                    onClick={() => setSwitchModalOpen(true)}
                    title="Change Career Track"
                  >
                    <RefreshCw size={11} />
                    <span>Change Track</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <h1 className="mountain-welcome-heading">
            Welcome back, <span className="user-name-highlight">{displayName}</span> — The 10-Level Mountain Ascent
          </h1>

          <p className="mountain-header-desc">
            {selectedPath && finalizedPathId
              ? `You are on the ${selectedPath.name} track. Advance along the mountain ridge to unlock each career milestone.`
              : 'Begin at Level 1: Discover to explore both career paths and choose your specialization.'}
          </p>
        </div>

        {/* View Mode & Right Controls */}
        <div className="mountain-header-right-controls">
          <div className="view-toggle-group" role="tablist" aria-label="View mode">
            <button
              className={`toggle-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
              role="tab"
              aria-selected={viewMode === 'map'}
            >
              <Compass size={14} />
              <span>Summit Map</span>
            </button>
            <button
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              role="tab"
              aria-selected={viewMode === 'list'}
            >
              <Layers size={14} />
              <span>Milestone List</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. MAIN FULL-SCREEN MOUNTAIN CANVAS (Requirement 5 & 7)
          ===================================================================== */}
      {viewMode === 'map' ? (
        <div className="summit-canvas-container photorealistic-mode full-screen-mode" role="region" aria-label="Interactive 3D mountain journey map">

          {/* Zoom & Travel Transform Wrapper */}
          <div
            className={`summit-zoom-container ${isTraveling ? 'is-traveling' : ''}`}
            style={{
              transform: isTraveling ? `scale(1.38) translate(${travelOffset.x}%, ${travelOffset.y}%)` : 'scale(1) translate(0, 0)',
              transition: 'transform 0.55s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* 3D Mountain Artwork Canvas */}
            <div className="summit-artwork-wrapper">
              <img
                src="/teklozy-mountain-journey.jpg"
                alt="Teklozy 10-Level Mountain Journey Map"
                className="summit-artwork-img"
              />
              <div className="summit-artwork-vignette" />
            </div>

            {/* Interactive Summit Destination Halo Marker */}
            <div
              className="summit-shrine-marker"
              style={{ left: '85.3%', top: '15.2%' }}
              onClick={() => handleNodeClick(9)}
              title="The Teklozy Summit · Career Placement & Alumni Network"
            >
              <div className="summit-temple-beacon" />
              <div className="summit-temple-badge">
                <Trophy size={14} className="trophy-icon" />
                <span>SUMMIT</span>
              </div>
            </div>

            {/* Interactive Milestone Nodes directly aligned to glowing platforms */}
            {milestones.map((m, idx) => {
              const pos = nodePositions[idx];
              const done = isCompleted(idx);
              const current = isCurrent(idx);
              const locked = !done && !current;
              const isShaking = lockedShakeIndex === idx;

              return (
                <div
                  key={m.level}
                  className={`milestone-node-wrapper photo-node ${done ? 'is-done' : ''} ${current ? 'is-current' : ''} ${locked ? 'is-locked' : ''} ${isShaking ? 'is-shaking' : ''}`}
                  style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
                  onMouseEnter={() => setActiveTooltip(idx)}
                  onMouseLeave={() => setActiveTooltip(null)}
                >
                  {/* Floating Pin Marker for Current Level */}
                  {current && (
                    <div className="active-station-pin-indicator" aria-hidden="true">
                      <MapPin size={22} className="floating-pin-icon" />
                    </div>
                  )}

                  <button
                    className="milestone-badge-btn photo-badge"
                    onClick={() => handleNodeClick(idx)}
                    aria-label={`Level ${m.level}: ${m.name} (${done ? 'Completed' : current ? 'Current' : 'Locked'})`}
                  >
                    <span className="badge-pulse-ring" />
                    <span className="badge-inner">
                      {done ? (
                        <Check size={14} strokeWidth={3} />
                      ) : locked ? (
                        <Lock size={12} />
                      ) : (
                        <span className="badge-num">{m.level}</span>
                      )}
                    </span>
                  </button>

                  <div className="node-caption photo-caption">
                    <span className="node-caption-lvl">LVL {m.level}</span>
                    <span className="node-caption-name">{m.name}</span>
                  </div>

                  {/* Non-Clipping Interactive Popover Tooltip */}
                  {activeTooltip === idx && (() => {
                    const isTopHalf = pos.top < 45;
                    const isRightEdge = pos.left > 75;
                    const isLeftEdge = pos.left < 25;
                    const popoverClass = [
                      'node-hover-popover',
                      isTopHalf ? 'placement-down' : 'placement-up',
                      isRightEdge ? 'align-right' : isLeftEdge ? 'align-left' : 'align-center'
                    ].join(' ');

                    return (
                      <div className={popoverClass} role="tooltip">
                        <div className="popover-badge">LEVEL {m.level} OF 10</div>
                        <h4>{m.name}</h4>
                        <p>{m.desc}</p>
                        <div className="popover-meta">
                          <span className="popover-status">
                            {done ? '✓ Completed' : current ? '● In Progress' : '🔒 Locked Milestone'}
                          </span>
                          <span className="popover-action">
                            {done ? 'Review Station →' : current ? 'Continue Ascent →' : 'Complete previous levels'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {/* Traveling Indicator Overlay (Requirement 7) */}
          {isTraveling && (
            <div className="mountain-travel-overlay" aria-live="assertive">
              <div className="travel-pill">
                <Sparkles size={16} className="travel-sparkle-spin" />
                <span>Ascending to Level {travelingLevel}...</span>
              </div>
            </div>
          )}

          {/* =====================================================================
              3. FLOATING RIGHT-SIDE PANELS & DOCK TOOLBAR (Requirement 6)
              ===================================================================== */}

          {/* Floating Pill Toolbar Dock */}
          <aside className="mountain-floating-dock" aria-label="Floating dashboard panels">
            <button
              className={`dock-pill-btn ${panels.announcements ? 'is-active' : ''}`}
              onClick={() => togglePanel('announcements')}
              title="Toggle Announcements"
            >
              <Bell size={14} className="dock-icon" />
              <span>Announcements</span>
              {announcements.length > 0 && <span className="dock-count-badge">{announcements.length}</span>}
            </button>

            <button
              className={`dock-pill-btn ${panels.events ? 'is-active' : ''}`}
              onClick={() => togglePanel('events')}
              title="Toggle Next Events"
            >
              <Calendar size={14} className="dock-icon" />
              <span>Events</span>
              {events.length > 0 && <span className="dock-count-badge gold">{events.length}</span>}
            </button>

            <button
              className={`dock-pill-btn ${panels.leaderboard ? 'is-active' : ''}`}
              onClick={() => togglePanel('leaderboard')}
              title="Toggle Leaderboard"
            >
              <Trophy size={14} className="dock-icon" />
              <span>Leaderboard</span>
              {board.me?.rank && <span className="dock-rank-badge">#{board.me.rank}</span>}
            </button>
          </aside>

          {/* Floating Panel Stack on the Right */}
          <div className="mountain-floating-panels-stack">

            {/* Panel A: Announcements */}
            {panels.announcements && (
              <div className="floating-card-panel announcement-panel" role="region" aria-label="Announcements">
                <div className="panel-header-strip">
                  <div className="panel-title-group">
                    <Bell size={14} className="panel-header-icon" />
                    <strong>Announcements</strong>
                    {announcements.length > 0 && <span className="panel-tag-pill">{announcements.length} New</span>}
                  </div>
                  <button
                    className="panel-close-btn"
                    onClick={() => closePanel('announcements')}
                    aria-label="Close Announcements"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="panel-body-content">
                  {announcements.length === 0 && <p className="panel-empty-note">No announcements right now.</p>}
                  {announcements.map((item) => (
                    <div className="announcement-item" key={item.id}>
                      <div className="item-header-row">
                        <span className="item-kicker">ANNOUNCEMENT</span>
                        <span className="item-date">{shortDate(item.starts_at)}</span>
                      </div>
                      <h5>{item.title}</h5>
                      <p>{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Panel B: Next Events */}
            {panels.events && (
              <div className="floating-card-panel events-panel" role="region" aria-label="Next Events">
                <div className="panel-header-strip">
                  <div className="panel-title-group">
                    <Calendar size={14} className="panel-header-icon gold" />
                    <strong>Next Events</strong>
                    <span className="panel-tag-pill gold">Upcoming</span>
                  </div>
                  <button
                    className="panel-close-btn"
                    onClick={() => closePanel('events')}
                    aria-label="Close Events"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="panel-body-content">
                  {events.length === 0 && <p className="panel-empty-note">No upcoming events yet.</p>}
                  {events.map((ev) => (
                    <div className="event-item-box" key={ev.id}>
                      <div className="event-badge-circle">
                        <Calendar size={16} />
                      </div>
                      <div className="event-info">
                        <span className="event-timing">{shortDate(ev.startsAt || ev.starts_at)}</span>
                        <h5>{ev.title}</h5>
                        <p>{ev.description}{ev.location ? ` · ${ev.location}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Panel C: Cohort Leaderboard */}
            {panels.leaderboard && (
              <div className="floating-card-panel leaderboard-panel" role="region" aria-label="Cohort Leaderboard">
                <div className="panel-header-strip">
                  <div className="panel-title-group">
                    <Trophy size={14} className="panel-header-icon" />
                    <strong>Weekly Standings</strong>
                  </div>
                  <button
                    className="panel-close-btn"
                    onClick={() => closePanel('leaderboard')}
                    aria-label="Close Leaderboard"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="panel-body-content leaderboard-scroll">
                  {board.items.length === 0 && (
                    <p className="panel-empty-note">
                      No one has opted in this week. Turn on leaderboard visibility in your profile to appear here.
                    </p>
                  )}
                  {board.items.slice(0, 5).map((row) => (
                    <div className={`leaderboard-item ${row.rank <= 3 ? 'top-rank' : ''}`} key={`${row.rank}-${row.publicName}`}>
                      <span className={`rank-num ${row.rank <= 3 ? `medal-${row.rank}` : ''}`}>{row.rank}</span>
                      <div className="leader-info">
                        <strong>{row.publicName}</strong>
                      </div>
                      <span className="leader-xp">{Number(row.xp).toLocaleString()} XP</span>
                    </div>
                  ))}
                  <div className="leaderboard-divider" />
                  <div className="leaderboard-item current-user-rank">
                    <span className="rank-num user-num">{board.me?.rank ? `#${board.me.rank}` : '—'}</span>
                    <div className="leader-info">
                      <strong>{displayName} (You)</strong>
                      <small>Level {currentLevel} · {milestones[currentLevel - 1]?.name}</small>
                    </div>
                    <span className="leader-xp highlight">{xp.toLocaleString()} XP</span>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      ) : (
        /* =====================================================================
            4. TABULAR LIST VIEW (Preserved Alternative View)
            ===================================================================== */
        <div className="milestones-list-container full-list-mode" role="tabpanel" aria-label="10-Level Career Milestones">
          {milestones.map((m, idx) => {
            const done = isCompleted(idx);
            const current = isCurrent(idx);
            const locked = !done && !current;

            return (
              <div
                key={m.level}
                className={`milestone-list-card ${done ? 'card-done' : ''} ${current ? 'card-current' : ''} ${locked ? 'card-locked' : ''}`}
                onClick={() => handleNodeClick(idx)}
                role="button"
                tabIndex={0}
              >
                <div className="list-card-num">
                  {done ? (
                    <Check size={16} strokeWidth={3} />
                  ) : locked ? (
                    <Lock size={14} />
                  ) : (
                    <span>{m.level}</span>
                  )}
                </div>

                <div className="list-card-info">
                  <div className="list-card-title-row">
                    <h3>Level {m.level} · {m.name}</h3>
                    {done && <span className="status-pill pill-done">Completed</span>}
                    {current && <span className="status-pill pill-current">In Progress</span>}
                    {locked && <span className="status-pill pill-locked">Locked</span>}
                  </div>
                  <p title={m.desc}>{m.desc}</p>
                </div>

                <div className="list-btn">
                  <span>{done ? 'Review' : current ? 'Continue' : 'Locked'}</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          5. INTENTIONAL CAREER PATH SWITCH CONFIRMATION MODAL (Requirement 11)
          ===================================================================== */}
      {switchModalOpen && (
        <div className="modal-backdrop-overlay" role="dialog" aria-modal="true">
          <div className="modal-card-box">
            <div className="modal-header-icon-row">
              <AlertCircle size={28} className="modal-warning-icon" />
              <h3>Change Career Trajectory?</h3>
            </div>
            <p>
              You are on <strong>{selectedPath ? selectedPath.name : 'Discover'}</strong>. You can switch to{' '}
              <strong>{switchTarget?.name ?? 'the other path'}</strong> once, until{' '}
              {career?.switchDeadline ? new Date(career.switchDeadline).toLocaleString() : 'the switch window closes'}.
            </p>
            <p>Your completed lessons and earned XP are kept. After switching, the path is fixed.</p>
            <div className="modal-actions-dual">
              <button
                className="btn-modal-secondary"
                onClick={() => setSwitchModalOpen(false)}
              >
                Keep Current Track
              </button>
              <button
                className="btn-modal-danger"
                onClick={async () => {
                  setSwitchModalOpen(false);
                  if (switchTarget) await switchPath(switchTarget.id).catch(() => undefined);
                }}
              >
                Change Career Track
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
