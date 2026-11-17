import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api, errorMessage } from '../lib/api';
import { Sparkles, FileText, ArrowRight, Search, HelpCircle, Lock, Check } from 'lucide-react';

/** Every lesson of the current path's Discover course, searchable and filterable by format. */
export default function LearnPage() {
  const { paths, selectedPath, navigate, triggerToast } = useApp();
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [course, setCourse] = useState(null);
  const [error, setError] = useState('');
  const currentPath = selectedPath || paths[0];

  useEffect(() => {
    if (!currentPath) return;
    setCourse(null);
    api
      .get('journey/level', { number: 1, pathwayId: currentPath.id })
      .then((d) => setCourse(d?.course ?? null))
      .catch((e) => setError(errorMessage(e)));
  }, [currentPath?.id]);

  if (!currentPath) return <div className="learn-catalog-page"><p>Loading…</p></div>;
  const lessons = (course?.modules ?? []).flatMap((m) => m.lessons.map((l) => ({ ...l, module: m.title })));
  const format = (l) => (l.kind === 'quiz' ? 'QUIZ' : l.contentFormat === 'visual' ? 'VISUAL' : 'READING');
  const filtered = lessons.filter((l) => {
    const q = searchQuery.trim().toLowerCase();
    return (filterType === 'ALL' || format(l) === filterType) && (!q || `${l.title} ${l.module}`.toLowerCase().includes(q));
  });

  const open = (l) => {
    if (!course?.enrollmentId) {
      navigate(`path/${currentPath.id}`);
      return;
    }
    if (!l.access.allowed && !l.isCompleted) {
      triggerToast(l.access.nextAction || 'Finish the earlier lessons first.');
      return;
    }
    navigate('lesson', { path: currentPath.id, lesson: l.id });
  };

  return (
    <div className="learn-catalog-page">
      <div className="learn-header-bar">
        <div>
          <span className="section-eyebrow">LESSONS</span>
          <h1>Learning Space</h1>
          <p>Every lesson of the {currentPath.name} Discover course.</p>
        </div>
        <button className="btn-switch-track-top" onClick={() => navigate('discover')}>
          <span>Paths ({currentPath.name})</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div className="learn-filter-toolbar">
        <div className="search-input-shell">
          <Search size={16} />
          <input type="text" placeholder="Search lessons and modules..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="format-filter-pills">
          {['ALL', 'READING', 'VISUAL', 'QUIZ'].map((f) => (
            <button key={f} className={`filter-pill-btn ${filterType === f ? 'active' : ''}`} onClick={() => setFilterType(f)}>
              {f === 'ALL' ? 'All Formats' : f}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="form-feedback-alert error" role="alert"><span>{error}</span></div>}
      {!course && !error && <p>Loading lessons…</p>}
      {course && !course.enrollmentId && (
        <div className="learn-bottom-cta-banner">
          <div>
            <h3>Enroll to start the {currentPath.name} course</h3>
            <p>Enrolling is free and lets you open every lesson in order.</p>
          </div>
          <button className="btn-banner-action" onClick={() => navigate(`path/${currentPath.id}`)}>
            <span>Open course</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      <div className="learn-cards-grid">
        {filtered.map((l) => {
          const Icon = l.kind === 'quiz' ? HelpCircle : l.contentFormat === 'visual' ? Sparkles : FileText;
          const locked = !l.access.allowed && !l.isCompleted;
          return (
            <div key={l.id} className={`learn-course-card ${locked ? 'is-locked' : ''}`} onClick={() => open(l)}>
              <div className="card-top-icon-strip">
                <div className="learn-card-icon-box"><Icon size={20} /></div>
                <span className="learn-card-format-tag">{format(l)} • {l.estimatedMinutes} min</span>
              </div>
              <div className="learn-card-body">
                <h3>{l.title}</h3>
                <p>{l.module}</p>
              </div>
              <div className="learn-card-footer">
                <span className="xp-earn-tag">{l.isCompleted ? <><Check size={13} /> Completed</> : locked ? <><Lock size={13} /> Locked</> : 'Available'}</span>
                <span className="open-lesson-link">
                  <span>Open</span>
                  <ArrowRight size={13} />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="learn-bottom-cta-banner">
        <div>
          <h3>Ready to practise?</h3>
          <p>Stage 2 has workplace tickets and hands-on labs with a real terminal.</p>
        </div>
        <button className="btn-banner-action" onClick={() => navigate('stage2')}>
          <span>Open Stage 2</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
