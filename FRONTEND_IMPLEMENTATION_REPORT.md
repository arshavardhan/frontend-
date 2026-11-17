# Teklozy — Frontend Implementation Report

Date: 16 Nov 2026 · Scope: `teklozyfrontend/frontend` only. **No backend file was changed** (neither `tecklozy backend` nor `teklozyfrontend/backend`).

## 1. Existing architecture discovered

| Area | Finding |
| --- | --- |
| Framework | React 18 + Vite 6, plain JSX, `lucide-react` icons, Monaco + xterm for labs |
| Routing | Custom hash router (`src/router.js`), screen switch in `src/main.jsx` — kept |
| State | `src/context/AppContext.jsx` loads `me`, `dashboard`, `pathways`, `careers/me`, `journey/stage-modules`, `stage2/batches/me` — kept and extended |
| API | `src/lib/api.js` → `/api/v1/*` (business API) and `/api/auth/*` (Better Auth cookie session), proxied by Vite to the Next.js backend in `../../tecklozy backend` (port 3000) |
| Backend | Next.js 16 + PostgreSQL, 142 routes documented in `API_TRANSACTIONS.md`. XP is server-side only, ≤25 XP per award, idempotent ledger |
| Styling | One 160 KB `style.css` + `stage2.css` (light theme) — kept for existing pages |
| Assets | Logo PNGs, a dark night mountain image (not matching the references) |
| Tests | None in the frontend |
| Note | `teklozyfrontend/backend` (FastAPI + SQLite) is **not** used by this frontend; it was left untouched |

## 2. Files created

- `public/illustrations/` — `journey-map.jpg`, `level1-scene.jpg`, `path-hero-ai.jpg`, `path-hero-temple.jpg`, `path-art-ai.png`, `path-art-dev.svg`, `trophy-banner.png`, `hackathon-card-art.png`, `quest-tunnel.png`, `dojo-torii.jpg`
- `src/services/api/` — `client`, `users`, `learningPaths`, `levels`, `modules`, `progress`, `rewards`, `events`, `announcements`, `leaderboard`, `discussions`, `index`
- `src/components/layout/` — `TopNav`, `Sidebar` (home + journey variants), `UserXpCard`
- `src/components/shared/` — `HexBadge`, `Progress` (bar + ring), `Tabs`, `Modal`, `States` (loading/empty/error), `Avatar`
- `src/components/journey/` — `JourneyMap`, `LevelMarker`, `MarkerTooltip`, `LevelListView`, `LockedLevelModal`, `JourneyProgressBar`, `mapLayouts`, `useElementScale`, `useCoverBox`
- `src/components/dashboard/` — `AnnouncementCarousel`, `NextEvents`, `EventCard`, `Leaderboard`, `HackathonCard`, `QuestCard`
- `src/components/learning/` — `ModuleCard`, `ResourcesPanel`, `DiscussionPanel`; `src/components/rewards/RewardTiles`
- `src/features/home/HomeScreen`, `features/path-selection/{PathSelectionScreen, PathDetailScreen, ChoosePathModal, InfoModals}`, `features/journey/{LevelScreen, useLevelActions}`, `features/learning/{LearningModulePage, ModuleChrome}`, `features/common/ComingSoonScreen`
- `src/features/learning/content/` — `adapter`, `contentTypes`, `ContentRenderer`, `renderers/{Text, Video, Visual, Animation, Code, Quiz, Resource, Project}ContentRenderer`, `AssessmentForm`, `CodeEditor`
- `src/hooks/useAsync.js`, `src/utils/journey.js`
- `src/styles/` — `tokens.css`, `shell.css`, `shared.css`, `home.css`, `path.css`, `level.css`, `learning.css`
- `tests/unit/*` (Vitest), `tests/visual/{mock_api.py, shoot.py}` (Playwright visual checks), `docs/screenshots/*`

## 3. Files modified

| File | Change |
| --- | --- |
| `src/main.jsx` | New shell (TopNav + Sidebar variants) and route table; all existing routes kept |
| `src/context/AppContext.jsx` | Milestones keep backend state; later levels open from backend `completed/available`; session-expiry listener |
| `src/lib/api.js` | Dispatches `teklozy:session-expired` on 401 |
| `src/lib/pathVisuals.js` | Level names from the spec; per-path art, short names, AI brain icon |
| `src/components/VisualSections.jsx` | Exports `Section` for reuse (no behaviour change) |
| `src/pages/GenericPage.jsx` | Fix: Challenges stayed on "Loading" when opened before paths loaded |
| `package.json`, `package-lock.json`, `vite.config.js` | `npm test` (Vitest, jsdom, Testing Library — dev only) |

Old `HomePage`, `MountainMap`, `PathSelectionPage`, `PathDetailsPage`, `LessonPage`, `Topbar`, `components/Sidebar` are no longer routed but were left in place (nothing deleted).

## 4–5. Screens and components

| Screen | Route | Reference |
| --- | --- | --- |
| Home — 10-level journey | `#/home` | `home screen.pdf` — 3 columns, illustrated map, 10 live markers, Map/List view, quest card, announcements carousel, events, leaderboard, journey progress bar |
| Discover — path selection | `#/discover` | Written spec (no image supplied): hero, Learn / Explore / Choose Your Path, Development + AI cards, 4 feature cards |
| Path detail ("into the path") | `#/path/ai-engineering`, `#/path/software-development` | `into the path.pdf` — breadcrumb pill, stats, 4 module cards with connectors, Continue Learning strip, Path Progress, What You'll Learn, Path Outcome |
| Level 1 (and levels 3–10) | `#/level/1` … `#/level/10` | `zoom in to level 1.pdf` — top nav, journey sidebar + Dojo card, scene with clickable badge and Learn/Build markers, Overview/Resources/Discussion panel, rewards, progress bar |
| Learning module | `#/module?level=1&key=…`, `#/lesson?path=…&lesson=…` | Reusable module experience driven by `ContentRenderer` |
| Existing pages | `learn`, `build`, `stage2`, `stage2/ticket`, `challenges`, `profile` | Unchanged, now inside the new shell |
| Not yet in backend | `applications`, `club`, `projects`, `jobs`, `community`, `grow` | Honest "coming soon" screen (no mock data) |

**Illustrations.** The repository had no art in the reference style, and the reference PDFs are single raster images. The environments were extracted from them, the baked-in UI labels were removed with texture-aware inpainting, and live markers are overlaid at the same coordinates. Art is kept separate from components: swap an image and its coordinates in `components/journey/mapLayouts.js`. The Development path art (`path-art-dev.svg`) is original because the references only show the AI path.

## 6. Backend APIs integrated

`me`, `dashboard` (identity, journey, gamification, preferences, announcements, events, leaderboard), `pathways`, `careers`, `careers/me`, `careers/finalize`, `careers/switch`, `journey/enrollment`, `journey/level`, `journey/stage-modules`, `journey/stage-modules/complete`, `me/preferences` (GET/PATCH), `course-enrollments`, `courses/material`, `lessons/content`, `lessons/content/quick-check`, `courses/lessons/start`, `courses/lessons/complete`, `course-assessments`, `course-attempts`, `course-attempts/submit`, `events`, `events/registration`, `gamification/leaderboard?period=week|all`, `notifications`, `notifications/read`, plus the existing auth endpoints.

## 7. Features working

- All 10 markers interactive; completed/current open their level, locked ones shake and explain the unlock requirement (from backend state).
- Map/List view, saved to `user_preference.journey_view`.
- Announcement carousel (arrows, dots, autoplay), event details, register/cancel, View All, leaderboard week/all-time.
- Level 1: modules with server lock state; Start Learning opens the next available module and resumes the path course at the first unfinished lesson.
- Welcome module → `stage-modules/complete`; Developer Profile → `PATCH me/preferences`; Explore → path course; Plan Your Career → finalize dialog.
- Content rendered by type: text, video (YouTube/Vimeo/MP4), visual (all backend visual section types), animation, code (Monaco, lazy-loaded; runs in CodeLab, never in the browser), quiz (graded and practice), resource (PDF/slides/external), project (assignment, brief, in-app task). Snake_case authoring contract (`section_id`, `content_url`) accepted. Unknown types degrade gracefully.
- Progress: completion from the backend; resume position per lesson saved locally and restored on reload.
- Expired sessions return to sign-in; loading, empty and error states everywhere; responsive desktop, tablet and mobile with no horizontal page overflow.

## 8. Pending / backend gaps (not invented)

| Need | Status |
| --- | --- |
| Discussions (Q&A, comments, replies) | No backend API. Isolated in `services/api/discussions.js`; tab shows "coming soon" |
| Reward amounts in the designs (+250 / +125 / +500 XP) | Backend caps each award at 25 XP. Screens show the real backend values (e.g. +25 XP) |
| "Tech Apprentice" rank titles | Backend returns a numeric platform level only; titles are a display map in `utils/journey.js` |
| Hackathon card | Uses a published event whose title contains "Hackathon"; otherwise "Opens soon" |
| Levels 3–10 content | Show locked/"being prepared" until the backend publishes them |
| Video/reading lesson-content formats | Backend marks them "planned"; renderers are ready for when they ship |
| Profile photos | Not stored by the backend; initials avatars |
| Server-side resume position | Not in the backend; stored per browser |

## 9. Bugs identified and fixed

- Level 1 description overlapped the "Learn" marker at 1440 px and blocked clicks (found by browser flow test) — fixed.
- Challenges stayed on "Loading" when opened directly (pre-existing) — fixed.
- New heading colour rule overrode the Level 2 page's white title — fixed by zero-specificity scoping.
- Duplicate resource entries when the same material was linked to several lessons — de-duplicated.

Known: the production bundle is ~4 MB because the existing CodeLab imports Monaco eagerly (pre-existing).

## 10. Test results

- `npm test`: **35/35 passing** — adapter mapping (all resource kinds, quiz/assignment, animation, snake_case contract), journey helpers, API services (URLs, bodies, no client-sent XP, 401 expiry, network errors, discussions isolation, resume), ContentRenderer type switching, journey map/markers, Home, Level 1 (locking, Start Learning, tabs), Path selection (Explore Development / AI, Learn, Choose Your Path → finalize).
- `npm run build`: succeeds.
- Browser checks (Chrome via Playwright against a mock of the real response shapes, `tests/visual`): Home, Level 1, Path detail (AI + Development), Discover, Lesson, Welcome module at 1440–1715 px; tablet 820 px; mobile 390 px. No page-level horizontal overflow; clicked through locked-level dialog, Start Learning, tooltip, List View, Resources, mobile drawer.
- Not run here: against the live backend and database (not reachable from the build environment).

## 11. Screenshots

`docs/screenshots/`: `home.jpg`, `level1.jpg`, `path-ai.jpg`, `discover.jpg`, `lesson.jpg`, `tablet-home.jpg`, `mobile-home.jpg`, `mobile-level1.jpg`.

## 12. Run

```bash
# backend (unchanged): in "tecklozy backend"
npm run db:local      # terminal 1
npm run dev           # terminal 2 → http://localhost:3000 (BETTER_AUTH_URL=http://localhost:5173)

# frontend: in teklozyfrontend/frontend
npm install
npm run dev           # http://localhost:5173
npm test              # unit tests
```
