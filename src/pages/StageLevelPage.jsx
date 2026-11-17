import React from 'react';
import { ArrowRight, BrainCircuit, Code2, Map as MapIcon } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import useAsync from '../hooks/useAsync';
import StageScene, { levelRoute } from '../components/stage/StageScene';
import { GroupModules, StageCTA, StageHeroIcon, StageModuleList, StageProgressCard, StageRewards } from '../components/stage/StageParts';
import { MOUNTAIN_MAP } from './HomePage';
import { levelInfo, stageNextMarkers, stageScene } from '../utils/journey';

/**
 * Planned topics for the later levels. They are shown as "Coming soon" until the backend
 * publishes the level's modules; nothing here can be started or completed.
 */
const PLANNED = {
  3: ['System Design Basics', 'Advanced Data Structures', 'Performance & Scaling', 'Architecture Patterns'],
  4: ['Project Planning', 'Git & Team Workflow', 'Build Your First Project', 'Code Review'],
  5: ['Your Developer Brand', 'Mentor Sessions', 'Study Groups', 'Community Events'],
  6: ['Production-Grade Projects', 'Testing at Scale', 'Team Builds', 'Deploy & Monitor'],
  7: ['DSA Interview Practice', 'System Design Interviews', 'Behavioural Interviews', 'Mock Interviews'],
  8: ['Resume & Portfolio', 'Job Matching', 'Application Tracker', 'Offer Negotiation'],
  9: ['Mentor Coaching', 'Salary Benchmarks', 'One-to-One Reviews', 'Career Strategy'],
  10: ['Alumni Network', 'Mentor New Learners', 'Give-Back Projects', 'Lifelong Learning'],
};

/** The journey map zoomed in on a level's platform, so every stage continues the same path. */
export function mapStageArt(level) {
  const pos = MOUNTAIN_MAP.markers[level];
  return {
    image: '/illustrations/journey-map@2x.jpg',
    width: MOUNTAIN_MAP.width * 2,
    height: MOUNTAIN_MAP.height * 2,
    focus: pos,
    // Keep the pedestal clear of the title in the top-left corner.
    target: { x: 0.68, y: 0.7 },
    zoom: pos.y < 35 || pos.x < 30 ? 1.9 : 1.45,
  };
}
/** The next two levels further up the path, shown as markers in the stage scene. */
export const mapStageMarkers = (level) => [level + 1, level + 2].filter((n) => n <= 10).map((n) => ({ n, pos: MOUNTAIN_MAP.markers[n] }));

const ADV_GROUPS = [
  { title: 'Advanced Patterns', summary: 'Composition, state architecture and modular backends.' },
  { title: 'Scale & Performance', summary: 'Profiling, caching, queues and real-time systems.' },
  { title: 'Reliability & Security', summary: 'Testing at scale, observability and secure delivery.' },
  { title: 'Production Engineering', summary: 'Infrastructure, releases, recovery and cost.' },
];

/** Levels 3–10: the journey map, zoomed in on the level's own platform. */
export default function StageLevelPage({ level }) {
  const { navigate, milestones, journey } = useApp();
  const info = levelInfo(level);
  const milestone = milestones[level - 1];
  const backend = journey?.levels?.find((l) => l.number === level);
  const art = stageScene(level);
  const markers = stageNextMarkers(level);
  const current = milestones.find((m) => m.status === 'current');

  // Level 3 is Development Advanced: its 40 module headings come from the backend curriculum.
  const advanced = useAsync(() => api.get('stage2/curriculum', { batchId: 'development-advanced' }), [level], { enabled: level === 3 });
  const [groupNo, setGroupNo] = useState(null);
  const advModules = advanced.data?.modules ?? [];
  const size = Math.ceil(advModules.length / 4) || 1;
  const advGroups = advModules.length ? ADV_GROUPS.map((g, i) => ({ ...g, number: i + 1, modules: advModules.slice(i * size, (i + 1) * size) })) : [];
  const activeGroup = groupNo ? advGroups.find((g) => g.number === groupNo) : null;

  const rows = advGroups.length ? advGroups.map((g) => ({
    key: g.title, position: g.number, title: g.title, description: `${g.modules.length} modules · Under development`, meta: `${g.modules.length}`, state: 'open', onClick: () => setGroupNo(g.number),
  })) : (PLANNED[level] ?? []).map((title, i) => ({
    key: title, position: i + 1, title, description: 'Under development for this level.', meta: '', state: 'soon',
  }));

  const overview = (
    <>
      <StageProgressCard level={level} percent={milestone?.status === 'completed' ? 100 : 0} done={milestone?.status === 'completed' ? rows.length : 0} total={rows.length} />
      {activeGroup ? <GroupModules group={activeGroup} modules={activeGroup.modules} onBack={() => setGroupNo(null)} />
        : <StageModuleList title={advGroups.length ? `Learning Path (4 groups · ${advModules.length} modules)` : undefined} rows={rows} />}
      <p className="st-note">Level {level} is under development. Its lessons will open here as soon as they are published.</p>
      {current && current.level !== level ? (
        <StageCTA label={`Continue Level ${current.level}: ${current.name}`} onClick={() => navigate(levelRoute(current.level))} />
      ) : (
        <StageCTA label="Under development" disabled />
      )}
      <StageRewards level={level} rewardXp={backend?.rewardXp ?? 0} badge={backend?.badge} />
    </>
  );

  const resources = (
    <>
      <h2 className="l1-h2">Keep growing while you wait</h2>
      <ul className="l1-links">
        <li><button type="button" onClick={() => navigate('tunnel/dsa', { from: 'home' })}><Code2 size={20} /><span><strong>DSA Tunnel</strong><small>Practise data structures and algorithms</small></span><ArrowRight size={18} /></button></li>
        <li><button type="button" onClick={() => navigate('tunnel/ai', { from: 'home' })}><BrainCircuit size={20} /><span><strong>AI Tunnel</strong><small>Build with artificial intelligence</small></span><ArrowRight size={18} /></button></li>
        <li><button type="button" onClick={() => navigate('home')}><MapIcon size={20} /><span><strong>Journey map</strong><small>See all ten levels</small></span><ArrowRight size={18} /></button></li>
      </ul>
    </>
  );

  return (
    <StageScene
      key={level}
      level={level}
      art={art}
      markers={markers}
      title={milestone?.name ?? info.name}
      desc={milestone?.desc ?? info.desc}
      heroIcon={<StageHeroIcon level={level} />}
      overview={overview}
      resources={resources}
    />
  );
}
