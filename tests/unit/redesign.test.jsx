import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { makeApp } from './mockApp';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../src/context/AppContext', () => ({ useApp: () => globalThis.__app }));
vi.mock('../../src/lib/api', () => ({
  api: { get, post, put: vi.fn(), patch: vi.fn() },
  errorMessage: (e) => e.message,
  ApiError: class ApiError extends Error {},
}));

const { default: HomePage } = await import('../../src/pages/HomePage');
const { default: LevelOnePage } = await import('../../src/pages/LevelOnePage');
const { default: PathDetailsPage } = await import('../../src/pages/PathDetailsPage');
const { default: Stage2Page } = await import('../../src/pages/Stage2Page');
const { default: TunnelPage } = await import('../../src/pages/TunnelPage');
const { default: FoundationWorkPage } = await import('../../src/pages/FoundationWorkPage');
const { default: Sidebar } = await import('../../src/components/Sidebar');
const { default: LevelTwoPage } = await import('../../src/pages/LevelTwoPage');
const { default: StageLevelPage } = await import('../../src/pages/StageLevelPage');
const { default: LevelPathPage } = await import('../../src/pages/LevelPathPage');

const week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((weekday, i) => ({
  date: `2026-11-${16 + i}`, weekday, done: false, isToday: i === 1, isFuture: i > 1,
}));
const streak = (days) => ({ currentDays: days, longestDays: days, todayDone: false, week, message: 'Complete a lesson today to start your streak.' });
const tunnels = (open) => ({
  items: [
    { id: 'dsa', title: 'DSA Tunnel', purpose: 'Practise DSA.', open, modulesTotal: 10, progress: open ? { percent: 10, modulesCompleted: 1, modulesTotal: 10 } : null },
    { id: 'ai', title: 'AI Tunnel', purpose: 'Build with AI.', open, modulesTotal: 20, progress: open ? { percent: 0, modulesCompleted: 0, modulesTotal: 20 } : null },
  ],
});

function routeGet(map) {
  get.mockImplementation((path) => (path in map ? Promise.resolve(typeof map[path] === 'function' ? map[path]() : map[path]) : Promise.reject(new Error(`unexpected ${path}`))));
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  post.mockResolvedValue({ ok: true });
  window.matchMedia = vi.fn(() => ({ matches: true, addListener() {}, removeListener() {} }));
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
});

describe('Home', () => {
  it('shows a zero streak as zero, both side quests, and opens the tunnel routes', async () => {
    globalThis.__app = makeApp();
    routeGet({ 'streaks/me': streak(0), tunnels: tunnels(false) });
    render(<HomePage />);
    const rail = screen.getByRole('complementary', { name: 'Streak and side quests' });
    expect(await within(rail).findByRole('img', { name: '0 day streak' })).toBeTruthy();
    expect(within(rail).getByText('0')).toBeTruthy();
    expect(await within(rail).findAllByText('Choose your Development path to unlock.')).toHaveLength(2);
    fireEvent.click(within(rail).getAllByRole('button', { name: /view quest/i })[1]);
    expect(globalThis.__app.navigate).toHaveBeenCalledWith('tunnel/ai', { from: 'home' });
  });

  it('travels into Level 2 from an available marker and explains locked ones', async () => {
    globalThis.__app = makeApp({ statuses: ['completed', 'current'] });
    routeGet({ 'streaks/me': streak(3), tunnels: tunnels(true) });
    render(<HomePage />);
    fireEvent.click(screen.getByRole('button', { name: /^Level 2: Learn Basics, in progress/ }));
    await waitFor(() => expect(globalThis.__app.navigate).toHaveBeenCalledWith('stage2'), { timeout: 1500 });
    fireEvent.click(screen.getByRole('button', { name: 'Level 4: Start Building, locked' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Complete Level 3: Learn Advanced to unlock Start Building.')).toBeTruthy();
  });

  it('keeps the milestone list view', () => {
    globalThis.__app = makeApp();
    routeGet({ 'streaks/me': streak(1), tunnels: tunnels(true) });
    render(<HomePage />);
    fireEvent.click(screen.getByRole('tab', { name: /list view/i }));
    expect(screen.getByRole('list', { name: 'Career levels' })).toBeTruthy();
  });
});

describe('Level 1 Discover', () => {
  it('lists the four backend modules, the count, the reward and completes orientation', async () => {
    globalThis.__app = makeApp();
    render(<LevelOnePage />);
    expect(screen.getByText('0 of 4 Modules Completed')).toBeTruthy();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText('+25 XP')).toBeTruthy();
    expect(screen.getByText('Discover Badge')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /start learning/i }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('journey/stage-modules/complete', { number: 1, moduleKey: 'welcome' }));
  });
});

describe('Inside a path', () => {
  it('renders ordered modules, the next module and opens its lesson', async () => {
    const app = makeApp();
    app.currentRoute = { path: 'path/software-development', query: {} };
    globalThis.__app = app;
    const lesson = (id, allowed) => ({ id, title: 'What is software?', kind: 'reading', estimatedMinutes: 4, isCompleted: false, access: { allowed }, contentFormat: 'visual' });
    routeGet({
      'journey/level': {
        level: { rewardXp: 25, badge: 'Discover' },
        course: {
          id: 'cv', description: 'Build software.', estimatedMinutes: 40, enrollmentId: 'e1', totalModules: 2, completedModules: 0, percent: 0,
          objectives: ['How software is built'],
          modules: [
            { id: 'm1', title: 'How Software Is Built', description: 'Lifecycle', xp: 5, isCompleted: false, isLocked: false, lessons: [lesson('l1', true)] },
            { id: 'm2', title: 'Shipping', description: 'Deploy', xp: 5, isCompleted: false, isLocked: true, lessons: [lesson('l2', false)] },
          ],
        },
      },
    });
    render(<PathDetailsPage />);
    expect(await screen.findByRole('heading', { name: 'Development Path' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /module 1: how software is built\. in progress/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /module 2: shipping\. locked/i }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /start module 1/i }));
    expect(app.navigate).toHaveBeenCalledWith('lesson', { path: 'software-development', lesson: 'l1' });
    expect(screen.getByText('How software is built')).toBeTruthy();
  });
});

describe('Stage 2', () => {
  const overview = {
    enrolled: true, batch: { id: 'development-basics' }, level: { number: 2, title: 'Core Foundations' },
    hero: { title: 'Build a Strong Foundation', summary: 'Learn.' }, streak: streak(2), gains: [{ id: 'tools', title: 'Use Real Tools' }],
    nextMilestone: { title: 'Complete all 4 modules to unlock Level 3.' }, cta: { label: 'Start Learning', action: 'module', moduleId: 'FE01' },
    learningPath: {
      groupsCompleted: 0, groupsTotal: 1, modulesCompleted: 0, modulesTotal: 3,
      groups: [{ number: 1, title: 'Core Concepts', summary: 'Basics', lessonCount: 6, moduleCount: 3, modulesCompleted: 0, state: 'available', modules: [
        { id: 'FE01', title: 'How the browser renders', state: 'available', status: 'published' },
        { id: 'FE02', title: 'Forms', state: 'locked', status: 'published' },
        { id: 'FE03', title: null, state: 'awaiting_content', status: 'awaiting_content' },
      ] }],
    },
  };

  it('shows server groups, labels locked and awaiting modules and opens the outline', async () => {
    globalThis.__app = makeApp({ stage2: { enrolled: true, batch: { id: 'development-basics' } } });
    routeGet({ 'stage2/overview': overview, 'stage3/eligibility': { eligible: false, missingModules: ['FE01'] }, tunnels: tunnels(true) });
    render(<Stage2Page />);
    expect(await screen.findByText('1. Core Concepts')).toBeTruthy();
    expect(screen.getByText('FE02 · Locked')).toBeTruthy();
    expect(screen.getByText('FE03 · Content coming soon')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /how the browser renders/i }));
    expect(globalThis.__app.navigate).toHaveBeenCalledWith('stage2/module', { batch: 'development-basics', module: 'FE01' });
    expect(screen.getByText('DSA Tunnel')).toBeTruthy();
    expect(screen.getByText('Complete all 4 modules to unlock Level 3.')).toBeTruthy();
  });

  it('enrolls an eligible learner from the hero action', async () => {
    globalThis.__app = makeApp();
    routeGet({
      'stage2/overview': { ...overview, enrolled: false, learningPath: null, enrollment: { eligible: true }, cta: { label: 'Start Learning', action: 'enroll' } },
      tunnels: tunnels(true),
    });
    render(<Stage2Page />);
    fireEvent.click(await screen.findByRole('button', { name: /start learning/i }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('stage2/enrollment'));
  });
});

describe('Tunnels', () => {
  it('shows the onboarding requirement when the tunnel is closed and returns to its entry screen', async () => {
    const app = makeApp();
    app.currentRoute = { path: 'tunnel/dsa', query: { from: 'stage2' } };
    globalThis.__app = app;
    routeGet({ 'tunnels/overview': { id: 'dsa', title: 'DSA Tunnel', purpose: 'Practise.', open: false, reason: 'ONBOARDING_REQUIRED', levels: [{ id: 'dsa', title: 'Core', modules: [{ id: 'DSA01', code: 'DSA01', title: 'Arrays', status: 'published' }] }] } });
    render(<TunnelPage />);
    expect(await screen.findByText('Finish onboarding to enter this tunnel')).toBeTruthy();
    expect(screen.getByRole('button', { name: /arrays/i }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Stage 2' }));
    expect(app.navigate).toHaveBeenCalledWith('stage2');
  });
});

describe('Module outline', () => {
  it('opens a challenge through its server storage reference', async () => {
    const app = makeApp();
    app.currentRoute = { path: 'stage2/module', query: { batch: 'development-basics', module: 'FE01' } };
    globalThis.__app = app;
    routeGet({
      'stage2/modules/outline': {
        module: { id: 'FE01', title: 'Rendering', missingPrerequisites: [] }, progress: { itemsCompleted: 2, itemsTotal: 3, percent: 66 },
        items: [{ itemId: 'c1:challenge', kind: 'challenge', conceptId: 'c1', title: 'Fix it', moduleId: 'FE01', challengeId: null, state: 'available' }],
      },
      'stage2/challenges': { storage: { moduleId: 'PILOT1', challengeId: 'PILOT1-late' } },
    });
    render(<FoundationWorkPage />);
    fireEvent.click(await screen.findByRole('button', { name: /fix it/i }));
    await waitFor(() => expect(app.navigate).toHaveBeenCalledWith('stage2/ticket', expect.objectContaining({ module: 'PILOT1', challenge: 'PILOT1-late', concept: 'c1' })));
  });
});

describe('Sidebar', () => {
  it('keeps the Stage 2 and CodeLab destinations and the collapse control', () => {
    globalThis.__app = makeApp({ setSidebarCollapsed: vi.fn(), sidebarCollapsed: false });
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'CodeLab' }));
    expect(globalThis.__app.navigate).toHaveBeenCalledWith('build');
    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(globalThis.__app.setSidebarCollapsed).toHaveBeenCalledWith(true);
  });
});

describe('Sidebar level crest', () => {
  it('follows the learner into their current stage', () => {
    globalThis.__app = makeApp({ statuses: ['completed', 'current'], currentLevel: 2, levelProgress: 40, setSidebarCollapsed: vi.fn() });
    render(<Sidebar />);
    fireEvent.click(screen.getByRole('button', { name: /current stage: level 2, core foundations, 40% complete/i }));
    expect(globalThis.__app.navigate).toHaveBeenCalledWith('stage2');
  });
});

describe('Every level opens as a stage', () => {
  it('Level 2 lists its groups and Continue Learning opens the next lesson directly', async () => {
    globalThis.__app = makeApp({ statuses: ['completed', 'current'], stage2: { enrolled: true, batch: { id: 'development-basics' } } });
    routeGet({
      'stage2/overview': {
        enrolled: true, batch: { id: 'development-basics' }, level: { title: 'Core Foundations' }, hero: { summary: 'Learn.' },
        cta: { action: 'module', moduleId: 'FE01', label: 'Start Learning' },
        learningPath: { groupsCompleted: 0, groupsTotal: 1, modulesCompleted: 0, groups: [{ number: 1, title: 'Core Concepts', summary: 'Basics', lessonCount: 2, moduleCount: 1, modulesCompleted: 0, state: 'available', modules: [{ id: 'FE01', state: 'available' }] }] },
      },
      'stage2/modules/outline': { items: [{ itemId: 'c:lesson', kind: 'lesson', conceptId: 'c' }], next: { itemId: 'c:lesson' } },
    });
    render(<LevelTwoPage />);
    expect(await screen.findByText('Core Concepts')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /start learning/i }));
    await waitFor(() => expect(globalThis.__app.navigate).toHaveBeenCalledWith('stage2/lesson', { batch: 'development-basics', module: 'FE01', concept: 'c', part: 'lesson' }));
  });

  it('Levels 3–10 show the same stage with their topics marked coming soon', () => {
    globalThis.__app = makeApp({ statuses: ['completed', 'current'] });
    render(<StageLevelPage level={7} />);
    expect(screen.getByRole('heading', { name: 'Interview Prep' })).toBeTruthy();
    expect(screen.getAllByText('Under development').length).toBe(4);
    fireEvent.click(screen.getByRole('button', { name: /continue level 2/i }));
    expect(globalThis.__app.navigate).toHaveBeenCalledWith('stage2');
  });
});

describe('Full learning path of Levels 3–10', () => {
  it('opens from the level Resources and shows four groups marked under development', async () => {
    globalThis.__app = makeApp({ statuses: ['completed', 'current'] });
    render(<StageLevelPage level={7} />);
    fireEvent.click(screen.getByRole('button', { name: /full learning path/i }));
    expect(globalThis.__app.navigate).toHaveBeenCalledWith('level/7/path');
  });

  it('Level 7 lists its planned groups, what it gives and the next milestone', async () => {
    globalThis.__app = makeApp({ statuses: ['completed', 'current'] });
    routeGet({ 'streaks/me': streak(0), tunnels: tunnels(true) });
    render(<LevelPathPage level={7} />);
    expect(screen.getByRole('heading', { name: /ace your interviews/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /dsa interview practice/i })).toBeTruthy();
    expect(screen.getAllByText('Under development').length).toBeGreaterThanOrEqual(4);
    fireEvent.click(screen.getByRole('button', { name: /mock interviews/i }));
    expect(screen.getByText(/modules for mock interviews are under development/i)).toBeTruthy();
    expect(screen.getByText(/complete level 7 to unlock level 8/i)).toBeTruthy();
  });

  it('Level 3 fills its groups with the backend Development Advanced modules', async () => {
    globalThis.__app = makeApp({ statuses: ['completed', 'current'] });
    const modules = Array.from({ length: 8 }, (_, i) => ({ id: `ADV${i + 1}`, title: `Advanced module ${i + 1}`, state: 'locked', status: 'awaiting_content' }));
    routeGet({ 'stage2/curriculum': { modules }, 'streaks/me': streak(0), tunnels: tunnels(true) });
    render(<LevelPathPage level={3} />);
    expect(await screen.findByText('Advanced module 1')).toBeTruthy();
    expect(get).toHaveBeenCalledWith('stage2/curriculum', { batchId: 'development-advanced' });
    fireEvent.click(screen.getByRole('button', { name: /production engineering/i }));
    expect(screen.getByText('Advanced module 8')).toBeTruthy();
    expect(screen.getAllByText(/ADV8 · Under development/).length).toBe(1);
  });
});
