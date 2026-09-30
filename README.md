# tour

A Claude Code / agent skill that adds a guided product tour to a web app: the page blurs and
dims, a rounded spotlight glides between the real UI elements, and a glass card explains each
one. Invoke it with `/tour`.

It ships a tested, dependency-free React engine, so every tour gets the same look, motion and
performance, plus the parts that change per app: choosing and writing the steps, getting the
page ready for each one, theming to the app's tokens, and a Playwright script that walks the
tour and flags problems.

## Install

```bash
npx skills add tommyc10/tour-skill
```

Or copy `skills/tour/` into `~/.claude/skills/tour` (every project) or `.claude/skills/tour`
(one project).

## Use

In a project, run `/tour`, or ask for "a product tour of the settings page". The skill finds the
page's key areas, proposes the steps, installs the engine, marks the targets, wires the entry
points (first visit, a help button, the command palette, `?`) and checks it in a browser.

## What's inside

```
skills/tour/
├── SKILL.md              the workflow, hard rules, and what never to ship
├── STEPS.md              choosing and writing steps, prepare(), entry points
├── CRAFT.md              every visual and motion value and why, theming, performance
├── assets/
│   ├── Tour.tsx          the engine: spotlight, card, keyboard, focus, inert page
│   ├── Tour.css          the masked blur veil, the glide, tokens, reduced motion/transparency
│   ├── useTour.ts        open / step / first-visit state
│   └── example.tsx       wiring a page, with a step that opens a form and closes it again
└── scripts/
    └── check-tour.mjs    walk the tour, screenshot each step, report problems
```

Requires React 18+ for the engine as-is; the skill explains how to port it to other frameworks.
The check script needs Playwright (`npm i -D playwright && npx playwright install chromium`).

## License

MIT
