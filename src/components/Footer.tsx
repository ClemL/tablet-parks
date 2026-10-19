'use client';

import { useEffect, useState } from 'react';

/** Version, build time and the latest line of public/updates.txt. */
export function Footer() {
  const [latest, setLatest] = useState<string | null>(null);
  useEffect(() => {
    fetch('/updates.txt', { cache: 'no-store' })
      .then((r) => (r.ok ? r.text() : ''))
      .then((text) => {
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        setLatest(lines[lines.length - 1]?.replace(/^\S+\s+-\s+/, '') ?? null);
      })
      .catch(() => setLatest(null));
  }, []);
  const built = process.env.NEXT_PUBLIC_BUILD_TIME?.slice(0, 16).replace('T', ' ');
  return (
    <footer className="footer">
      <span>
        v{process.env.NEXT_PUBLIC_APP_VERSION} · built {built} UTC
      </span>
      {latest ? <span className="footer__latest">Latest: {latest}</span> : null}
      <span className="muted">Fan project; not affiliated with Keymaster Games, publisher of PARKS.</span>
    </footer>
  );
}
