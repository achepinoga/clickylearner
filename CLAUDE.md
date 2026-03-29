# CLAUDE.md

## Project Context

This repo is a study typing app with:

- `client/`: Vite + React frontend
- `server/`: Express backend
- `framer-motion`: primary animation library already used throughout the app
- `gsap`, `three`, `matter-js`: available, but only use them for an intro if there is a clear visual reason

The app entry point is `client/src/App.jsx`. The UI already uses staged transitions and `AnimatePresence`, so the intro animation should plug into that existing pattern instead of introducing a separate animation system unless necessary.

## Goal

Create an intro animation for the app that:

- feels intentional and premium
- matches the existing visual language of Clickylearner
- does not slow down first interaction
- works on desktop and mobile
- respects reduced-motion preferences

The intro should act like a short branded prelude before the user lands on the current app flow.

## Recommended Approach

Prefer a lightweight React + `framer-motion` intro overlay rather than a canvas-heavy boot sequence.

Recommended structure:

1. Add a top-level intro state in `client/src/App.jsx`.
2. Render an `IntroOverlay` component before the main staged app content.
3. Use `AnimatePresence` so the intro exits cleanly into the existing `GameMode` screen.
4. Keep the total sequence around `1200ms` to `1800ms`.
5. Allow skip on click, key press, or once the timer completes.

This app already has strong animated surfaces in:

- `client/src/App.jsx`
- `client/src/components/GameMode.jsx`
- `client/src/components/Upload.jsx`
- `client/src/components/Typer.jsx`
- `client/src/components/Results.jsx`

The intro should feel like the front door to those screens, not a separate visual product.

## Best Fit For This Repo

The most compatible intro for this project is:

- a dark atmospheric full-screen overlay
- logo mark reveal first
- logo text `Clickylearner` resolving second
- subtle grid/snow/scanline background motion
- one accent pulse or shimmer
- fade/blur lift into the existing home screen

Good motion stack:

- background drift
- logo scale-in
- text tracking/opacity reveal
- brief connector line or progress-bar sweep
- clean fade out

Avoid:

- long cinematic intros
- loud particle systems that block rendering
- 3D scenes unless the user explicitly wants a dramatic landing page
- duplicated transitions that fight with `App.jsx` page transitions

## Files To Create Or Edit

Primary implementation path:

- create `client/src/components/IntroOverlay.jsx`
- create `client/src/components/IntroOverlay.css`
- update `client/src/App.jsx`

Optional reuse candidates:

- `client/src/components/ShapeGrid/ShapeGrid.jsx`
- `client/src/components/PixelSnow/PixelSnow.jsx`
- `client/src/components/TextType/TextType.jsx`
- `client/src/components/RecallTransition.jsx`

These optional components should be reused only if they materially improve the intro without making startup fragile or heavy.

## Integration Plan

### 1. Add Intro State In `App.jsx`

Add state such as:

- `showIntro`
- `introComplete`

Recommended initialization:

- show intro on first load of the session
- optionally persist dismissal in `sessionStorage`

Example behavior:

- first visit in tab: intro plays
- refresh or return in same tab: intro can be skipped

If you want it to play every time, keep it purely in component state and do not persist it.

### 2. Gate Main Content

In `App.jsx`, render:

- intro overlay first
- existing app layout behind it or after it

Preferred behavior:

- render the main app behind the intro so exit feels seamless
- prevent interaction until intro completes

### 3. Build `IntroOverlay`

The component should:

- mount full-screen
- animate in automatically
- expose `onComplete`
- support `onSkip`
- clean itself up without leaving timers/listeners behind

Suggested content hierarchy:

- animated background
- centered logo mark
- app name
- short micro-tagline such as `type to remember`

### 4. Exit Into Existing Flow

When the intro finishes:

- fade opacity out
- slightly blur or lift the overlay
- reveal the current `GameMode` stage underneath

Do not also trigger a second large entrance animation on the same exact elements unless coordinated carefully.

## Motion Guidance

Use `framer-motion` variants and short, layered timing.

Suggested sequence:

1. Overlay fades in: `0ms - 250ms`
2. Background motif appears: `100ms - 600ms`
3. Logo mark scales in: `250ms - 700ms`
4. Wordmark reveals: `500ms - 1000ms`
5. Accent sweep or pulse: `900ms - 1250ms`
6. Overlay fades out: `1200ms - 1600ms`

Preferred easing:

- `easeOut`
- custom cubic curves similar to the ones already used in `App.jsx`

Keep transforms simple:

- `opacity`
- `y`
- `scale`
- `filter: blur()`

These are already consistent with the rest of the app.

## Visual Direction

Use the existing app identity:

- dark background
- white or near-white typography
- restrained glow
- minimal but sharp geometric accents

Recommended background ideas:

- soft radial glow
- subtle moving grid
- dim scanline pass
- sparse floating dust or snow

Recommended logo treatment:

- use `client/public/logo.png`
- pair image reveal with text fade

Avoid making the intro feel like a game splash screen unless the whole product is being pushed in that direction.

## Performance Rules

The intro must not degrade startup quality.

Rules:

- prefer CSS + `framer-motion` over WebGL
- no expensive per-frame layout work
- no large image sequences
- no continuous background effect after the intro ends unless intentionally reused elsewhere
- clean up timers and listeners in `useEffect`

If using `PixelSnow` or another animated background:

- keep it subtle
- test lower-end devices
- ensure it can be disabled for reduced motion

## Accessibility Rules

Always support reduced motion.

Implementation expectations:

- use `useReducedMotion` from `framer-motion`
- shorten or remove transforms for users who prefer reduced motion
- allow click or key skip
- do not trap focus
- do not autoplay sound

Reduced-motion fallback:

- static background
- instant logo/text appearance
- fast fade to app

## Suggested Component Shape

Use a component contract like:

```jsx
export default function IntroOverlay({ onComplete }) {
  // timer + skip handling
  // reduced motion handling
  // animation markup
}
```

Useful internal pieces:

- `isExiting`
- `prefersReducedMotion`
- `handleSkip`

## Suggested CSS Concerns

Your `IntroOverlay.css` should define:

- full-screen positioning
- layered background
- logo block layout
- controlled glow
- responsive typography
- safe mobile spacing

Suggested class areas:

- `.intro-overlay`
- `.intro-backdrop`
- `.intro-grid`
- `.intro-center`
- `.intro-logo`
- `.intro-wordmark`
- `.intro-tagline`

## Concrete Implementation Notes For This Codebase

When editing `client/src/App.jsx`:

- keep the existing stage model intact
- do not entangle intro completion with auth/session fetching
- do not block localStorage restoration of notes/settings/results
- keep intro state independent from `stage`

That means:

- intro is a presentation layer concern
- app stage remains a product flow concern

This separation will keep the app maintainable.

## Recommended First Version

Build version 1 like this:

- full-screen dark overlay
- logo image fades and scales in
- `Clickylearner` text reveals with slight upward motion
- thin glowing line sweeps beneath the wordmark
- optional subtitle: `type to remember`
- overlay fades away into `GameMode`

This is enough to feel polished without creating technical debt.

## Optional Version 2 Enhancements

If version 1 is successful, consider:

- using `ShapeGrid` as a faint moving background
- using `TextType` for the tagline
- reusing `RecallTransition` scanline ideas for the exit
- adding a single keyboard hint like `press any key`

Only add these if they improve clarity and style. Do not add motion for its own sake.

## Acceptance Criteria

The intro is complete when:

- it plays smoothly on app load
- it exits cleanly into the existing home screen
- it can be skipped
- it respects reduced motion
- it does not break mobile layout
- it does not introduce startup lag
- the code remains isolated to a small number of files

## What Not To Do

Do not:

- rewrite the app around the intro
- add server involvement
- attach intro state to Supabase auth state
- use OpenAI for the intro
- add sound by default
- build a large 3D scene unless explicitly requested

## If Asked To Implement It

If the next task is implementation, follow this order:

1. Create `IntroOverlay.jsx`
2. Create `IntroOverlay.css`
3. Wire it into `App.jsx`
4. Test skip behavior
5. Test reduced motion
6. Test desktop and mobile
7. Adjust timing to avoid overlap with existing page transitions

## Light Mode Goal

Create a light mode for this app that preserves the exact same product identity as the current dark mode.

Non-negotiable requirement:

- dark mode must remain visually unchanged
- light mode must keep the same layout, spacing, typography, motion, borders, shadows, and component structure
- the only intended difference is color treatment
- the logo must not be recolored or restyled

For this project, "looks the same" means:

- same composition
- same hierarchy
- same rhythm
- same interaction states
- same animation timing
- same component density

The light mode is not a redesign. It is a palette translation.

## Core Rule

Do not edit the dark mode design directly.

Instead:

1. Preserve the current dark values as the `dark` theme source of truth.
2. Introduce a parallel `light` theme using semantic CSS variables.
3. Migrate hardcoded dark colors to variables.
4. Switch theme by changing tokens, not by changing component geometry.

If a style change affects shape, spacing, sizing, animation, or logo appearance, it is the wrong change.

## Best Approach For This Repo

This codebase already has a partial token layer in `client/src/index.css`, but many component CSS files still contain hardcoded dark colors like:

- `#000`
- `#080808`
- `#111`
- `rgba(255, 255, 255, ...)`
- fixed amber / green / red literals

Because of that, the correct implementation is:

- centralize theme tokens in `client/src/index.css`
- attach the theme at the document or app root using `data-theme`
- replace hardcoded component colors with semantic variables

Do not:

- use CSS `filter: invert()`
- create a second copy of every stylesheet
- fork components just for theme
- patch only the obvious screens and leave dialogs/tests/history inconsistent

## Files That Should Drive The Theme

Primary files:

- `client/src/index.css`
- `client/src/App.jsx`
- `client/src/components/SettingsModal.jsx`

Component CSS files that likely need token cleanup:

- `client/src/App.css`
- `client/src/components/AuthModal.css`
- `client/src/components/Upload.css`
- `client/src/components/Typer.css`
- `client/src/components/SpeedTyper.css`
- `client/src/components/Results.css`
- `client/src/components/GameMode.css`
- `client/src/components/FlashcardsPage.css`
- `client/src/components/HistoryPanel.css`
- `client/src/components/FlashcardTest.css`
- `client/src/components/SettingsModal.css`
- `client/src/components/RecallTransition.css`
- `client/src/components/IntroOverlay.css` if the intro remains part of the product flow

## Theme Architecture

Use one theme attribute at the root:

- `document.documentElement.dataset.theme = 'dark'`
- `document.documentElement.dataset.theme = 'light'`

Recommended source of truth:

- store the selected theme in React state in `client/src/App.jsx`
- persist it in `localStorage`, for example `cl_theme`
- sync the root `data-theme` attribute in an effect

Recommended state shape:

- `theme`
- `setTheme`

Recommended default:

- default to `dark`
- restore from `localStorage` if present

This keeps dark mode unchanged while allowing light mode to be introduced cleanly.

## Required Token Strategy

You need semantic variables, not one-off hex swaps.

Keep existing dark-mode values as the `dark` token set, then define a `light` token set with the same semantic names.

At minimum, define tokens for:

- page background
- primary surface
- secondary surface
- glass background
- glass border
- regular border
- hover border
- primary text
- muted text
- accent
- accent glow
- correct state
- incorrect state
- warning
- warning background
- success glow
- scrollbar thumb
- panel shadow
- overlay background
- subtle highlight lines
- disabled text
- pending text

Do not rely only on:

- `--bg`
- `--surface`
- `--text`
- `--accent`

That is not enough for this app because many UI states depend on alpha-treated borders, panel depth, and status colors.

## Recommended Token Shape

Use a structure like this in `client/src/index.css`:

```css
:root,
[data-theme="dark"] {
  --bg: #000000;
  --surface: #080808;
  --surface-2: #0f0f0f;
  --surface-3: #111111;
  --overlay: rgba(0, 0, 0, 0.7);
  --glass: rgba(255, 255, 255, 0.02);
  --glass-border: rgba(255, 255, 255, 0.1);
  --border-soft: rgba(255, 255, 255, 0.08);
  --border: rgba(255, 255, 255, 0.12);
  --border-strong: rgba(255, 255, 255, 0.2);
  --border-hover: rgba(255, 255, 255, 0.35);
  --text: #ffffff;
  --text-dim: #444444;
  --text-faint: rgba(255, 255, 255, 0.18);
  --accent: #ffffff;
  --accent-glow: rgba(255, 255, 255, 0.15);
  --correct: #ffffff;
  --incorrect: #ff4444;
  --warning: #f59e0b;
  --success: #34d399;
  --panel-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

[data-theme="light"] {
  --bg: #f6f4ef;
  --surface: #fffdf8;
  --surface-2: #f2eee6;
  --surface-3: #ebe5db;
  --overlay: rgba(245, 241, 233, 0.76);
  --glass: rgba(17, 17, 17, 0.025);
  --glass-border: rgba(17, 17, 17, 0.08);
  --border-soft: rgba(17, 17, 17, 0.06);
  --border: rgba(17, 17, 17, 0.12);
  --border-strong: rgba(17, 17, 17, 0.18);
  --border-hover: rgba(17, 17, 17, 0.28);
  --text: #141414;
  --text-dim: #6a655d;
  --text-faint: rgba(20, 20, 20, 0.28);
  --accent: #141414;
  --accent-glow: rgba(20, 20, 20, 0.12);
  --correct: #141414;
  --incorrect: #d63d3d;
  --warning: #b7791f;
  --success: #1f9d6a;
  --panel-shadow: 0 10px 32px rgba(32, 24, 16, 0.12);
}
```

The exact light palette can change, but the intent should remain:

- warm paper background
- dark ink foreground
- restrained glow
- same contrast logic as dark mode

## Logo Rule

The logo must remain unchanged across themes.

For this repo, treat both of these as part of the logo:

- the image mark
- the `Clickylearner` wordmark

That means:

- do not recolor `client/public/logo.png`
- do not remap the logo text to the light theme accent if that changes its appearance
- keep the current logo styling visually identical in both themes

If needed, hard-pin logo styling to the current dark-mode visual values rather than theme variables.

This is the one deliberate exception to the palette swap.

## Implementation Rules

When implementing light mode:

1. Add theme state in `client/src/App.jsx`.
2. Persist it in `localStorage`.
3. Apply a root `data-theme` attribute.
4. Add a theme toggle in `client/src/components/SettingsModal.jsx`.
5. Move all reusable color decisions into semantic variables.
6. Replace hardcoded dark values in component CSS with theme tokens.
7. Leave all non-color styling alone.

The toggle belongs in settings, not as a floating redesign element.

## How To Replace Existing Colors

When you find this pattern:

- `background: #080808`
- `border: 1px solid rgba(255,255,255,0.12)`
- `color: #fff`

Do not directly invent new per-file light values.

Instead:

1. create or choose a semantic token
2. map the current dark value to the dark token
3. define the light counterpart once
4. replace the component style with the token

Example:

```css
background: var(--surface);
border: 1px solid var(--border);
color: var(--text);
```

That is the correct migration path.

## Status Colors

Some colors are semantic and should remain semantically consistent across themes:

- success
- error
- warning
- score grades
- quiz right/wrong states
- flashcard recall emphasis

Do not blindly invert them.

Instead:

- keep the same hue family
- slightly tune depth and alpha for the light background
- preserve visual priority relative to the surrounding UI

For example:

- red stays red, but the background wash and border alpha should be lighter and cleaner in light mode
- amber stays amber, but must not overpower the page
- green success glows should be reduced so they do not bloom too hard on a pale surface

## Light Mode Must Mirror Dark Mode

These things must stay identical between themes:

- spacing
- sizing
- border thickness
- shape language
- hover behavior
- focus behavior
- animation durations
- page flow
- component hierarchy
- copy

Only these things should change:

- background colors
- surface colors
- border colors
- text colors
- glow values
- alpha overlays
- status color tuning

## Settings Integration

Add a setting for theme selection in `client/src/components/SettingsModal.jsx`.

Preferred UX:

- `Theme`
- options: `Dark` and `Light`

Implementation expectations:

- theme change should be instant
- selection should persist
- dark remains default

Do not:

- hide the toggle somewhere unrelated
- create a separate page for theme
- require reload

## Important Constraint For This App

This app uses a very high amount of monochrome borders, transparent fills, and glow-based emphasis.

That means light mode will fail if you only switch:

- page background
- text color
- accent color

You must also retune:

- all `rgba(255,255,255,...)` borders
- all near-black panel backgrounds
- all shadows designed for black surfaces
- all faint pending text colors
- all overlay backdrops

Without that, light mode will look washed out, too faint, or visually broken.

## Suggested Light Palette Direction

Do not build a pure white clinical theme.

Better direction for this app:

- paper-like background
- soft ivory surfaces
- charcoal text
- subtle graphite borders
- warm gray secondary text

This preserves the editorial / terminal-like feel of the current UI much better than flat white.

## Testing Checklist

A light mode implementation is not finished until all of these are checked:

- `GameMode`
- `Upload`
- `Typer`
- `SpeedTyper`
- `Results`
- `FlashcardTest`
- `FlashcardsPage`
- `HistoryPanel`
- `AuthModal`
- `SettingsModal`
- intro overlay if still active

Check each for:

- default state
- hover state
- active state
- disabled state
- error state
- success state
- mobile layout

## Acceptance Criteria

The light mode is complete when:

- dark mode looks exactly as it did before
- light mode keeps the same design language and layout
- the logo is unchanged in both themes
- all major screens and modals are themed consistently
- there are no stray hardcoded dark backgrounds in light mode
- there are no unreadable low-contrast text areas
- theme choice persists across reloads

## What Not To Do For Light Mode

Do not:

- redesign the app
- swap fonts
- soften or round the UI differently
- restyle the logo
- rely on automatic inversion
- create a separate light-only component tree
- leave component-level hardcoded dark colors in place
- change dark mode values while introducing light mode

## If Asked To Implement Light Mode

Follow this order:

1. Add theme state and persistence in `client/src/App.jsx`.
2. Apply `data-theme` at the root.
3. Expand `client/src/index.css` into full dark and light token sets.
4. Add the theme control to `client/src/components/SettingsModal.jsx`.
5. Convert shared app-level styles in `client/src/App.css`.
6. Convert component CSS files from hardcoded colors to tokens.
7. Lock the logo styling so it remains unchanged across themes.
8. Test every mode and modal in both themes.
