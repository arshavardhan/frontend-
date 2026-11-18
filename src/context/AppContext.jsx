import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { parseRoute, navigate as routerNavigate } from '../router';
import { api, auth, ApiError, errorMessage } from '../lib/api';
import { resetDemo } from '../lib/demoBackend';
import { toPath, LEVEL_NAMES } from '../lib/pathVisuals';
import { Code2, Sparkles } from 'lucide-react';

const PUBLIC_ROUTES = new Set(['signin', 'reset-password']);
const EXPLORING_KEY = 'teklozyExploringPath';

const DEFAULT_PATHS = [
  {
    id: 'software-development',
    name: 'Development',
    title: 'Software Engineering & Full-Stack',
    desc: 'Master how modern web software is designed, engineered, tested and deployed at scale.',
    icon: Code2,
    badge: 'SOFTWARE ENGINEERING',
    modulesCount: 8,
    estimatedTime: '2.0 hrs',
    totalXp: 500,
    tags: ['React & TypeScript', 'Node.js & Python', 'Databases & SQL', 'CI/CD & Cloud'],
    skills: ['Frontend Architecture', 'REST & GraphQL APIs', 'Database Schemas', 'Cloud Deployment'],
    modules: [
      { id: 'dev-1', title: 'The Modern Web — How the Internet Actually Works', desc: 'Understand clients, servers, HTTP/3, and distributed cloud systems.', duration: '6 min', type: 'Video', xp: 125 },
      { id: 'dev-2', title: 'Component Architecture & Declarative UI', desc: 'Design systems, state management, and component trees.', duration: '4 min', type: 'Visual', xp: 125 },
      { id: 'dev-3', title: 'Why Full-Stack Engineering Matters', desc: 'Connect database models, business logic and client applications.', duration: '4 min', type: 'Reading', xp: 125 },
      { id: 'dev-4', title: 'Production APIs & Data Flows', desc: 'Build performant endpoints, relational schemas, and indexing strategies.', duration: '5 min', type: 'Reading', xp: 125 },
      { id: 'dev-5', title: 'Deployment, CI/CD & Cloud Infrastructure', desc: 'Containerization with Docker, automated pipelines, and cloud hosting.', duration: '7 min', type: 'Video', xp: 125 }
    ]
  },
  {
    id: 'ai-engineering',
    name: 'Artificial Intelligence',
    title: 'Introduction to AI & Intelligent Systems',
    desc: 'Discover how machine learning models learn from data, reason with LLMs and automate complex workflows.',
    icon: Sparkles,
    badge: 'INTELLIGENCE SYSTEMS',
    modulesCount: 5,
    estimatedTime: '22 min',
    totalXp: 625,
    tags: ['Machine Learning', 'Deep Learning', 'Generative AI & LLMs', 'Agentic AI'],
    skills: ['Statistical Learning', 'Neural Network Architectures', 'LLM Prompt Engineering', 'Autonomous Agents'],
    modules: [
      { id: 'ai-1', title: 'The Big Question — Why Are We Building Machines That Can Think?', desc: 'The fundamental idea behind intelligent machines and why this question started the AI journey.', duration: '6 min', type: 'Video', xp: 125 },
      { id: 'ai-2', title: 'What is AI?', desc: 'Defining intelligence, algorithmic reasoning, and the shift from rules to pattern recognition.', duration: '3 min', type: 'Visual', xp: 125 },
      { id: 'ai-3', title: 'Why AI Exists?', desc: 'AI was created to help solve real-world problems that are too complex, repetitive or time-consuming for humans.', duration: '4 min', type: 'Reading', xp: 125 },
      { id: 'ai-4', title: 'AI Around You', desc: 'Explore recommendations, search algorithms, autonomous perception and conversational intelligence in daily life.', duration: '4 min', type: 'Reading', xp: 125 },
      { id: 'ai-5', title: 'How AI Learns?', desc: 'Discover how neural networks process training datasets, optimize loss functions, and make predictions.', duration: '5 min', type: 'Video', xp: 125 }
    ]
  }
];

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentRoute, setCurrentRoute] = useState(() => parseRoute());
  useEffect(() => {
    const handle = () => {
      setCurrentRoute(parseRoute());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('hashchange', handle);
    window.addEventListener('popstate', handle);
    return () => {
      window.removeEventListener('hashchange', handle);
      window.removeEventListener('popstate', handle);
    };
  }, []);
  const navigate = useCallback((path, q = {}, replace = false) => routerNavigate(path, q, replace), []);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const triggerToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((m) => (m === msg ? '' : m)), 3600);
  }, []);

  const [authState, setAuthState] = useState('loading');
  const [user, setUser] = useState(null);
  const [paths, setPaths] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [career, setCareer] = useState(null);
  const [stageModules, setStageModules] = useState(null);
  const [stage2, setStage2] = useState(null);
  const [stage2Error, setStage2Error] = useState('');
  const [stage2Progress, setStage2Progress] = useState(null);
  const [exploringId, setExploringId] = useState(() => localStorage.getItem(EXPLORING_KEY) || 'software-development');
  const [guestXp, setGuestXp] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('teklozyGuestProgress') || '{}');
      return saved.xp || 2700;
    } catch {
      return 2700;
    }
  });
  const [apiStatus, setApiStatus] = useState('checking');
  const loading = useRef(false);

  /** Reloads everything the shell shows. Each call is independent so one failure does not blank the app. */
  const refresh = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const [pathItems, dash, careerState, modules, batch] = await Promise.all([
        api.get('pathways').catch(() => null),
        api.get('dashboard').catch(() => null),
        api.get('careers/me').catch(() => null),
        api.get('journey/stage-modules', { number: 1 }).catch(() => null),
        api.get('stage2/batches/me').then(
          (value) => { setStage2Error(''); return value; },
          (error) => { setStage2Error(errorMessage(error)); return null; },
        ),
      ]);
      if (pathItems?.items?.length) setPaths(pathItems.items.map(toPath));
      if (dash) setDashboard(dash);
      if (careerState) setCareer(careerState);
      if (modules) setStageModules(modules);
      if (batch) setStage2(batch);
      if (batch?.enrolled && batch.batch?.id) {
        const progress = await api.get('stage2/progress', { batchId: batch.batch.id }).catch(() => null);
        if (progress) setStage2Progress(progress);
      }
    } finally {
      loading.current = false;
    }
  }, []);

  const loadSession = useCallback(async () => {
    // Guest workspace: the in-browser demo API answers every call, so the full journey works offline.
    if (localStorage.getItem('teklozyGuestSession') === 'true') {
      const me = await api.get('me');
      setUser(me);
      setAuthState('signed-in');
      setApiStatus('guest');
      await refresh();
      return me;
    }

    try {
      const me = await api.get('me');
      setUser(me);
      setAuthState('signed-in');
      setApiStatus('connected');
      await refresh();
      return me;
    } catch (error) {
      setUser(null);
      setAuthState('signed-out');
      setApiStatus(error instanceof ApiError && (error.status === 0 || error.status >= 500) ? 'offline' : 'connected');
      return null;
    }
  }, [refresh]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Any API call that comes back 401 means the session expired: drop to the sign-in screen once.
  useEffect(() => {
    const onExpired = () => {
      if (authState !== 'signed-in') return;
      if (localStorage.getItem('teklozyGuestSession') === 'true') return; // guest session does not expire
      setUser(null);
      setAuthState('signed-out');
      triggerToast('Your session ended. Please sign in again.');
    };
    window.addEventListener('teklozy:session-expired', onExpired);
    return () => window.removeEventListener('teklozy:session-expired', onExpired);
  }, [authState, triggerToast]);

  // Route guard: public pages only when signed out; everything else needs a session.
  useEffect(() => {
    if (authState === 'loading') return;
    const path = currentRoute.path;
    if (authState === 'signed-out' && !PUBLIC_ROUTES.has(path)) navigate('signin', {}, true);
    if (authState === 'signed-in' && (path === 'signin' || !window.location.hash || window.location.hash === '#/'))
      navigate('home', {}, true);
  }, [authState, currentRoute.path, navigate]);

  const signIn = useCallback(
    async (email, password) => {
      await auth.signIn(email, password);
      const me = await loadSession();
      if (!me) throw new ApiError(0, 'SESSION_CHECK_FAILED', 'The server could not load your account. Try signing in again.');
      triggerToast(`Welcome back, ${me.name.split(' ')[0]}!`);
      return me;
    },
    [loadSession, triggerToast],
  );

  const loginAsGuest = useCallback(async () => {
    localStorage.setItem('teklozyGuestSession', 'true');
    localStorage.removeItem('teklozyGuestProgress');
    const me = await loadSession();
    triggerToast('Welcome to Teklozy! Your guest progress is saved in this browser.');
    navigate('home');
    return me;
  }, [loadSession, navigate, triggerToast]);

  const logout = useCallback(async () => {
    const wasGuest = localStorage.getItem('teklozyGuestSession') === 'true';
    localStorage.removeItem('teklozyGuestSession');
    if (wasGuest) resetDemo();
    localStorage.removeItem('teklozyUserId');
    localStorage.removeItem('teklozyUserName');
    localStorage.removeItem('teklozyUserEmail');
    if (!wasGuest) await auth.signOut().catch(() => undefined);
    setUser(null);
    setDashboard(null);
    setCareer(null);
    setStageModules(null);
    setStage2(null);
    setStage2Progress(null);
    setStage2Error('');
    setAuthState('signed-out');
    triggerToast('Signed out successfully.');
    navigate('signin');
  }, [navigate, triggerToast]);

  /** Runs a backend action, shows its error as a toast, and refreshes the shell on success. */
  const run = useCallback(
    async (action, success) => {
      try {
        const result = await action();
        if (success) triggerToast(success);
        await refresh();
        return result;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) await loadSession();
        triggerToast(errorMessage(error));
        throw error;
      }
    },
    [refresh, loadSession, triggerToast],
  );

  /** Development is the one career path (AI lives on as an optional tunnel). */
  const MAIN_PATH = 'software-development';
  const effectivePaths = useMemo(() => {
    const list = paths && paths.length > 0 ? paths : DEFAULT_PATHS;
    const main = list.filter((p) => p.id === MAIN_PATH);
    return main.length ? main : list;
  }, [paths]);
  /** Every path, for supported old course links such as #/path/ai-engineering. */
  const allPaths = useMemo(() => (paths && paths.length > 0 ? paths : DEFAULT_PATHS), [paths]);

  const finalizedId = career?.activeCareerPath?.id ?? null;
  const selectedPath = useMemo(
    () =>
      effectivePaths.find((p) => p.id === (finalizedId || exploringId) || p.kind === (finalizedId || exploringId)) ??
      effectivePaths[0],
    [effectivePaths, finalizedId, exploringId],
  );

  /** Opens a path's Discover content (exploring both paths is allowed before finalizing). */
  const explorePath = useCallback(
    async (pathwayId) => {
      setExploringId(pathwayId);
      localStorage.setItem(EXPLORING_KEY, pathwayId);
      await api.post('journey/enrollment', { pathwayId }).catch((error) => {
        if (!(error instanceof ApiError && error.status === 409)) throw error;
      });
    },
    [],
  );
  const finalizePath = useCallback(
    (pathwayId) => run(() => api.post('careers/finalize', { pathwayId, confirm: true }), 'Career path saved. Your 48-hour switch window has started.'),
    [run],
  );
  const switchPath = useCallback(
    (targetCareerPathId) =>
      run(
        () => api.post('careers/switch', { targetCareerPathId, requestId: crypto.randomUUID(), confirm: true }),
        'Career path switched.',
      ),
    [run],
  );

  const journey = dashboard?.journey ?? null;
  const gamification = dashboard?.gamification ?? null;
  const xp = gamification?.totalXp ?? 0;

  const awardXp = useCallback((amount) => {
    setGuestXp((prev) => {
      const next = prev + amount;
      try {
        const guestProgress = JSON.parse(localStorage.getItem('teklozyGuestProgress') || '{}');
        guestProgress.xp = next;
        localStorage.setItem('teklozyGuestProgress', JSON.stringify(guestProgress));
      } catch (e) {}
      return next;
    });
  }, []);

  /**
   * Ten home-map levels. Level 1 comes from the journey, Level 2 from Stage 2 eligibility; any
   * level the backend reports as completed/available is respected.
   */
  const milestones = useMemo(() => {
    const level1 = journey?.levels?.find((l) => l.number === 1);
    const level1Done = level1?.state === 'completed' || Boolean(stage2?.enrolled);
    const list = [];
    for (const m of LEVEL_NAMES) {
      const backend = journey?.levels?.find((l) => l.number === m.level);
      const prev = list[list.length - 1];
      let status = 'locked';
      if (m.level === 1) status = level1Done ? 'completed' : 'current';
      else if (backend?.state === 'completed') status = 'completed';
      else if (m.level === 2) status = level1Done ? 'current' : 'locked';
      else if (prev?.status === 'completed' && backend?.state === 'available') status = 'current';
      // The guest preview is for testing the whole journey: nothing on the map is locked.
      if (status === 'locked' && user?.id === 'guest-demo') status = 'available';
      list.push({
        ...m,
        status,
        backendState: backend?.state ?? null,
        rewardXp: backend?.rewardXp ?? 0,
        badge: backend?.badge ?? null,
        estimatedMinutes: backend?.estimatedMinutes ?? null,
      });
    }
    return list;
  }, [journey, stage2, user?.id]);

  const currentLevel = milestones.find((m) => m.status === 'current')?.level
    ?? (milestones.every((m) => m.status === 'completed') ? milestones.length : 1);

  /** Progress inside the learner's current journey level, from the stage that owns it. */
  const levelProgress = useMemo(() => {
    const current = milestones.find((m) => m.level === currentLevel);
    if (!current) return 0;
    if (current.status === 'completed') return 100;
    if (currentLevel === 1) return stageModules?.percent ?? 0;
    if (currentLevel === 2) return stage2?.enrolled ? (stage2Progress?.percent ?? 0) : 0;
    return 0;
  }, [milestones, currentLevel, stageModules, stage2, stage2Progress]);

  const value = {
    currentRoute,
    navigate,
    authState,
    user,
    displayName: user?.name ?? 'Learner',
    email: user?.email ?? '',
    xp,
    awardXp,
    gamification,
    dashboard,
    journey,
    career,
    stageModules,
    stage2,
    stage2Error,
    // The guest workspace has full access through the demo API; `isDemo` only drives the preview badge.
    isDemo: user?.id === 'guest-demo',
    paths: effectivePaths,
    allPaths,
    selectedPath,
    finalizedPathId: finalizedId,
    explorePath,
    finalizePath,
    switchPath,
    milestones,
    currentLevel,
    levelProgress,
    stage2Progress,
    refresh,
    run,
    signIn,
    loginAsGuest,
    loadSession,
    logout,
    apiStatus,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileMenuOpen,
    setMobileMenuOpen,
    toastMessage,
    triggerToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
