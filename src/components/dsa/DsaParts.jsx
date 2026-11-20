import React from 'react';
import {
  Award, CheckCircle2, Crosshair, GitFork, Grid3x3, Hash, Layers, Link2, Lock, Network, Rows3, ScrollText, Type, Waypoints, Zap,
} from 'lucide-react';

/** Icon of each chapter, keyed by the backend's chapter `icon`. */
export const CHAPTER_ICONS = {
  array: Rows3, hash: Hash, 'linked-list': Link2, target: Crosshair, branch: GitFork,
  stack: Layers, text: Type, tree: Network, graph: Waypoints, grid: Grid3x3,
};
export const chapterIcon = (icon) => CHAPTER_ICONS[icon] ?? Rows3;

export const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
export function DifficultyPill({ value }) {
  return <span className={`dsa-diff is-${value}`}>{DIFFICULTY_LABEL[value] ?? value}</span>;
}

export const VERDICT_LABEL = {
  accepted: 'Accepted', wrong_answer: 'Wrong answer', runtime_error: 'Runtime error', time_limit_exceeded: 'Time limit exceeded',
  memory_limit_exceeded: 'Memory limit exceeded', compile_error: 'Compilation error', output_limit_exceeded: 'Output limit exceeded',
};

/* ------------------------------ tiny, safe markdown ------------------------------ */

function inline(text, keyBase) {
  const out = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\((https:\/\/[^)\s]+)\))/g;
  let last = 0;
  let m;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const key = `${keyBase}-${k++}`;
    if (t.startsWith('`')) out.push(<code key={key}>{t.slice(1, -1)}</code>);
    else if (t.startsWith('**')) out.push(<strong key={key}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith('_')) out.push(<em key={key}>{t.slice(1, -1)}</em>);
    else out.push(<a key={key} href={m[2]} target="_blank" rel="noreferrer">{t.slice(1, t.indexOf(']'))}</a>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Renders the small markdown subset the backend writes (bold, code, lists, code blocks, links) as React elements. */
export function Md({ text, className = '' }) {
  const blocks = [];
  const lines = String(text ?? '').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const code = [];
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) code.push(lines[i]);
      blocks.push(<pre key={i}><code>{code.join('\n')}</code></pre>);
    } else if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      for (; i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i]); i++) items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
      i--;
      const List = ordered ? 'ol' : 'ul';
      blocks.push(<List key={i}>{items.map((it, j) => <li key={j}>{inline(it, `${i}-${j}`)}</li>)}</List>);
    } else if (line.trim()) {
      const para = [line];
      for (; i + 1 < lines.length && lines[i + 1].trim() && !lines[i + 1].startsWith('```') && !/^\s*([-*]|\d+\.)\s+/.test(lines[i + 1]); i++) para.push(lines[i + 1]);
      blocks.push(<p key={i}>{inline(para.join(' '), i)}</p>);
    }
  }
  return <div className={`dsa-md ${className}`}>{blocks}</div>;
}

/** Compact value printer for test inputs and outputs. */
export const show = (v) => {
  if (v === undefined) return '—';
  const s = JSON.stringify(v);
  return s && s.length > 400 ? `${s.slice(0, 400)}…` : s;
};

/* ---------------------------------- artwork ---------------------------------- */

/** The dungeon gate at the top of the map: an arch with torches, banners and the code sign. */
export function DungeonGate({ className = '' }) {
  return (
    <svg viewBox="0 0 360 240" className={`dsa-gate ${className}`} aria-hidden="true">
      <defs>
        <radialGradient id="gateFire" cx="0.5" cy="0.7" r="0.7">
          <stop offset="0" stopColor="#fff1c1" />
          <stop offset="0.3" stopColor="#ffb02e" />
          <stop offset="0.7" stopColor="#c2410c" />
          <stop offset="1" stopColor="#3a1405" />
        </radialGradient>
        <linearGradient id="gateStone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a99780" />
          <stop offset="1" stopColor="#4c4038" />
        </linearGradient>
        <linearGradient id="gateBanner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2d5fe0" />
          <stop offset="1" stopColor="#173a9c" />
        </linearGradient>
        <radialGradient id="torch" cx="0.5" cy="0.6" r="0.5">
          <stop offset="0" stopColor="#fff6d0" />
          <stop offset="0.45" stopColor="#ffb547" />
          <stop offset="1" stopColor="#ff6a00" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="180" cy="150" rx="170" ry="90" fill="#ff8a1f" opacity="0.18" />
      {/* banners */}
      {[44, 316].map((x) => (
        <g key={x}>
          <rect x={x - 3} y="18" width="6" height="12" fill="#6b5a3f" />
          <path d={`M${x - 22} 26 H${x + 22} V108 L${x} 124 L${x - 22} 108 Z`} fill="url(#gateBanner)" stroke="#0e2a6e" strokeWidth="2" />
          <path d={`M${x - 11} 52 H${x + 11} M${x} 52 V86`} stroke="#9cc3ff" strokeWidth="6" strokeLinecap="round" />
        </g>
      ))}
      {/* arch */}
      <path d="M86 236 V120 A94 94 0 0 1 274 120 V236 Z" fill="url(#gateStone)" />
      {[...Array(11)].map((_, i) => {
        const a = Math.PI - (i * Math.PI) / 10;
        return <line key={i} x1={180 + Math.cos(a) * 68} y1={120 - Math.sin(a) * 68} x2={180 + Math.cos(a) * 94} y2={120 - Math.sin(a) * 94} stroke="#3c322b" strokeWidth="2" />;
      })}
      <path d="M112 236 V122 A68 68 0 0 1 248 122 V236 Z" fill="url(#gateFire)" />
      <text x="180" y="150" textAnchor="middle" fontSize="54" fontWeight="800" fill="#fffaf0" fontFamily="ui-monospace, Menlo, monospace" style={{ filter: 'drop-shadow(0 0 6px #ffcf6b)' }}>&lt;/&gt;</text>
      {/* torches */}
      {[96, 264].map((x) => (
        <g key={x}>
          <rect x={x - 6} y="176" width="12" height="44" rx="3" fill="#3c3530" />
          <rect x={x - 10} y="168" width="20" height="10" rx="2" fill="#5a4c40" />
          <ellipse cx={x} cy="152" rx="20" ry="28" fill="url(#torch)" className="dsa-flame" />
        </g>
      ))}
    </svg>
  );
}

/** Treasure chest for chapter progress. */
export function Chest({ open = false }) {
  return (
    <svg viewBox="0 0 120 96" className="dsa-chest" aria-hidden="true">
      <defs>
        <linearGradient id="chestWood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8651c" />
          <stop offset="1" stopColor="#7a3410" />
        </linearGradient>
        <radialGradient id="chestGold" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset="1" stopColor="#f0a40a" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="88" rx="50" ry="7" fill="#000" opacity="0.25" />
      {open && <ellipse cx="60" cy="38" rx="40" ry="14" fill="url(#chestGold)" />}
      <path d={open ? 'M14 36 Q60 -6 106 36 L100 16 Q60 -18 20 16 Z' : 'M12 40 Q12 10 60 10 Q108 10 108 40 Z'} fill="url(#chestWood)" stroke="#4a1f08" strokeWidth="3" />
      <rect x="12" y="40" width="96" height="46" rx="5" fill="url(#chestWood)" stroke="#4a1f08" strokeWidth="3" />
      <rect x="12" y="40" width="96" height="9" fill="#f2b632" stroke="#8a5a06" strokeWidth="2" />
      <rect x="26" y="40" width="9" height="46" fill="#f2b632" stroke="#8a5a06" strokeWidth="2" />
      <rect x="85" y="40" width="9" height="46" fill="#f2b632" stroke="#8a5a06" strokeWidth="2" />
      <rect x="51" y="48" width="18" height="20" rx="3" fill="#ffd34d" stroke="#8a5a06" strokeWidth="2" />
      <circle cx="60" cy="58" r="3" fill="#6b3f05" />
    </svg>
  );
}

/** The XP, DSA badge and certificate rewards. */
export function RewardTiles({ rewards = [], xp }) {
  const icon = { xp: Zap, 'dsa-badge': Award, certificate: ScrollText };
  return (
    <ul className="dsa-rewards">
      {rewards.map((r) => {
        const Icon = icon[r.id] ?? Award;
        const label = r.id === 'xp' ? (r.xp ?? xp ? `+${(r.xp ?? xp).toLocaleString()} XP` : 'XP') : r.label;
        return (
          <li key={r.id} className={`is-${r.id} ${r.earned ? 'is-earned' : ''}`}>
            <span className="dsa-rewards__icon"><Icon size={26} /></span>
            <span>{label}</span>
            {r.earned ? <CheckCircle2 size={14} className="dsa-rewards__ok" /> : <Lock size={12} className="dsa-rewards__lock" />}
          </li>
        );
      })}
    </ul>
  );
}
