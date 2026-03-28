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

