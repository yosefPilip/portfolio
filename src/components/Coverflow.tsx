import { useCallback, useEffect, useRef, useState } from 'react';
import { tracks } from '../data/tracks';

// How covers fan out from the centered/selected one.
const MAX_VISIBLE = 3; // covers shown on each side before fully fading out
const SPREAD = 58; // % of a cover's width each step is pushed sideways
const TILT = 38; // deg each side cover rotates away in perspective
const DEPTH = 70; // px each step recedes into the screen
const SWIPE_THRESHOLD = 45; // px of horizontal drag before a swipe navigates

function coverStyle(offset: number): React.CSSProperties {
  const abs = Math.abs(offset);
  const dir = Math.sign(offset);

  if (abs > MAX_VISIBLE) {
    return {
      opacity: 0,
      pointerEvents: 'none',
      transform: `translateX(${dir * (MAX_VISIBLE + 1) * SPREAD}%) scale(0.5)`,
      zIndex: 0,
    };
  }

  return {
    transform: [
      `translateX(${offset * SPREAD}%)`,
      `translateZ(${-abs * DEPTH}px)`,
      `rotateY(${-dir * TILT}deg)`,
      `scale(${abs === 0 ? 1 : Math.max(0.62, 1 - abs * 0.14)})`,
    ].join(' '),
    opacity: abs === 0 ? 1 : Math.max(0.32, 1 - abs * 0.3),
    zIndex: tracks.length - abs,
    pointerEvents: 'auto',
  };
}

export function Coverflow() {
  const [active, setActive] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  const dragMoved = useRef(false);

  const clamp = (i: number) => Math.max(0, Math.min(tracks.length - 1, i));
  const go = useCallback((delta: number) => setActive((i) => clamp(i + delta)), []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    }
  };

  // Pointer-based swipe / click discrimination on the stage.
  const onPointerDown = (e: React.PointerEvent) => {
    dragStart.current = e.clientX;
    dragMoved.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    if (Math.abs(e.clientX - dragStart.current) > 8) dragMoved.current = true;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    const delta = e.clientX - dragStart.current;
    dragStart.current = null;
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      go(delta < 0 ? 1 : -1);
    }
  };

  // Clicking a cover: center it if it's a neighbor, open it if already centered.
  const onCoverClick = (index: number, href: string) => (e: React.MouseEvent) => {
    if (dragMoved.current) {
      e.preventDefault();
      return;
    }
    if (index !== active) {
      e.preventDefault();
      setActive(index);
    } else {
      // active cover — let the anchor navigate to SoundCloud in a new tab.
      window.open(href, '_blank', 'noopener');
      e.preventDefault();
    }
  };

  // Keep the focus ring behavior sane: focus the stage on mount is not forced,
  // but pressing arrows anywhere on the page while nothing else is focused works.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    // Only bind global arrows when the carousel is on screen.
    const el = stageRef.current;
    if (!el) return;
    let onScreen = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    const wrapped = (e: KeyboardEvent) => {
      if (onScreen) handler(e);
    };
    window.addEventListener('keydown', wrapped);
    return () => {
      window.removeEventListener('keydown', wrapped);
      io.disconnect();
    };
  }, [go]);

  const current = tracks[active];
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="cf">
      <div className="cf-controls">
        <button
          className="cf-arrow"
          onClick={() => go(-1)}
          disabled={active === 0}
          aria-label="Previous mix"
        >
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div
          className="cf-stage"
          ref={stageRef}
          role="listbox"
          aria-label="Mix covers"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (dragStart.current = null)}
        >
          {tracks.map((t, i) => {
            const offset = i - active;
            const isActive = i === active;
            return (
              <a
                key={t.id}
                className={`cf-cover${isActive ? ' is-active' : ''}`}
                style={coverStyle(offset)}
                href={t.href}
                target="_blank"
                rel="noopener"
                role="option"
                aria-selected={isActive}
                aria-label={isActive ? `${t.title} — open on SoundCloud` : `Select ${t.title}`}
                tabIndex={isActive ? 0 : -1}
                onClick={onCoverClick(i, t.href)}
                draggable={false}
              >
                <img src={t.cover} alt={`${t.title} cover art`} loading="lazy" draggable={false} />
                {isActive && (
                  <span className="cf-cover-badge">
                    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
                    </svg>
                    Play on SoundCloud
                  </span>
                )}
              </a>
            );
          })}
        </div>

        <button
          className="cf-arrow"
          onClick={() => go(1)}
          disabled={active === tracks.length - 1}
          aria-label="Next mix"
        >
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className="cf-info" aria-live="polite">
        <div className="cf-index mono">
          {pad(active + 1)} <span>/</span> {pad(tracks.length)}
        </div>
        <h3 className="cf-title">{current.title}</h3>
        <p className="cf-desc">{current.description}</p>
        <a className="cf-link" href={current.href} target="_blank" rel="noopener">
          Listen on SoundCloud
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="4" y1="12" x2="19" y2="12" />
            <polyline points="13 6 19 12 13 18" />
          </svg>
        </a>
      </div>

      <div className="cf-dots" role="tablist" aria-label="Choose mix">
        {tracks.map((t, i) => (
          <button
            key={t.id}
            className={`cf-dot${i === active ? ' is-active' : ''}`}
            onClick={() => setActive(i)}
            aria-label={`Go to ${t.title}`}
            aria-selected={i === active}
            role="tab"
          />
        ))}
      </div>
    </div>
  );
}
