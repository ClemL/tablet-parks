# CLAUDE.md

Guidance for Claude Code (and anyone else) working in this repository.

## Working agreements

* **Always start a new branch for each request.** Never commit to the default branch, and do not
  stack an unrelated request's changes onto a branch created for a previous one. If a request's PR
  has already been merged, restart from the latest default branch.
* **The default branch is `claude/gracious-edison-v8u33y`; there is no `main`.** Every PR so far
  merged into it. `git ls-remote --symref origin HEAD` names it if that ever changes.
* **Open a pull request when the work is done**, against the default branch, summarizing what
  changed and why.
* **Verify before opening the PR.** CI (`.github/workflows/ci.yml`) runs the same four; run them
  locally first, in this order:
  * `npm run typecheck`
  * `npm test` — needs `redis-server` on the PATH, or `REDIS_PORT` pointing at one
  * `npm run build`
  * `npm run test:e2e` — against that build (needs `redis-server` too)
* **Add a line to `public/updates.txt` when you ship a user-visible change.** Newest last; the footer
  reads the file and shows the final line. Internal changes (refactors, tests, tooling) do not get a
  line. Format: `YYYY-MM-DDTHH:MM:00Z - What changed` (`date -u +%Y-%m-%dT%H:%M:00Z`).
* **Post the links at the end of every response:** the repo, https://github.com/ClemL/tablet-parks,
  and the Vercel app and pipeline (confirm once the project is imported).
* **Comments explain *why*, not *what*.**

## What this project is

The parks-game (`ClemL/parks-game`) as a table game: one tablet is the board and the only
controller, read upright from one side; each phone is one player's sheet with their secret
objectives. Next.js App Router on Vercel, with no websockets: devices poll, and whichever poll
comes after a computer's move is due plays it. Every new game provisions its own Upstash Redis
database through `POST https://upstash.com/start-redis` and keeps using it until the game is over
or abandoned. The README covers how a game goes and how it is wired; read it before a large change.

## Layout

```
src/game/          Rules engine from parks-game — pure; view.ts is the redaction
src/room/          room.ts: seats, settings, the computers' clock, views (pure); names.ts
src/server/        start-redis provisioning, REST client, store, sealing, service (server-only)
src/app/           page.tsx (tablet), seat/page.tsx (phone), api/games/*, styles/ (one CSS file per area)
src/client/        API client, polling hook, localStorage, the changelog parser
src/components/    tablet/ (setup, board, trail, sheets, menu) · phone/ · shared cards, Footer
src/art/           Park and site illustrations and the Pokémon pawns, drawn as SVG
scripts/           mock-upstash.mjs: start-redis and the REST API in front of a real redis-server
e2e/               Playwright: a tablet and phones together, against the build
public/updates.txt Changelog, oldest first
```

## Conventions that matter here

* **The engine is pure and comes from parks-game.** `src/game/` takes a `GameState` and returns a
  new one; no React, DOM or browser APIs. Rule changes belong there, with a unit test.
* **The room is pure too.** `src/room/room.ts` owns seats, settings, the computers' clock (`drain`)
  and who sees what (`tableView`, `seatView`). No storage, no crypto, no `Date.now()` — the caller
  passes the time, so whole games play out in a unit test.
* **Never send a device information it is not entitled to.** Redaction is `viewFor` in
  `src/game/view.ts`, driven by the policies in `tableView`/`seatView`. Add a test in
  `room.test.ts` asserting on the JSON before changing what a view carries; deck order never leaves
  the server, only counts (`parkDeckCount`, `gearDeckCount`).
* **Handles stay sealed.** Devices only ever hold sealed handles (`src/server/seal.ts`). Database
  credentials, the `start-redis` idempotency key and the RNG seed never reach a browser. A seat's QR
  ticket rides in the URL fragment (`/seat#t=…`), so it is never sent to a server in a URL.
* **Client code imports `src/server/` only as `import type`.** Those modules import `server-only`
  and fail the client build otherwise.
* **Only the tablet walks hikers.** `/api/games/move` and `/control` accept the tablet's handle only.
  A phone may answer its own seat's park decision — visit, reserve, buy gear or pass — through
  `/api/games/choose` (`playForPhone`), and nothing else; otherwise the phones read, join and leave.
* **A house rule is off unless the table turns it on.** It lives in `HouseRules` with a default in
  `DEFAULT_HOUSE_RULES`, is normalized in `normalizeSettings` (unknown values read as off), and gets
  a switch in `SetupSettings`; `hydrate` fills it in for games saved before it existed.
* **The trail's geometry is `trailLayout()`**, a pure function of the board's measured size with
  its own test. Stops are 150–168 px on a 1280×800 tablet; keep them that easy to tap.
* **Verify UI work in a real browser.** Drive the built app in Chromium (tablet 1280×800, phone
  390×844 and sideways 844×390) before claiming a UI change works, and add the flow to `e2e/`.
* **Motion and colour are accessibility surfaces.** `base.css` shortens every animation under
  `prefers-reduced-motion`; gate hover affordances behind `(hover: hover) and (pointer: fine)`; a
  seat is identified by its letters as well as its colour. Colours are tokens in `tokens.css`, each
  pair measured for contrast; there is one dark theme.

## Things that will bite you

**`next.config.ts` runs more than once per build.** Anything generated there (the build time, the
fallback sealing key) is pinned with `process.env.X ??=` on the first evaluation. Generate a value
without that and the server and client bundles disagree.

**Without `TABLE_SECRET`, every build mints its own sealing key.** A redeploy mid-game then signs
every device out of it. Production should set it; a local run works without (the browser tests
set their own).

**`next dev` rewrites `AGENTS.md`.** Commit its block rather than reverting it, or every dev run
leaves the tree dirty. It also warns that this Next.js (16) differs from older versions: read
`node_modules/next/dist/docs/` before using an API you have not seen here.

**`npm run dev` provisions real Upstash databases.** Run `PARKS_STORE=memory npm run dev` to stay
offline. For a phone on the same Wi-Fi, open the tablet by the laptop's LAN address, not
`localhost`, or the QR codes point nowhere the phone can reach.

**CSS class names are global.** Grep before coining one: a setup screen styled as `.camp` once
restyled every Nightfall campsite button into a full-screen column. The setup uses `.basecamp`.

**Playwright reuses whatever already listens on ports 3200 and 3299** outside CI. Stop any
`next dev` or `next start` there first, or the browser tests run against it instead of the build.

**The pinned `@playwright/test` needs its own Chromium build** (`npx playwright install chromium`).
Where a different Chromium is preinstalled, point `launchOptions.executablePath` at it from a
config under `out/` (gitignored) instead of editing `playwright.config.ts`.

**Table codes are random letters.** Assert on patterns, never on the absence of letters: a code that
spelled `FVP8A` once failed a "no VP in the header" check.

**A take-back cannot cross a revealed card.** `revealsNothing` in `room.ts` refuses an undo once
any deck shrank, a row showed a card it did not show before (the Outfitter Camp turns the gear row
over without shrinking the deck), or a season turned; a new deck or face-down pile must be added
to that check.

**Full-screen lengths go through `var(--full-h)` / `var(--full-w)`, never `100dvh` / `100vw`.**
The menus' scale setting is CSS `zoom` on the root, and a zoomed viewport unit grows with it, so
the tokens divide by `--zoom`. Measure the board with `clientWidth`, not `getBoundingClientRect`,
for the same reason.

**A seat's Pokémon (`avatar`) is not its name.** Pawns and hiker names follow the avatar
(`src/art/pokemon.tsx`, `names.ts`); it is unique at the table, and only a seat's own phone may
change it (`/api/games/avatar`).

**CI's push trigger names `main`, which this remote does not have.** CI still runs on every pull
request; nothing runs on a merge.

## Testing

```bash
npm run typecheck   # tsc --noEmit
npm test            # Vitest: engine, room, views, sealing, provisioning, the service over redis-server
npm run build       # the production build the browser tests run against
npm run test:e2e    # Playwright: setup, board, phones, footer; mock Upstash on :3299, app on :3200
```

The browser tests start `scripts/mock-upstash.mjs` and the built app themselves
(`playwright.config.ts`), with `PARKS_RATE_LIMIT=50`, since every test opens a table from the
same address. Read expected text from the served files (as `e2e/footer.spec.ts` reads
`/updates.txt`) rather than hard-coding it.

## Style

* **Comments say why, in full sentences;** doc comments open each exported component and module.
* **UI copy is plain sentences in the app's voice**, with the typographic apostrophe (`’`) and the
  spelling already there (`colour`). No jargon the table would not use: "stop", "seat", "pack".
* **Commit subjects say what changed for the players;** the body says why.
* **Dependencies:** five at runtime (`next`, `react`, `react-dom`, `qrcode-generator`,
  `server-only`). The art, the icons and the QR codes are drawn here; add a dependency only with a
  reason stated in the PR.
