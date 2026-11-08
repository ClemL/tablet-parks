/**
 * The entries of public/updates.txt, oldest first: one per line, trimmed,
 * blank lines dropped. Windows line endings count as line breaks too, so a
 * file saved on Windows does not leave a stray carriage return on each entry.
 */
export function parseChangelog(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
