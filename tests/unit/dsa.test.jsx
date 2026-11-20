import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { makeApp } from './mockApp';
import { dsaDemoRoute } from '../../src/lib/dsa/demoDsa';

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock('../../src/context/AppContext', () => ({ useApp: () => globalThis.__app }));
vi.mock('../../src/lib/api', () => ({ api: { get, post: vi.fn(), put: vi.fn() }, errorMessage: (e) => e.message }));
const { default: DsaDungeonPage } = await import('../../src/pages/DsaDungeonPage');
const { default: DsaChapterPage } = await import('../../src/pages/DsaChapterPage');

const fail = (status, code, message) => ({ __demoError: true, status, code, message });
const call = (s, method, path, q = {}, body = {}) => dsaDemoRoute(method, path, q, body, s, fail, () => {});

describe('DSA Dungeon guest backend', () => {
  it('serves the ten backend chapters and every problem', async () => {
    const s = {};
    const d = await call(s, 'GET', 'dsa/dungeon');
    expect(d.chapters).toHaveLength(10);
    expect(d.chapters[0].title).toBe('Arrays');
    expect(d.progress.problemsTotal).toBe(187);
    const c = await call(s, 'GET', 'dsa/chapter', { chapterId: 'DSA08' });
    expect(c.counts.all).toBe(40);
    const hard = await call(s, 'GET', 'dsa/chapter', { chapterId: 'DSA08', difficulty: 'hard' });
    expect(hard.problems.every((p) => p.difficulty === 'hard')).toBe(true);
  });

  it('gives starter code, reveals hints and records link-out problems as solved', async () => {
    const s = {};
    const p = await call(s, 'GET', 'dsa/problem', { slug: 'two-sum' });
    expect(p.judge.languages.map((l) => l.language)).toEqual(['javascript', 'python', 'java', 'cpp']);
    expect(p.judge.languages[0].starterCode).toContain('function twoSum(nums, target)');
    expect((await call(s, 'POST', 'dsa/problem/hint', {}, { slug: 'two-sum' })).items).toHaveLength(1);
    await expect(call(s, 'POST', 'dsa/problem/run', {}, { slug: 'two-sum', language: 'python', code: 'x' })).rejects.toMatchObject({ code: 'JUDGE_UNAVAILABLE' });
    await call(s, 'POST', 'dsa/problem/self-report', {}, { slug: 'delete-node-in-a-linked-list' });
    expect((await call(s, 'GET', 'dsa/dungeon')).progress.problemsSolved).toBe(1);
    const genie = await call(s, 'POST', 'genie/ask', {}, { slug: 'two-sum', mode: 'approach' });
    expect(genie.reply).toMatch(/Key idea/);
  });
});

describe('DSA Dungeon pages', () => {
  beforeEach(() => { get.mockReset(); });

  it('the map lists the chapters and opens one', async () => {
    globalThis.__app = makeApp({ statuses: ['completed', 'current'] });
    const d = await call({}, 'GET', 'dsa/dungeon');
    get.mockResolvedValue(d);
    render(<DsaDungeonPage />);
    fireEvent.click(await screen.findByRole('button', { name: /chapter 3: linked list/i }));
    expect(globalThis.__app.navigate).toHaveBeenCalledWith('dsa/chapter', { id: 'DSA03' });
    expect(screen.getByRole('button', { name: /test with blitz80/i }).disabled).toBe(true);
  });

  it('the chapter lists its problems and opens one in the editor', async () => {
    globalThis.__app = { ...makeApp({ statuses: ['completed', 'current'] }), currentRoute: { query: { id: 'DSA01' } } };
    get.mockResolvedValue(await call({}, 'GET', 'dsa/chapter', { chapterId: 'DSA01' }));
    render(<DsaChapterPage />);
    fireEvent.click(await screen.findByText('1. Set Matrix Zeroes'));
    expect(globalThis.__app.navigate).toHaveBeenCalledWith('dsa/problem', { slug: 'set-matrix-zeroes' });
    expect(screen.getByRole('button', { name: /medium \(12\)/i })).toBeTruthy();
  });
});
