# Trailside Seasons — Table

The [PARKS-style hiking game](https://github.com/ClemL/parks-game), rebuilt for one tablet in the
middle of the table and a phone in every player's hand. Up to five seats (four by default); every
seat nobody scans into is played by the computer.

- **The tablet is the board, and the only controller.** It shows the hiking trail, the parks on
  offer, the gear shop and the campsites. Hikers are moved, and parks and gear bought, here.
- **Each phone is one player's own sheet.** Resources, the camera, photos, campfires, bottles,
  gear, parks visited and reserved — and the two secret objectives, with a **Hide** button.
  A phone can also open the computer players' sheets (or every sheet, if the table allows it).
- **Every game gets a fresh Upstash Redis database**, provisioned on the spot through Upstash's
  `start-redis` endpoint (no account, no API key), and used until the game is over or abandoned.

> Fan project. Not affiliated with, endorsed by, or licensed from Keymaster Games, who publish
> *PARKS*. The rules engine, cards and artwork come from [parks-game](https://github.com/ClemL/parks-game).

## How a game goes

1. **Settings.** The tablet opens on the settings screen: seats (2–5), the Nightfall and Wildlife
   expansions, two house rules, how fast the computers move, and whose sheets a phone may open.
2. **Open the table.** The server provisions a new Upstash database for this game, and the tablet
   shows the lobby: a **name tag and a QR code for each seat**, on the edge of the tablet nearest
   whoever sits there, turned to face them. Names can be typed on the tablet or on the phone.
3. **Phones scan in.** Scanning a seat's code opens that seat on the phone. Scanning it again from
   another phone moves the seat there (the first phone is told), so a dead phone is never stuck.
4. **Start.** Open seats become computer players, each with its own name and playing style.
5. **Play.** Whoever is on the clock walks a hiker on the tablet: tap the hiker (the rear one is
   picked to begin with), then any lit site. A move onto an occupied site asks before spending
   the campfire. Decisions — the camera, trades, tents, the bison, the token limit — open a sheet
   turned toward that player's edge. At the Trail End or a Ranger Station the park row and gear
   shop grow **Visit / Reserve / Buy** buttons right on the board. The phone of whoever is up
   buzzes.
6. **Seasons and scoring.** The tablet turns the page between seasons. After winter, the final
   scores — with every objective revealed — show on the tablet and every phone.

The table menu (☰) during play changes the pace and the peek rule, shows any seat's code again for
a late or replacement phone, hands a seat to the computer, and abandons the game.

### Rules

All of the [parks-game rules as implemented](https://github.com/ClemL/parks-game#rules-as-implemented)
apply unchanged — the engine in `src/game/` is that repository's, with two corrections made while
porting: a view no longer carries the season cards and advanced sites still to come, and the log no
longer names a park reserved face down from the deck.

What differs is who sees what, which is the point of the table:

| Information | Tablet | Your phone | Another phone |
| --- | --- | --- | --- |
| Trail, parks on offer, gear shop, campsites, camera and first-player holders | ✓ | ✓ | ✓ |
| Your resources, bottles, gear, photos, parks | while you act | ✓ | only if the table allows **every seat** |
| A computer player's sheet | — | ✓ | ✓ |
| Your secret objectives | never | ✓ (hideable) | never |
| Parks you reserved | while you stand at a park decision | ✓ | count only |
| Park deck order, upcoming seasons, RNG | never | never | never |

At the final scoring everything except the deck is revealed.

## How it is wired

```
 tablet ──┐                      ┌── POST https://upstash.com/start-redis   (once per game)
 phones ──┼─► Next.js routes ────┤
          │   (Vercel functions) └── Upstash REST API of that game's database
          │     src/server/*            parks:game:<code>  "v<version>;d<cpuDueAt>;<deflated room>"
          └── polls GET /api/games/state?since=<version>
```

- **One key per game.** The room — seats, settings and the full game state — is stored deflated
  behind a short plain-text prefix holding its version and when the next computer move is due. A
  poll reads only that prefix (`GETRANGE`, ~40 bytes) unless something changed, so a five-device
  table costs a few thousand Redis commands an hour.
- **Writes are a compare-and-set** on the version, in a Lua `EVAL`, because the REST API has no
  `WATCH` across calls. A writer that loses retries against the state that won.
- **The computers move on a clock, not instantly.** When a computer is on the clock the room
  records when its next step is due; whichever device polls after that moment plays it (and any
  others that came due) and writes the result. The tablet polls faster while a computer thinks, so
  its moves appear one beat at a time and light up the site they landed on.
- **Sealed handles.** Each game lives in its own database, so a request has to say which one. The
  tablet and the phones hold *handles*: the database's endpoint and token, the game code, and who
  is asking, encrypted and authenticated with AES-256-GCM under a key only the server has
  (`src/server/seal.ts`). A phone cannot read the credentials out of its handle (and go round the
  server to read everyone's objectives), nor forge one (and point the server at a host of its
  choosing). A seat's QR code is a *ticket* that can only be traded for a phone handle; a phone
  handle carries a per-device nonce, so a later scan of the same seat signs the earlier phone out.
- **Redaction happens on the server** (`viewFor` in `src/game/view.ts`, policies in
  `src/room/room.ts`). Each device is sent only what it may see; the tests assert on the JSON,
  not on what the UI happens to render.

### The database per game

`createGame` in `src/server/service.ts` calls `start-redis` with a fresh UUID as the
`Idempotency-Key`, parses the markdown answer for the endpoint and token, waits for the new
endpoint to answer a `PING` (a brand-new database can take a few seconds to appear in DNS), and
writes the lobby. That key re-fetches the database's credentials, so it never leaves the server —
the tablet is shown only a fingerprint and the expiry.

- **Game over:** the game's key is kept for six hours so phones can read the scores. The next game
  provisions a new database.
- **Abandoned:** the tablet's *Abandon* deletes the game's key at once; a game nobody touches for
  24 hours expires on its own.
- **The database itself** is Upstash's to remove: unclaimed `start-redis` databases are deleted after
  three days. There is no API call to delete one sooner.
- **If `start-redis` cannot be reached**, a new game falls back to the deployment's shared database
  when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are set, and to process memory on a
  laptop. On a deployment with neither, opening a table fails with the reason rather than silently
  using memory, which each serverless instance would hold separately.

## Deploy to Vercel

1. <https://vercel.com/new> → *Import Git Repository* → `ClemL/tablet-parks`. The Next.js preset is
   detected; nothing in the build settings needs changing.
2. **Recommended:** add `TABLE_SECRET` (any long random string) under *Settings → Environment
   Variables*. Without it each build mints its own sealing key, so a redeploy in the middle of a
   game signs every device out of it.
3. Deploy. No database needs to be attached: each game provisions its own.

| Variable | Required | What it does |
| --- | --- | --- |
| `TABLE_SECRET` | recommended | Key for sealed handles. Keeps games alive across redeploys |
| `PARKS_STORE` | no | `start-redis` (default), `env` (always use the shared database below) or `memory` (one process only) |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | no | Shared fallback database; `KV_REST_API_URL`/`KV_REST_API_TOKEN` also work |
| `UPSTASH_START_REDIS_URL` | no | Override the provisioning endpoint — the tests point it at a local mock |
| `PARKS_RATE_LIMIT` | no | Multiplies the per-address limits on new games (12 per 10 minutes) and joins (40) |

`GET /api/health` reports the store mode and which variables are present, never their values.

## Develop

```bash
npm install
npm run dev          # http://localhost:3000 — open /, then scan a seat's code with a phone on the same Wi-Fi
npm test             # engine, room, sealing, provisioning and the full service over a real redis-server
npm run typecheck
npm run build
npm run test:e2e     # Playwright against the build, with a mock Upstash in front of redis-server
```

`npm run dev` provisions real `start-redis` databases. To stay offline, run with
`PARKS_STORE=memory`. For a phone on the same network, open the tablet page by the laptop's LAN
address (not `localhost`), so the QR codes point somewhere the phone can reach.

The integration tests and the browser tests need `redis-server` on the `PATH` (or `REDIS_PORT`
pointing at one); `scripts/mock-upstash.mjs` answers `start-redis` the way Upstash does and serves
each database's REST API in front of it, so the compare-and-set Lua runs for real.

### Layout

```
src/game/         Rules engine from parks-game — pure, no React or DOM
src/room/         One table: seats, settings, the computers' clock, who sees what (pure)
src/server/       start-redis provisioning, REST client, store, sealing, the game service
src/app/api/      Route handlers: games, state, join, seat, move, control, leave, abandon, health
src/client/       API client, the polling hook, localStorage
src/components/   tablet/ (settings, lobby, board, sheets, menu) · phone/ · shared cards
src/art/          The park and site illustrations from parks-game
scripts/          mock-upstash.mjs for the tests
e2e/              Browser tests
```
