---
name: tour-lite
description: Add the low-power version of the guided product tour to a web app. Same steps, card and rounded spotlight as /tour, but no blur, no glide and no fades, so it stays smooth on remote desktops, dev pods, thin clients and old laptops. Use when asked for a lightweight, low-power or performant tour, when the full tour is laggy, to convert an existing tour to lite, or /tour-lite.
---

# Guided tours, lite

The same tour as [`tour`](../tour/SKILL.md), drawn the cheap way. Use it when the people taking
the tour are on machines that can't draw a full-window blur every frame.

| | `/tour` | `/tour-lite` |
| --- | --- | --- |
| Page behind | Blurred and dimmed | Dimmed only, a little darker; stays sharp |
| Between steps | Spotlight and card glide (320ms) | They jump: one repaint per step |
| Card | Glass | Solid |
| Opening, closing, step text | Fade | Instant |
| Target re-measured | Every frame | Every 120ms |
| Steps, keys, focus, `prepare`, entry points | The same | The same |

It is one engine with a switch, not a second codebase: `tour-lite` uses the files in `../tour/`.

## Hard rules

1. **Follow `../tour/SKILL.md`.** Its hard rules, workflow, [STEPS.md](../tour/STEPS.md) and
   "Never ship" table all apply. This file only lists what's different.
2. **Force it.** Pass `lite` (not `lite="auto"`). The point of asking for lite is that nobody
   sees the heavy version, even for a moment.
3. **Don't add motion back.** No transitions on the ring or card, no `backdrop-filter`, no fade
   on the dim. Small things may still animate (button press, progress dots).

## What's different in the workflow

- **Install (step 2):** the same three files from `../tour/assets/`.
- **Theme (step 3):** the tokens that matter here are `--tour-veil-lite` (the dim) and
  `--tour-surface-solid` (the card), plus the text, line and primary colours. `--tour-veil`,
  `--tour-blur`, `--tour-surface`, `--tour-edge` and `--tour-shadow` aren't used in lite.
- **Wire (step 6):**
  `{tour.open && <Tour steps={steps} index={tour.index} onIndex={tour.go} onDone={tour.finish} lite />}`
- **Verify (step 7):** run `../tour/scripts/check-tour.mjs` as usual. Its output must end with
  `Ran as: lite`.

## Converting an existing tour

If the project already has the tour, it's one prop: add `lite` to `<Tour>`. If its `Tour.tsx` has
no `lite` prop, it's an older copy: replace `Tour.tsx` and `Tour.css` with the current ones from
`../tour/assets/` (keep the project's token block), then add the prop.

## If `../tour` isn't there

This skill was installed on its own. Install the full set:

```bash
npx skills add tommyc10/tour-skill
```

Why lite is built the way it is, and the measurements: "Lite" in [CRAFT.md](../tour/CRAFT.md).
