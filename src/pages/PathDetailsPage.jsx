import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api, errorMessage } from '../lib/api';
import { ProgressBar, RingProgress } from '../components/shared/Progress';
import { AccountRequired, ErrorState, LoadingState } from '../components/shared/States';
import {
  ArrowLeft, ChevronRight, ChartNoAxesColumnIncreasing, Clock, Zap, Lock, Check, CircleCheck, Play,
  MonitorPlay, ChartColumnBig, BriefcaseBusiness, Target, Search, FileText, Gamepad2, BrainCircuit, Code2,
  SquarePlus, BookOpen, Trophy, Medal, Shapes,
} from 'lucide-react';

/** First lesson the learner can open: the first unfinished allowed one, else the first allowed. */
export function nextLesson(course) {
  const lessons = (course?.modules ?? []).flatMap((m) => m.lessons ?? []);
  return lessons.find((l) => l.access?.allowed && !l.isCompleted) ?? lessons.find((l) => l.access?.allowed) ?? null;
}

const MODULE_ART = [MonitorPlay, ChartColumnBig, BriefcaseBusiness, Target];

function ModuleArt({ index, active }) {
  const Icon = MODULE_ART[index % MODULE_ART.length];
  return (
    <span className={`pd-art ${active ? 'is-active' : ''}`} aria-hidden="true">
      <Icon strokeWidth={1.8} />
      {index === 1 && <Search className="pd-art__lens" strokeWidth={2.6} />}
    </span>
  );
}

/** Chip label for one lesson of the module, from its kind and content format. */
function lessonChip(lesson) {
  if (lesson.kind === 'quiz') return { icon: Gamepad2, text: 'Quick Quiz' };
  if (lesson.contentFormat === 'video') return { icon: Play, text: `Video Lesson · ${lesson.estimatedMinutes} min` };
  if (lesson.contentFormat === 'visual') return { icon: Shapes, text: `Visual Lesson · ${lesson.estimatedMinutes} min` };
  return { icon: FileText, text: lesson.title.length > 22 ? 'Key Notes' : lesson.title };
}

const moduleProgress = (m) => {
  const lessons = m.lessons ?? [];
  if (m.isCompleted) return 100;
  return lessons.length ? Math.round((lessons.filter((l) => l.isCompleted).length * 100) / lessons.length) : 0;
};

export default function PathDetailsPage() {
  const { currentRoute, paths, allPaths, navigate, explorePath, run, triggerToast, isGuest } = useApp();
  const pathId = currentRoute.path.replace('path/', '');
  const currentPath = (allPaths ?? paths).find((p) => p.id === pathId);
  const isAI = pathId === 'ai-engineering';
  const pathExists = Boolean(currentPath);
  const [level, setLevel] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (isGuest || !pathExists) return;
    setError('');
    try {
      await explorePath(pathId);
      setLevel(await api.get('journey/level', { number: 1, pathwayId: pathId }));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [explorePath, pathId, isGuest, pathExists]);

  useEffect(() => { load(); }, [load]);

  const course = level?.course;
  const enroll = async () => {
    setBusy(true);
    try {
      await run(() => api.post('course-enrollments', { versionId: course.id }), 'Enrolled. Your first lesson is ready.');
      await load();
    } catch { /* AppContext shows the API error. */ }
    finally { setBusy(false); }
  };
  const openLesson = (lesson) => {
    if (!course?.enrollmentId) { triggerToast('Enroll in this course first.'); return; }
    if (!lesson?.access?.allowed) { triggerToast(lesson?.access?.nextAction || 'Finish the earlier lessons first.'); return; }
    navigate('lesson', { path: pathId, lesson: lesson.id });
  };

  if (isGuest) return <AccountRequired feature="the learning path" />;
  if (!currentPath) return <ErrorState message="This learning path could not be found." />;

  const next = nextLesson(course);
  const modules = course?.modules ?? [];
  const nextModuleIndex = modules.findIndex((m) => (m.lessons ?? []).some((l) => l.id === next?.id));
  const nextModule = nextModuleIndex >= 0 ? modules[nextModuleIndex] : null;
  const moduleXp = modules.reduce((n, m) => n + (m.xp ?? 0), 0);
  const totalXp = moduleXp || level?.level?.rewardXp || currentPath.xpReward || 0;
  const PathIcon = isAI ? BrainCircuit : Code2;
  const pathTitle = isAI ? 'AI Path' : 'Development Path';
  const crumb = isAI ? 'Artificial Intelligence' : 'Development';
  const nextProgress = nextModule ? moduleProgress(nextModule) : 0;

  return (
    <div className={`pd-page ${isAI ? 'is-ai' : 'is-dev'}`}>
      <section className="pd-hero" aria-labelledby="pd-title">
        <div className="pd-hero__art" aria-hidden="true">
          <img src={isAI ? '/illustrations/path-hero-ai.jpg' : '/illustrations/path-hero-temple.jpg'} alt="" />
        </div>
        <div className="pd-hero__copy">
          <nav className="pd-crumbs" aria-label="Breadcrumb">
            <button type="button" className="pd-crumbs__back" onClick={() => navigate('level/1')} aria-label="Back to Level 1"><ArrowLeft size={22} /></button>
            <button type="button" className="pd-crumbs__link" onClick={() => navigate('level/1')}>Level 1: Discover</button>
            <ChevronRight size={18} aria-hidden="true" />
            <span aria-current="page">{crumb}</span>
          </nav>
          <div className="pd-titlerow">
            <span className="pd-pathicon" aria-hidden="true"><PathIcon size={42} strokeWidth={2} /></span>
            <div>
              <h1 id="pd-title">{pathTitle}</h1>
              <p>{course?.description || currentPath.desc}</p>
            </div>
          </div>
          <ul className="pd-stats">
            <li><ChartNoAxesColumnIncreasing size={22} /> {course?.totalModules ?? modules.length ?? 0} Modules</li>
            <li><Clock size={21} /> ~ {course?.estimatedMinutes ?? '—'} min</li>
            <li><Zap size={22} className="pd-bolt" /> +{totalXp} XP</li>
          </ul>
        </div>
      </section>

      {error && <ErrorState message={error} onRetry={load} />}

      <div className="pd-grid">
        <section className="pd-journey" aria-labelledby="pd-journey-title">
          <header className="pd-journey__head">
            <h2 id="pd-journey-title">{isAI ? 'Your AI Exploration Journey' : 'Your Development Journey'}</h2>
            <span className="pd-lockpill"><Lock size={18} /> Complete all modules to finish Level 1</span>
          </header>

          {!course && !error && <LoadingState label="Loading course…" />}
          {course && (
            <ol className="pd-modules">
              {modules.map((m, idx) => {
                const isNext = idx === nextModuleIndex && !m.isCompleted;
                const first = (m.lessons ?? []).find((l) => l.access?.allowed && !l.isCompleted) ?? (m.lessons ?? [])[0];
                const pct = moduleProgress(m);
                const state = m.isCompleted ? 'done' : m.isLocked ? 'locked' : isNext ? 'next' : 'open';
                return (
                  <li key={m.id} className={`pd-module is-${state}`}>
                    <button type="button" onClick={() => openLesson(first)} disabled={m.isLocked || !first}
                      aria-label={`Module ${idx + 1}: ${m.title}. ${state === 'done' ? 'Completed' : state === 'locked' ? 'Locked' : state === 'next' ? 'In progress' : 'Available'}`}>
                      <span className="pd-module__num" aria-hidden="true">{idx + 1}</span>
                      <span className="pd-module__flag" aria-hidden="true">
                        {state === 'done' ? <span className="pd-pill pd-pill--done"><CircleCheck size={15} /> Completed</span>
                          : state === 'next' ? <span className="pd-pill pd-pill--progress"><CircleCheck size={15} /> In Progress</span>
                          : state === 'locked' ? <Lock size={24} /> : null}
                      </span>
                      <ModuleArt index={idx} active={state === 'next' || state === 'done'} />
                      <strong className="pd-module__title">{m.title}</strong>
                      <span className="pd-module__desc">{m.description}</span>
                      {state === 'next' || state === 'done' ? (
                        <span className="pd-module__progress" aria-hidden="true"><ProgressBar value={pct} /><b>{pct}%</b></span>
                      ) : (
                        <span className="pd-xp" aria-hidden="true"><Zap size={18} /> +{m.xp ?? 0} XP</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}

          {course && (nextModule || !course.enrollmentId) && (
            <div className="pd-continue">
              <span className="pd-continue__thumb" aria-hidden="true">
                <img src={isAI ? '/illustrations/quest-ai.png' : '/illustrations/path-art-dev.svg'} alt="" />
              </span>
              <div className="pd-continue__copy">
                <span className="pd-continue__eyebrow">{course.enrollmentId ? 'Continue Learning' : 'Start Learning'}</span>
                <h3>{nextModule?.title ?? modules[0]?.title}</h3>
                <ul className="pd-chips">
                  {(nextModule ?? modules[0])?.lessons?.slice(0, 3).map((l) => {
                    const chip = lessonChip(l);
                    return <li key={l.id}><chip.icon size={18} /> {chip.text}</li>;
                  })}
                </ul>
              </div>
              {course.enrollmentId ? (
                <button type="button" className="pd-cta" onClick={() => openLesson(next)} disabled={!next}>
                  <Play size={20} fill="currentColor" /> {nextProgress > 0 ? 'Continue' : 'Start'} Module {nextModuleIndex + 1}
                </button>
              ) : (
                <button type="button" className="pd-cta" onClick={enroll} disabled={busy}>
                  <Play size={20} fill="currentColor" /> {busy ? 'Enrolling…' : 'Enroll & Start'}
                </button>
              )}
            </div>
          )}
          {course && !nextModule && course.enrollmentId && course.percent >= 100 && (
            <div className="pd-continue pd-continue--done">
              <span className="pd-continue__thumb pd-continue__thumb--done" aria-hidden="true"><Trophy size={48} /></span>
              <div className="pd-continue__copy">
                <span className="pd-continue__eyebrow">Path complete</span>
                <h3>Every module is finished</h3>
              </div>
              <button type="button" className="pd-cta" onClick={() => navigate('level/1')}>Back to Level 1</button>
            </div>
          )}
        </section>

        <aside className="pd-side" aria-label="Path summary">
          <section className="pd-card">
            <h3><SquarePlus size={24} /> Path Progress</h3>
            <div className="pd-progress">
              <RingProgress value={course?.percent ?? 0} size={84} stroke={10} fontSize={21} label={`Path ${course?.percent ?? 0}% complete`} />
              <div>
                <span>{course?.completedModules ?? 0} of {course?.totalModules ?? modules.length} Modules Completed</span>
                <ProgressBar value={course?.percent ?? 0} label="Path progress" />
              </div>
            </div>
          </section>
          <section className="pd-card">
            <h3><BookOpen size={24} /> What You&apos;ll Learn</h3>
            <ul className="pd-learn">
              {(course?.objectives ?? []).map((o) => <li key={o}><span className="pd-check"><Check size={14} strokeWidth={3.4} /></span>{o}</li>)}
            </ul>
          </section>
          <section className="pd-card">
            <h3><Trophy size={24} /> Path Outcome</h3>
            <ul className="pd-outcome">
              {level?.level?.badge && <li><Medal size={34} className="pd-o-badge" /><span>{level.level.badge} Badge</span></li>}
              <li><Zap size={34} className="pd-o-xp" /><span>+{level?.level?.rewardXp ?? totalXp} XP</span></li>
              <li><ChartNoAxesColumnIncreasing size={34} className="pd-o-unlock" /><span>Unlock Level 2</span></li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
