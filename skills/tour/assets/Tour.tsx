/* A guided tour. The page behind is blurred and dimmed, except for a spotlight cut around
 * the element the step is about; a card beside it explains what it's for. Between steps
 * the spotlight and card glide to the next element, so the eye follows along.
 *
 *   veil    the blur + dim, with the spotlight masked out of it (see Tour.css)
 *   ring    a thin outline on the spotlight's edge
 *   card    step count, title, text, Back / Next
 *
 * Each step's target is found by `data-tour="…"` and measured every frame, so the spotlight
 * keeps up when the target moves: a panel sliding open, a form animating in, a scroll.
 *
 * It knows nothing about the page it tours. Steps come in as a prop; colours come from the
 * --tour-* tokens in Tour.css. No dependencies beyond React. */

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import './Tour.css';

export type TourSide = 'right' | 'left' | 'bottom' | 'top';

export interface TourStep {
  /** The `data-tour` value of the element to spotlight. None: a centred card, whole page veiled. */
  target?: string;
  /** Where the card would like to sit. It moves if there isn't room. */
  side?: TourSide;
  title: string;
  body: ReactNode;
  /** Get the page ready for this step (open a panel, show a form). Return a function that
   *  undoes it; it runs when the step is left or the tour ends. */
  prepare?: () => void | (() => void);
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const PAD = 6; // room between the target and the spotlight's edge
const GAP = 14; // between the spotlight and the card
const MARGIN = 12; // keep the card this far inside the window
const CARD_W = 340;
const LEAVE_MS = 180; // matches the fade-out in Tour.css
const LITE_POLL_MS = 120; // lite: how often to re-measure the target (instead of every frame)
const PROBE_FRAMES = 12; // 'auto': frames timed before deciding
const SLOW_FRAME_MS = 30; // 'auto': a median frame slower than this (under ~33fps) means lite

/** The target's box plus padding, trimmed to the window (a tall list shouldn't spill off-screen). */
function measure(el: HTMLElement): Box | null {
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const x = Math.max(4, r.left - PAD);
  const y = Math.max(4, r.top - PAD);
  const right = Math.min(window.innerWidth - 4, r.right + PAD);
  const bottom = Math.min(window.innerHeight - 4, r.bottom + PAD);
  return right > x && bottom > y ? { x, y, w: right - x, h: bottom - y } : null;
}

const OPPOSITE: Record<TourSide, TourSide> = { right: 'left', left: 'right', bottom: 'top', top: 'bottom' };

/** Where the card goes: the preferred side if it fits, then the others; centred when there's no target. */
function place(box: Box | null, preferred: TourSide, w: number, h: number, vw: number, vh: number) {
  const clampX = (x: number) => Math.min(vw - MARGIN - w, Math.max(MARGIN, x));
  const clampY = (y: number) => Math.min(vh - MARGIN - h, Math.max(MARGIN, y));
  if (!box) return { x: clampX((vw - w) / 2), y: clampY((vh - h) / 2) };

  const sides = [...new Set<TourSide>([preferred, OPPOSITE[preferred], 'bottom', 'right', 'left', 'top'])];
  for (const side of sides) {
    if (side === 'right' && box.x + box.w + GAP + w <= vw - MARGIN) return { x: box.x + box.w + GAP, y: clampY(box.y) };
    if (side === 'left' && box.x - GAP - w >= MARGIN) return { x: box.x - GAP - w, y: clampY(box.y) };
    if (side === 'bottom' && box.y + box.h + GAP + h <= vh - MARGIN) return { x: clampX(box.x), y: box.y + box.h + GAP };
    if (side === 'top' && box.y - GAP - h >= MARGIN) return { x: clampX(box.x), y: box.y - GAP - h };
  }
  // No room anywhere (the target fills the window): sit inside its bottom-right corner.
  return { x: clampX(box.x + box.w - w - GAP), y: clampY(box.y + box.h - h - GAP) };
}

const Arrow = ({ back }: { back?: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {back ? <path d="M19 12H5M12 19l-7-7 7-7" /> : <path d="M5 12h14M12 5l7 7-7 7" />}
  </svg>
);

const Cross = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export function Tour({
  steps,
  index,
  onIndex,
  onDone,
  lite = false,
}: {
  steps: TourStep[];
  index: number;
  onIndex: (index: number) => void;
  /** Called once the tour has faded out: finished, skipped or closed. */
  onDone: () => void;
  /** The low-power version: dim without blur, a solid card, and jumps instead of glides.
   *  'auto' times the first frames and switches to it only if the machine is struggling. */
  lite?: boolean | 'auto';
}) {
  const step = steps[index];
  const last = index === steps.length - 1;
  const id = useId();
  const [box, setBox] = useState<Box | null>(null);
  const [view, setView] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [cardH, setCardH] = useState(220);
  const [leaving, setLeaving] = useState(false);
  const [slow, setSlow] = useState(false);
  const isLite = lite === true || slow;
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // Everything else on the page is inert while the tour shows: no clicks, no focus, no autofocus.
  useLayoutEffect(() => {
    const others = [...document.body.children].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== rootRef.current && !el.inert,
    );
    others.forEach((el) => (el.inert = true));
    return () => others.forEach((el) => (el.inert = false));
  }, []);

  // Let the step get the page ready, and undo it when the step is left. Keyed on the index,
  // not the step object, so steps built inside a component don't re-run on every render.
  useEffect(() => {
    const undo = step.prepare?.();
    return () => {
      if (typeof undo === 'function') undo();
    };
  }, [index]);

  // 'auto': time the first frames, while the blur is showing. Too slow, and it goes lite.
  useEffect(() => {
    if (lite !== 'auto') return;
    let frame = 0;
    let last = 0;
    const gaps: number[] = [];
    const tick = (now: number) => {
      if (last) gaps.push(now - last);
      last = now;
      if (gaps.length < PROBE_FRAMES) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const median = [...gaps].sort((a, b) => a - b)[gaps.length >> 1];
      if (median > SLOW_FRAME_MS) setSlow(true);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [lite]);

  // Find the step's target, bring it into view, then follow it: every frame, or in lite a
  // few times a second (nothing glides, so that's plenty).
  useLayoutEffect(() => {
    let frame = 0;
    let timer = 0;
    let seen = '';
    let scrolled = false;
    const follow = () => {
      const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
      if (el && !scrolled) {
        el.scrollIntoView({ block: 'nearest' });
        scrolled = true;
      }
      const next = el ? measure(el) : null;
      const key = next ? `${Math.round(next.x)} ${Math.round(next.y)} ${Math.round(next.w)} ${Math.round(next.h)}` : '';
      if (key !== seen) {
        seen = key;
        setBox(next);
      }
      if (isLite) timer = window.setTimeout(follow, LITE_POLL_MS);
      else frame = requestAnimationFrame(follow);
    };
    follow();
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [step.target, isLite]);

  useEffect(() => {
    const onResize = () => setView({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // The card's height decides where it fits, and changes with each step's text.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    setCardH(el.offsetHeight);
    const observer = new ResizeObserver(() => setCardH(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Keep focus on the card, so ↵ and Tab go to its buttons.
  useEffect(() => nextRef.current?.focus({ preventScroll: true }), [index]);

  const leave = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(onDone, isLite ? 0 : LEAVE_MS);
  };
  const next = () => (last ? leave() : onIndex(index + 1));
  const back = () => index > 0 && onIndex(index - 1);

  // The live values are read through a ref, so the listener is added once.
  const keys = useRef({ next, back, leave });
  keys.current = { next, back, leave };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // ↵ on one of the card's buttons presses that button.
      if (e.key === 'Enter' && (e.target as HTMLElement).closest?.('.tour button')) return;
      const k = keys.current;
      const run = { ArrowRight: k.next, Enter: k.next, ArrowLeft: k.back, Escape: k.leave }[e.key];
      if (!run) return;
      e.preventDefault();
      e.stopPropagation();
      run();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  // With no target the spotlight shrinks to a point in the middle, so the whole page is veiled.
  const hole = box ?? { x: view.w / 2, y: view.h / 2, w: 0, h: 0 };
  const spot = {
    '--sx': `${hole.x}px`,
    '--sy': `${hole.y}px`,
    '--sw': `${hole.w}px`,
    '--sh': `${hole.h}px`,
  } as CSSProperties;
  const cardW = Math.min(CARD_W, view.w - 2 * MARGIN);
  const at = place(box, step.side ?? 'right', cardW, cardH, view.w, view.h);

  return createPortal(
    <div
      ref={rootRef}
      className="tour"
      data-leaving={leaving || undefined}
      data-lite={isLite || undefined}
      data-target={step.target}
      data-found={step.target ? Boolean(box) : undefined}
    >
      <div className="tour-veil" style={spot} aria-hidden />
      <div className="tour-ring" style={spot} data-on={box ? '' : undefined} aria-hidden />

      <div
        ref={cardRef}
        className="tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-body`}
        style={{ width: cardW, transform: `translate(${at.x}px, ${at.y}px)` }}
      >
        <div className="tour-pop">
          <button className="tour-close" onClick={leave} aria-label="End tour" title="End tour  Esc">
            <Cross />
          </button>

          {/* `key` swaps the text in fresh, so it fades in for each step. */}
          <div className="tour-content" key={index} aria-live="polite">
            <div className="tour-count">
              {String(index + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
            </div>
            <h2 id={`${id}-title`} className="tour-title">
              {step.title}
            </h2>
            <p id={`${id}-body`} className="tour-body">
              {step.body}
            </p>
          </div>

          <footer className="tour-foot">
            <div className="tour-progress" aria-hidden>
              {steps.map((_, i) => (
                <span key={i} data-done={i <= index || undefined} />
              ))}
            </div>
            {index > 0 && (
              <button className="tour-btn tour-back" onClick={back} aria-label="Previous step">
                <Arrow back />
              </button>
            )}
            <button ref={nextRef} className="tour-btn" data-primary onClick={next}>
              {index === 0 ? 'Start the tour' : last ? 'Finish' : 'Next'}
              {!last && <Arrow />}
            </button>
          </footer>
        </div>
      </div>
    </div>,
    document.body,
  );
}
