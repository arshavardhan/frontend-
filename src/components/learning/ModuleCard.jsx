import React from 'react';
import { Play, Lock, Check } from 'lucide-react';
import { pad2, formatDuration } from '../../utils/journey';

/** One Level module row: number, title, description, duration, completion and lock state. */
export default function ModuleCard({ module, index, active, onOpen }) {
  const state = module.isCompleted ? 'done' : module.isLocked ? 'locked' : 'open';
  const label = `Module ${pad2(index + 1)}: ${module.title}. ${module.isCompleted ? 'Completed' : module.isLocked ? 'Locked' : 'Available'}. ${formatDuration(module.estimatedMinutes)}`;
  return (
    <button className={`tk-module is-${state} ${active ? 'is-active' : ''}`} onClick={() => onOpen(module)} aria-label={label}>
      <span className={`tk-module__state tk-module__state--${state}`} aria-hidden="true">
        {state === 'done' ? <Check size={18} strokeWidth={3} /> : state === 'locked' ? <Lock size={18} /> : <Play size={16} fill="currentColor" />}
      </span>
      <span className="tk-module__num">{pad2(index + 1)}</span>
      <span className="tk-module__text">
        <strong>{module.title}</strong>
        <small>{module.description}</small>
      </span>
      <span className="tk-module__time">{formatDuration(module.estimatedMinutes)}</span>
    </button>
  );
}
