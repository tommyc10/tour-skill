# Craft: how it looks, moves and performs

Every value in `Tour.css` / `Tour.tsx`, and why. Change tokens freely; change these values only
with a reason.

## The layers

| Layer | What | Why |
| --- | --- | --- |
| Veil | Full-window, `background: var(--tour-veil)` + `backdrop-filter: blur(6px) saturate(.8)`, with a rounded hole masked out | Blur says "not now" more gently than a black overlay, and the target stays sharp and fully coloured by contrast |
| Ring | 1px line + 5px faint glow, same radius as the hole | Gives the hole a crisp edge on busy backgrounds |
| Card | 340px glass: translucent surface, `blur(40px) saturate(1.8)`, 1px inner top highlight, 1px outline, deep soft shadow, 14px radius | Reads as floating above the veil without looking like a modal |

## The rounded hole

CSS can't cut a rounded rectangle out of a `backdrop-filter` layer directly. The veil uses seven
mask layers:

1. the whole window, `mask-composite: subtract`, on top;
2. a rectangle `w × (h − 2r)` and a rectangle `(w − 2r) × h`, overlapping into a plus shape;
3. four `radial-gradient` circles, `2r × 2r`, one in each corner, filling the plus into a rounded
   rectangle. The lower six combine with `add`.

`r = min(12px, w/2, h/2)` so tiny targets still get a round (not inverted) hole. The circle's edge
is `calc(100% - .5px)` → `100%` for a hair of anti-aliasing.

A zero-size hole at the window's centre means "no target": the whole page is veiled, and the next
step's hole opens out from the middle like an iris.

## The glide

`--sx --sy --sw --sh` are registered with `@property` as `<length>`. Unregistered custom
properties can't interpolate (they flip at the halfway point); registered ones transition like any
length. The veil's mask and the ring both read them, so hole and ring move as one, entirely in CSS.

| Motion | Value | Why |
| --- | --- | --- |
| Spotlight + card between steps | 320ms `cubic-bezier(0.77, 0, 0.175, 1)` | Movement across the screen gets a strong ease-in-out. Longer than everyday UI (≤ 300ms) because it's rare, first-run and explanatory: the eye has to be able to follow it |
| Veil in | opacity 0 → 1, 240ms `cubic-bezier(0.23, 1, 0.32, 1)`, via `@starting-style` | Entrances ease out; no JS mount logic needed |
| Card in | scale .96 + 6px down → rest, 240ms same ease-out | Never from `scale(0)`; small scale plus lift feels like it arrives, not pops |
| Step text | keyed per step, opacity + 4px rise, 200ms ease-out | Tells you the content changed even when the card barely moves |
| Out | everything fades, 180ms, then unmount | Exits faster than entrances |
| Buttons | press `scale(.97)` 160ms; hover colour 150ms, only on `(hover: hover) and (pointer: fine)` | Feedback without sticky hover on touch |

**Interruptions:** everything is a CSS transition, not keyframes, so pressing → three times fast
retargets smoothly from wherever it is instead of restarting.

**Reduced motion:** the spotlight and card jump; only the fades stay. **Reduced transparency:**
no blur, darker dim (`rgba(0,0,0,.6)`), solid card (`--tour-surface-solid`).

## Following the target

The engine re-measures the target with `getBoundingClientRect()` on every animation frame, and
only sets state when the rounded box changes. That's what keeps the spotlight on an element that
is still animating in, a column sliding open, a scroll, or a resize, with no special cases. On a
static page it costs one rect read per frame and zero renders.

The rect is padded 6px and trimmed 4px inside the window. The target is `scrollIntoView({ block:
'nearest' })`-ed once per step.

## Placing the card

Preferred side → opposite → bottom → right → left → top, 14px from the spotlight and at least 12px
inside the window, clamped on the other axis. If nothing fits (the target fills the screen), it
sits inside the target's bottom-right corner. Width is `min(340px, window − 24px)`. The card's
height is watched with a `ResizeObserver`, so placement stays right when text wraps differently.

## Performance

- The glide is CSS-only; React renders only when a step changes or a target actually moves.
- `backdrop-filter` + a changing mask repaints the veil during the 320ms glide. That's fine for a
  rare, full-attention moment. Don't add more blurred layers, and don't animate `--tour-blur`.
- Keep the blur at 6px: bigger radii cost more per frame and make the page unrecognisable.
- The card and ring move with `transform`. The ring's `width`/`height` follow `--sw`/`--sh`, a
  layout change on one fixed, childless element: negligible.

## Lite: the low-power version

The blur is the expensive part: while the spotlight glides, the whole window's blurred layer is
redrawn every frame. Machines without a real GPU (remote desktops, dev pods, thin clients, old
laptops) can't keep up, and the tour stutters. `lite` removes everything that repaints the whole
window per frame:

| Full | Lite |
| --- | --- |
| Blurred, dimmed veil with a masked hole | No veil. One flat `box-shadow` around the ring dims the page (`--tour-veil-lite`, a little darker to make up for the missing blur) |
| Spotlight and card glide 320ms | They jump. Each step is a single repaint |
| Glass card (`blur(40px)`) | Solid card (`--tour-surface-solid`), smaller shadow |
| Fades in and out, text fades per step | Appears and disappears at once |
| Target re-measured every frame | Re-measured every 120ms |

`lite="auto"` times 12 frames as the tour opens, with the blur showing. If the median frame is
slower than 30ms (under about 33fps), it switches to lite for the rest of that tour. Fast machines
never notice; slow ones see a moment of the full version, then the light one.

Measured on the reference build, software-rendered with the CPU throttled 6×, stepping through
the whole tour: full ran at a median 33ms per frame (95th percentile 100ms); lite at 17ms (95th
percentile 17ms).

Lite is not the same as reduced motion: reduced motion keeps the blur and the fades. Lite is about
what the machine can draw, not what the person prefers.

## Accessibility

- The card is `role="dialog"` `aria-modal`, labelled by its title and described by its body; the
  text region is `aria-live="polite"`, so each step is announced.
- Everything else in `<body>` is `inert` while it's open: no stray focus, clicks, or autofocus.
- Focus moves to Next on every step. ↵ on a focused button presses that button.
- Keys: → / ↵ next, ← back, Esc ends. Esc works on every step.

## Theming

Override in one block, mapping to the app's tokens. The dark defaults in `Tour.css` sit in
`:where(.tour)`, so a plain `.tour { … }` wins no matter which stylesheet loads first.

| Token | For | Dark default | Light suggestion |
| --- | --- | --- | --- |
| `--tour-veil` | dim over the page | `rgba(0,0,0,.5)` | `rgba(0,0,0,.22)` |
| `--tour-veil-lite` | dim in lite mode (no blur) | `rgba(0,0,0,.62)` | `rgba(0,0,0,.4)` |
| `--tour-blur` | veil blur | `6px` | `6px` |
| `--tour-ring` | spotlight edge, focus outline | `rgba(255,255,255,.4)` | `rgba(0,0,0,.35)` |
| `--tour-glow` | soft halo round the ring | `rgba(255,255,255,.05)` | `rgba(0,0,0,.05)` |
| `--tour-surface` | card glass | `rgba(22,22,22,.6)` | `rgba(255,255,255,.6)` |
| `--tour-surface-solid` | card when transparency is reduced | `#1c1c1c` | `#ffffff` |
| `--tour-edge` | card's inner top highlight | `rgba(255,255,255,.07)` | `rgba(255,255,255,.9)` |
| `--tour-line` | card outline, dots, kbd | `rgba(255,255,255,.11)` | `rgba(0,0,0,.1)` |
| `--tour-shadow` | card shadow | `0 24px 64px rgba(0,0,0,.6)` | `0 24px 64px rgba(0,0,0,.16)` |
| `--tour-fg` / `-2` / `-3` | title / body / count | `#ededed` `#a3a3a3` `#737373` | `#171717` `#525252` `#737373` |
| `--tour-hover` | button hover, kbd fill | `rgba(255,255,255,.06)` | `rgba(0,0,0,.04)` |
| `--tour-primary` / `-fg` / `-hover` | Next button | `#fafafa` `#0a0a0a` `#e2e2e2` | `#171717` `#ffffff` `#333333` |
| `--tour-font` / `--tour-mono` | text / step count | system sans / system mono | the app's (the tour renders in `<body>`, so it won't pick up a font set on the app's root) |
| `--tour-z` | stacking | `1000` | above the app's modals and toasts |

```css
/* e.g. an app with shadcn-style tokens and a .dark class */
.tour {
  --tour-surface: color-mix(in oklab, var(--popover) 60%, transparent);
  --tour-surface-solid: var(--popover);
  --tour-fg: var(--foreground);
  --tour-fg-2: var(--muted-foreground);
  --tour-primary: var(--primary);
  --tour-primary-fg: var(--primary-foreground);
  --tour-font: var(--font-sans);
}
:root:not(.dark) .tour {
  --tour-veil: rgba(0, 0, 0, 0.22);
  --tour-ring: rgba(0, 0, 0, 0.35);
  /* …the rest of the light column */
}
```

To use the app's own `<Button>` instead of `.tour-btn`, swap it in `Tour.tsx`, keeping the
`nextRef` on the Next button.
