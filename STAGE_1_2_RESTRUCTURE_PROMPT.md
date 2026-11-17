# Frontend implementation prompt for Teklozy

Implement the Home, Stage 1 and Stage 2 redesign in `teklozyfrontend/frontend`. Use the three supplied PDFs as visual references. Their sample numbers, labels, progress and tool integrations are illustration content. Use the current API contract for all learner data and actions.

## Visual fidelity is the acceptance target

Recreate the reference screens as precisely as possible at their original desktop proportions. Treat the PDFs as visual specifications for placement, width, spacing, card density, type scale, color, shadows, icon treatment and artwork framing. Match the dominant shapes and alignment before refining decoration. Preserve the requested differences in the live build: the existing collapsible left navigation, real learner data, and the DSA and AI side quests in the old tools slot. Keep the illustrated path's full-width feel when the sidebar is collapsed.

Use the three PDFs as follows:

| Screen | Reference | Artwork and placement |
| --- | --- | --- |
| Home | Current Teklozy mountain journey | Use `public/teklozy-mountain-journey.jpg` as the map background. Preserve its full 16:9 framing and keep each interactive milestone aligned to the artwork when the map resizes. Put the streak and two side quests in a separate right rail. |
| Stage 1 Discover | `zoom in to level 1.pdf` | Use `public/illustrations/level1-scene.jpg` as the full-bleed scene. Keep the green pedestal in the lower center, the gate on the left, and the temple on the upper right. Overlay the title and back control at the upper left. Match the compact white right panel and the wide navy progress strip along the bottom. Use a localized dark overlay behind the white heading so the art remains visible. |
| Inside a path | `into the path.pdf` | Use `public/illustrations/path-hero-ai.jpg` for AI and `public/illustrations/path-hero-temple.jpg` for Development. The art runs behind the whole banner with a pale left fade for the live title and metadata. Keep the AI laptop, robot and distant temple visible on the right. Match the horizontal module row, slim Continue Learning card below it, and stacked summary cards on the right. |
| Stage 2 Foundations | `level-2.pdf` | Use `public/illustrations/level2-hero-scene.png` for the learner, glowing book and arched-window scene. Anchor it on the right of the wide navy hero. Keep the live heading and blue button on the left. Use the corresponding `level2-card1-core.png` through `level2-card4-dev.png` illustrations for the four group cards and `level2-milestone-gate.png` for the right-rail milestone card. |

Build the screens in React and CSS with the art as separate image assets. Keep headings, buttons, rewards, module counts and progress live. If a supplied asset has baked-in interface text, a visibly different crop, or insufficient resolution, source the clean original artwork first. If it is unavailable, recreate just the illustration from the matching PDF crop with the same composition, lighting, palette and focal positions. Export WebP or PNG at sufficient resolution for the rendered size. Preserve the asset's aspect ratio and use CSS positioning or a dedicated mobile crop to keep the focal subject visible. Keep decorative images out of the accessible reading order.

Render each PDF and capture the corresponding browser screen at the same aspect ratio. Compare them side by side and with a 50% overlay. Check the header, sidebar, hero bounds, artwork focal points, panel edges, card baselines and footer alignment. Iterate wherever an element is materially shifted or clipped. Capture desktop with the sidebar both expanded and collapsed, then verify tablet and phone layouts for readable text, visible controls and no horizontal overflow. Use test data matching the reference only for visual comparison. Use backend values during normal operation.

## Shared shell and Home

- Keep the current Teklozy header and collapsible left sidebar, including the mobile drawer, active destinations, and direct Stage 2 and CodeLab buttons. Carry that same navigation through the stage overviews and path detail.
- Keep the mountain journey as the main Home view and preserve the milestone list option. An available Level 1 or Level 2 marker should travel into its stage and change the URL. Respect reduced-motion preferences, and retain existing locked milestones and explanations.
- Put **Your Streak** above **Side quests** in a right rail on Home. Stack the rail below the map on smaller screens. Source the count, message and weekday states from `GET streaks/me`. Show zero as zero.
- Replace the **Connect Your Tools** card and GitHub and LeetCode controls in the Level 2 view with **DSA Tunnel** and **AI Tunnel**. Surface those same two cards on Home. Use `GET tunnels` and `GET tunnels/overview?tunnelId=` for access, module state, progress and the tunnel outline. Each tunnel has an independent route and leads back to its entry screen. Show the onboarding requirement when access is closed.

## Stage 1 and path detail

- Choose **zoom in to level 1.pdf** for the Discover overview. Put the existing temple and pedestal illustration on the left, a white learning panel on the right, and a navy journey-progress strip across the bottom. The panel should show the four backend Discover modules, a clear next action, completion count, and the actual Level 1 reward. Keep orientation, profile, path exploration and finalization actions connected to their existing flows.
- Use **into the path.pdf** for course detail. Match its illustrated banner, ordered module cards, highlighted next module, Continue Learning strip, and right stack for Path Progress, What You'll Learn and Path Outcome. Source lesson access, enrollment, completion and objectives from the journey API. The current product uses Development for the main journey and AI as an optional tunnel. Apply the PDF layout to the main path and preserve access to supported existing course URLs.
- Keep text, buttons and progress indicators as live, accessible UI over the artwork.

## Stage 2

- Use **level-2.pdf** for the foundation hero, four learning-path group cards and sidebar widgets. Use existing illustrations and live text for the heading and primary action. Bind the overview to `GET stage2/overview` and preserve its enrollment and prerequisite states.
- Populate each group with backend modules. Open module outlines, then show lesson, guided problem and challenge items in server order. Use `stage2/modules/outline`, `stage2/lessons`, `stage2/lessons/complete` and `stage2/challenges`. Use the challenge's server storage reference to open the existing written or CodeLab ticket. Keep awaiting content and locked items clearly labeled.
- Use server eligibility and requirements for the next milestone. Preserve drafts, hints, saved progress, grading and CodeLab sandbox behavior through their existing APIs.

## Local integration

Use the current backend with migrations through `021_development_path_and_tunnels.sql`. Stage 2 overview depends on `020_lesson_notes_and_tools.sql`. Migration 021 moves existing AI Basics progress into history and changes AI Basics enrollment into tunnel access. Use an up-to-date disposable database for verification. The CodeLab workspace also requires the configured Docker lab runner.

## Acceptance

- Home has a visible streak and both side quests. Stage 2 displays the same side quests in the old tools slot.
- Keyboard, browser Back, direct routes, sidebar collapse, mobile stacking and reduced motion work.
- The two stages show server progress for signed-in learners and a useful sign-in, loading or retry state when needed.
- Run the frontend production build and focused frontend tests. Verify Home to Level 1, path detail, Level 2 enrollment and module navigation, and both tunnel entry routes. Record any live service dependency that prevents end-to-end verification.
