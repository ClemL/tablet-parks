'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { parseChangelog } from '@/client/changelog';
import { Icon } from './Icon';

const APP_NAME = 'Trailside Seasons';
// Both are stamped once by next.config.ts; the fallbacks keep a bare dev server or a test from
// printing "undefined".
const VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? '';

/**
 * Build info and the newest line of public/updates.txt, which opens the whole
 * changelog, newest first. The file is fetched rather than bundled, so shipping
 * an entry is a one-line append with no code change. A missing, failing or
 * empty file leaves the build info alone — nothing to apologise for.
 */
export function Footer() {
  const [entries, setEntries] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/updates.txt', { cache: 'no-store' })
      .then((response) => (response.ok ? response.text() : ''))
      .then((text) => {
        if (!cancelled) setEntries(parseChangelog(text));
      })
      .catch(() => {
        // Offline or blocked: the build info stands on its own.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    // Back to where the keyboard was, rather than the top of the page.
    trigger.current?.focus();
  }, []);

  const latest = entries.length > 0 ? entries[entries.length - 1] : null;

  return (
    <>
      <footer className="footer">
        <span className="footer__build">
          {APP_NAME} · v{VERSION}
          {BUILD_TIME ? ` · built ${BUILD_TIME}` : ''}
        </span>
        {latest ? (
          <button type="button" ref={trigger} className="footer__latest" title={latest} onClick={() => setOpen(true)}>
            {latest}
          </button>
        ) : null}
        <span className="footer__fan">Fan project; not affiliated with Keymaster Games, publisher of PARKS.</span>
      </footer>
      {/* Outside the footer, so the sheet does not inherit its small monospace type. */}
      {open ? <Changelog entries={entries} onClose={close} /> : null}
    </>
  );
}

/** Every entry, newest first, in the same sheet the table's other dialogs use. */
function Changelog({ entries, onClose }: { entries: string[]; onClose: () => void }) {
  const closer = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closer.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    // A long page behind the sheet stays put while the list scrolls.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    // Only a click on the backdrop itself closes it: one that starts inside the sheet
    // (selecting a line, scrolling the list) bubbles up here too.
    <div className="scrim" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="sheet changelog" role="dialog" aria-modal="true" aria-labelledby="changelog-title">
        <header className="sheet__head">
          <div>
            <h2 id="changelog-title">Changelog</h2>
          </div>
          <button type="button" ref={closer} className="btn btn--icon" aria-label="Close the changelog" onClick={onClose}>
            <Icon name="x" size={18} />
          </button>
        </header>
        <ol className="changelog__list">
          {entries
            .slice()
            .reverse()
            .map((entry, index) => (
              // A text child, so React escapes it: an entry can never inject markup.
              <li key={`${index}-${entry}`}>{entry}</li>
            ))}
        </ol>
      </div>
    </div>
  );
}
