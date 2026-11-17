import React, { useState } from 'react';
import { ArrowRight, BrainCircuit, Code2, Compass, PartyPopper, Trophy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import StageScene from '../components/stage/StageScene';
import { StageCTA, StageHeroIcon, StageModuleList, StageProgressCard, StageRewards } from '../components/stage/StageParts';
import { AccountRequired, ErrorState } from '../components/shared/States';
import { nextLesson, stageNextMarkers, stageScene } from '../utils/journey';

const MAIN_PATH = 'software-development';

/** /illustrations/level1-scene.jpg and the platforms the next two levels sit on (% of the art). */
export const LEVEL1_ART = stageScene(1);
const LEVEL1_MARKERS = stageNextMarkers(1);

export default function LevelOnePage() {
  const { stageModules, navigate, run, milestones, journey, finalizePath, isGuest, refresh, triggerToast } = useApp();
  const [busy, setBusy] = useState(false);

  const level1 = journey?.levels?.find((level) => level.number === 1);
  const modules = stageModules?.modules ?? [];
  const next = modules.find((m) => !m.isLocked && !m.isCompleted) ?? null;
  const completed = stageModules?.completedModules ?? modules.filter((m) => m.isCompleted).length;
  const total = stageModules?.totalModules ?? (modules.length || 4);
  const percent = stageModules?.percent ?? (total ? Math.round((completed * 100) / total) : 0);

  /** Opens the next Development lesson directly (enrolling first when needed). */
  async function continueCourse() {
    const level = await api.get('journey/level', { number: 1, pathwayId: MAIN_PATH });
    let course = level?.course;
    if (course && !course.enrollmentId) {
      await api.post('journey/enrollment', { pathwayId: MAIN_PATH }).catch(() => undefined);
      await api.post('course-enrollments', { versionId: course.id });
      course = (await api.get('journey/level', { number: 1, pathwayId: MAIN_PATH }))?.course;
    }
    const lesson = nextLesson(course);
    if (lesson) navigate('lesson', { path: MAIN_PATH, lesson: lesson.id });
    else triggerToast('Every Development lesson is complete.');
  }

  async function openModule(module) {
    setBusy(true);
    try {
      switch (module.completionRule) {
        case 'orientation':
          await run(() => api.post('journey/stage-modules/complete', { number: 1, moduleKey: module.key }), 'Welcome module completed.');
          break;
        case 'profile_setup': navigate('profile'); break;
        case 'path_exploration': await continueCourse(); break;
        case 'path_finalization':
          // One career path: starting it finishes Discover and the learner moves on to Learn.
          await finalizePath(MAIN_PATH);
          navigate('stage2');
          break;
        default:
      }
    } catch { /* AppContext shows the API error. */ }
    finally { setBusy(false); }
  }

  /** A finished module moves the learner on: to the next open module, or into Level 2. */
  function advance(module) {
    const after = modules.find((m) => m.position > module.position && !m.isCompleted) ?? modules.find((m) => !m.isCompleted);
    if (after) openModule(after);
    else navigate('stage2');
  }

  const allDone = modules.length > 0 && !next;
  const ctaLabel = !next ? 'Continue to Level 2: Learn'
    : completed === 0 ? 'Start Learning'
    : next.completionRule === 'path_finalization' ? 'Start the Development Path' : 'Continue Learning';

  const rows = modules.map((m) => ({
    key: m.key, position: m.position, title: m.title, description: m.description, meta: `${m.estimatedMinutes} min`,
    state: m.isCompleted ? 'done' : m.isLocked ? 'locked' : next?.key === m.key ? 'next' : 'open',
    onClick: () => (m.isCompleted ? advance(m) : openModule(m)),
  }));

  const overview = (
    <>
      <StageProgressCard level={1} percent={percent} done={completed} total={total} />
      {isGuest ? <AccountRequired feature="Discover" /> : !stageModules ? (
        <ErrorState message="Discover modules could not be loaded." onRetry={refresh} />
      ) : (
        <>
          <StageModuleList rows={rows} busy={busy} />
          {allDone && <div className="l1-done" role="status"><PartyPopper size={20} /> Discover complete! Your journey moves on to Learn.</div>}
          <StageCTA label={ctaLabel} busy={busy} done={allDone} onClick={() => (next ? openModule(next) : navigate('stage2'))} />
        </>
      )}
      {level1 && <StageRewards level={1} rewardXp={level1.rewardXp} badge={level1.badge} />}
    </>
  );

  const resources = (
    <>
      <h2 className="l1-h2">Discover resources</h2>
      <ul className="l1-links">
        <li><button type="button" onClick={() => openModule({ completionRule: 'path_exploration' })}><Code2 size={20} /><span><strong>Development lessons</strong><small>Open your next lesson</small></span><ArrowRight size={18} /></button></li>
        <li><button type="button" onClick={() => navigate('tunnel/ai', { from: 'home' })}><BrainCircuit size={20} /><span><strong>AI Tunnel</strong><small>Optional side quest you can open any time</small></span><ArrowRight size={18} /></button></li>
        <li><button type="button" onClick={() => navigate('challenges')}><Trophy size={20} /><span><strong>Discover challenges</strong><small>Short knowledge checks for each area</small></span><ArrowRight size={18} /></button></li>
      </ul>
    </>
  );

  return (
    <StageScene
      level={1}
      art={LEVEL1_ART}
      markers={LEVEL1_MARKERS}
      title={level1?.title || milestones[0]?.name || 'Discover'}
      desc={level1?.description || milestones[0]?.desc}
      heroIcon={<StageHeroIcon level={1} />}
      overview={overview}
      resources={resources}
    />
  );
}
