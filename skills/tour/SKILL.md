---
name: tour
description: Add a guided product tour to a web app. The page blurs and dims, a rounded spotlight glides between real UI elements, and a glass card explains each one. Ships a tested, dependency-free React engine (Tour.tsx + Tour.css), the rules for choosing and writing steps, theming to the app's tokens, and a Playwright script that walks the tour and flags problems. Use when asked for a product tour, onboarding walkthrough, feature tour, coach marks, spotlight tutorial, "show new users around", "walk people through the UI", or /tour.
---

# Guided tours

A tour that lives inside the real frontend: it points at the actual elements people will use,
not screenshots. The page behind goes soft (blur + dim), a spotlight with rounded corners
glides from one element to the next, and a small glass card says what each one is for. It
starts once on a first visit, and can be replayed from a help button, a command or `?`.

It does ONE thing: add that tour to an existing page. It doesn't build empty-state onboarding,
checklists, or feature announcements.

## Hard rules

1. **Copy the engine, don't rewrite it.** `assets/Tour.tsx`, `Tour.css` and `useTour.ts` go in as
   they are. The rounded hole (a seven-layer CSS mask) and the glide (registered `@property`
   lengths) are exactly the parts that break when retyped from memory. Change tokens, not
   mechanics. The why of each value is in [CRAFT.md](CRAFT.md).
2. **Real elements only.** Every step targets a `data-tour="…"` element in the live page. If
   something isn't on screen, a step's `prepare` puts it there; never fake it with an image.
3. **Nothing the tour does may stick.** `prepare` returns the function that undoes it, and only
   undoes what it did itself (if the user already had the form open, leave it open). Ending the
   tour on any step leaves the page as it was.
4. **The tour has the keyboard.** While it's open, the app's global shortcut handler returns early.
   The engine makes everything else inert, but a window-level listener registered first still
   fires first.
5. **Write less.** Steps follow [STEPS.md](STEPS.md): 6–10 steps, titles ≤ 6 words, bodies ≤ 2
   sentences, one idea each. A tour nobody finishes teaches nothing.
6. **Verify in a browser before saying it's done.** Run `scripts/check-tour.mjs` and look at every
   screenshot.

## Workflow

### 1. Recon

Find, before writing anything:

- **Framework.** React 18+ uses the engine directly. Anything else: see "Not React" below.
- **The page and its pieces.** The areas a first-time user must understand, and which of them
  can be hidden (collapsed panels, drawers, forms that only appear after an action).
- **Tokens.** The app's colours for popover/menu surfaces, text, borders, primary buttons, and how
  it switches theme (class, `data-` attribute, media query).
- **Keyboard.** Where global shortcuts are handled, and which keys are free (`?` usually is).
- **Entry points.** A help menu, the user menu, a command palette: where "Take the tour" goes.

### 2. Install

Copy `assets/Tour.tsx`, `Tour.css`, `useTour.ts` into the project. A top-level `tours/` folder
keeps it portable; follow the project's convention if it has one. If it's outside `src/`, add it
to `tsconfig` `include`.

### 3. Theme

Map the `--tour-*` tokens to the app's own in one block. Don't edit the rules below the token block.
See "Theming" in [CRAFT.md](CRAFT.md) for the full list, light-theme values, and what each is for.

### 4. Mark the targets

Add `data-tour="name"` to each element a step points at: the whole region (the list, the filter
bar, the form), not a tiny child. If the same idea renders in different places at different widths
(a docked panel vs. a floating bar), put the same name on both; only one is on screen at a time.

### 5. Write the steps

Follow [STEPS.md](STEPS.md). Show the step list (target, title) in one message before wiring it in.
Steps live in their own file next to the engine (e.g. `tours/review-queue.tsx`).

### 6. Wire it

Follow `assets/example.tsx`:

- `const tour = useTour(steps.length, { storageKey: '<page>-tour' })`
- `{tour.open && <Tour steps={steps} index={tour.index} onIndex={tour.go} onDone={tour.finish} lite="auto" />}`
- `lite`: `"auto"` (recommended) shows the full tour and switches to the low-power one only if
  the first frames are slow. `true` forces low-power: use it when the app mostly runs on remote
  desktops, dev pods or thin clients. `false` (default) never switches. See "Lite" in
  [CRAFT.md](CRAFT.md).
- A `startTour()` wrapper that first puts the page in a good state (panels shown, overlays closed,
  an interesting record selected), then calls `tour.start()`.
- Gate the global shortcut handler on `tour.open`. Add `?` → `startTour`.
- Entry points: a help button ("Take the tour"), a command-palette item, and `?`.

### 7. Verify

With the dev server running:

```bash
node <skill>/scripts/check-tour.mjs --url http://localhost:5173 --out ./tour-shots
node <skill>/scripts/check-tour.mjs --url … --size 1024x768 --scheme light
node <skill>/scripts/check-tour.mjs --url … --reduced
```

It fails on steps whose target wasn't found, console errors, a tour that doesn't close, nothing
saved to `localStorage`, or anything left inert. Then **look at the screenshots**: the card
shouldn't cover the thing it describes, the ring should hug the target, and text should fit.
Test ending the tour halfway through (Esc) and check the page is exactly as it was.

## Not React

Keep `Tour.css` exactly; port `Tour.tsx`'s behaviour to the framework. It must: find the target by
`data-tour`, re-measure it every animation frame (write the four `--s*` properties only when the
rounded box changes), place the card with the same side-fallback order, render to `<body>`, make
the rest of `<body>` inert, run/undo `prepare` per step, handle → ↵ ← Esc in the capture phase,
focus Next on each step, and fade out for 180ms before unmounting.

## Never ship

| Never | Instead |
| --- | --- |
| Screenshots or a separate tour page | Spotlight the live elements |
| A rectangular hole, or `box-shadow: 0 0 0 9999px` to dim | The masked, blurred veil in `Tour.css` |
| Tweening the mask with JS every frame | Transition the registered `--s*` properties in CSS |
| Measuring once when the step starts | Re-measure every frame; targets move |
| `prepare` without an undo, or an undo that closes the user's own work | Return a cleanup that only reverses the tour's change |
| Page shortcuts firing under the tour | Gate them on `tour.open` |
| A tour that restarts on every visit | `finish()` sets the storage key |
| Titles that repeat the UI label ("The Filter Bar") | Say what it's for ("Narrow it down") |
| 15 steps | 6–10; cut to what a first-timer needs today |
| Removing the reduced-motion / reduced-transparency blocks | Keep them; they ship with it |
| The full blur on machines that can't draw it (remote desktops, dev pods) | `lite="auto"`, or `lite` if you know the audience |

## Files

- `assets/Tour.tsx`: the engine (spotlight, card, keyboard, inert, `prepare`)
- `assets/Tour.css`: the veil mask, the glide, the card, tokens, OS preferences
- `assets/useTour.ts`: open / step / first-visit state
- `assets/example.tsx`: steps built from page callbacks, and the wiring
- `scripts/check-tour.mjs`: walk the tour, screenshot every step, report problems
- [STEPS.md](STEPS.md): choosing and writing steps, `prepare`, entry points
- [CRAFT.md](CRAFT.md): every visual and motion value, and why; theming; performance
