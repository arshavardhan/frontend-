import React, { useCallback, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import { languageFor } from '../lib/monacoSetup';
import { useApp } from '../context/AppContext';
import { api, errorMessage } from '../lib/api';
import LabTerminal from './LabTerminal';
import { WRITTEN_FIELDS, AttemptFeedback } from './Stage2Shared';
import {
  ChevronLeft, File, Folder, Save, Play, RotateCcw, Square, Send, Database, Globe, RefreshCw, CheckCircle2, XCircle
} from 'lucide-react';

export default function LabWorkspace({ q, ticket, onBack, onSubmitted }) {
  const { run, refresh, triggerToast } = useApp();
  const lab = ticket.lab;
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [path, setPath] = useState('');
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState('');
  const [tab, setTab] = useState(lab.hasPreview ? 'preview' : lab.hasDatabase ? 'sql' : 'checks');
  const [preview, setPreview] = useState(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [checks, setChecks] = useState(null);
  const [sql, setSql] = useState('');
  const [queryResult, setQueryResult] = useState(null);
  const [notes, setNotes] = useState(() => Object.fromEntries(WRITTEN_FIELDS.map(([k]) => [k, ''])));
  const [lastAttempt, setLastAttempt] = useState(null);
  const [busy, setBusy] = useState('');

  const start = useCallback(async () => {
    setError('');
    try {
      const s = await api.post('stage2/labs', { batchId: q.batch, moduleId: q.module, challengeId: q.challenge || undefined });
      setSession(s);
      setPreview(s.preview);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [q.batch, q.module, q.challenge]);

  useEffect(() => {
    start();
  }, [start]);

  const listFiles = useCallback(async () => {
    if (!session) return;
    const d = await api.get('stage2/labs/files', { sessionId: session.id, path: '.' });
    setFiles(d.entries.filter((e) => !e.path.startsWith('.lab') && !e.path.includes('node_modules')));
  }, [session]);

  const openFile = useCallback(
    async (p) => {
      const d = await api.get('stage2/labs/files', { sessionId: session.id, path: p });
      setPath(p);
      setContent(d.content);
      setSaved(d.content);
    },
    [session],
  );

  const loadFiles = useCallback(async () => {
    setFileError('');
    try {
      await listFiles();
      const starterFile = lab.submissionFiles[0];
      if (starterFile) await openFile(starterFile);
    } catch (e) {
      setFileError(errorMessage(e));
    }
  }, [lab.submissionFiles, listFiles, openFile]);

  useEffect(() => {
    if (session) loadFiles();
  }, [session, loadFiles]);

  const saveFile = async () => {
    await api.put('stage2/labs/files', { sessionId: session.id, path, content });
    setSaved(content);
    setPreviewKey((k) => k + 1);
  };

  const save = async () => {
    setBusy('save');
    try {
      await saveFile();
    } catch (e) {
      triggerToast(errorMessage(e));
    } finally {
      setBusy('');
    }
  };

  const chooseFile = async (nextPath) => {
    if (nextPath === path) return;
    setBusy('open');
    try {
      if (content !== saved) await saveFile();
      await openFile(nextPath);
    } catch (e) {
      triggerToast(errorMessage(e));
    } finally {
      setBusy('');
    }
  };

  const reloadPreview = async () => {
    try {
      setPreview(await api.post('stage2/labs/preview-url', { sessionId: session.id }));
      setPreviewKey((k) => k + 1);
    } catch (e) {
      triggerToast(errorMessage(e));
    }
  };

  const runChecks = async () => {
    setBusy('checks');
    try {
      if (content !== saved) await saveFile();
      setChecks((await api.post('stage2/labs/checks', { sessionId: session.id })).checks);
      setTab('checks');
    } catch (e) {
      triggerToast(errorMessage(e));
    } finally {
      setBusy('');
    }
  };

  const runQuery = async () => {
    setBusy('query');
    try {
      setQueryResult(await api.post('stage2/labs/query', { sessionId: session.id, sql }));
    } catch (e) {
      setQueryResult({ ok: false, error: { message: errorMessage(e) } });
    } finally {
      setBusy('');
    }
  };

  const submit = async () => {
    setBusy('submit');
    try {
      if (content !== saved) await saveFile();
      const written = Object.fromEntries(Object.entries(notes).filter(([, v]) => v.trim()));
      const attempt = await api.post('stage2/labs/submit', { sessionId: session.id, requestKey: crypto.randomUUID(), written });
      triggerToast('Submitted. Hidden checks have graded your work.');
      setLastAttempt(attempt);
      setTab('submit');
      onSubmitted?.();
      refresh();
    } catch (e) {
      triggerToast(errorMessage(e));
      setTab('submit');
    } finally {
      setBusy('');
    }
  };

  const reset = async () => {
    if (!window.confirm('Reset restores the starter files and data. Your edits in this lab will be lost. Continue?')) return;
    setBusy('reset');
    try {
      await run(() => api.post('stage2/labs/reset', { sessionId: session.id }), 'Lab reset to the starter files.');
      setChecks(null);
      await listFiles();
      if (path) await openFile(path);
      setPreview(await api.post('stage2/labs/preview-url', { sessionId: session.id }).catch(() => preview));
      setPreviewKey((k) => k + 1);
    } catch (e) {
      triggerToast(errorMessage(e));
    } finally {
      setBusy('');
    }
  };

  const stop = async () => {
    setBusy('stop');
    try {
      await run(() => api.post('stage2/labs/stop', { sessionId: session.id }), 'Lab stopped.');
      onBack();
    } catch {
      setBusy('');
    }
  };

  if (error)
    return (
      <div className="lab-workspace">
        <button className="back-nav-btn" onClick={onBack}><ChevronLeft size={16} /> Back to ticket</button>
        <div className="form-feedback-alert error" role="alert">
          <span>{error}</span>
          <button className="inline-link-btn" onClick={start}>Try again</button>
        </div>
      </div>
    );
  if (!session)
    return (
      <div className="lab-workspace">
        <p className="lab-starting">Starting your lab sandbox…</p>
      </div>
    );

  return (
    <div className="lab-workspace">
      <header className="lab-toolbar">
        <button className="back-nav-btn" onClick={onBack}><ChevronLeft size={16} /> {ticket.title}</button>
        <span className="lab-expiry">Session ends {new Date(session.expiresAt).toLocaleTimeString()}</span>
        <div className="lab-toolbar-actions">
          <button className="btn-outline-small" onClick={runChecks} disabled={Boolean(busy)}><Play size={14} /> {busy === 'checks' ? 'Running…' : 'Run checks'}</button>
          <button className="btn-outline-small" onClick={reset} disabled={Boolean(busy)}><RotateCcw size={14} /> Reset</button>
          <button className="btn-outline-small" onClick={stop} disabled={Boolean(busy)}><Square size={14} /> Stop</button>
          <button className="btn-level-primary" onClick={() => setTab('submit')}><Send size={14} /> Submit</button>
        </div>
      </header>

      <div className="lab-grid">
        <aside className="lab-files">
          <div className="lab-panel-title">Files</div>
          {fileError && <div role="alert">{fileError} <button className="inline-link-btn" onClick={loadFiles}>Retry</button></div>}
          {files.map((f) => (
            <button
              key={f.path}
              className={`lab-file ${f.path === path ? 'is-open' : ''} depth-${f.path.split('/').length - 1}`}
              disabled={Boolean(busy) || f.type !== 'file'}
              onClick={() => chooseFile(f.path)}
            >
              {f.type === 'dir' ? <Folder size={13} /> : <File size={13} />} {f.path.split('/').pop()}
            </button>
          ))}
        </aside>

        <section className="lab-editor">
          <div className="lab-panel-title">
            {path || 'Choose a file'} {content !== saved && <em>· unsaved</em>}
            <button className="btn-outline-small" onClick={save} disabled={Boolean(busy) || !path || content === saved}><Save size={13} /> Save</button>
          </div>
          <Editor
            height="100%"
            theme="vs-dark"
            path={path}
            language={languageFor(path)}
            value={content}
            onChange={(v) => setContent(v ?? '')}
            options={{ readOnly: !path || Boolean(busy), minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
          />
        </section>

        <section className="lab-side">
          <div className="lab-tabs" role="tablist">
            {lab.hasPreview && <button className={tab === 'preview' ? 'is-active' : ''} onClick={() => setTab('preview')}><Globe size={13} /> Preview</button>}
            {lab.hasDatabase && <button className={tab === 'sql' ? 'is-active' : ''} onClick={() => setTab('sql')}><Database size={13} /> SQL</button>}
            <button className={tab === 'checks' ? 'is-active' : ''} onClick={() => setTab('checks')}><CheckCircle2 size={13} /> Checks</button>
            <button className={tab === 'submit' ? 'is-active' : ''} onClick={() => setTab('submit')}><Send size={13} /> Submit</button>
          </div>

          {tab === 'preview' && (
            <div className="lab-preview">
              {preview ? (
                <>
                  <div className="lab-preview-bar">
                    <button className="inline-link-btn" onClick={reloadPreview}><RefreshCw size={12} /> Reload</button>
                    <a href={preview.url} target="_blank" rel="noreferrer">Open in new tab</a>
                  </div>
                  <iframe key={previewKey} title="Lab preview" src={preview.url} sandbox="allow-scripts allow-forms allow-same-origin" />
                </>
              ) : (
                <p>Preview is not configured on this server.</p>
              )}
            </div>
          )}

          {tab === 'sql' && (
            <div className="lab-sql">
              <textarea value={sql} onChange={(e) => setSql(e.target.value)} placeholder="SELECT * FROM invoices;" spellCheck={false} />
              <div className="lab-sql-actions">
                <button className="btn-outline-small" onClick={() => setSql(path.endsWith('.sql') ? content : sql)} disabled={!path.endsWith('.sql')}>Use open file</button>
                <button className="btn-level-primary" onClick={runQuery} disabled={!sql.trim() || Boolean(busy)}><Play size={13} /> Run (read-only)</button>
              </div>
              {queryResult && !queryResult.ok && (
                <div className="form-feedback-alert error" role="alert">
                  <span>{queryResult.error.code ? `${queryResult.error.code}: ` : ''}{queryResult.error.message}{queryResult.error.position ? ` (at character ${queryResult.error.position})` : ''}</span>
                </div>
              )}
              {queryResult?.ok && (
                <div className="vs-table-wrap">
                  <small>{queryResult.rowCount} rows · {queryResult.durationMs} ms{queryResult.truncated ? ' · first 500 shown' : ''}</small>
                  <table className="vs-table">
                    <thead><tr>{queryResult.columns.map((c) => <th key={c.name}>{c.name}<small> {c.type}</small></th>)}</tr></thead>
                    <tbody>{queryResult.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v === null ? 'NULL' : String(v)}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'checks' && (
            <div className="lab-checks">
              {!checks && <p>Run the visible checks to see how your workspace is doing. Hidden checks run when you submit.</p>}
              {checks?.map((c) => (
                <div key={c.id} className={`lab-check ${c.passed ? 'is-pass' : 'is-fail'}`}>
                  {c.passed ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                  <strong>{lab.visibleChecks.find((v) => v.id === c.id)?.description || c.id}</strong>
                  {!c.passed && c.output && <pre>{c.output}</pre>}
                </div>
              ))}
            </div>
          )}

          {tab === 'submit' && (
            <div className="lab-submit">
              <p>Your saved workspace is graded by {lab.hiddenCheckCount} hidden checks. Short notes earn the written rubric points.</p>
              {WRITTEN_FIELDS.map(([key, label, help]) => (
                <label key={key} className="stage2-written-field compact">
                  <span>{label}</span>
                  <textarea value={notes[key]} placeholder={help} maxLength={8000} onChange={(e) => setNotes({ ...notes, [key]: e.target.value })} />
                </label>
              ))}
              <button className="btn-level-primary" onClick={submit} disabled={Boolean(busy)}>
                <Send size={14} /> {busy === 'submit' ? 'Grading…' : 'Submit workspace'}
              </button>
              {lastAttempt && <AttemptFeedback attempt={lastAttempt} />}
            </div>
          )}
        </section>

        <section className="lab-terminal-wrap">
          <LabTerminal sessionId={session.id} />
        </section>
      </div>
    </div>
  );
}
