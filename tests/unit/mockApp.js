import { vi } from 'vitest';
import { LEVELS } from '../../src/utils/journey';
import { toPath } from '../../src/lib/pathVisuals';

/** A realistic AppContext value for component tests (shapes match GET dashboard / journey). */
export function makeApp(over = {}) {
  const statuses = over.statuses ?? ['current'];
  const milestones = LEVELS.map((l, i) => ({ ...l, status: statuses[i] ?? 'locked', backendState: null, rewardXp: 25, badge: i === 0 ? 'Discover' : null }));
  const paths = [
    toPath({ id: 'software-development', title: 'Software Development', displayTitle: 'Development', description: 'Discover how software is designed, developed and deployed.', xpReward: 25, domains: [{ id: 'a', title: 'Frontend' }, { id: 'b', title: 'Backend' }] }),
    toPath({ id: 'ai-engineering', title: 'Artificial Intelligence', displayTitle: 'Artificial Intelligence', description: 'Discover how machines learn.', xpReward: 25, domains: [{ id: 'c', title: 'GenAI' }] }),
  ];
  const stageModules = {
    completedModules: 0, totalModules: 4, percent: 0, current: 'welcome',
    modules: [
      { key: 'welcome', position: 1, title: 'Welcome to Teklozy', description: 'Get familiar with the platform and your journey', estimatedMinutes: 6, completionRule: 'orientation', isCompleted: false, isLocked: false },
      { key: 'developer-profile', position: 2, title: 'Set Up Your Developer Profile', description: 'Create your profile and personalise your path', estimatedMinutes: 8, completionRule: 'profile_setup', isCompleted: false, isLocked: true },
      { key: 'explore-paths', position: 3, title: 'Explore the Learning Paths', description: 'Understand the 10-level journey and key outcomes', estimatedMinutes: 7, completionRule: 'path_exploration', isCompleted: false, isLocked: true },
      { key: 'plan-career', position: 4, title: 'Plan Your Tech Career', description: 'Set your goals and unlock the next level', estimatedMinutes: 10, completionRule: 'path_finalization', isCompleted: false, isLocked: true },
    ],
  };
  return {
    currentRoute: { path: 'home', query: {} },
    navigate: vi.fn(),
    triggerToast: vi.fn(),
    run: vi.fn(async (fn) => fn()),
    refresh: vi.fn(async () => undefined),
    explorePath: vi.fn(async () => undefined),
    finalizePath: vi.fn(async () => undefined),
    switchPath: vi.fn(async () => undefined),
    setMobileMenuOpen: vi.fn(),
    mobileMenuOpen: false,
    milestones,
    currentLevel: milestones.find((m) => m.status === 'current')?.level ?? 1,
    paths,
    selectedPath: null,
    finalizedPathId: null,
    career: null,
    stageModules,
    journey: { levels: [{ number: 1, rewardXp: 25, badge: 'Discover', state: 'available' }] },
    gamification: { totalXp: 2450, platformLevel: 3, xpForCurrentLevel: 1200, xpForNextLevel: 3000, streakDays: 12 },
    xp: 2450,
    dashboard: { preferences: { journey_view: 'map', leaderboard_visible: false, public_name: '' }, announcements: [], upcomingEvents: [], leaderboard: { items: [], me: null } },
    displayName: 'Gautam Verma',
    ...over,
  };
}
