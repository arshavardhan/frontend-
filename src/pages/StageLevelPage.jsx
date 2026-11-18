import React, { useState } from 'react';
import { ArrowRight, BrainCircuit, Code2, LayoutGrid, Map as MapIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import useAsync from '../hooks/useAsync';
import StageScene, { levelRoute } from '../components/stage/StageScene';
import { GroupModules, StageCTA, StageHeroIcon, StageModuleList, StageProgressCard, StageRewards } from '../components/stage/StageParts';
import { levelInfo, stageNextMarkers, stageScene } from '../utils/journey';
import { LEVEL_PATHS, groupModules } from '../utils/levelPaths';

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
  const advGroups = advModules.length ? groupModules(3, advModules) : [];
  const activeGroup = groupNo ? advGroups.find((g) => g.number === groupNo) : null;

  const rows = advGroups.length ? advGroups.map((g) => ({
    key: g.title, position: g.number, title: g.title, description: `${g.modules.length} modules · Under development`, meta: `${g.modules.length}`, state: 'open', onClick: () => setGroupNo(g.number),
  })) : (LEVEL_PATHS[level]?.groups ?? []).map(({ title }, i) => ({
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
      <h2 className="l1-h2">Level {level} resources</h2>
      <ul className="l1-links">
        <li><button type="button" onClick={() => navigate(`level/${level}/path`)}><LayoutGrid size={20} /><span><strong>Full learning path</strong><small>Every group, module and milestone</small></span><ArrowRight size={18} /></button></li>
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
