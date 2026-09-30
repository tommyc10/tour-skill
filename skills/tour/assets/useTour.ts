/* Whether the tour is showing, and which step it's on. It starts by itself the first time
 * someone opens the page; after that, only when asked (a help button, a command, a key). */

import { useEffect, useState } from 'react';

export function useTour(
  stepCount: number,
  { storageKey = 'tour-seen', autoStart = true, delay = 600 }: { storageKey?: string; autoStart?: boolean; delay?: number } = {},
) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const start = () => {
    setIndex(0);
    setOpen(true);
  };

  // First visit: wait for the page to settle, then start.
  useEffect(() => {
    if (!autoStart || localStorage.getItem(storageKey)) return;
    const timer = setTimeout(start, delay);
    return () => clearTimeout(timer);
  }, []);

  return {
    open,
    index,
    start,
    go: (i: number) => setIndex(Math.min(stepCount - 1, Math.max(0, i))),
    /** Pass to <Tour onDone>: closes it and remembers it's been seen. */
    finish() {
      setOpen(false);
      localStorage.setItem(storageKey, '1');
    },
  };
}

export type TourState = ReturnType<typeof useTour>;
