# CLAUDE.md

Guidance for Claude Code (and anyone else) working in this repository.

## Working agreements

* **Always start a new branch for each request.** Do not commit directly to `main`, and do not stack
  an unrelated request's changes onto a branch created for a previous one. If a request's PR has
  already been merged, restart from the latest `main`.
* **Open a pull request when the work is done**, against `main`, summarizing what changed and why.
* **Verify before opening the PR.** CI (`.github/workflows/ci.yml`) runs the same four; run them
  locally first:
  * `npm run typecheck`
  * `npm test`
  * `npm run build`
  * `npm run test:e2e` — against that build (needs `redis-server` on the PATH)
* **Add a line to `public/updates.txt` when you ship a user-visible change.** One entry per line,
  oldest first, formatted `<ISO timestamp> - <what changed>`. The settings screen's footer shows the
  last line.
* **Post the links at the end of every response:** the repo, https://github.com/ClemL/tablet-parks,
  and the Vercel app and pipeline once the project is imported.
* **Comments explain *why*, not *what*.**

## What this project is

The parks-game (`ClemL/parks-game`) as a table game: one tablet is the board and the only
controller; each phone is one player's read-only sheet with their secret objectives. Next.js App
Router on Vercel. Every new game provisions its own Upstash Redis database through
`POST https://upstash.com/start-redis` and keeps using it until the game is over or abandoned.

## Conventions that matter here

* **The engine is pure and comes from parks-game.** `src/game/` takes a `GameState` and returns a
  new one; no React, DOM or browser APIs. Rule changes belong there, with a unit test.
* **The room is pure too.** `src/room/room.ts` owns seats, settings, the computers' clock (`drain`)
  and who sees what (`tableView`, `seatView`). No storage, no crypto, no `Date.now()` — the caller
  passes the time, so whole games play out in a unit test.
* **Never send a device information it is not entitled to.** Redaction is `viewFor` in
  `src/game/view.ts`, driven by the policies in `tableView`/`seatView`. Add a test in
  `room.test.ts` asserting on the JSON before changing what a view carries.
* **Handles stay sealed.** Devices only ever hold sealed handles (`src/server/seal.ts`). Database
  credentials, the `start-redis` idempotency key and the RNG seed never reach a browser.
* **Only the tablet moves.** `/api/games/move` and `/control` accept the tablet's handle only. The
  phones read; they do not act, apart from joining and leaving their seat.
* **Verify UI work in a real browser.** Drive the built app in Chromium (tablet 1280×800, phone
  390×844) before claiming a UI change works, and add the flow to `e2e/` when it matters.
* **Motion and colour are accessibility surfaces.** Respect `prefers-reduced-motion`; gate hover
  affordances behind `(hover: hover) and (pointer: fine)`; a seat is identified by its letters as
  well as its colour.
