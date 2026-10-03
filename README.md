# tour-skill

Agent skills (Claude Code, Codex and others) that add a guided product tour to a web app: the
page dims, a rounded spotlight moves between the real UI elements, and a card explains each one.

| Skill | Command | Use it when |
| --- | --- | --- |
| [`tour`](skills/tour/SKILL.md) | `/tour` | The default. Blurred background, gliding spotlight, glass card. Switches itself to lite on a machine too slow for the blur |
| [`tour-lite`](skills/tour-lite/SKILL.md) | `/tour-lite` | The audience is on remote desktops, dev pods, thin clients or old laptops. No blur, no glide, no fades: one repaint per step |

Both use the same tested, dependency-free React engine, the same steps and the same keys. Moving
between them is a one-prop change (`lite`).

## Install

```bash
npx skills add tommyc10/tour-skill
```

That installs both. (`tour-lite` uses `tour`'s files, so keep them together.) To install by hand,
copy `skills/tour/` and `skills/tour-lite/` into `~/.claude/skills/` (every project) or
`.claude/skills/` (one project).

## Use

In a project, run `/tour` or `/tour-lite`, or ask for "a product tour of the settings page". The
skill finds the page's key areas, proposes the steps, installs the engine, marks the targets,
wires the entry points (first visit, a help button, the command palette, `?`) and checks it in a
browser.

## Layout

```
skills/
├── tour/                     /tour
│   ├── SKILL.md              the workflow, hard rules, and what never to ship
│   ├── STEPS.md              choosing and writing steps, prepare(), entry points
│   ├── CRAFT.md              every visual and motion value and why; lite; theming; performance
│   ├── assets/
│   │   ├── Tour.tsx          the engine: spotlight, card, keyboard, focus, inert page, lite
│   │   ├── Tour.css          tokens, the masked blur veil, the glide, the lite styles
│   │   ├── useTour.ts        open / step / first-visit state
│   │   └── example.tsx       wiring a page, with a step that opens a form and closes it again
│   └── scripts/
│       └── check-tour.mjs    walk the tour, screenshot each step, report problems
└── tour-lite/                /tour-lite
    └── SKILL.md              what's different from /tour (it uses the files above)
```

## Requirements

- React 18+ for the engine as-is. `tour/SKILL.md` explains how to port it to other frameworks.
- Playwright for the check script: `npm i -D playwright && npx playwright install chromium`.

## License

MIT
