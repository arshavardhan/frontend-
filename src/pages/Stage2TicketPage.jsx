import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api, ApiError, errorMessage } from '../lib/api';
import { LoadingState } from '../components/shared/States';
import { WRITTEN_FIELDS, AttemptFeedback } from '../components/Stage2Shared';
import {
  ChevronLeft, Lightbulb, Target, Check, BookOpen, FileSearch, Terminal,
  PenLine, ClipboardCheck, ArrowRight, Lock, Wrench
} from 'lucide-react';

const LabWorkspace = lazy(() => import('../components/LabWorkspace'));

const ref = (q) => ({ batchId: q.batch, moduleId: q.module, challengeId: q.challenge || undefined });

function Evidence({ items }) {
  return items.map((e) => (
    <div key={e.id} className="stage2-evidence">
      <span className="stage2-evidence-label">{e.label} <small>{e.kind}</small></span>
      <pre>{e.content}</pre>
    </div>
  ));
}

function WrittenTicket({ q, onSubmitted }) {
  const { run } = useApp();
  const [answers, setAnswers] = useState(() => Object.fromEntries(WRITTEN_FIELDS.map(([k]) => [k, ''])));
  const [revision, setRevision] = useState(0);
  const [saveState, setSaveState] = useState('');
  const dirty = useRef(false);
  const revisionRef = useRef(0);

  useEffect(() => {
    api.get('stage2/drafts', ref(q)).then((d) => {
      setAnswers((a) => ({ ...a, ...d.content }));
      setRevision(d.revision);
      revisionRef.current = d.revision;
    }).catch(() => undefined);
  }, [q.batch, q.module, q.challenge]);

  useEffect(() => {
    if (!dirty.current) return;
    setSaveState('Saving…');
    const t = setTimeout(async () => {
      try {
        const saved = await api.put('stage2/drafts', { ...ref(q), revision: revisionRef.current, content: answers });
        revisionRef.current = saved.revision;
        setRevision(saved.revision);
        setSaveState('Draft saved');
      } catch (e) {
        setSaveState(e instanceof ApiError && e.code === 'STALE_REVISION' ? 'Changed in another tab — reload to continue' : 'Could not save draft');
      }
    }, 900);
    return () => clearTimeout(t);
  }, [answers]);

  const submit = async () => {
    const attempt = await run(
      () => api.post('stage2/attempts', { ...ref(q), requestKey: crypto.randomUUID(), written: answers }),
      'Submitted. Your feedback is below.',
    ).catch(() => null);
    if (attempt) onSubmitted(attempt);
  };

  return (
    <div className="stage2-written">
      {WRITTEN_FIELDS.map(([key, label, help]) => (
        <label key={key} className="stage2-written-field">
          <span>{label}</span>
          <small>{help}</small>
          <textarea
            value={answers[key]}
            maxLength={8000}
            onChange={(e) => {
              dirty.current = true;
              setAnswers({ ...answers, [key]: e.target.value });
            }}
          />
        </label>
      ))}
      <div className="stage2-written-actions">
        <small>{saveState || (revision ? 'Draft loaded' : 'Answers are saved as you type')}</small>
        <button className="btn-level-primary" onClick={submit} disabled={WRITTEN_FIELDS.every(([k]) => !answers[k].trim())}>
          <span>Submit for feedback</span>
          <ClipboardCheck size={15} />
        </button>
      </div>
    </div>
  );
}

export default function Stage2TicketPage() {
  const { currentRoute, navigate, run } = useApp();
  const q = currentRoute.query;
  const isChallenge = Boolean(q.challenge);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [hints, setHints] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [solution, setSolution] = useState(null);
  const [solutionError, setSolutionError] = useState('');
  const [showExample, setShowExample] = useState(false);

  const loadAttempts = useCallback(() => api.get('stage2/attempts', ref(q)).then((d) => setAttempts(d.items)).catch(() => undefined), [q.batch, q.module, q.challenge]);

  useEffect(() => {
    if (!q.batch || !q.module) {
      setError('Open a ticket from Stage 2 or CodeLab.');
      return;
    }
    setDetail(null);
    setError('');
    setSolution(null);
    setSolutionError('');
    const load = q.concept
      ? api.get('stage2/challenges', { batchId: q.batch, conceptId: q.concept })
      : isChallenge
      ? api.get('stage2/validation-challenges/details', { batchId: q.batch, challengeId: q.challenge })
      : api.get('stage2/modules', { batchId: q.batch, moduleId: q.module });
    load.then(setDetail).catch((e) => setError(errorMessage(e)));
    api.get('stage2/hints', ref(q)).then(setHints).catch(() => undefined);
    loadAttempts();
  }, [q.batch, q.module, q.challenge, q.concept, isChallenge, loadAttempts]);

  const revealHint = async () => setHints(await run(() => api.post('stage2/hints', ref(q))).catch(() => hints));
  const loadSolution = async () => {
    try {
      setSolution(await api.get('stage2/solutions', ref(q)));
      setSolutionError('');
    } catch (e) {
      setSolutionError(errorMessage(e));
    }
  };

  const back = (
    <div className="page-breadcrumb-header">
      <button className="back-nav-btn" onClick={() => (q.tunnel ? navigate(`tunnel/${q.tunnel}`, { from: q.from }) : navigate('stage2'))}>
        <ChevronLeft size={16} />
        <span>{q.tunnel ? 'Tunnel overview' : 'Level 2'}</span>
      </button>
      <span className="breadcrumb-divider">/</span>
      <span className="breadcrumb-current">{q.challenge || q.module}</span>
    </div>
  );

  if (error)
    return (
      <div className="stage2-ticket-page">
        {back}
        <div className="level-locked-prompt-box">
          <div className="locked-icon-bubble"><Lock size={28} /></div>
          <h3>This ticket isn't open</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  if (detail && !detail.ticket) return <div className="stage2-ticket-page">{back}<p>This ticket is coming soon.</p></div>;
  if (!detail) return <div className="stage2-ticket-page">{back}<p>Loading ticket…</p></div>;

  if (q.view === 'lab' && detail.ticket.lab)
    return (
      <Suspense fallback={<LoadingState label="Loading the lab workspace…" />}>
        <LabWorkspace
          q={q}
          ticket={detail.ticket}
          onBack={() => navigate('stage2/ticket', { ...q, view: undefined })}
          onSubmitted={loadAttempts}
        />
      </Suspense>
    );

  const t = detail.ticket;
  return (
    <div className="stage2-ticket-page">
      {back}
      <header className="stage2-ticket-hero">
        <span className="hero-eyebrow-chip">{q.concept ? detail.moduleCode : isChallenge ? 'PRACTICE TICKET' : `MODULE ${detail.id}`} · WORKPLACE SIMULATION</span>
        <h1>{detail.title}</h1>
        <p>{detail.summary}</p>
        {isChallenge && !q.concept && <small>Practice ticket on {detail.moduleId} · {detail.moduleTitle}. It doesn't change your module progress.</small>}
      </header>

      <div className="stage2-ticket-layout">
        <div className="stage2-ticket-main">
          {detail.concepts?.length > 0 && <section className="stage2-block">
            <h2><BookOpen size={17} /> Concepts</h2>
            {detail.concepts.map((c) => (
              <div key={c.name} className="stage2-concept">
                <h3>{c.name}</h3>
                <p><strong>Why it matters.</strong> {c.why}</p>
                <p><strong>How it works.</strong> {c.how}</p>
                <p><strong>Evidence to look for.</strong> {c.evidence}</p>
              </div>
            ))}
          </section>}

          {detail.issues?.length > 0 && <section className="stage2-block">
            <h2><Wrench size={17} /> Common workplace issues</h2>
            <div className="stage2-issue-grid">
              {detail.issues.map((i) => (
                <div key={i.name} className="stage2-issue">
                  <h3>{i.name}</h3>
                  <p><strong>Symptom:</strong> {i.symptom}</p>
                  <p><strong>First check:</strong> {i.firstCheck}</p>
                  <p><strong>Fix:</strong> {i.fix}</p>
                  <p><strong>Verify:</strong> {i.verification}</p>
                </div>
              ))}
            </div>
          </section>}

          {detail.workedExample && <section className="stage2-block">
            <button className="stage2-toggle" onClick={() => setShowExample(!showExample)}>
              <FileSearch size={17} /> Worked example: {detail.workedExample.title} {showExample ? '▲' : '▼'}
            </button>
            {showExample && (
              <div className="stage2-example">
                <p><strong>Report.</strong> {detail.workedExample.report}</p>
                <Evidence items={detail.workedExample.evidence} />
                <ol>{detail.workedExample.investigation.map((s) => <li key={s}>{s}</li>)}</ol>
                <p><strong>Cause.</strong> {detail.workedExample.cause}</p>
                <p><strong>Fix.</strong> {detail.workedExample.fix}</p>
                <p><strong>Verification.</strong> {detail.workedExample.verification}</p>
              </div>
            )}
          </section>}

          <section className="stage2-block stage2-ticket-brief">
            <h2><Target size={17} /> Your ticket: {t.title}</h2>
            <p>{t.problem}</p>
            <p><strong>Impact.</strong> {t.impact}</p>
            <h3>Evidence</h3>
            <Evidence items={t.evidence} />
            <h3>Constraints</h3>
            <ul>{t.constraints.map((c) => <li key={c}>{c}</li>)}</ul>
            <h3>What to submit</h3>
            <p>{t.expectedSubmission}</p>
            <h3>Acceptance criteria</h3>
            <ul className="stage2-criteria">{t.acceptanceCriteria.map((c) => <li key={c}><Check size={13} /> {c}</li>)}</ul>
          </section>

          {t.kind === 'written' ? (
            <section className="stage2-block">
              <h2><PenLine size={17} /> Your answer</h2>
              <WrittenTicket q={q} onSubmitted={loadAttempts} />
            </section>
          ) : (
            <section className="stage2-block stage2-lab-launch">
              <h2><Terminal size={17} /> Hands-on lab</h2>
              <p>
                Opens your own sandbox with the starter files, a terminal{t.lab.hasPreview ? ', a live preview' : ''}
                {t.lab.hasDatabase ? ', a SQL panel' : ''} and {t.lab.visibleChecks.length} visible checks.{' '}
                {t.lab.hiddenCheckCount} hidden checks grade your submission.
              </p>
              <button className="btn-level-primary" onClick={() => navigate('stage2/ticket', { ...q, view: 'lab' })}>
                <span>Open lab</span>
                <ArrowRight size={15} />
              </button>
            </section>
          )}

          {attempts.length > 0 && (
            <section className="stage2-block">
              <h2><ClipboardCheck size={17} /> Your attempts</h2>
              {attempts.map((a) => <AttemptFeedback key={a.id} attempt={a} />)}
            </section>
          )}
        </div>

        <aside className="stage2-ticket-side">
          <div className="sidebar-summary-card">
            <h3><Lightbulb size={16} /> Hints</h3>
            {hints?.revealed.map((h) => <p key={h.index} className="stage2-hint">{h.index + 1}. {h.text}</p>)}
            {hints && hints.revealed.length < hints.total ? (
              <button className="btn-outline-small" onClick={revealHint}>
                Show hint {hints.revealed.length + 1} of {hints.total}
              </button>
            ) : hints ? (
              <small>All hints shown.</small>
            ) : null}
          </div>
          <div className="sidebar-summary-card">
            <h3><ClipboardCheck size={16} /> How it's graded</h3>
            {detail.rubric.map((d) => (
              <div key={d.dimension} className="stage2-rubric-row">
                <strong>{d.dimension}</strong>
                <span>{d.criteria.reduce((n, c) => n + c.points, 0)} pts</span>
              </div>
            ))}
            <small>Pass at 70 of 100.</small>
          </div>
          <div className="sidebar-summary-card">
            <h3><BookOpen size={16} /> Instructor solution</h3>
            {solution ? (
              <div className="stage2-solution">
                <p>{solution.solution.summary}</p>
                <ol>{solution.solution.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                <p><strong>Verification.</strong> {solution.solution.verification}</p>
              </div>
            ) : (
              <>
                <small>Unlocks after an attempt scoring 40 or more, or after two attempts.</small>
                <button className="btn-outline-small" onClick={loadSolution}>View solution</button>
                {solutionError && <small className="stage2-error">{solutionError}</small>}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
