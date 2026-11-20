import React from 'react';
import { Check, Flag, Gift, Lock, Play, Star, Target } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import useAsync from '../hooks/useAsync';
import { ErrorState, LoadingState } from '../components/shared/States';
import { RewardTiles } from '../components/dsa/DsaParts';

const SHEET_URL = 'https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems/';

/**
 * The painted map (/illustrations/dsa/dungeon-map.jpg, 1211×872) already names the backend's ten
 * chapters on its doors. Each box below is [left, top, width, height] in % of that artwork.
 */
const DOORS = [
  [29.73, 65.59, 16.85, 18.7], [52.19, 56.27, 15.94, 17.47], [37.74, 43.41, 14.37, 15.31], [66.47, 43.23, 14.62, 16.17],
  [52.02, 29.93, 14.45, 16.28], [77.79, 30.62, 14.45, 15.94], [35.09, 21.78, 12.88, 14.0], [67.71, 19.48, 12.88, 14.81],
  [51.2, 13.58, 12.63, 14.06], [78.78, 5.8, 14.04, 17.71],
];
const BACK = [2.64, 2.75, 3.3, 3.21];
const TILES = { striver: [2.56, 24.77, 9.0, 10.44], practise: [12.55, 24.77, 8.92, 10.44], blitz: [22.46, 24.77, 8.92, 10.44] };

const box = ([left, top, width, height]) => ({ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` });

function Hotspot({ rect, label, onClick, disabled, title, className = '', href }) {
  if (href) return <a className={`dsa-hot ${className}`} style={box(rect)} href={href} target="_blank" rel="noreferrer" aria-label={label} title={title} />;
  return <button type="button" className={`dsa-hot ${className}`} style={box(rect)} onClick={onClick} disabled={disabled} aria-label={label} title={title} />;
}

/** DSA Dungeon: the painted map on the left, live progress on the right (GET dsa/dungeon). */
export default function DsaDungeonPage() {
  const { navigate } = useApp();
  const q = useAsync(() => api.get('dsa/dungeon'), []);
  const d = q.data;
  const openChapter = (c) => c && navigate('dsa/chapter', { id: c.id });
  const current = d && (d.continue?.chapterId ?? d.chapters.find((c) => c.unlocked && c.state !== 'completed')?.id ?? d.chapters[0].id);
  const cont = () => (d?.continue ? navigate('dsa/problem', { slug: d.continue.slug }) : openChapter(d?.chapters[0]));
  const mastered = d?.progress.chaptersCompleted ?? 0;
  const total = d?.progress.chaptersTotal ?? 10;
  const pct = Math.round((mastered / Math.max(1, total)) * 100);

  return (
    <div className="dsa-page dsa-map">
      <section className="dsa-map__pane" aria-label="DSA Dungeon map">
        <div className="dsa-map__art">
          <img src="/illustrations/dsa/dungeon-map.jpg" alt="" draggable="false" />
          {/* a mirrored floor continues the scene when the screen is taller than the artwork */}
          <img className="dsa-map__ext is-bottom" src="/illustrations/dsa/dungeon-map.jpg" alt="" aria-hidden="true" draggable="false" />
          <Hotspot rect={BACK} label="Back to Home" onClick={() => navigate('home')} className="is-round" />
          <Hotspot rect={TILES.striver} label="Learn with Striver: open the Striver SDE Sheet" href={SHEET_URL} />
          <Hotspot rect={TILES.practise} label="Practise Problems" onClick={() => openChapter(d?.chapters.find((c) => c.id === current))} disabled={!d} />
          <Hotspot rect={TILES.blitz} label="Test with Blitz80 (under development)" title="Under development" disabled className="is-soon" />
          {DOORS.map((rect, i) => {
            const c = d?.chapters[i];
            return (
              <Hotspot
                key={i}
                rect={rect}
                className="is-door"
                label={c ? `Chapter ${c.number}: ${c.title}, ${c.solved} of ${c.total} solved${c.unlocked ? '' : ', locked'}` : `Chapter ${i + 1}`}
                onClick={() => openChapter(c)}
                disabled={!c || !c.unlocked}
              />
            );
          })}
        </div>
        {/* Live, and pinned so it stays on screen when the bottom of the painting is trimmed */}
        <button type="button" className="dsa-map__cta" onClick={cont} disabled={!d}>
          <Play fill="currentColor" /> {d?.progress.problemsSolved ? 'Continue Learning' : 'Start Learning'}
        </button>
      </section>

      <aside className="dsa-map__rail" aria-label="Quest progress, learning path and rewards">
        <section className="dsa-map__card" aria-label="Your quest progress">
          <h2><Target className="is-gold" /> Your Quest Progress</h2>
          <div className="dsa-map__big"><strong>{mastered} / {total}</strong><span>Modules mastered</span><b>{pct}%</b></div>
          <div className="dsa-map__bar"><span style={{ width: `${Math.max(pct, 6)}%` }} /></div>
        </section>

        <section className="dsa-map__card dsa-map__path" aria-label="Your learning path">
          <h2><Flag className="is-gold" /> Your Learning Path</h2>
          <p>Learn → Practise → Assess → Revise</p>
          {q.error ? <ErrorState message={q.error} onRetry={q.reload} />
            : !d ? <LoadingState label="Opening the DSA Dungeon…" />
            : (
              <ul>
                {d.chapters.map((c) => {
                  const state = !c.unlocked ? 'locked' : c.state === 'completed' ? 'completed' : c.id === current ? 'current' : 'open';
                  return (
                    <li key={c.id}>
                      <button type="button" className={`is-${state}`} onClick={() => openChapter(c)} disabled={!c.unlocked} aria-current={c.id === current ? 'step' : undefined}
                        title={`${c.solved} of ${c.total} solved`}>
                        <span className="dsa-map__radio">{state === 'completed' ? <Check strokeWidth={3.5} /> : state === 'locked' ? <Lock /> : null}</span>
                        <span>{String(c.number).padStart(2, '0')}.&nbsp; {c.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          <button type="button" className="dsa-map__bonus" disabled title="Under development" aria-label="Bonus: Bits, Tries & Strings (under development)"><Star /> Bonus: Bits, Tries &amp; Strings</button>
        </section>

        <section className="dsa-map__card dsa-map__rewards" aria-label="Mastery rewards">
          <h2><Gift className="is-gold" /> Mastery Rewards</h2>
          <RewardTiles rewards={d?.rewards ?? [{ id: 'xp', label: 'XP' }, { id: 'dsa-badge', label: 'DSA Badge' }, { id: 'certificate', label: 'Certificate' }]} />
        </section>
      </aside>
    </div>
  );
}
