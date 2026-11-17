import React from 'react';
import { ArrowLeft, ArrowRight, Clock3, Lock, Play, CheckCircle2, Compass } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import useAsync from '../hooks/useAsync';
import { AccountRequired, ErrorState, LoadingState } from '../components/shared/States';
import { ProgressBar } from '../components/shared/Progress';
import { TUNNEL_PREVIEWS } from '../components/JourneyWidgets';

const STATE_LABEL = { completed: 'Completed', in_progress: 'In progress', available: 'Available', locked: 'Locked' };

/** Entry screen of one optional tunnel (`#/tunnel/dsa`, `#/tunnel/ai`), from `GET tunnels/overview`. */
export default function TunnelPage() {
  const { currentRoute, isGuest, navigate } = useApp();
  const id = currentRoute.path.split('/')[1];
  const from = currentRoute.query.from === 'stage2' ? 'stage2' : 'home';
  const preview = TUNNEL_PREVIEWS.find((t) => t.id === id);
  const { data, error, loading, reload } = useAsync(() => api.get('tunnels/overview', { tunnelId: id }), [id], { enabled: Boolean(preview) && !isGuest });
  const list = useAsync(() => api.get('tunnels'), [id], { enabled: Boolean(preview) && !isGuest && Boolean(data?.open) });
  const progress = list.data?.items?.find((t) => t.id === id)?.progress ?? null;
  const modules = (data?.levels ?? []).flatMap((l) => l.modules);
  const start = data?.open ? modules.find((m) => m.status !== 'awaiting_content' && (m.state === 'in_progress' || m.state === 'available')) : null;
  const openModule = (moduleId) => navigate('stage2/module', { batch: data.batchId, module: moduleId, tunnel: id, from });

  return (
    <div className={`tn-page tn-page--${id}`}>
      <button type="button" className="tn-back" onClick={() => navigate(from)}>
        <ArrowLeft size={18} /> {from === 'home' ? 'Home' : 'Stage 2'}
      </button>

      <header className="tn-hero">
        <div className="tn-hero__copy">
          <span className="tn-eyebrow">Optional side quest</span>
          <h1>{data?.title ?? preview?.title ?? 'Side quest'}</h1>
          <p>{data?.purpose ?? preview?.purpose ?? ''}</p>
          {data?.open && progress && (
            <div className="tn-progress">
              <span>{progress.modulesCompleted ?? 0} / {progress.modulesTotal ?? data.modulesTotal} modules · {progress.percent ?? 0}%</span>
              <ProgressBar value={progress.percent ?? 0} label={`${data.title} progress`} />
            </div>
          )}
          {start && (
            <button type="button" className="tn-cta" onClick={() => openModule(start.id)}>
              <Play size={18} fill="currentColor" /> {start.state === 'in_progress' ? 'Continue' : 'Start'} {start.code} <ArrowRight size={18} />
            </button>
          )}
        </div>
        {preview && <img className="tn-hero__art" src={`/illustrations/quest-${id}.png`} alt="" />}
      </header>

      {!preview ? <ErrorState message="This tunnel could not be found." /> : isGuest ? <AccountRequired feature="side quests" /> : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading && !data ? <LoadingState label="Loading tunnel…" /> : data && (
        <>
          {!data.open && (
            <section className="tn-gate" role="status">
              <Lock size={22} />
              <div>
                <strong>Finish onboarding to enter this tunnel</strong>
                <span>Choose your Development path in Level 1. The tunnel opens as soon as your path is saved.</span>
              </div>
              <button type="button" className="tn-gate__btn" onClick={() => navigate('level/1')}><Compass size={17} /> Go to Level 1</button>
            </section>
          )}
          {data.open && data.whenToEnter && <p className="tn-note">{data.whenToEnter}</p>}
          {data.levels.map((level) => (
            <section className="tn-level" key={level.id ?? level.title} aria-labelledby={`tn-${level.id}`}>
              <header>
                <h2 id={`tn-${level.id}`}>{level.title}</h2>
                {level.readiness && <span>{level.readiness}</span>}
              </header>
              <ol className="tn-modules">
                {level.modules.map((m) => {
                  const awaiting = m.status === 'awaiting_content';
                  const state = awaiting ? 'awaiting' : !data.open ? 'locked' : (m.state ?? 'locked');
                  const disabled = awaiting || state === 'locked';
                  return (
                    <li key={m.id}>
                      <button type="button" className={`tn-module is-${state}`} disabled={disabled} onClick={() => openModule(m.id)}>
                        <span className="tn-module__code">{m.code}</span>
                        <strong>{m.title}</strong>
                        {m.teaches && <small>{m.teaches}</small>}
                        <span className="tn-module__state">
                          {awaiting ? <><Clock3 size={15} /> Under development</>
                            : state === 'completed' ? <><CheckCircle2 size={15} /> Completed</>
                            : state === 'locked' ? <><Lock size={14} /> Locked</>
                            : <>{STATE_LABEL[state] ?? state} <ArrowRight size={15} /></>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          {data.legacy && (
            <section className="tn-level">
              <header><h2>Earlier AI Basics work</h2><span>{data.legacy.note}</span></header>
              <ul className="tn-legacy">{data.legacy.modules.map((m) => <li key={m.moduleId}>{m.moduleId} · {String(m.state).replaceAll('_', ' ')}{m.bestScore != null ? ` · best ${m.bestScore}` : ''}</li>)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
