import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseChangelog } from './changelog';

describe('the changelog file', () => {
  it('reads one entry per line, oldest first', () => {
    expect(parseChangelog('2026-01-01T00:00:00Z - First\n2026-01-02T00:00:00Z - Second\n')).toEqual([
      '2026-01-01T00:00:00Z - First',
      '2026-01-02T00:00:00Z - Second',
    ]);
  });

  it('takes Windows line endings, stray spaces and blank lines in its stride', () => {
    expect(parseChangelog('  a - one  \r\n\r\n\tb - two\r\n   \r\n')).toEqual(['a - one', 'b - two']);
  });

  it('has no entries when the file is empty or only blank lines', () => {
    expect(parseChangelog('')).toEqual([]);
    expect(parseChangelog('\n\n   \n\r\n')).toEqual([]);
  });

  it('keeps the shipped file in the documented format, oldest first', () => {
    const entries = parseChangelog(readFileSync(new URL('../../public/updates.txt', import.meta.url), 'utf8'));
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) expect(entry).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z - \S/);
    const times = entries.map((entry) => entry.slice(0, 20));
    expect([...times].sort()).toEqual(times);
  });
});
