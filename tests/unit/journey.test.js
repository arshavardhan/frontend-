import { describe, it, expect } from 'vitest';
import { LEVELS, unlockRequirement, nextMilestone, nextStageModule, nextLesson, xpProgress, rankTitle } from '../../src/utils/journey';

const ms = (statuses) => LEVELS.map((l, i) => ({ ...l, status: statuses[i] ?? 'locked', backendState: null }));

describe('journey helpers', () => {
  it('lists the 10 levels in the reference order', () => {
    expect(LEVELS.map((l) => l.name)).toEqual(['Discover', 'Learn Basics', 'Learn Advanced', 'Start Building', 'Networking', 'Advanced Building', 'Interview Prep', 'Apply', 'Premium', 'Alumni Connect']);
  });

  it('explains how to unlock a locked level', () => {
    const list = ms(['completed', 'completed', 'current']);
    expect(unlockRequirement(list, 4)).toBe('Complete Level 3: Learn Advanced to unlock Start Building.');
    expect(unlockRequirement(list, 3)).toBe('');
  });

  it('uses the backend reason when the previous level is done', () => {
    const list = ms(['completed', 'completed', 'completed']).map((m) => (m.level === 4 ? { ...m, backendState: 'upcoming' } : m));
    expect(unlockRequirement(list, 4)).toBe('This level is being prepared and will open soon.');
  });

  it('builds the next milestone message', () => {
    const next = nextMilestone(ms(['completed', 'completed', 'current']));
    expect(next.message).toBe('Complete Level 3 to Unlock');
    expect(next.target.name).toBe('Start Building');
  });

  it('finds the next available stage module and lesson', () => {
    expect(nextStageModule({ modules: [{ key: 'a', isCompleted: true }, { key: 'b', isCompleted: false, isLocked: false }, { key: 'c', isLocked: true }] }).key).toBe('b');
    expect(nextStageModule({ modules: [{ key: 'a', isCompleted: true }] })).toBeNull();
    const course = { modules: [{ lessons: [{ id: '1', isCompleted: true, access: { allowed: true } }, { id: '2', access: { allowed: true } }, { id: '3', access: { allowed: false } }] }] };
    expect(nextLesson(course).id).toBe('2');
  });

  it('computes XP progress from backend thresholds', () => {
    expect(xpProgress({ totalXp: 2450, xpForCurrentLevel: 1200, xpForNextLevel: 3000 })).toMatchObject({ percent: 69, to: 3000 });
    expect(rankTitle(3)).toBe('Tech Apprentice');
    expect(rankTitle(99)).toBe('Tech Master');
  });
});
