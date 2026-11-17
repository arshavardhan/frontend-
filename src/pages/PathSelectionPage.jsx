import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Code2, Sparkles, BookOpen, Clock, Zap, Check, ArrowRight,
  Target, Layers, Trophy, ChartNoAxesColumnIncreasing, ChevronLeft, Lock
} from 'lucide-react';

export default function PathSelectionPage() {
  const { paths, finalizedPathId, explorePath, finalizePath, navigate, triggerToast, stageModules, career } = useApp();
  const [confirming, setConfirming] = useState(null);
  const explore = stageModules?.modules?.find((m) => m.key === 'explore-paths');
  const progressFor = (id) => explore?.paths?.find((p) => p.pathwayId === id);
  const discoveryFor = (id) => career?.pathProgress?.find((p) => p.pathwayId === id);

  const handleSelect = async (pathObj) => {
    try {
      await explorePath(pathObj.id);
      navigate(`path/${pathObj.id}`);
    } catch {
      triggerToast('Could not open this path. Please try again.');
    }
  };

  return (
    <div className="path-selection-page-wrap">
      {/* Navigation Breadcrumb & Back */}
      <div className="page-breadcrumb-header">
        <button className="back-nav-btn" onClick={() => navigate('level/1')}>
          <ChevronLeft size={16} />
          <span>Back to Discover</span>
        </button>
        <span className="breadcrumb-divider">/</span>
        <span className="breadcrumb-static">Level 1: Discover</span>
        <span className="breadcrumb-divider">/</span>
        <span className="breadcrumb-current">Career Path Selection</span>
      </div>

      {/* Hero Section */}
      <section className="path-selection-hero-card">
        <div className="hero-content-col">
          <span className="hero-eyebrow-chip">LEVEL 1 · DISCOVER</span>
          <h1 className="hero-main-title">
            Start the <span className="text-gradient-sky">Development Path.</span>
          </h1>
          <p className="hero-lead-text">
            Explore the introductory courses, then start the Development path to unlock your learning roadmap and optional tunnels.
          </p>

          <div className="hero-assurance-pills">
            <div className="assurance-pill">
              <Check size={14} className="pill-check" />
              <span>Structured Curriculum</span>
            </div>
            <div className="assurance-pill">
              <Check size={14} className="pill-check" />
              <span>Production Code Projects</span>
            </div>
            <div className="assurance-pill">
              <Check size={14} className="pill-check" />
              <span>Industry Verified Skills</span>
            </div>
          </div>
        </div>

        <div className="hero-visual-col" aria-hidden="true">
          <div className="hero-orbital-ring-1" />
          <div className="hero-orbital-ring-2" />
          <div className="hero-core-badge">
            <img src="/teklozy-logo-original.png" alt="Teklozy" className="hero-core-logo" />
          </div>
          <span className="floating-discipline-chip chip-left">
            <Code2 size={14} /> Fullstack Dev
          </span>
          <span className="floating-discipline-chip chip-right">
            <Sparkles size={14} /> AI & LLMs
          </span>
        </div>
      </section>

      {/* Selection Cards Heading */}
      <div className="path-cards-heading-bar">
        <div>
          <span className="section-eyebrow">CURATED LEARNING PATHS</span>
          <h2>Your Learning Path</h2>
          <p>Development is your career path. AI stays available as an optional tunnel.</p>
        </div>
        <span className="path-count-badge">Your career path</span>
      </div>

      {/* Path Cards Grid */}
      <div className="path-cards-dual-grid">
        {paths.map((p) => {
          const isSelected = finalizedPathId === p.id;
          const isAI = p.id === 'ai-engineering';
          const progress = progressFor(p.id);
          const discovery = discoveryFor(p.id);

          return (
            <article
              key={p.id}
              className={`path-selection-card ${isAI ? 'track-ai' : 'track-dev'} ${isSelected ? 'is-active-selection' : ''}`}
            >
              {/* Card Illustration Banner */}
              <div className="path-card-banner">
                <div className="card-ambient-glow" />
                <div className="card-orbital-line" />
                <div className="card-hero-icon-wrap">
                  {isAI ? (
                    <Sparkles size={64} className="card-icon-svg" />
                  ) : (
                    <Code2 size={64} className="card-icon-svg" />
                  )}
                </div>
                <span className="card-discipline-badge">{p.badge}</span>
                {isSelected && (
                  <span className="active-enrolled-ribbon">
                    <Check size={12} strokeWidth={3} /> Your Career Path
                  </span>
                )}
              </div>

              {/* Card Content Body */}
              <div className="path-card-content">
                <div className="path-meta-metrics">
                  <span><BookOpen size={13} /> {p.domains.length} Areas</span>
                  <span><Clock size={13} /> {progress ? `${progress.percent}% explored` : 'Not started'}</span>
                  <span><Zap size={13} /> +{p.xpReward} XP</span>
                </div>

                <h3 className="path-card-title">{p.title}</h3>
                <p className="path-card-desc">{p.desc}</p>

                {/* Tags */}
                <div className="path-card-tag-cloud">
                  {p.tags.map((t) => (
                    <span key={t} className="skill-tag-pill">{t}</span>
                  ))}
                </div>

                {/* Core Competencies Checklist */}
                <div className="path-card-skills-checklist">
                  {p.skills.map((s) => (
                    <div key={s} className="skill-check-item">
                      <Check size={13} className="skill-check-icon" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>

                {/* Action CTA Button */}
                <div className="path-card-action-bar">
                  <button
                    className={`btn-select-path ${isSelected ? 'btn-active-path' : ''}`}
                    onClick={() => handleSelect(p)}
                  >
                    <span>{isSelected || progress?.percent ? 'Continue ' + p.name : 'Explore ' + p.name}</span>
                    <ArrowRight size={15} />
                  </button>
                  {!finalizedPathId && !isAI && (
                    <button className="btn-select-path btn-finalize-path" onClick={async () => {
                      const saved = await finalizePath(p.id).then(() => true, () => false);
                      if (saved) navigate('stage2');
                    }}>
                      <span>Start the {p.name} path</span>
                      <Check size={15} />
                    </button>
                  )}
                  <small className="path-persistence-caption">
                    <Lock size={11} />{' '}
                    {finalizedPathId
                      ? isSelected
                        ? 'Saved as your path'
                        : 'You can explore this path; your career path is set'
                      : 'Complete either Discover course, then start the Development path.'}
                    {discovery ? ` · ${discovery.discoveryChallengesPassed}/${discovery.discoveryChallengesTotal} challenges passed` : ''}
                  </small>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {confirming && (
        <div className="modal-backdrop-overlay" role="dialog" aria-modal="true">
          <div className="modal-card-box">
            <h3>Choose {confirming.name} as your career path?</h3>
            <p>
              This starts the main learning path and unlocks the DSA and AI side quests.
            </p>
            <div className="modal-actions-dual">
              <button className="btn-modal-secondary" onClick={() => setConfirming(null)}>Keep exploring</button>
              <button
                className="btn-modal-danger"
                onClick={async () => {
                  const target = confirming;
                  setConfirming(null);
                  const saved = await finalizePath(target.id).then(() => true, () => false);
                  // Discover is done: carry the learner straight on to Level 2 (Learn).
                  if (saved) navigate('stage2');
                }}
              >
                Choose {confirming.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Benefits Footer Strip */}
      <section className="path-benefits-row">
        <div className="benefit-card">
          <div className="benefit-icon-box"><Target size={20} /></div>
          <div className="benefit-text">
            <strong>Understand Careers</strong>
            <p>Explore real-world software & AI roles and hiring criteria.</p>
          </div>
        </div>

        <div className="benefit-card">
          <div className="benefit-icon-box"><Layers size={20} /></div>
          <div className="benefit-text">
            <strong>Learn by Doing</strong>
            <p>Write real code and build deployment-ready artifacts.</p>
          </div>
        </div>

        <div className="benefit-card">
          <div className="benefit-icon-box"><Trophy size={20} /></div>
          <div className="benefit-text">
            <strong>Earn XP & Badges</strong>
            <p>Get recognized and level up with verified achievements.</p>
          </div>
        </div>

        <div className="benefit-card">
          <div className="benefit-icon-box"><ChartNoAxesColumnIncreasing size={20} /></div>
          <div className="benefit-text">
            <strong>Grow with Purpose</strong>
            <p>Follow a proven 10-level ascent from learner to hired engineer.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
