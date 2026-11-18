# Teklozy frontend

React 18 + Vite single-page app for the Teklozy career journey: the Home map, the 10 level pages, Stage 2 lessons and tickets, the DSA and AI tunnels, and CodeLab.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (vitest)
npm run build      # production build in dist/
```

The app calls the backend at `/api/v1`. In development Vite proxies `/api` to `TEKLOZY_BACKEND_URL` (default `http://127.0.0.1:3000`); copy `.env.example` to `.env` to change it.

**Guest preview** works without the backend: press "Enter Guest Workspace" on the sign-in page (or sign in as `guest@teklozy.demo` / `TeklozyGuest@2026`). Every API call is then answered in the browser by `src/lib/demoBackend.js`, using the curriculum in `src/lib/curriculumData.js` (generated from the backend's registries), with progress saved in localStorage. Nothing is locked, so the whole workflow can be tested.

## Layout

| Path | What it holds |
| --- | --- |
| `src/main.jsx` | App shell, route table, sidebar/topbar layout |
| `src/router.js` | Hash router (`#/home`, `#/level/2`, `#/stage2/lesson?...`) |
| `src/context/AppContext.jsx` | Session, journey, progress and navigation state |
| `src/lib/api.js` | Backend client (routes to the demo backend in guest preview) |
| `src/pages/` | One component per screen |
| `src/components/stage/` | Shared stage frame (scene, panel slide), stage parts, lesson player |
| `src/components/journey/` | Map markers, progress bar, list view, locked-level modal |
| `src/components/shared/` | Loading/error/empty states, badges, progress, modal |
| `src/utils/journey.js` | Level/stage helpers (names, art, unlock rules) |
| `src/style.css`, `src/stage2.css` | Base styles, ticket/lab styles |
| `src/styles/tokens.css`, `src/styles/redesign.css` | Design tokens and the current design |
| `public/illustrations/` | Map, stage scenes, badges and card art |
| `tests/unit/` | Vitest + Testing Library tests |
