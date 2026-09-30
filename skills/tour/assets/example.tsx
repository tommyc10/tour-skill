/* An example of wiring a tour into a page. Copy the shape, not the words: the steps are
 * written for a made-up review queue. Replace them with ones for the real page.
 *
 *   1. mark the elements:      <aside data-tour="filters">…</aside>
 *   2. write the steps:        pageTourSteps() below
 *   3. render and connect it:  ExamplePage below */

import { useEffect, useRef, useState } from 'react';
import { Tour, type TourStep } from './Tour';
import { useTour } from './useTour';

/** Steps that need the page (to open a form, say) take its callbacks as arguments. */
export function pageTourSteps(page: { formOpen: boolean; openForm: () => void; closeForm: () => void }): TourStep[] {
  return [
    {
      title: 'Welcome to the review queue',
      body: <>Items that need a person's decision land here. This takes about a minute.</>,
    },
    {
      target: 'filters',
      side: 'right',
      title: 'Narrow it down',
      body: (
        <>
          Filter by team or status. Search anything with <kbd>/</kbd>.
        </>
      ),
    },
    {
      target: 'list',
      side: 'right',
      title: 'The queue',
      body: (
        <>
          Move with <kbd>J</kbd> <kbd>K</kbd>. Amber means it's waiting on you.
        </>
      ),
    },
    {
      target: 'form',
      side: 'left',
      title: 'Every decision needs a reason',
      body: <>Say what you checked. It's saved to the audit log with your name.</>,
      // Open the real form for this step, and close it again after, but only if the tour opened it.
      prepare: () => {
        if (page.formOpen) return;
        page.openForm();
        return page.closeForm;
      },
    },
    {
      title: "You're all set",
      body: (
        <>
          Replay this tour any time with <kbd>?</kbd>, or from the help menu.
        </>
      ),
    },
  ];
}

export function ExamplePage() {
  const [formOpen, setFormOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const steps = pageTourSteps({ formOpen, openForm: () => setFormOpen(true), closeForm: () => setFormOpen(false) });
  const tour = useTour(steps.length, { storageKey: 'review-queue-tour' });

  /** Put everything the tour points at on screen before starting. */
  const startTour = () => {
    setSidebarHidden(false);
    tour.start();
  };

  // The page's own shortcuts stand down while the tour has the keyboard.
  const tourOpen = useRef(false);
  tourOpen.current = tour.open;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tourOpen.current) return;
      if (e.key === '?') startTour();
      // …the page's other shortcuts
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="page">
      {!sidebarHidden && <aside data-tour="filters">…</aside>}
      <main data-tour="list">…</main>
      {formOpen && <form data-tour="form">…</form>}
      <button onClick={startTour}>Take the tour</button>

      {tour.open && <Tour steps={steps} index={tour.index} onIndex={tour.go} onDone={tour.finish} />}
    </div>
  );
}
