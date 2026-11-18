import React, { useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, ChevronLeft, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api, errorMessage } from '../lib/api';
import useAsync from '../hooks/useAsync';
import { ErrorState, LoadingState } from '../components/shared/States';
import { ProgressBar } from '../components/shared/Progress';
import Stage2LessonView from '../components/stage/Stage2LessonView';

const stateText = (state) => state?.replaceAll('_', ' ') ?? '';
const accountError = 'Open this module from your learning path.';

export default function FoundationWorkPage({ lesson = false }) {
  const { currentRoute, navigate, refresh } = useApp();
  const q = currentRoute.query;
  const valid = Boolean(q.batch && q.module && (!lesson || q.concept));
  const part = q.part === 'guided' ? 'guided' : 'lesson';
  const ref = { batchId: q.batch, conceptId: q.concept, part };
  const result = useAsync(() => lesson
    ? api.get('stage2/lessons', ref)
    : api.get('stage2/modules/outline', { batchId: q.batch, moduleId: q.module }),
  [lesson, q.batch, q.module, q.concept, part], { enabled: valid });
  // In a lesson, the module outline tells us what comes next (lesson → guided problem → ticket).
  const outlineQ = useAsync(() => api.get('stage2/modules/outline', { batchId: q.batch, moduleId: q.module }),
    [lesson, q.batch, q.module, q.concept, part], { enabled: lesson && valid });
  const items = outlineQ.data?.items ?? [];
  const here = items.findIndex((i) => i.itemId === `${q.concept}:${part}`);
  const nextItem = here >= 0 ? items.slice(here + 1).find((i) => i.state !== 'awaiting_content') ?? null : null;
  const back = () => {
    // Lessons return to their stage (Level 2) or tunnel, not to a separate outline page.
    if (lesson && !q.tunnel) navigate('stage2');
    else if (lesson) navigate(`tunnel/${q.tunnel}`, { from: q.from });
    else if (q.tunnel) navigate(`tunnel/${q.tunnel}`, { from: q.from });
    else navigate('stage2');
  };
  const [opening, setOpening] = useState('');
  /** Challenges open the ticket the server stores them under (written or CodeLab). */
  const open = async (item) => {
    if (item.kind !== 'challenge') {
      navigate('stage2/lesson', { ...q, concept: item.conceptId, part: item.kind });
      return;
    }
    setOpening(item.itemId);
    let storage = { moduleId: item.moduleId, challengeId: item.challengeId };
    try {
      const challenge = await api.get('stage2/challenges', { batchId: q.batch, conceptId: item.conceptId });
      if (challenge?.storage?.moduleId) storage = challenge.storage;
    } catch { /* fall back to the outline's reference */ }
    finally { setOpening(''); }
    navigate('stage2/ticket', { ...q, module: storage.moduleId, challenge: storage.challengeId || undefined, concept: item.conceptId, outline: q.module });
  };

  const data = result.data;
  if (lesson && valid && data && !result.error) {
    return (
      <Stage2LessonView q={q} lesson={data} outline={outlineQ.data} onOpen={open} onBack={back}
        onReload={async () => { await result.reload(); outlineQ.reload(); refresh(); }} />
    );
  }
  return (
    <div className="stage2-page foundation-work">
      <button type="button" className="back-nav-btn" onClick={back}><ChevronLeft size={16} /> {q.tunnel ? 'Tunnel overview' : 'Level 2'}</button>
      {!valid ? <ErrorState message={accountError} /> : result.error ? <ErrorState message={result.error} onRetry={result.reload} /> : result.loading && !data ? <LoadingState /> : data && (
        lesson ? <LessonBody data={data} refInput={ref} nextItem={nextItem} onNext={() => (nextItem ? open(nextItem) : back())}
          onReload={async () => { await result.reload(); outlineQ.reload(); refresh(); }} /> : (
          <>
            <header className="tunnel-hero">
              <span className="section-eyebrow">{data.module.code ?? data.module.id}</span>
              <h1>{data.module.title}</h1>
              {data.progress && <><p>{data.progress.itemsCompleted} / {data.progress.itemsTotal} activities completed</p><ProgressBar value={data.progress.percent} label="Module progress" /></>}
              {data.module.missingPrerequisites?.length > 0 && <p>Complete {data.module.missingPrerequisites.join(', ')} first.</p>}
            </header>
            <section className="journey-widget">
              <h2><BookOpen size={20} /> Module activities</h2>
              <ul className="foundation-items">{data.items.map((item) => {
                const awaiting = item.status === 'awaiting_content' || item.state === 'awaiting_content';
                const available = !awaiting && ['available', 'in_progress', 'completed'].includes(item.state) && Boolean(item.conceptId);
                return (
                  <li key={item.itemId}><button type="button" onClick={() => open(item)} disabled={!available || Boolean(opening)}>
                    <span><strong>{item.title}</strong><small>{item.kind === 'guided' ? 'Guided problem' : item.kind} · {awaiting ? 'Content coming soon' : stateText(item.state)}{opening === item.itemId ? ' · Opening…' : ''}</small></span>
                    {available ? <ArrowRight size={16} /> : <Lock size={16} />}
                  </button></li>
                );
              })}</ul>
            </section>
          </>
        )
      )}
    </div>
  );
}

function LessonBody({ data, refInput, onReload, nextItem, onNext }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const guided = data.guided?.evidence ? data.guided : null;
  const markComplete = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post('stage2/lessons/complete', refInput);
      await onReload();
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  return (
    <article className="foundation-lesson">
      <header className="tunnel-hero"><span className="section-eyebrow">{data.moduleTitle}</span><h1>{guided?.title ?? data.title}</h1>{data.minutes && <p>{data.minutes} min</p>}</header>
      <div className="journey-widget">
        {data.opening && <p>{data.opening}</p>}
        {data.sections?.map((section) => <section key={section.id}><h2>{section.title}</h2><p>{section.body}</p></section>)}
        {data.example && <section><h2>{data.example.title}</h2><pre>{data.example.code}</pre><p>{data.example.walkthrough}</p></section>}
        {guided && (
          <>
            <p>{guided.report}</p>
            {guided.evidence.map((e) => <section key={e.id}><h2>{e.label}</h2><pre>{e.content}</pre></section>)}
            {[['Reproduce', guided.reproduction], ['Hypothesis', guided.hypothesis], ['Diagnostic action', guided.diagnosticAction],
              ['Cause', guided.cause], ['Repair', guided.repair], ['Verification', guided.verification]].map(([title, body]) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}
            <h2>Before</h2><pre>{guided.before}</pre><h2>After</h2><pre>{guided.after}</pre>
          </>
        )}
        {data.tabs?.takeaways?.length > 0 && <section><h2>Key takeaways</h2><ul>{data.tabs.takeaways.map((text) => <li key={text}>{text}</li>)}</ul></section>}
        {data.tabs?.resources?.length > 0 && <section><h2>Resources</h2><ul>{data.tabs.resources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul></section>}
        {data.tabs?.notes && <LessonNotes initial={data.tabs.notes} refInput={refInput} />}
        {error && <ErrorState message={error} />}
        {data.status === 'awaiting_content' ? <p>{data.guided?.brief || 'This lesson is coming soon.'}</p> : data.completed ? (
          <div className="fw-next">
            <strong className="fw-done"><CheckCircle2 size={18} /> Lesson completed</strong>
            <button className="btn-level-primary fw-next-btn" onClick={onNext}>
              {nextItem ? <>Next: {nextItem.title}</> : 'Back to module'} <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <button className="btn-level-primary" onClick={markComplete} disabled={busy}>{busy ? 'Saving…' : 'Mark complete'} <ArrowRight size={16} /></button>
        )}
      </div>
    </article>
  );
}


function LessonNotes({ initial, refInput }) {
  const [note, setNote] = useState(initial);
  const [body, setBody] = useState(initial.body);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    setStatus('');
    try {
      const updated = await api.put('stage2/lessons/notes', {
        batchId: refInput.batchId, conceptId: refInput.conceptId, body, revision: note.revision,
      });
      setNote(updated);
      setStatus('Notes saved.');
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="foundation-notes">
      <label><strong>Lesson notes</strong><textarea rows={4} maxLength={10000} value={body} onChange={(event) => setBody(event.target.value)} disabled={saving} /></label>
      <button type="button" className="btn-outline-small" onClick={save} disabled={saving || body === note.body}>{saving ? 'Saving…' : 'Save notes'}</button>
      <p role="status">{status}</p>
    </section>
  );
}
