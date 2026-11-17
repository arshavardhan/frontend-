import React, { useMemo, useState } from 'react';
import { FileText, PlayCircle, Shapes, Download, ExternalLink, Lock, ChevronRight, HelpCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { levelsService, modulesService } from '../../services/api';
import useAsync from '../../hooks/useAsync';
import { EmptyState, ErrorState, LoadingState } from '../shared/States';

export const RESOURCE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'text', label: 'Text', icon: FileText },
  { id: 'video', label: 'Video', icon: PlayCircle },
  { id: 'visual', label: 'Visual', icon: Shapes },
  { id: 'download', label: 'Downloads', icon: Download },
  { id: 'external', label: 'External', icon: ExternalLink },
];

/** Maps backend course_resource.kind to a resource category. */
export function resourceCategory(kind) {
  if (kind === 'video') return 'video';
  if (kind === 'pdf' || kind === 'slides') return 'download';
  if (kind === 'external') return 'external';
  return 'text';
}
const ICON = { text: FileText, video: PlayCircle, visual: Shapes, download: Download, external: ExternalLink, quiz: HelpCircle };

/** Lessons and lesson materials for this level, from journey/level + courses/material. */
async function loadResources(pathIds, levelNumber) {
  const levels = await Promise.all(pathIds.map((id) => levelsService.level(levelNumber, id).catch(() => null)));
  const items = [];
  const materialJobs = [];
  levels.forEach((lvl, i) => {
    const course = lvl?.course;
    if (!course) return;
    for (const mod of course.modules ?? [])
      for (const lesson of mod.lessons ?? []) {
        const allowed = Boolean(lesson.access?.allowed || lesson.isCompleted);
        const category = lesson.kind === 'quiz' ? 'quiz' : lesson.contentFormat === 'visual' ? 'visual' : 'text';
        items.push({ id: `l-${lesson.id}`, category, title: lesson.title, meta: `${mod.title} · ${lesson.estimatedMinutes} min`, pathId: pathIds[i], lessonId: lesson.id, locked: !allowed || !course.enrollmentId });
        if (allowed && course.enrollmentId && lesson.kind !== 'quiz' && materialJobs.length < 10)
          materialJobs.push(modulesService.material(course.id, lesson.id).then((m) => ({ m, mod, lesson })).catch(() => null));
      }
  });
  const seen = new Set();
  for (const res of await Promise.all(materialJobs)) {
    if (!res) continue;
    for (const r of res.m?.resources ?? []) {
      // Materials shared by several lessons are listed once.
      if (!r.url || seen.has(r.url)) continue;
      seen.add(r.url);
      items.push({ id: `r-${r.id}`, category: resourceCategory(r.kind), title: r.title, meta: `${res.lesson.title}${r.provider ? ` · ${r.provider}` : ''}`, url: r.url });
    }
  }
  return items;
}

export default function ResourcesPanel({ levelNumber = 1 }) {
  const { selectedPath, paths, navigate } = useApp();
  const pathIds = useMemo(() => (selectedPath ? [selectedPath.id] : paths.map((p) => p.id)), [selectedPath, paths]);
  const { data, loading, error, reload } = useAsync(() => loadResources(pathIds, levelNumber), [pathIds.join(','), levelNumber], { enabled: pathIds.length > 0 });
  const [filter, setFilter] = useState('all');
  const items = (data ?? []).filter((r) => filter === 'all' || r.category === filter || (filter === 'text' && r.category === 'quiz'));

  const open = (r) => {
    if (r.url) window.open(r.url, '_blank', 'noopener,noreferrer');
    else if (!r.locked) navigate('lesson', { path: r.pathId, lesson: r.lessonId });
    else navigate(`path/${r.pathId}`);
  };

  return (
    <div className="tk-resources">
      <div className="tk-filterchips" role="group" aria-label="Filter resources">
        {RESOURCE_FILTERS.map((f) => (
          <button key={f.id} className={`tk-filterchip ${filter === f.id ? 'is-active' : ''}`} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}>{f.label}</button>
        ))}
      </div>
      {loading && <LoadingState lines={4} />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {!loading && !error && items.length === 0 && (
        <EmptyState title="No resources here yet">Explore a career path to unlock this level's lessons and materials.</EmptyState>
      )}
      <ul className="tk-reslist">
        {items.map((r) => {
          const Icon = ICON[r.category] ?? FileText;
          return (
            <li key={r.id}>
              <button className={`tk-res ${r.locked ? 'is-locked' : ''}`} onClick={() => open(r)}>
                <span className={`tk-res__icon tk-res__icon--${r.category}`}><Icon size={20} /></span>
                <span className="tk-res__text"><strong>{r.title}</strong><small>{r.meta}</small></span>
                {r.locked ? <Lock size={16} /> : r.url ? <ExternalLink size={16} /> : <ChevronRight size={18} />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
