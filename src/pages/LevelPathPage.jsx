import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronRight, Clock3, Layers, Lock, Play, Target, Trophy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import useAsync from '../hooks/useAsync';
import { ErrorState, LoadingState } from '../components/shared/States';
import { HomeStreak, SideQuests } from '../components/JourneyWidgets';
import { levelInfo, stageBadge, stageScene } from '../utils/journey';
import { LEVEL_COLORS, LEVEL_PATHS, groupModules } from '../utils/levelPaths';

const STATE_LABEL = { completed: 'Completed', in_progress: 'In progress', available: 'Available', locked: 'Locked' };

function HeroTitle({ text }) {
  const words = text.trim().split(/\s+/);
  const last = words.pop();
  return <h1>{words.join(' ')} <em>{last}</em></h1>;
}

/** The full learning path of Levels 3–10, laid out like the Stage 2 overview. */
export default function LevelPathPage({ level }) {
  const { navigate, milestones } = useApp();
  const path = LEVEL_PATHS[level];
  const info = levelInfo(level);
  const name = milestones[level - 1]?.name ?? info.name;
  const color = LEVEL_COLORS[level];
  const batchId = path?.batchId;
  const curriculum = useAsync(() => api.get('stage2/curriculum', { batchId }), [batchId], { enabled: Boolean(batchId) });
  const [selected, setSelected] = useState(0);

  if (!path) return <ErrorState message="This level has no learning path yet." />;

  const modules = curriculum.data?.modules ?? [];
  const groups = batchId && modules.length ? groupModules(level, modules) : path.groups.map((g, i) => ({ ...g, number: i + 1, modules: [] }));
  const active = groups[selected];
  const done = (g) => g.modules.length > 0 && g.modules.every((m) => m.state === 'completed');
  const next = levelInfo(level + 1);
  const scrollToPath = () => document.getElementById('lp-path')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  const openModule = (m) => navigate('stage2/module', { batch: batchId, module: m.id });

  return (
    <div className="s2-page lp-page" style={{ '--lp-c': color }}>
      <div className="s2-grid">
        <div className="s2-main">
          <header className="s2-hero lp-hero">
            <img className="s2-hero__art lp-hero__art" src={stageScene(level).image} alt="" />
            <div className="s2-hero__copy">
              <button type="button" className="lp-back" onClick={() => navigate(`level/${level}`)}><ArrowLeft size={16} /> Level {level}: {name}</button>
              <span className="s2-levelpill">Level {level} <span aria-hidden="true">•</span> {path.pill}</span>
              <HeroTitle text={path.hero} />
              <p>{path.summary}</p>
              <button type="button" className="s2-cta" onClick={scrollToPath}>
                <Play size={22} fill="currentColor" /> Explore the Path <ArrowRight size={22} />
              </button>
            </div>
          </header>

          <section className="s2-path" id="lp-path" aria-labelledby="lp-path-title">
            <header className="s2-path__head">
              <h2 id="lp-path-title"><Layers size={34} /> Your Learning Path</h2>
              <span className="s2-countpill">{groups.filter(done).length} / {groups.length} Modules Completed</span>
            </header>

            <div className="s2-gate" role="status">
              <Clock3 size={20} />
              <span>Level {level} is under development. Its lessons will open here as soon as they are published.</span>
            </div>

            <ol className="s2-groups">
              {groups.map((g, i) => {
                const Icon = g.icon;
                return (
                  <li key={g.title}>
                    <button type="button" className={`s2-group ${selected === i ? 'is-selected' : ''}`} aria-pressed={selected === i} aria-controls="lp-modules" onClick={() => setSelected(i)}>
                      <span className="lp-art" aria-hidden="true"><Icon strokeWidth={2.1} /></span>
                      <strong>{g.number}. {g.title}</strong>
                      <span className="s2-group__summary">{g.summary}</span>
                      <span className="s2-group__foot">
                        {g.modules.length ? <><BookOpen size={19} /> {g.modules.length} Modules <ChevronRight size={20} className="s2-group__chev" /></> : <><Clock3 size={17} /> Under development</>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            {active && (
              <div className="s2-modules" id="lp-modules" aria-live="polite">
                <div className="s2-modules__head">
                  <h3>{active.number}. {active.title}</h3>
                  <span>{active.modules.length ? `${active.modules.filter((m) => m.state === 'completed').length} / ${active.modules.length} modules completed` : 'Under development'}</span>
                </div>
                {curriculum.error ? <ErrorState message={curriculum.error} onRetry={curriculum.reload} />
                  : curriculum.loading && batchId && !modules.length ? <LoadingState label="Loading modules…" />
                  : active.modules.length ? (
                    <ul>
                      {active.modules.map((m) => {
                        const awaiting = m.status === 'awaiting_content';
                        const locked = m.state === 'locked';
                        return (
                          <li key={m.id}>
                            <button type="button" className={`s2-module is-${awaiting ? 'awaiting_content' : m.state}`} onClick={() => openModule(m)} disabled={awaiting || locked}>
                              <span className="s2-module__icon" aria-hidden="true">
                                {m.state === 'completed' ? <CheckCircle2 size={20} /> : awaiting ? <Clock3 size={19} /> : locked ? <Lock size={18} /> : <Play size={16} fill="currentColor" />}
                              </span>
                              <span className="s2-module__text">
                                <strong>{m.title || m.id}</strong>
                                <small>{m.id} · {awaiting ? 'Under development' : STATE_LABEL[m.state] ?? m.state}</small>
                              </span>
                              {!awaiting && !locked && <ArrowRight size={18} className="s2-module__go" />}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="lp-empty"><Clock3 size={20} /> The modules for {active.title} are under development. They will appear here as soon as they are published.</p>
                  )}
              </div>
            )}
          </section>

          <section className="s2-gains" aria-label={`What you'll gain in Level ${level}`}>
            <h2><Target size={36} /> What You&apos;ll Gain in Level {level}</h2>
            <ul>
              {path.gains.map(([title, Icon]) => <li key={title}><Icon size={30} /> <span>{title}</span></li>)}
            </ul>
          </section>
        </div>

        <aside className="s2-rail" aria-label="Streak, side quests and next milestone">
          <HomeStreak />
          <SideQuests from="home" />
          <section className="rail-card s2-milestone lp-milestone" aria-labelledby="lp-ms-title">
            <img src={stageBadge(Math.min(level + 1, 10))} alt="" className="lp-milestone__art" />
            <h2 id="lp-ms-title"><Trophy size={28} /> Next Milestone</h2>
            <p>{level < 10 ? `Complete Level ${level} to unlock Level ${level + 1}: ${milestones[level]?.name ?? next.name}.` : 'This is the final level of your journey.'}</p>
            {level < 10 && (
              <button type="button" className="s2-linkbtn" onClick={() => navigate(`level/${level + 1}`)}>See Level {level + 1} <ArrowRight size={16} /></button>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
