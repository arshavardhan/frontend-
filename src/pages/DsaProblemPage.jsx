import React, { useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  ArrowLeft, Bookmark, BookmarkCheck, Bug, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock3, ExternalLink, FlaskConical,
  History, Info, KeyRound, Lightbulb, Maximize2, MessageSquare, Minimize2, Moon, Play, RotateCcw, ScanSearch, Send, Sparkles, Sun, XCircle,
} from 'lucide-react';
import '../lib/monacoSetup';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import useAsync from '../hooks/useAsync';
import { ErrorState, LoadingState } from '../components/shared/States';
import { DifficultyPill, Md, VERDICT_LABEL, chapterIcon, show } from '../components/dsa/DsaParts';

const LANG_LABEL = { javascript: 'JavaScript', python: 'Python', java: 'Java', cpp: 'C++' };
const MONACO_LANG = { javascript: 'javascript', python: 'python', java: 'java', cpp: 'cpp' };
const LANG_KEY = 'teklozyDsaLanguage';
const savedLanguage = () => { try { return localStorage.getItem(LANG_KEY) || 'javascript'; } catch { return 'javascript'; } };

const GENIE_MODES = [
  ['explain', 'Explain', Info], ['approach', 'Approach', Sparkles], ['hint', 'Hint', Lightbulb],
  ['debug', 'Debug', Bug], ['review', 'Review', ScanSearch], ['solution', 'Solution', KeyRound],
];

function Example({ ex, index }) {
  return (
    <div className="dsa-example">
      <div className="dsa-example__io">
        <span className="dsa-example__label">Input</span>
        <div className="dsa-example__vals">
          {Object.entries(ex.input ?? {}).map(([k, v]) => <code key={k}>{k === 'calls' ? show(v) : `${k} = ${show(v)}`}</code>)}
        </div>
        <span className="dsa-example__label">Output</span>
        <div className="dsa-example__vals"><code>{show(ex.output)}</code></div>
      </div>
      {ex.explanation && (
        <div className="dsa-example__why">
          <strong><Info size={17} /> Explanation</strong>
          <Md text={ex.explanation} />
        </div>
      )}
      <span className="sr-only">Example {index + 1}</span>
    </div>
  );
}

function ProblemTab({ p }) {
  const j = p.judge;
  return (
    <div className="dsa-statement">
      <Md text={j.statement} className="dsa-statement__text" />
      <h3>Examples</h3>
      {j.examples.map((ex, i) => <Example key={i} ex={ex} index={i} />)}
      {j.constraints?.length > 0 && (
        <>
          <h3>Constraints</h3>
          <ul className="dsa-constraints">{j.constraints.map((c) => <li key={c}><Md text={c} /></li>)}</ul>
        </>
      )}
      <PracticeLinks p={p} />
    </div>
  );
}

function PracticeLinks({ p }) {
  return (
    <div className="dsa-links">
      {p.patterns?.map((t) => <span key={t} className="dsa-tag">{t}</span>)}
      {p.links.map((l) => <a key={l.url} href={l.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> {l.site}</a>)}
    </div>
  );
}

function HintsTab({ p, onReveal, busy }) {
  const h = p.judge.hints;
  return (
    <div className="dsa-hints">
      <p className="dsa-muted">Hints open one at a time. Try each before taking the next.</p>
      <ol>
        {h.items.map((text, i) => <li key={i}><span className="dsa-hints__n">Hint {i + 1}</span><Md text={text} /></li>)}
        {Array.from({ length: h.total - h.items.length }, (_, k) => (
          <li key={`locked-${k}`} className="is-locked"><span className="dsa-hints__n">Hint {h.items.length + k + 1}</span><span>Hidden</span></li>
        ))}
      </ol>
      {h.revealed < h.total && (
        <button type="button" className="dsa-btn" onClick={onReveal} disabled={busy}><Lightbulb size={17} /> Reveal hint {h.revealed + 1} of {h.total}</button>
      )}
    </div>
  );
}

function GenieTab({ slug, code, language }) {
  const thread = useAsync(() => api.get('genie/thread', { slug }), [slug]);
  const [messages, setMessages] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const end = useRef(null);
  const list = messages ?? thread.data?.messages ?? [];
  useEffect(() => { setUnlocked(Boolean(thread.data?.solutionUnlocked)); }, [thread.data]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [list.length]);

  const ask = async (mode, message) => {
    setBusy(true);
    setError('');
    try {
      const r = await api.post('genie/ask', { slug, mode, ...(message ? { message } : {}), ...(['debug', 'review', 'ask'].includes(mode) && code ? { code, language } : {}) });
      const label = { explain: 'Explain this problem', approach: 'How should I approach this?', hint: 'Give me a hint', debug: 'Why is my code failing?', review: 'Review my code', solution: 'Show me the solution' }[mode];
      setMessages([...list, { role: 'learner', mode, content: message || label }, { role: 'genie', mode, content: r.reply }]);
      setUnlocked(Boolean(r.solutionUnlocked));
      if (mode === 'ask') setText('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dsa-genie">
      <div className="dsa-genie__modes">
        {GENIE_MODES.map(([mode, label, Icon]) => (
          <button key={mode} type="button" onClick={() => ask(mode)} disabled={busy || (mode === 'solution' && !unlocked)}
            title={mode === 'solution' && !unlocked ? 'Solve it, or reveal all hints and submit 3 times, to unlock' : undefined}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>
      <div className="dsa-genie__thread" aria-live="polite">
        {thread.loading && !list.length ? <LoadingState label="Opening the Genie…" />
          : !list.length ? <p className="dsa-muted dsa-genie__empty">Ask the Coding Genie to explain the problem, suggest an approach, or debug your last run. It coaches you without handing out the answer.</p>
          : list.map((m, i) => (
            <div key={i} className={`dsa-msg is-${m.role}`}>{m.role === 'genie' ? <Md text={m.content} /> : <p>{m.content}</p>}</div>
          ))}
        {busy && <div className="dsa-msg is-genie is-typing"><span /><span /><span /></div>}
        <div ref={end} />
      </div>
      {error && <p className="dsa-error">{error}</p>}
      <form className="dsa-genie__ask" onSubmit={(e) => { e.preventDefault(); if (text.trim()) ask('ask', text.trim()); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask the Genie about this problem…" maxLength={2000} aria-label="Ask the Genie" />
        <button type="submit" disabled={busy || !text.trim()} aria-label="Send"><Send size={17} /></button>
      </form>
    </div>
  );
}

function SubmissionsTab({ slug, version }) {
  const q = useAsync(() => api.get('dsa/problem/submissions', { slug }), [slug, version]);
  if (q.loading && !q.data) return <LoadingState label="Loading submissions…" />;
  if (q.error) return <ErrorState message={q.error} onRetry={q.reload} />;
  const items = q.data?.items ?? [];
  if (!items.length) return <p className="dsa-muted dsa-pad">No runs or submissions yet.</p>;
  return (
    <ul className="dsa-subs">
      {items.map((s) => (
        <li key={s.id} className={`is-${s.verdict}`}>
          {s.verdict === 'accepted' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          <strong>{VERDICT_LABEL[s.verdict] ?? s.verdict}</strong>
          <span>{s.mode === 'run' ? 'Run' : 'Submit'} · {LANG_LABEL[s.language] ?? s.language}</span>
          <span>{s.passed}/{s.total}</span>
          <span>{s.runtime_ms != null ? `${s.runtime_ms} ms` : '—'}</span>
          <time>{new Date(s.created_at).toLocaleString()}</time>
        </li>
      ))}
    </ul>
  );
}

function ResultPanel({ tab, setTab, result, examples, busy, error }) {
  const total = result?.total ?? examples.length;
  const passed = result?.passed ?? 0;
  const [caseIndex, setCaseIndex] = useState(0);
  useEffect(() => { setCaseIndex(result?.failedIndex ?? result?.failedCase?.index ?? 0); }, [result]);
  const cases = result?.cases ?? [];
  const current = cases[caseIndex];
  const consoleText = cases.map((c) => c.console).filter(Boolean).join('\n') || result?.failedCase?.console || '';
  return (
    <section className="dsa-results" aria-label="Test results">
      <header>
        <button type="button" className={tab === 'tests' ? 'is-on' : ''} onClick={() => setTab('tests')}>Test Cases</button>
        <button type="button" className={tab === 'output' ? 'is-on' : ''} onClick={() => setTab('output')}>Output</button>
        <span className={`dsa-results__count ${result ? (result.verdict === 'accepted' ? 'is-ok' : 'is-bad') : ''}`}>
          {result?.verdict === 'accepted' ? <CheckCircle2 size={18} /> : result ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          {passed} / {total} Passed
        </span>
      </header>
      <div className="dsa-results__body">
        {busy ? <div className="dsa-results__empty"><span className="dsa-spinner" /> Running your code…</div>
          : error ? <p className="dsa-error">{error}</p>
          : tab === 'output' ? (
            result ? (
              <div className="dsa-output">
                <p className={`dsa-verdict is-${result.verdict}`}>{VERDICT_LABEL[result.verdict] ?? result.verdict}{result.runtimeMs != null ? ` · ${result.runtimeMs} ms` : ''}{result.preview ? ' · guest preview sample' : ''}</p>
                {result.compile && !result.compile.ok && <pre>{result.compile.output}</pre>}
                {result.failedCase && !result.compile?.output && (
                  <dl>
                    <dt>Input</dt><dd><code>{show(result.failedCase.input)}</code></dd>
                    <dt>Expected</dt><dd><code>{show(result.failedCase.expected)}</code></dd>
                    <dt>Your output</dt><dd><code>{show(result.failedCase.output)}</code></dd>
                    {result.failedCase.error && <><dt>Error</dt><dd><pre>{result.failedCase.error}</pre></dd></>}
                  </dl>
                )}
                {consoleText && <><h4>Console</h4><pre>{consoleText}</pre></>}
              </div>
            ) : <div className="dsa-results__empty"><FlaskConical size={22} /> Run your code to see the output…</div>
          ) : cases.length ? (
            <div className="dsa-cases">
              <div className="dsa-cases__tabs">
                {cases.map((c, i) => (
                  <button key={i} type="button" className={`${i === caseIndex ? 'is-on' : ''} ${c.passed ? 'is-pass' : 'is-fail'}`} onClick={() => setCaseIndex(i)}>
                    {c.passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />} Case {i + 1}
                  </button>
                ))}
              </div>
              {current && (
                <dl>
                  <dt>Input</dt><dd>{Object.entries(current.input ?? {}).map(([k, v]) => <code key={k}>{k === 'calls' ? show(v) : `${k} = ${show(v)}`}</code>)}</dd>
                  <dt>Expected</dt><dd><code>{show(current.expected)}</code></dd>
                  <dt>Your output</dt><dd><code>{current.output === null && current.error ? '—' : show(current.output)}</code></dd>
                  {current.error && <><dt>Error</dt><dd><pre>{current.error}</pre></dd></>}
                </dl>
              )}
            </div>
          ) : result ? (
            <div className="dsa-output">
              <p className={`dsa-verdict is-${result.verdict}`}>{VERDICT_LABEL[result.verdict] ?? result.verdict}: {result.passed}/{result.total} {result.mode === 'run' ? 'examples' : 'tests'} passed{result.runtimeMs != null ? ` in ${result.runtimeMs} ms` : ''}</p>
              {result.compile && !result.compile.ok && <pre>{result.compile.output}</pre>}
              {result.failedCase?.input !== undefined && <p className="dsa-muted">The first failing case is in Output.</p>}
            </div>
          ) : <div className="dsa-results__empty"><FlaskConical size={22} /> Run your code to see test results…</div>}
      </div>
    </section>
  );
}

/** The problem-solving panel: statement, hints and Genie on the left; editor, tests, Run and Submit on the right. */
export default function DsaProblemPage() {
  const { navigate, currentRoute } = useApp();
  const slug = currentRoute?.query?.slug;
  const q = useAsync(() => api.get('dsa/problem', { slug }), [slug], { enabled: Boolean(slug) });
  const p = q.data;
  const [leftTab, setLeftTab] = useState('problem');
  const [language, setLanguage] = useState(savedLanguage);
  const [codes, setCodes] = useState({});
  const [dark, setDark] = useState(true);
  const [wide, setWide] = useState(false);
  const [resultTab, setResultTab] = useState('tests');
  const [result, setResult] = useState(null);
  const [runError, setRunError] = useState('');
  const [busy, setBusy] = useState(null);
  const [subsVersion, setSubsVersion] = useState(0);
  const [flash, setFlash] = useState('');
  const saveTimer = useRef(null);

  const languages = p?.judge?.languages ?? [];
  const langInfo = languages.find((l) => l.language === language) ?? languages[0];
  const code = codes[language] ?? langInfo?.draft ?? langInfo?.starterCode ?? '';
  const examples = p?.judge?.examples ?? [];

  useEffect(() => { setCodes({}); setResult(null); setRunError(''); setLeftTab('problem'); }, [slug]);
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const setCode = (value) => {
    setCodes((c) => ({ ...c, [language]: value ?? '' }));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (value && value !== langInfo?.starterCode) api.put('dsa/problem/draft', { slug, language, code: value }).catch(() => {});
    }, 1200);
  };
  const chooseLanguage = (l) => {
    setLanguage(l);
    try { localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
  };
  const resetCode = () => setCode(langInfo?.starterCode ?? '');

  const run = async (mode) => {
    setBusy(mode);
    setRunError('');
    try {
      const r = await api.post(mode === 'run' ? 'dsa/problem/run' : 'dsa/problem/submit', { slug, language, code });
      setResult({ ...r, mode, cases: mode === 'run' ? r.cases : undefined });
      setResultTab(r.verdict === 'compile_error' || (mode === 'submit' && r.verdict !== 'accepted') ? 'output' : 'tests');
      setSubsVersion((v) => v + 1);
      if (mode === 'submit' && r.verdict === 'accepted') {
        setFlash(`Accepted: ${r.passed}/${r.total} tests passed${r.runtimeMs != null ? ` in ${r.runtimeMs} ms` : ''}.`);
        q.reload();
      }
    } catch (e) {
      setResult(null);
      setRunError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const reveal = async () => {
    setBusy('hint');
    try {
      await api.post('dsa/problem/hint', { slug });
      await q.reload();
    } finally {
      setBusy(null);
    }
  };
  const toggleBookmark = async () => {
    await api.put('dsa/problem/bookmark', { slug, bookmarked: !p.bookmarked });
    q.reload();
  };
  const selfReport = async () => {
    setBusy('self');
    try { await api.post('dsa/problem/self-report', { slug }); q.reload(); } finally { setBusy(null); }
  };

  const Icon = useMemo(() => chapterIcon(p?.chapter?.icon), [p?.chapter?.icon]);

  if (!slug) return <div className="dsa-page dsa-page--center"><ErrorState message="Choose a problem from a chapter." /></div>;
  if (q.loading && !p) return <div className="dsa-page dsa-page--center"><LoadingState label="Opening the problem…" /></div>;
  if (q.error) return <div className="dsa-page dsa-page--center"><ErrorState message={q.error} onRetry={q.reload} /></div>;

  const go = (s) => s && navigate('dsa/problem', { slug: s });
  const back = () => navigate('dsa/chapter', { id: p.chapter.id });

  return (
    <div className={`dsa-page dsa-solve ${wide ? 'is-wide' : ''}`}>
      <header className="dsa-solve__bar">
        <span className="dsa-solve__crest" aria-hidden="true"><Icon size={26} /></span>
        <div className="dsa-solve__where">
          <strong>DSA Dungeon</strong>
          <span>{p.chapter.title} <span aria-hidden="true">•</span> <em>{p.number}. {p.title}</em></span>
        </div>
        <div className="dsa-solve__nav">
          <button type="button" className="dsa-iconbtn" onClick={() => go(p.previous)} disabled={!p.previous} aria-label="Previous problem"><ChevronLeft size={18} /></button>
          <button type="button" className="dsa-iconbtn" onClick={() => go(p.next)} disabled={!p.next} aria-label="Next problem"><ChevronRight size={18} /></button>
        </div>
        {p.status === 'solved' && <span className="dsa-solved"><CheckCircle2 size={16} /> Solved</span>}
      </header>
      {flash && <div className="dsa-flash" role="status"><CheckCircle2 size={18} /> {flash}<button type="button" onClick={() => setFlash('')} aria-label="Dismiss">×</button></div>}

      <div className="dsa-solve__grid">
        <section className="dsa-card dsa-left" aria-label="Problem">
          <nav className="dsa-tabs" role="tablist">
            <button type="button" className="dsa-iconbtn" onClick={back} aria-label="Back to the chapter"><ArrowLeft size={18} /></button>
            {[['problem', 'Problem', null], ...(p.judge ? [['hints', 'Hints', Lightbulb]] : []), ['genie', 'Genie', MessageSquare], ...(p.judge ? [['subs', 'Submissions', History]] : [])].map(([id, label, TabIcon]) => (
              <button key={id} type="button" role="tab" aria-selected={leftTab === id} className={leftTab === id ? 'is-on' : ''} onClick={() => setLeftTab(id)}>
                {TabIcon && <TabIcon size={17} />} {label}
              </button>
            ))}
            <button type="button" className="dsa-iconbtn dsa-tabs__mark" onClick={toggleBookmark} aria-pressed={p.bookmarked} aria-label={p.bookmarked ? 'Remove bookmark' : 'Bookmark this problem'}>
              {p.bookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            </button>
          </nav>
          <div className="dsa-left__body">
            <div className="dsa-left__title">
              <span className="dsa-tile" aria-hidden="true"><Icon size={26} /></span>
              <h1>{p.number}. {p.title}</h1>
              <DifficultyPill value={p.difficulty} />
            </div>
            {leftTab === 'problem' && (p.judge ? <ProblemTab p={p} /> : (
              <div className="dsa-statement">
                <p>This problem is practised on {p.links.map((l) => l.site).join(' or ')}. Solve it there, then mark it solved here to count it toward the chapter.</p>
                <PracticeLinks p={p} />
                <button type="button" className="dsa-btn dsa-btn--green" onClick={selfReport} disabled={busy === 'self' || p.status === 'solved'}>
                  <CheckCircle2 size={17} /> {p.status === 'solved' ? 'Marked as solved' : 'Mark as solved'}
                </button>
              </div>
            ))}
            {leftTab === 'hints' && p.judge && <HintsTab p={p} onReveal={reveal} busy={busy === 'hint'} />}
            {leftTab === 'genie' && <GenieTab slug={slug} code={code} language={language} />}
            {leftTab === 'subs' && <SubmissionsTab slug={slug} version={subsVersion} />}
          </div>
        </section>

        <section className="dsa-card dsa-right" aria-label="Code editor">
          {p.judge ? (
            <>
              <header className="dsa-editorbar">
                <label className="dsa-langpick">
                  <span aria-hidden="true">&lt;/&gt;</span>
                  <select value={language} onChange={(e) => chooseLanguage(e.target.value)} aria-label="Language">
                    {languages.map((l) => <option key={l.language} value={l.language}>{LANG_LABEL[l.language] ?? l.language}</option>)}
                  </select>
                  <ChevronDown size={16} />
                </label>
                <div className="dsa-editorbar__tools">
                  <button type="button" onClick={() => setDark(false)} className={!dark ? 'is-on' : ''} aria-label="Light editor"><Sun size={18} /></button>
                  <button type="button" onClick={() => setDark(true)} className={dark ? 'is-on' : ''} aria-label="Dark editor"><Moon size={18} /></button>
                  <button type="button" onClick={resetCode} aria-label="Reset to starter code" title="Reset to starter code"><RotateCcw size={18} /></button>
                  <button type="button" onClick={() => setWide((w) => !w)} aria-label={wide ? 'Show the problem' : 'Expand the editor'}>{wide ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
                </div>
              </header>
              <div className="dsa-editor">
                <Editor
                  key={`${slug}-${language}`}
                  language={MONACO_LANG[language]}
                  theme={dark ? 'teklozy-night' : 'light'}
                  beforeMount={(monaco) => monaco.editor.defineTheme('teklozy-night', {
                    base: 'vs-dark', inherit: true, rules: [],
                    colors: { 'editor.background': '#0b1330', 'editor.lineHighlightBackground': '#121c42', 'editorGutter.background': '#0b1330', 'editorLineNumber.foreground': '#56649a', 'editorLineNumber.activeForeground': '#c8d2ff', 'scrollbarSlider.background': '#2c3d7888' },
                  })}
                  value={code}
                  onChange={setCode}
                  options={{ fontSize: 15, minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true, tabSize: language === 'python' ? 4 : 2, padding: { top: 12 } }}
                />
              </div>
              <ResultPanel tab={resultTab} setTab={setResultTab} result={result} examples={examples} busy={busy === 'run' || busy === 'submit'} error={runError} />
              <footer className="dsa-actions">
                <span className="dsa-muted">{p.judge.testCaseCount} hidden tests · {p.attempts} attempt{p.attempts === 1 ? '' : 's'}</span>
                <button type="button" className="dsa-btn dsa-btn--dark" onClick={() => run('run')} disabled={Boolean(busy)}><Play size={18} fill="currentColor" /> Run Code</button>
                <button type="button" className="dsa-btn dsa-btn--blue" onClick={() => run('submit')} disabled={Boolean(busy)}><Send size={18} /> Submit</button>
              </footer>
            </>
          ) : (
            <div className="dsa-external">
              <ExternalLink size={40} />
              <h2>Practise on {p.links[0]?.site}</h2>
              <p className="dsa-muted">This one has no in-app judge yet. Open it on the practice site, solve it there, and come back to mark it solved.</p>
              <div className="dsa-external__links">
                {p.links.map((l) => <a key={l.url} className="dsa-btn dsa-btn--blue" href={l.url} target="_blank" rel="noreferrer"><ExternalLink size={17} /> Open on {l.site}</a>)}
              </div>
              <p className="dsa-muted"><Clock3 size={14} /> Status: {p.status === 'solved' ? 'solved' : 'not solved yet'}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
