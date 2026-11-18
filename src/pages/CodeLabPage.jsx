import React from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import useAsync from '../hooks/useAsync';
import { EmptyState, ErrorState, LoadingState } from '../components/shared/States';
import { ArrowRight, FlaskConical, Lock, Terminal, Database, Globe } from 'lucide-react';

/**
 * Labs hub. Every lab runs in its own isolated sandbox on the lab runner (real terminal, files,
 * preview and SQL); there is no in-process code execution in the web app.
 */
export default function CodeLabPage() {
  const { stage2, stage2Error, refresh, navigate } = useApp();
  const batchId = stage2?.batch?.id;
  const { data: labs, error, loading, reload } = useAsync(async () => {
    const [validation, curriculum] = await Promise.all([
      api.get('stage2/validation-challenges', { batchId }),
      api.get('stage2/curriculum', { batchId }),
    ]);
    const practice = validation.items.filter((i) => i.kind === 'lab').map((i) => ({
      key: i.conceptId ?? i.challengeId, title: i.title, moduleId: i.moduleId, challenge: i.challengeId,
      concept: i.conceptId, outline: i.slotId, note: i.conceptId ? 'Module challenge' : 'Practice ticket',
    }));
    const modules = curriculum.modules.filter((m) => m.status === 'published' && m.kind === 'lab').map((m) => ({
      key: m.id, title: m.label, moduleId: m.id, locked: m.state === 'locked', note: `Module ${m.id}`,
    }));
    return [...practice, ...modules];
  }, [batchId], { enabled: Boolean(batchId) });

  return (
    <div className="generic-workspace-page">
      <div className="workspace-header-bar">
        <div>
          <span className="section-eyebrow">HANDS-ON LABS</span>
          <h1>CodeLab</h1>
          <p>Each lab opens your own sandbox with a real terminal, the starter files, visible checks and hidden grading.</p>
        </div>
      </div>
      {stage2Error ? (
        <ErrorState message={stage2Error} onRetry={refresh} />
      ) : !stage2 ? (
        <LoadingState label="Loading Stage 2 access…" />
      ) : !stage2.enrolled ? (
        <div className="level-locked-prompt-box">
          <div className="locked-icon-bubble"><Lock size={28} /></div>
          <h3>Labs open in Stage 2</h3>
          <p>Complete Level 1 and join your Stage 2 batch to start the labs.</p>
          <button className="btn-level-primary" onClick={() => navigate('stage2')}><span>Go to Stage 2</span><ArrowRight size={15} /></button>
        </div>
      ) : (
        <div className="stage2-ticket-grid">
          {error && <ErrorState message={error} onRetry={reload} />}
          {loading && <LoadingState label="Loading labs…" />}
          {!loading && labs?.length === 0 && <EmptyState title="No labs are published for your batch yet." />}
          {!loading && labs?.map((l) => (
            <button
              key={l.key}
              className={`stage2-ticket-card ${l.locked ? 'is-locked' : ''}`}
              onClick={() => l.locked
                ? navigate('stage2')
                : navigate('stage2/ticket', { batch: batchId, module: l.moduleId, challenge: l.challenge, ...(l.concept ? { concept: l.concept, outline: l.outline } : {}), view: 'lab' })}
            >
              <span className="stage2-ticket-kind"><FlaskConical size={14} /> {l.note}</span>
              <strong>{l.title}</strong>
              <span className="open-lesson-link">{l.locked ? 'Locked · view Stage 2' : 'Open lab'} <ArrowRight size={13} /></span>
            </button>
          ))}
        </div>
      )}
      <div className="workspace-cards-grid">
        <div className="workspace-feature-card"><div className="feature-card-icon"><Terminal size={24} /></div><h3>Real terminal</h3><p>Run commands in an isolated container that only you can reach.</p></div>
        <div className="workspace-feature-card"><div className="feature-card-icon"><Globe size={24} /></div><h3>Live preview</h3><p>See your browser app update as you save files.</p></div>
        <div className="workspace-feature-card"><div className="feature-card-icon"><Database size={24} /></div><h3>Private database</h3><p>Query a PostgreSQL database seeded for the ticket.</p></div>
      </div>
    </div>
  );
}
