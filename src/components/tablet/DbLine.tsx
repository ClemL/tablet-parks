import type { DbInfo } from '@/room/room';

/** Where this game's state lives, in one line — never the credentials. */
export function DbLine({ db }: { db: DbInfo }) {
  if (db.source === 'start-redis') {
    return (
      <p className="db-line">
        <span aria-hidden="true">🗄️</span> A fresh Upstash Redis database for this game <span className="code">#{db.label}</span>
        {db.expires ? <span className="muted"> · Upstash deletes it {formatDate(db.expires)}</span> : null}
      </p>
    );
  }
  if (db.source === 'env') {
    return (
      <p className="db-line">
        <span aria-hidden="true">🗄️</span> The deployment’s shared Redis database{' '}
        <span className="muted">(a fresh one could not be provisioned)</span>
      </p>
    );
  }
  return (
    <p className="db-line db-line--warn">
      <span aria-hidden="true">💻</span> Kept in this server’s memory — fine on a laptop, not on a deployment
    </p>
  );
}

function formatDate(raw: string): string {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
