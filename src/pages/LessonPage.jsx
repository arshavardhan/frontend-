import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api, errorMessage } from '../lib/api';
import VisualSections from '../components/VisualSections';
import {
  ChevronLeft, Play, Check, Lock, BookOpen, Layers, Target, NotebookPen,
  FileText, ArrowRight, HelpCircle, ExternalLink, ArrowLeft, Settings, Maximize
} from 'lucide-react';

const REFLECTION_MIN = 20;

/** Graded course quiz: starts one attempt and submits it; the server grades and awards XP. */
function CourseQuiz({ enrollmentId, lesson, onPassed }) {
  const { run } = useApp();
  const [definition, setDefinition] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setDefinition(null);
    setAnswers({});
    setResult(null);
    api.get('course-assessments', { enrollmentId, lessonId: lesson.id }).then(setDefinition).catch((e) => setError(errorMessage(e)));
  }, [enrollmentId, lesson.id]);

  const choose = (q, option) =>
    setAnswers((prev) => {
      const current = prev[q.key] ?? [];
      const multi = q.kind === 'multiple';
      return { ...prev, [q.key]: multi ? (current.includes(option) ? current.filter((o) => o !== option) : [...current, option]) : [option] };
    });

  const submit = async () => {
    try {
      const attempt = await api.post('course-attempts', { enrollmentId, lessonId: lesson.id, requestKey: crypto.randomUUID() });
      const graded = await run(() => api.post('course-attempts/submit', { id: attempt.id, responses: answers }));
      setResult(graded);
      if (graded.state === 'passed') onPassed();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  if (error) return <div className="form-feedback-alert error" role="alert"><span>{error}</span></div>;
  if (!definition) return <p>Loading knowledge check…</p>;
  return (
    <div className="quiz-test-panel">
      <p className="quiz-intro">Pass mark {definition.pass_percent}%. Your answers are graded on the server.</p>
      {definition.questions.map((q, i) => (
        <fieldset key={q.key} className="quiz-question-block">
          <legend>{i + 1}. {q.prompt}</legend>
          {(q.options ?? []).map((o) => (
            <label key={o} className={`quiz-option-row ${(answers[q.key] ?? []).includes(o) ? 'is-selected' : ''}`}>
              <input
                type={q.kind === 'multiple' ? 'checkbox' : 'radio'}
                name={q.key}
                checked={(answers[q.key] ?? []).includes(o)}
                onChange={() => choose(q, o)}
                disabled={Boolean(result)}
              />
              <span>{o}</span>
            </label>
          ))}
        </fieldset>
      ))}
      {result ? (
        <div className={`form-feedback-alert ${result.state === 'passed' ? 'success' : 'error'}`} role="status">
          <span>
            {result.state === 'passed' ? 'Passed' : result.state === 'failed' ? 'Not passed yet' : 'Submitted'}
            {result.score !== null && result.score !== undefined ? `: ${result.score}%` : ''}. {result.feedback || ''}
          </span>
          {result.state === 'failed' && (
            <button className="inline-link-btn" onClick={() => { setResult(null); setAnswers({}); }}>Try again</button>
          )}
        </div>
      ) : (
        <button className="btn-nav-next" onClick={submit} disabled={definition.questions.some((q) => !(answers[q.key] ?? []).length)}>
          <span>Submit answers</span>
          <Check size={16} />
        </button>
      )}
    </div>
  );
}

/** Ungraded quick check inside a visual lesson. */
function QuickCheck({ lessonId, quickCheck }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const toggle = (q, id) =>
    setAnswers((prev) => {
      const current = prev[q.id] ?? [];
      return { ...prev, [q.id]: q.kind === 'multiple' ? (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]) : [id] };
    });
  const check = async () => {
    setResult(await api.post('lessons/content/quick-check', {
      lessonId,
      answers: quickCheck.questions.map((q) => ({ questionId: q.id, optionIds: answers[q.id] ?? [] })),
    }));
  };
  const byId = new Map((result?.results ?? []).map((r) => [r.questionId, r]));
  return (
    <div className="quiz-test-panel">
      <h3><HelpCircle size={16} /> {quickCheck.title || 'Quick check'}</h3>
      {quickCheck.questions.map((q, i) => (
        <fieldset key={q.id} className="quiz-question-block">
          <legend>{i + 1}. {q.prompt}</legend>
          {q.options.map((o) => (
            <label key={o.id} className={`quiz-option-row ${(answers[q.id] ?? []).includes(o.id) ? 'is-selected' : ''}`}>
              <input type={q.kind === 'multiple' ? 'checkbox' : 'radio'} name={q.id} checked={(answers[q.id] ?? []).includes(o.id)} onChange={() => toggle(q, o.id)} />
              <span>{o.label}</span>
            </label>
          ))}
          {byId.get(q.id) && (
            <p className={byId.get(q.id).correct ? 'quiz-feedback-ok' : 'quiz-feedback-bad'}>
              {byId.get(q.id).correct ? 'Correct. ' : 'Not quite. '}{byId.get(q.id).explanation}
            </p>
          )}
        </fieldset>
      ))}
      <button className="save-notes-btn" onClick={check}>Check answers (not graded)</button>
      {result && <p>{result.correctCount} of {result.questionCount} correct.</p>}
    </div>
  );
}

export default function LessonPage() {
  const { currentRoute, navigate, paths, run, triggerToast } = useApp();
  const pathId = currentRoute.query.path || '';
  const lessonId = currentRoute.query.lesson || '';
  const currentPath = paths.find((p) => p.id === pathId);

  const [level, setLevel] = useState(null);
  const [material, setMaterial] = useState(null);
  const [visual, setVisual] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('About');
  const [reflection, setReflection] = useState('');
  const [format, setFormat] = useState('video');

  const loadCourse = useCallback(async () => {
    try {
      setLevel(await api.get('journey/level', { number: 1, pathwayId: pathId }));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [pathId]);
  // Reload on every lesson change: access and completion move as the learner progresses.
  useEffect(() => {
    loadCourse();
  }, [loadCourse, lessonId]);

  const course = level?.course;
  const modules = course?.modules ?? [];
  const allLessons = useMemo(() => modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id }))), [modules]);
  const lesson = allLessons.find((l) => l.id === lessonId);
  const module = modules.find((m) => m.lessons.some((l) => l.id === lessonId));
  const index = allLessons.findIndex((l) => l.id === lessonId);
  const prev = index > 0 ? allLessons[index - 1] : null;
  const next = index >= 0 && index < allLessons.length - 1 ? allLessons[index + 1] : null;

  useEffect(() => {
    setReflection(localStorage.getItem(`teklozy-reflection-${lessonId}`) || '');
    setActiveTab('About');
    setFormat('video');
  }, [lessonId]);

  useEffect(() => {
    if (!course?.enrollmentId || !lesson) return;
    setMaterial(null);
    setVisual(null);
    if (!lesson.access.allowed) return;
    if (lesson.kind !== 'quiz') {
      api.post('courses/lessons/start', { enrollmentId: course.enrollmentId, lessonId }).catch(() => undefined);
      api.get('courses/material', { versionId: course.id, lessonId }).then(setMaterial).catch((e) => setError(errorMessage(e)));
      if (lesson.contentFormat === 'visual') api.get('lessons/content', { lessonId }).then(setVisual).catch(() => setVisual(null));
    }
  }, [course?.enrollmentId, course?.id, lesson?.id, lesson?.access?.allowed, lesson?.kind, lesson?.contentFormat, lessonId]);

  const go = (target) => {
    if (!target) return;
    if (!target.access.allowed && !target.isCompleted) {
      triggerToast(target.access.nextAction || 'Finish this lesson first.');
      return;
    }
    navigate('lesson', { path: pathId, lesson: target.id });
  };

  const complete = async () => {
    if (reflection.trim().length < REFLECTION_MIN) {
      setActiveTab('Notes');
      triggerToast(`Write a short reflection (at least ${REFLECTION_MIN} characters) in Notes to complete this lesson.`);
      return;
    }
    try {
      await run(
        () => api.post('courses/lessons/complete', { enrollmentId: course.enrollmentId, lessonId, reflection: reflection.trim() }),
        'Lesson completed.',
      );
      await loadCourse();
    } catch {
      /* toast shown */
    }
  };

  if (error) return <div className="generic-workspace-page"><div className="form-feedback-alert error" role="alert"><span>{error}</span></div></div>;
  if (!course) return <div className="generic-workspace-page"><p>Loading lesson…</p></div>;
  if (!course.enrollmentId) {
    navigate('level/1', {}, true);
    return null;
  }
  if (!lesson) return <div className="generic-workspace-page"><p>This lesson is not part of the course.</p></div>;

  const moduleDone = module ? module.lessons.filter((l) => l.isCompleted).length : 0;
  const progressPercent = module ? Math.round((moduleDone / module.lessons.length) * 100) : 0;
  const takeaways = visual?.keyTakeaways ?? [];
  const objectives = visual?.learningObjectives ?? material?.lesson?.objectives ?? [];
  const resources = material?.resources ?? [];

  const kindLabel = (l) => (l.kind === 'quiz' ? 'Quiz' : l.contentFormat === 'visual' ? 'Visual' : l.contentFormat === 'video' ? 'Video' : 'Reading');
  const moduleIndex = modules.indexOf(module);
  const moduleLessons = module?.lessons ?? [];
  const posInModule = moduleLessons.findIndex((l) => l.id === lessonId);
  const upNext = moduleLessons.slice(posInModule + 1);
  const videoResource = resources.find((r) => r.kind === 'video');
  const textResources = resources.filter((r) => r.kind === 'text');
  const locked = !lesson.access.allowed && !lesson.isCompleted;
  const FORMATS = [
    { id: 'video', label: 'Video', icon: Play },
    { id: 'visual', label: 'Visual', icon: Layers },
    { id: 'reading', label: 'Reading', icon: BookOpen },
  ];

  return (
    <div className="ls-shell">
      {/* Left: the module, its progress and every lesson with its state. */}
      <aside className="ls-left" aria-label="Module lessons">
        <button className="ls-back" onClick={() => navigate('level/1')} aria-label="Back to Level 1"><ArrowLeft size={20} /></button>
        <span className="ls-kicker">Module {String(moduleIndex + 1).padStart(2, '0')}</span>
        <h2 className="ls-module">{module?.title}</h2>
        <div className="ls-progress"><span className="ls-bar"><span style={{ width: `${progressPercent}%` }} /></span><b>{progressPercent}%</b></div>
        <nav className="ls-lessons">
          {moduleLessons.map((l, idx) => {
            const isCurrent = l.id === lessonId;
            const isLocked = !l.access.allowed && !l.isCompleted;
            return (
              <button key={l.id} className={`ls-lesson ${isCurrent ? 'is-current' : ''} ${l.isCompleted ? 'is-done' : ''} ${isLocked ? 'is-locked' : ''}`} onClick={() => go(l)} disabled={isLocked}>
                <span className="ls-lesson__icon">
                  {l.isCompleted ? <Check size={16} strokeWidth={3} /> : isLocked ? <Lock size={16} /> : <Play size={14} fill="currentColor" />}
                </span>
                <span className="ls-lesson__text"><strong>{idx + 1}. {l.title}</strong><small>{kindLabel(l)} · {l.estimatedMinutes} min</small></span>
              </button>
            );
          })}
        </nav>
        <div className="ls-complete-card">
          <h3>Complete this module</h3>
          <ul>
            {moduleLessons.map((l) => <li key={l.id} className={l.isCompleted ? 'is-done' : ''}><span>{l.isCompleted ? <Check size={13} strokeWidth={3} /> : null}</span>{l.title}</li>)}
          </ul>
          <small>{moduleDone} of {moduleLessons.length} lessons complete</small>
        </div>
      </aside>

      {/* Centre: the lesson itself. */}
      <main className="ls-center">
        <div className="ls-toprow">
          <span className="ls-pill">Lesson {index + 1} of {allLessons.length}</span>
          {lesson.kind !== 'quiz' && (
            <div className="ls-formats" role="tablist" aria-label="Lesson format">
              {FORMATS.map((f) => (
                <button key={f.id} role="tab" aria-selected={format === f.id} className={format === f.id ? 'is-active' : ''} onClick={() => setFormat(f.id)}>
                  <f.icon size={15} /> {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <h1 className="ls-title">{visual?.title || lesson.title}</h1>

        {locked ? (
          <div className="level-locked-prompt-box">
            <div className="locked-icon-bubble"><Lock size={28} /></div>
            <h3>This lesson is locked</h3>
            <p>{lesson.access.nextAction || 'Finish the earlier lessons first.'}</p>
          </div>
        ) : lesson.kind === 'quiz' ? (
          <CourseQuiz enrollmentId={course.enrollmentId} lesson={lesson} onPassed={loadCourse} />
        ) : (
          <>
            {format === 'video' && (
              <>
                <div className="ls-player">
                  {videoResource?.url && /youtube\.com|youtu\.be/.test(videoResource.url) ? (
                    <iframe title={videoResource.title} src={`https://www.youtube-nocookie.com/embed/${(videoResource.url.match(/(?:v=|youtu\.be\/)([\w-]{6,})/) || [])[1] || ''}`} allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen />
                  ) : (
                    <div className="ls-player__placeholder">
                      <span className="ls-player__play"><Play size={34} fill="currentColor" /></span>
                      <strong>Lesson video</strong>
                      <small>The video for “{lesson.title}” will play here.</small>
                    </div>
                  )}
                  <div className="ls-player__bar" aria-hidden="true">
                    <Play size={18} fill="currentColor" /><span>0:00 / {lesson.estimatedMinutes}:00</span>
                    <span className="ls-player__track"><span /></span>
                    <span className="ls-chip">CC</span><span>1x</span><Settings size={18} /><Maximize size={18} />
                  </div>
                </div>
                <section className="ls-card ls-summary">
                  <h3><FileText size={18} /> Video summary</h3>
                  {textResources.length ? textResources.map((r) => <p key={r.id}>{r.body.split(/\n{2,}/)[0]}</p>) : (
                    <div className="ls-skeleton"><span /><span /><span /></div>
                  )}
                  <ul className="ls-chapters">
                    <li><span>0:00</span> Introduction</li>
                    <li><span>{Math.max(1, Math.round(lesson.estimatedMinutes / 3))}:00</span> Key idea</li>
                    <li><span>{Math.max(2, Math.round((lesson.estimatedMinutes * 2) / 3))}:00</span> Recap</li>
                  </ul>
                </section>
              </>
            )}
            {format === 'visual' && (visual ? <VisualSections sections={visual.sections} /> : (
              <section className="ls-card ls-placeholder"><Layers size={28} /><strong>Visual lesson</strong><small>Diagrams and step-by-step visuals for this lesson will appear here.</small></section>
            ))}
            {format === 'reading' && (
              <section className="ls-card reading-article-body">
                {textResources.map((r) => (
                  <section key={r.id}><h3>{r.title}</h3>{r.body.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}</section>
                ))}
                {!material && <p>Loading lesson…</p>}
                {material && textResources.length === 0 && <div className="ls-skeleton"><span /><span /><span /><span /></div>}
              </section>
            )}
            {format === 'visual' && visual?.quickCheck && <QuickCheck lessonId={lessonId} quickCheck={visual.quickCheck} />}

            <div className="ls-tabs" role="tablist">
              {[['About', BookOpen, 'About'], ['Takeaways', Target, 'Key Takeaways'], ['Resources', Layers, 'Resources'], ['Notes', NotebookPen, 'Notes']].map(([key, Icon, label]) => (
                <button key={key} className={activeTab === key ? 'is-active' : ''} onClick={() => setActiveTab(key)} role="tab" aria-selected={activeTab === key}>
                  <Icon size={18} /> {label}
                </button>
              ))}
            </div>
            <div className="ls-card ls-tabpanel">
              {activeTab === 'About' && (
                <>
                  <h3><Target size={20} className="ls-blue" /> What you’ll learn</h3>
                  <ul className="ls-checks">
                    {(objectives.length ? objectives : [lesson.title]).map((o) => <li key={o}><Check size={16} strokeWidth={3} />{o}</li>)}
                  </ul>
                </>
              )}
              {activeTab === 'Takeaways' && (takeaways.length ? (
                <ul className="ls-checks">{takeaways.map((t) => <li key={t.id}><Check size={16} strokeWidth={3} /><span><strong>{t.title}</strong>{t.description ? ` ${t.description}` : ''}</span></li>)}</ul>
              ) : <div className="ls-skeleton"><span /><span /></div>)}
              {activeTab === 'Resources' && (resources.filter((r) => r.kind !== 'text').length ? resources.filter((r) => r.kind !== 'text').map((r) => (
                <div className="ls-resource" key={r.id}><FileText size={16} /><strong>{r.title}</strong>{r.url && <a href={r.url} target="_blank" rel="noreferrer noopener">Open <ExternalLink size={12} /></a>}</div>
              )) : <p className="ls-muted">Slides, downloads and links for this lesson will appear here.</p>)}
              {activeTab === 'Notes' && (
                <>
                  <textarea className="notes-textarea" value={reflection} maxLength={2000}
                    placeholder={`What did you learn? Write at least ${REFLECTION_MIN} characters; this reflection is saved when you complete the lesson.`}
                    onChange={(e) => { setReflection(e.target.value); localStorage.setItem(`teklozy-reflection-${lessonId}`, e.target.value); }} />
                  <small className="ls-muted">{reflection.trim().length}/{REFLECTION_MIN} characters minimum</small>
                </>
              )}
            </div>
          </>
        )}

        <footer className="ls-footer">
          {prev ? <button className="ls-prev" onClick={() => go(prev)}><ArrowLeft size={18} /> Previous</button> : <span />}
          {lesson.kind !== 'quiz' && !lesson.isCompleted && lesson.access.allowed ? (
            <button className="ls-next" onClick={complete}>Complete lesson <Check size={18} strokeWidth={3} /></button>
          ) : next ? (
            <button className="ls-next" onClick={() => go(next)}>Next: {next.title} <ArrowRight size={18} /></button>
          ) : (
            <button className="ls-next" onClick={() => navigate('level/1')}>Back to Level 1 <Check size={18} strokeWidth={3} /></button>
          )}
        </footer>
      </main>

      {/* Right: module progress and what comes next. */}
      <aside className="ls-right" aria-label="Module progress">
        <section className="ls-card ls-modprog">
          <div><h3>Module Progress</h3><span>{moduleDone} of {moduleLessons.length} lessons</span></div>
          <div className="ls-progress"><span className="ls-bar"><span style={{ width: `${progressPercent}%` }} /></span><b>{progressPercent}%</b></div>
        </section>
        <section className="ls-card ls-upnext">
          <h3>Up Next in this Module</h3>
          {upNext.length === 0 && <p className="ls-muted">This is the last lesson of the module.{next ? ` Next up: ${next.title}.` : ''}</p>}
          {upNext.map((l, i) => {
            const isLocked = !l.access.allowed && !l.isCompleted;
            return (
              <button key={l.id} className="ls-upnext__row" onClick={() => go(l)} disabled={isLocked}>
                <span className="ls-upnext__icon">{l.isCompleted ? <Check size={16} strokeWidth={3} /> : isLocked ? <Lock size={16} /> : <Play size={14} fill="currentColor" />}</span>
                <strong>{posInModule + i + 2}. {l.title}</strong><small>{l.estimatedMinutes} min</small>
              </button>
            );
          })}
        </section>
        <section className="ls-card ls-coursecard">
          <h3>Course</h3>
          <p>{course.title}</p>
          <div className="ls-progress"><span className="ls-bar"><span style={{ width: `${course.percent}%` }} /></span><b>{course.percent}%</b></div>
          <small className="ls-muted">{course.completedModules} of {course.totalModules} modules complete</small>
        </section>
      </aside>
    </div>
  );
}
