import React, { useState } from 'react';
import { ArrowLeft, BarChart3, Bookmark, Briefcase, CheckCircle2, Circle, CircleDot, Code2, ExternalLink, Flag, Gift, Lock, Play, Target } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import useAsync from '../hooks/useAsync';
import { ErrorState, LoadingState } from '../components/shared/States';
import { Chest, DifficultyPill, DungeonGate, RewardTiles, chapterIcon } from '../components/dsa/DsaParts';

const FILTERS = [['all', 'All'], ['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']];

function StatusIcon({ status }) {
  if (status === 'solved') return <CheckCircle2 size={22} className="dsa-status is-solved" aria-label="Solved" />;
  if (status === 'attempted') return <CircleDot size={22} className="dsa-status is-attempted" aria-label="Attempted" />;
  return <Circle size={22} className="dsa-status" aria-label="Not started" />;
}

/** One chapter of the DSA Dungeon: its problems, the quest track and progress (GET dsa/chapter). */
export default function DsaChapterPage() {
  const { navigate, currentRoute } = useApp();
  const chapterId = currentRoute?.query?.id ?? 'DSA01';
  const [difficulty, setDifficulty] = useState('all');
  const q = useAsync(() => api.get('dsa/chapter', { chapterId, difficulty: difficulty === 'all' ? undefined : difficulty }), [chapterId, difficulty]);

  if (q.loading && !q.data) return <div className="dsa-page dsa-page--center"><LoadingState label="Opening the chapter…" /></div>;
  if (q.error) return <div className="dsa-page dsa-page--center"><ErrorState message={q.error} onRetry={q.reload} /></div>;
  const { chapter: c, track, counts, problems, rewards } = q.data;
  const Icon = chapterIcon(c.icon);
  const open = (p) => navigate('dsa/problem', { slug: p.slug });
  const cont = q.data.continue;

  return (
    <div className="dsa-page dsa-chapter">
      <header className="dsa-chapter__head">
        <button type="button" className="dsa-iconbtn dsa-iconbtn--lg" onClick={() => navigate('tunnel/dsa')} aria-label="Back to the DSA Dungeon"><ArrowLeft size={22} /></button>
        <span className="dsa-hex" aria-hidden="true"><Icon size={34} strokeWidth={2.2} /></span>
        <div className="dsa-chapter__title">
          <h1>{c.title}</h1>
          <span className="dsa-pill">DSA Dungeon <span aria-hidden="true">•</span> Chapter {c.number} of {track.length}</span>
        </div>
        <DungeonGate className="dsa-chapter__gate" />
        <section className="dsa-card dsa-chapter__progress" aria-label="Chapter progress">
          <div>
            <div className="dsa-row"><strong>Chapter Progress</strong><span>{c.solved} / {c.total}</span></div>
            <div className="dsa-row"><div className="dsa-bar"><span style={{ width: `${Math.max(c.percent, 2)}%` }} /></div><b>{c.percent}%</b></div>
          </div>
          <Chest open={c.state === 'completed'} />
        </section>
      </header>

      <div className="dsa-chapter__grid">
        <nav className="dsa-card dsa-track" aria-label="Quest track">
          <h2><Flag size={22} className="is-gold" /> Quest Track</h2>
          <ol>
            {track.map((t) => (
              <li key={t.id} className={`is-${t.id === c.id ? 'current' : t.state}`}>
                <button type="button" onClick={() => navigate('dsa/chapter', { id: t.id })} disabled={!t.unlocked} aria-current={t.id === c.id ? 'page' : undefined}>
                  <span className="dsa-track__num">{String(t.number).padStart(2, '0')}</span>
                  <span className="dsa-track__title">{t.title}</span>
                  {!t.unlocked ? <Lock size={16} /> : t.state === 'completed' ? <CheckCircle2 size={17} className="is-done" /> : null}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <section className="dsa-card dsa-problems" aria-labelledby="dsa-problems-title">
          <header className="dsa-problems__head">
            <BarChart3 size={34} className="is-gold" />
            <div>
              <h2 id="dsa-problems-title">Practice Problems</h2>
              <p className="dsa-muted">{c.summary}</p>
            </div>
            <div className="dsa-filters" role="group" aria-label="Filter by difficulty">
              {FILTERS.map(([id, label]) => (
                <button key={id} type="button" className={difficulty === id ? 'is-on' : ''} aria-pressed={difficulty === id} onClick={() => setDifficulty(id)}>
                  {label} ({counts[id]})
                </button>
              ))}
            </div>
          </header>
          <ul className="dsa-problems__list">
            {problems.map((p) => (
              <li key={p.slug} className={`is-${p.status}`}>
                <button type="button" className="dsa-problem" onClick={() => open(p)} disabled={!c.unlocked}>
                  <StatusIcon status={p.status} />
                  <span className="dsa-problem__title">{p.number}. {p.title}</span>
                  {p.bookmarked && <Bookmark size={15} className="dsa-problem__mark" aria-label="Bookmarked" />}
                  <span className="dsa-problem__kind" title={p.inApp ? 'Solve in the in-app editor' : `Practise on ${p.links[0]?.site}`}>
                    {p.inApp ? <><Code2 size={14} /> In-app</> : <><ExternalLink size={13} /> {p.links[0]?.site}</>}
                  </span>
                  <DifficultyPill value={p.difficulty} />
                </button>
                {p.links[0] && (
                  <a className="dsa-problem__link" href={p.links[0].url} target="_blank" rel="noreferrer" aria-label={`Open ${p.title} on ${p.links[0].site}`}>
                    <ExternalLink size={18} />
                  </a>
                )}
              </li>
            ))}
            {!problems.length && <li className="dsa-empty">No {difficulty} problems in this chapter.</li>}
          </ul>
        </section>

        <aside className="dsa-chapter__side">
          <section className="dsa-card">
            <h2><Gift size={22} className="is-gold" /> Chapter Rewards</h2>
            <RewardTiles rewards={rewards} />
          </section>
          <section className="dsa-card">
            <h2><Target size={22} className="is-gold" /> Your Progress</h2>
            <div className="dsa-big"><strong>{c.solved} / {c.total}</strong><span>Problems solved</span><b>{c.percent}%</b></div>
            <div className="dsa-bar"><span style={{ width: `${Math.max(c.percent, 2)}%` }} /></div>
            <p className="dsa-muted">{c.inAppCount >= c.total ? `All ${c.total} problems are judged in the app.` : `${c.inAppCount} of ${c.total} are judged in the app; the others are practised on the linked site and marked solved here.`}</p>
          </section>
          {(c.independent || c.related?.length > 0) && (
            <section className="dsa-card dsa-realworld">
              <h2><Briefcase size={20} className="is-gold" /> Real-world task</h2>
              {c.independent && <p>{c.independent}</p>}
              {c.related?.length > 0 && <p className="dsa-muted">Supports Development lesson {c.related.join(', ')}.</p>}
            </section>
          )}
          <button type="button" className="dsa-cta dsa-cta--block" onClick={() => cont && open(cont)} disabled={!cont}>
            <Play size={24} fill="currentColor" /> {cont ? (c.solved ? 'Continue Solving' : 'Start Solving') : 'Chapter complete'}
          </button>
        </aside>
      </div>
    </div>
  );
}
