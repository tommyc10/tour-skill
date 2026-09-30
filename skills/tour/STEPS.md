# Writing the steps

## Choosing what to show

A tour answers one question for a first-time user: *what do I do here?* Walk the path a person
takes to finish the page's main job, in the order they'd take it, and point at each place they
stop.

- **Start centred.** Step 1 has no target: name the page and its purpose in two sentences, and say
  how long the tour takes ("about a minute"). The whole page is veiled, and the spotlight opens
  from the centre on step 2.
- **Then follow the work.** Usually: where to find things (navigation, filters, search) → the list
  → reading one item (the numbers, the evidence) → acting on it (the buttons) → the form that
  finishes it.
- **Then the speed-ups.** One step for the command palette / shortcuts, if the app has them.
- **End centred.** Say how to replay the tour (`?`, the help button).
- **Skip** anything self-explanatory (a logo, a search box that says "Search"), settings, and rare
  paths. 6–10 steps. If it needs more, it's two tours.

## Writing each step

| Part | Rule | Good | Bad |
| --- | --- | --- | --- |
| Title | ≤ 6 words, what it's *for* | "Find the rules that need you" | "The Filter Bar" |
| Body | ≤ 2 sentences, plain words | "Confidence under 60% turns orange: those might hide something real." | "This component displays the confidence metric…" |
| Keys | Name the real shortcut in `<kbd>` | "Move with <kbd>J</kbd> <kbd>K</kbd>." | "Use keyboard navigation." |
| Colour/icons | Say what they mean | "Amber means it's waiting on you." | (nothing) |
| Voice | The app's own voice; second person | "Every change needs a reason." | "Users must provide…" |

Read every body aloud. If it needs a breath, cut it.

## Targets

- Mark the **whole region**, not a child: the list container, the stat row, the form. The spotlight
  pads 6px and is trimmed to the window, so a tall list is fine.
- `side` is a preference: `'right'` for things on the left edge (sidebar, list), `'left'` for
  things on the right (a rail, a form), `'bottom'` for full-width bars and rows. The card falls back
  through the opposite side, then bottom, right, left, top, and finally sits inside the target.
- A step whose target isn't on screen still works (the card centres), but the check script flags
  it. Fix it with `prepare` or `startTour`, don't ship it.

## `prepare`: getting the page ready

Use it when a step needs something that isn't showing: a form that opens after pressing a button,
a collapsed panel, a tab.

```tsx
{
  target: 'form',
  prepare: () => {
    if (page.formOpen) return;   // the user's own form: leave it alone
    page.openForm();             // open it for this step…
    return page.closeForm;       // …and close it when the step is left or the tour ends
  },
}
```

- Steps that need page state are built by a function that takes the page's callbacks
  (`pageTourSteps({ … })` in `example.tsx`). `prepare` runs when the step's *index* changes, with
  the callbacks from that render.
- Open things the way a pointer would, so their own entrance animation plays; the spotlight follows
  the element as it moves.
- Never submit, delete, or save anything from `prepare`. Show, don't do.

## Starting well

Wrap `tour.start()` in a `startTour()` that puts the page in a state where every step works:

- show collapsed sidebars/panels, close drawers, palettes and popovers;
- select an item that shows the most (one waiting for a decision, with a warning on it) rather than
  whatever happens to be first;
- don't change what the user can't easily change back (filters they set, drafts). Selecting a
  different row is fine.

## Entry points

- **First visit:** `useTour` starts it 600ms after load unless its `storageKey` is set. Use a key
  per page (`'review-queue-tour'`) so each page's tour shows once.
- **A help button** near the user menu or page header, labelled "Take the tour".
- **The command palette**, if there is one: "Take the tour", with the `?` hint.
- **`?`** as a global shortcut, when it's free.
