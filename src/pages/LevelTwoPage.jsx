import React, { useState } from 'react';
import { ArrowRight, BrainCircuit, Code2, LayoutGrid, PartyPopper, Terminal } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import useAsync from '../hooks/useAsync';
import StageScene from '../components/stage/StageScene';
import { GroupModules, StageCTA, StageHeroIcon, StageModuleList, StageProgressCard, StageRewards } from '../components/stage/StageParts';
import { ErrorState, LoadingState } from '../components/shared/States';
import { stageNextMarkers, stageScene } from '../utils/journey';

/** Level 2 sits on the same mountain path as Level 1: its platform, with Levels 3 and 4 further up. */
const LEVEL2_ART = stageScene(2);

/**
 * Level 2 (Learn Basics · Core Foundations) as a stage, like Level 1: the four learning-path
 * groups are its modules and Continue Learning opens the next lesson directly.
 */
export default function LevelTwoPage() {
  const { navigate, run, journey, milestones, stage2, triggerToast } = useApp();
  const overview = useAsync(() => api.get('stage2/overview'), [stage2?.batch?.id, stage2?.enrolled]);
  const data = overview.data;
  const [busy, setBusy] = useState(false);
  const [openGroupNo, setOpenGroupNo] = useState(null);
  const level2 = journey?.levels?.find((l) => l.number === 2);
  const groups = data?.learningPath?.groups ?? [];

  /** Opens a module at its next step: lesson, guided problem or ticket. */
  async function openModule(batchId, moduleId) {
    const outline = await api.get('stage2/modules/outline', { batchId, moduleId });
    const item = outline?.next ? outline.items.find((i) => i.itemId === outline.next.itemId) : outline?.items?.[0];
    if (!item) { navigate('stage2/module', { batch: batchId, module: moduleId }); return; }
    if (item.kind === 'challenge') {
      const challenge = await api.get('stage2/challenges', { batchId, conceptId: item.conceptId }).catch(() => null);
      const storage = challenge?.storage ?? { moduleId: item.moduleId, challengeId: item.challengeId };
      navigate('stage2/ticket', { batch: batchId, module: storage.moduleId, challenge: storage.challengeId || undefined, concept: item.conceptId, outline: moduleId });
      return;
    }
    navigate('stage2/lesson', { batch: batchId, module: moduleId, concept: item.conceptId, part: item.kind });
  }

  async function withBusy(fn) {
    setBusy(true);
    try { await fn(); } catch { /* run() shows API errors */ } finally { setBusy(false); }
  }

  async function ensureEnrolled() {
    if (data?.enrolled) return data;
    await run(() => api.post('stage2/enrollment'), 'Welcome to Level 2.');
    return overview.reload();
  }

  const continueLearning = () => withBusy(async () => {
    const current = await ensureEnrolled();
    if (!current?.enrolled) return;
    if (current.cta?.action === 'module') await openModule(current.batch.id, current.cta.moduleId);
    else triggerToast('Every open module is complete. New modules are on the way.');
  });

  /** A group opens its module list inside the panel; each published module opens at its next step. */
  const openGroup = (group) => withBusy(async () => {
    const current = await ensureEnrolled();
    if (current?.learningPath) setOpenGroupNo(group.number);
  });
  const openGroupModule = (m) => withBusy(async () => { if (data?.batch) await openModule(data.batch.id, m.id); });
  const activeGroup = openGroupNo ? groups.find((g) => g.number === openGroupNo) : null;

  const rowState = (g, i) => {
    if (g.state === 'completed') return 'done';
    if (g.state === 'locked' && data?.enrolled) return 'locked';
    const firstOpen = groups.findIndex((x) => x.state === 'in_progress' || x.state === 'available');
    return i === firstOpen ? 'next' : 'open';
  };
  const rows = groups.length ? groups.map((g, i) => ({
    key: g.number, position: g.number, title: g.title, description: `${g.moduleCount} modules · ${g.modules.filter((m) => m.status === 'published').length} ready · ${g.summary}`,
    meta: `${g.modulesCompleted}/${g.moduleCount}`, state: rowState(g, i), onClick: () => openGroup(g),
  })) : ['Core Concepts', 'Build & Compose', 'Workflows & Tools', 'Real Development'].map((title, i) => ({
    key: title, position: i + 1, title, description: 'Opens when you start Level 2.', meta: '', state: i === 0 ? 'next' : 'open', onClick: () => continueLearning(),
  }));

  const done = data?.learningPath?.groupsCompleted ?? 0;
  const total = data?.learningPath?.groupsTotal ?? 4;
  const percent = total ? Math.round((done * 100) / total) : 0;
  const allDone = Boolean(data?.learningPath) && done === total;

  const panel = (
    <>
      <StageProgressCard level={2} percent={percent} done={done} total={total} />
      {overview.error ? <ErrorState message={overview.error} onRetry={overview.reload} /> : overview.loading && !data ? <LoadingState label="Loading Level 2…" /> : (
        <>
          {activeGroup ? (
            <GroupModules group={activeGroup} modules={activeGroup.modules} busy={busy} onBack={() => setOpenGroupNo(null)} onOpen={openGroupModule} />
          ) : <StageModuleList title={`Learning Path (${groups.length || 4} groups · ${data?.learningPath?.modulesTotal ?? 40} modules)`} rows={rows} busy={busy} />}
          {allDone && <div className="l1-done" role="status"><PartyPopper size={20} /> Level 2 complete! Level 3 is next.</div>}
          <StageCTA
            label={allDone ? 'Continue to Level 3' : data?.enrolled && data?.learningPath?.modulesCompleted ? 'Continue Learning' : 'Start Learning'}
            busy={busy} done={allDone}
            onClick={allDone ? () => navigate('level/3') : continueLearning}
          />
        </>
      )}
      <StageRewards level={2} rewardXp={level2?.rewardXp ?? 0} badge={level2?.badge} />
    </>
  );

  const resources = (
    <>
      <h2 className="l1-h2">Level 2 resources</h2>
      <ul className="l1-links">
        <li><button type="button" onClick={() => navigate('stage2/overview')}><LayoutGrid size={20} /><span><strong>Full learning path</strong><small>Every module, practice and milestone</small></span><ArrowRight size={18} /></button></li>
        <li><button type="button" onClick={() => navigate('tunnel/dsa', { from: 'stage2' })}><Code2 size={20} /><span><strong>DSA Tunnel</strong><small>Optional data structures side quest</small></span><ArrowRight size={18} /></button></li>
        <li><button type="button" onClick={() => navigate('tunnel/ai', { from: 'stage2' })}><BrainCircuit size={20} /><span><strong>AI Tunnel</strong><small>Optional AI side quest</small></span><ArrowRight size={18} /></button></li>
        <li><button type="button" onClick={() => navigate('build')}><Terminal size={20} /><span><strong>CodeLab</strong><small>Hands-on sandbox labs</small></span><ArrowRight size={18} /></button></li>
      </ul>
    </>
  );

  return (
    <StageScene
      level={2}
      art={LEVEL2_ART}
      markers={stageNextMarkers(2)}
      title={milestones[1]?.name ?? 'Learn Basics'}
      pill={`Level 2 of ${milestones.length || 10} · ${data?.level?.title ?? 'Core Foundations'}`}
      desc={data?.hero?.summary ?? milestones[1]?.desc}
      heroIcon={<StageHeroIcon level={2} />}
      overview={panel}
      resources={resources}
    />
  );
}
