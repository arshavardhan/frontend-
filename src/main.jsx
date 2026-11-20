import React, { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { CheckCircle2 } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import PathSelectionPage from './pages/PathSelectionPage';
import PathDetailsPage from './pages/PathDetailsPage';
import LessonPage from './pages/LessonPage';
import LearnPage from './pages/LearnPage';
import GenericPage from './pages/GenericPage';
import CodeLabPage from './pages/CodeLabPage';
import Stage2Page from './pages/Stage2Page';
import Stage2TicketPage from './pages/Stage2TicketPage';
import FoundationWorkPage from './pages/FoundationWorkPage';
import TunnelPage from './pages/TunnelPage';
import { StageFrame } from './components/stage/StageScene';
import { LoadingState } from './components/shared/States';

// The problem page carries the Monaco editor, so it loads only when a problem is opened.
const DsaProblemPage = lazy(() => import('./pages/DsaProblemPage'));
import LevelOnePage from './pages/LevelOnePage';
import LevelTwoPage from './pages/LevelTwoPage';
import StageLevelPage from './pages/StageLevelPage';
import LevelPathPage from './pages/LevelPathPage';
import DsaDungeonPage from './pages/DsaDungeonPage';
import DsaChapterPage from './pages/DsaChapterPage';
import './style.css';
import './stage2.css';
import './styles/tokens.css';
import './styles/redesign.css';
import './styles/dsa.css';

function Toast() {
  const { toastMessage } = useApp();
  if (!toastMessage) return null;
  return (
    <div className="global-toast-notification" role="status" aria-live="polite">
      <CheckCircle2 size={17} className="toast-check-icon" />
      <span className="toast-text">{toastMessage}</span>
    </div>
  );
}

/** `level/3/path` … `level/10/path`: a level's full learning path. */
const levelPathOf = (path) => /^level\/(\d+)\/path$/.exec(path)?.[1];

/** Screens from the redesign render edge to edge inside the shell. */
function viewportClass(path) {
  if (path === 'home') return 'viewport-home';
  if (path === 'tunnel/dsa' || path === 'dsa/chapter' || path === 'dsa/problem') return 'viewport-dsa';
  if (levelPathOf(path)) return 'viewport-wide';
  if (path.startsWith('level/') || path === 'stage2') return 'viewport-scene';
  if (path.startsWith('path/') || path === 'stage2/overview' || path.startsWith('tunnel/')) return 'viewport-wide';
  return '';
}

function AppContent() {
  const { currentRoute, authState } = useApp();
  const routePath = currentRoute?.path || 'home';

  if (authState === 'loading') {
    return (
      <div
        className="app-boot-screen"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#07152b',
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif',
        }}
        role="status"
        aria-live="polite"
      >
        <img src="/teklozy-logo-on-dark.png" alt="Teklozy" style={{ height: 42, marginBottom: 16 }} />
        <span style={{ fontSize: 14, color: '#94a3b8' }}>Loading your journey…</span>
      </div>
    );
  }

  // Unauthenticated standalone login view
  if (authState !== 'signed-in' || routePath === 'signin' || routePath === 'reset-password') {
    return (
      <>
        <AuthPage key={routePath} />
        <Toast />
      </>
    );
  }

  // Full-width distraction-free studio for Lesson, Path Details, and Stage 2 Ticket
  const isStudioMode = routePath === 'lesson' || routePath === 'stage2/ticket' || routePath === 'stage2/lesson' || routePath === 'dsa/problem';
  const isCodeLab = routePath === 'stage2/ticket' && currentRoute?.query?.view === 'lab';

  const renderActiveScreen = () => {
    if (routePath === 'home') return <HomePage />;
    if (routePath === 'discover') return <PathSelectionPage />;
    if (routePath.startsWith('path/')) return <PathDetailsPage key={routePath} />;
    if (routePath === 'lesson') return <LessonPage />;
    if (routePath === 'level/2' || routePath === 'stage2') return <LevelTwoPage />;
    if (routePath === 'stage2/overview') return <Stage2Page />;
    if (routePath === 'level/1') return <LevelOnePage />;
    if (levelPathOf(routePath)) return levelPathOf(routePath) === '2' ? <Stage2Page /> : <LevelPathPage key={routePath} level={Number(levelPathOf(routePath))} />;
    if (routePath.startsWith('level/')) {
      const n = Number(routePath.split('/')[1]);
      if (n >= 3 && n <= 10) return <StageLevelPage level={n} />;
      return <GenericPage type="level" />;
    }
    if (routePath === 'learn') return <LearnPage />;
    if (routePath === 'build') return <CodeLabPage />;

    if (routePath === 'stage2/module' || routePath === 'stage2/lesson') return <FoundationWorkPage key={currentRoute.raw} lesson={routePath === 'stage2/lesson'} />;
    if (routePath === 'tunnel/dsa') return <DsaDungeonPage />;
    if (routePath === 'dsa/chapter') return <DsaChapterPage key={currentRoute.raw} />;
    if (routePath === 'dsa/problem') return <Suspense fallback={<div className="dsa-page dsa-page--center"><LoadingState label="Opening the editor…" /></div>}><DsaProblemPage /></Suspense>;
    if (routePath.startsWith('tunnel/')) return <TunnelPage key={routePath} />;
    if (routePath === 'stage2/ticket') return <Stage2TicketPage key={JSON.stringify([currentRoute.query.batch, currentRoute.query.module, currentRoute.query.challenge, currentRoute.query.concept])} />;
    if (routePath === 'challenges') return <GenericPage type="challenges" />;
    if (routePath === 'profile') return <GenericPage type="profile" />;

    // Default route fallback
    return <HomePage />;
  };

  return (
    <div className={`teklozy-app-shell ${isStudioMode ? 'studio-mode' : ''}`}>
      <Topbar />

      <div className="teklozy-layout-body">
        {!isStudioMode && <Sidebar />}

        <main
          className={`teklozy-main-viewport ${isStudioMode ? 'viewport-fullwidth' : ''} ${
            isCodeLab ? 'viewport-codelab' : ''
          } ${viewportClass(routePath)}`}
        >
          {viewportClass(routePath) === 'viewport-scene' ? (
            // One persistent frame for every level: scenes crossfade and the panel slides between levels.
            <div className="route-stage is-scene" key="stage">
              <StageFrame>{renderActiveScreen()}</StageFrame>
            </div>
          ) : (
            <div className="route-stage" key={routePath}>
              {renderActiveScreen()}
            </div>
          )}
        </main>
      </div>

      <Toast />
    </div>
  );
}

function Root() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(<Root />);
}
