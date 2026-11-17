import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api, errorMessage } from '../lib/api';
import useAsync from '../hooks/useAsync';
import { AccountRequired, ErrorState, LoadingState } from '../components/shared/States';
import LevelOnePage from './LevelOnePage';
import {
  Trophy, Settings, Compass, ArrowRight, CheckCircle2,
  Lock, Zap, Star, Shield, ChevronLeft, Sparkles, Layers
} from 'lucide-react';

function BackBar({ label }) {
  const { navigate } = useApp();
  return (
    <div className="page-breadcrumb-header">
      <button className="back-nav-btn" onClick={() => navigate('home')}>
        <ChevronLeft size={16} />
        <span>Summit Roadmap</span>
      </button>
      <span className="breadcrumb-divider">/</span>
      <span className="breadcrumb-current">{label}</span>
    </div>
  );
}

function LaterLevel({ lvlNum }) {
  const { milestones, navigate } = useApp();
  const milestone = milestones.find((m) => m.level === lvlNum) || milestones[0];
  return (
    <div className="generic-workspace-page">
      <BackBar label={`Level ${lvlNum}: ${milestone.name}`} />
      <section className="level-overview-hero">
        <div className="level-badge-large">
          <span>LVL</span>
          <strong>{lvlNum}</strong>
        </div>
        <div className="level-hero-text">
          <span className="hero-eyebrow-chip">MILESTONE {lvlNum} OF 10</span>
          <h1>{milestone.name}</h1>
          <p>{milestone.desc}</p>
        </div>
      </section>
      <div className="level-actions-container">
        <div className="level-locked-prompt-box">
          <div className="locked-icon-bubble"><Lock size={28} /></div>
          <h3>Level {lvlNum} content is on the way</h3>
          <p>{milestone.status === 'locked' ? `This level unlocks after Level ${lvlNum - 1}. ` : ''}The lessons for this level are being prepared.</p>
          <button className="btn-level-primary" onClick={() => navigate('home')}>
            <span>Return to Summit Map</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Discover knowledge checks for the learner's current path, graded by the server. */
function Challenges() {
  const { selectedPath, paths, run, navigate, isGuest } = useApp();
  const [pathwayId, setPathwayId] = useState(selectedPath?.id || paths[0]?.id || '');
  // Paths load after sign-in; pick one as soon as they arrive (direct navigation / refresh).
  useEffect(() => {
    if (!pathwayId && (selectedPath?.id || paths[0]?.id)) setPathwayId(selectedPath?.id || paths[0].id);
  }, [pathwayId, selectedPath?.id, paths]);
  const [open, setOpen] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { data, loading, error: listError, reload } = useAsync(
    () => api.get('challenges', { pathwayId }),
    [pathwayId],
    { enabled: !isGuest && Boolean(pathwayId) },
  );
  const items = data?.items;

  const openChallenge = async (id) => {
    setError('');
    setResult(null);
    setAnswers({});
    try {
      setOpen(await api.get('challenges/details', { id }));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const toggle = (q, option) => {
    setAnswers((prev) => {
      const multi = q.kind === 'multiple_choice' || q.kind === 'matching';
      const current = prev[q.key] ?? [];
      const next = multi ? (current.includes(option) ? current.filter((o) => o !== option) : [...current, option]) : [option];
      return { ...prev, [q.key]: next };
    });
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await run(
        () => api.post('challenges/attempts', { challengeId: open.challenge.id, responses: answers, requestKey: crypto.randomUUID() }),
      );
      setResult(res);
      reload();
    } catch {
      // The app shows the API error.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="generic-workspace-page">
      <div className="workspace-header-bar">
        <div>
          <span className="section-eyebrow">DISCOVER KNOWLEDGE CHECKS</span>
          <h1>Challenges</h1>
          <p>Short checks for each area of a path. Passing the mandatory checks counts toward Level 1.</p>
        </div>
        <div className="view-toggle-group" role="tablist" aria-label="Path">
          {paths.map((p) => (
            <button key={p.id} className={`toggle-btn ${pathwayId === p.id ? 'active' : ''}`} disabled={submitting} onClick={() => { setPathwayId(p.id); setOpen(null); setError(''); }}>
              <span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>
      {error && <div className="form-feedback-alert error" role="alert"><span>{error}</span></div>}

      {isGuest ? <AccountRequired feature="Challenges" /> : open ? (
        <div className="challenge-runner-card">
          <button className="back-nav-btn" disabled={submitting} onClick={() => setOpen(null)}>
            <ChevronLeft size={16} />
            <span>All challenges</span>
          </button>
          <h2>{open.challenge.title}</h2>
          <p>{open.challenge.description} · Pass mark {open.challenge.passingScorePercent}% · Attempts used {open.previousAttemptsCount} of {open.challenge.maxAttempts}</p>
          {open.questions.map((q, i) => (
            <fieldset key={q.key} className="quiz-question-block">
              <legend>{i + 1}. {q.prompt}</legend>
              {(q.kind === 'multiple_choice' || q.kind === 'matching') && <small>Select every correct answer.</small>}
              {q.options.map((o) => (
                <label key={o} className={`quiz-option-row ${(answers[q.key] ?? []).includes(o) ? 'is-selected' : ''}`}>
                  <input
                    type={q.kind === 'multiple_choice' || q.kind === 'matching' ? 'checkbox' : 'radio'}
                    name={q.key}
                    checked={(answers[q.key] ?? []).includes(o)}
                    onChange={() => toggle(q, o)}
                    disabled={submitting || Boolean(result)}
                  />
                  <span>{o}</span>
                </label>
              ))}
            </fieldset>
          ))}
          {result ? (
            <div className={`form-feedback-alert ${result.passed ? 'success' : 'error'}`} role="status">
              <span>
                {result.passed ? 'Passed' : 'Not passed yet'}: {result.scorePercent ?? result.score_percent}%.
                {result.xpAwarded ? ` +${result.xpAwarded} XP.` : ''}
              </span>
            </div>
          ) : open.previousAttemptsCount >= open.challenge.maxAttempts ? (
            <p>You've used all attempts for this challenge.</p>
          ) : (
            <button className="btn-level-primary" onClick={submit} disabled={submitting || open.questions.some((q) => !(answers[q.key] ?? []).length)}>
              <span>{submitting ? 'Submitting…' : 'Submit answers'}</span>
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      ) : (
        <div className="workspace-cards-grid">
          {listError && <ErrorState message={listError} onRetry={reload} />}
          {loading && <LoadingState label="Loading challenges…" />}
          {items?.length === 0 && <p>No challenges for this path yet.</p>}
          {!loading && items?.map((c) => (
            <div key={c.id} className={`workspace-feature-card challenge-entry-card${c.userPassed ? ' highlight-card' : ''}`}>
              <div className="challenge-card-top">
                <span className={`diff-tag ${c.difficulty}`}>{c.difficulty}</span>
                <span className="xp-reward"><Zap size={13} /> +{c.xpReward} XP</span>
              </div>
              <h3>{c.title}</h3>
              <p>{c.description}</p>
              <div className="challenge-card-footer">
                <span>{c.userPassed ? <><CheckCircle2 size={14} /> Passed</> : c.isMandatory ? 'Required for Level 1' : 'Optional'}</span>
                <button className="btn-outline-small" onClick={() => openChallenge(c.id)}>
                  {c.userPassed ? 'Retake' : 'Start'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {!open && (
        <button className="btn-outline-small" onClick={() => navigate('discover')}>
          <Compass size={14} /> Explore paths
        </button>
      )}
    </div>
  );
}

/** Profile and preferences. Setting a public name completes the "Developer Profile" module. */
function Profile() {
  const { displayName, email, xp, gamification, run, selectedPath, finalizedPathId, navigate, currentLevel, milestones } = useApp();
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('me/preferences').then(setPrefs).catch(() => setPrefs({ journey_view: 'map', leaderboard_visible: false, public_name: '' }));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await run(
        () =>
          api.patch('me/preferences', {
            journeyView: prefs.journey_view,
            leaderboardVisible: Boolean(prefs.leaderboard_visible && prefs.public_name.trim()),
            publicName: prefs.public_name.trim(),
          }),
        'Profile saved.',
      );
      setPrefs(saved);
    } catch {
      /* toast already shown */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="generic-workspace-page">
      <div className="workspace-header-bar">
        <div>
          <span className="section-eyebrow">ACCOUNT</span>
          <h1>Developer Profile</h1>
          <p>Your public name is what other learners see on the leaderboard. Adding it completes the profile step of Level 1.</p>
        </div>
      </div>
      <div className="profile-settings-grid">
        <div className="profile-summary-card">
          <div className="profile-avatar-large">{(displayName[0] || 'L').toUpperCase()}</div>
          <h2>{displayName}</h2>
          <span className="profile-email">{email}</span>
          <div className="profile-field-row">
            <span>Level</span>
            <strong>{currentLevel} · {milestones[currentLevel - 1]?.name}</strong>
          </div>
          <div className="profile-field-row">
            <span>Experience</span>
            <span className="field-value-xp"><Zap size={14} /> {xp.toLocaleString()} XP</span>
          </div>
          <div className="profile-field-row">
            <span>Career path</span>
            <strong>{finalizedPathId ? selectedPath?.name : 'Not chosen yet'}</strong>
          </div>
          {gamification?.achievements?.length > 0 && (
            <div className="profile-field-row">
              <span>Badges</span>
              <strong>{gamification.achievements.map((a) => a.title || a.key).join(', ')}</strong>
            </div>
          )}
          {!finalizedPathId && (
            <button className="btn-outline-small" onClick={() => navigate('discover')}>
              <Compass size={14} /> Choose a path
            </button>
          )}
        </div>

        <form className="profile-settings-card" onSubmit={save}>
          <h3><Settings size={16} /> Preferences</h3>
          {!prefs ? (
            <p>Loading…</p>
          ) : (
            <>
              <label className="form-field-group">
                <span>Public name</span>
                <input
                  className="profile-text-input"
                  value={prefs.public_name}
                  maxLength={80}
                  onChange={(e) => setPrefs({ ...prefs, public_name: e.target.value })}
                  placeholder="How your name appears to others"
                />
              </label>
              <label className="profile-check-row">
                <input
                  type="checkbox"
                  checked={prefs.leaderboard_visible}
                  disabled={!prefs.public_name.trim()}
                  onChange={(e) => setPrefs({ ...prefs, leaderboard_visible: e.target.checked })}
                />
                <span>Show me on the weekly leaderboard</span>
              </label>
              <label className="form-field-group">
                <span>Home view</span>
                <select className="profile-text-input" value={prefs.journey_view} onChange={(e) => setPrefs({ ...prefs, journey_view: e.target.value })}>
                  <option value="map">Summit map</option>
                  <option value="list">Milestone list</option>
                </select>
              </label>
              <button type="submit" className="btn-level-primary" disabled={saving}>
                <span>{saving ? 'Saving…' : 'Save profile'}</span>
                <Shield size={15} />
              </button>
            </>
          )}
        </form>
      </div>
      <p className="profile-footnote"><Star size={13} /> <Sparkles size={13} /> Badges and XP are awarded by the server when you complete levels and challenges.</p>
    </div>
  );
}

export default function GenericPage({ type }) {
  const { currentRoute } = useApp();
  if (type === 'level') {
    const lvlNum = parseInt(currentRoute.path.replace('level/', ''), 10) || 1;
    return lvlNum === 1 ? <LevelOnePage /> : <LaterLevel lvlNum={lvlNum} />;
  }
  if (type === 'challenges') return <Challenges />;
  return <Profile />;
}
