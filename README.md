# Trailside Seasons — Table

The [PARKS-style hiking game](https://github.com/ClemL/parks-game), rebuilt for one tablet in the
middle of the table and a phone in every player's hand. Up to five seats (four by default); every
seat nobody scans into is played by the computer.

- **The tablet is the board**, read upright from one side. It draws the hiking trail as a path
  winding across the screen, a large round stop for each site, out along the top row and back
  along the next to the Trail End. Each stop is an enamel badge: the scene in a window, the name
  round the rim, the step on a tab, and a rim in the colour of what the stop pays — blue for
  water, green for trees, gold for sun, grey for stone — or of the kind of stop it is (purple for
  Wildlife). Hikers are walked here. The parks on offer, the gear shop and
  the campsites wait in a drawer, closed until someone opens it: each phone shows them, and parks
  and gear are bought on the buyer's own phone or in that drawer.
- **Each phone is one player's own sheet.** Resources, the camera, photos, campfires, bottles,
  gear, parks visited and reserved — and the two secret objectives, with a **Hide** button. Once
  the game is dealt the phone is held sideways, with five panels a swipe apart: **Status** (the
  sheet), **Hike**, the parks, the gear shop (**REI**) and the menu (☰). The parks and REI show your pack
  above the cards, grey out gear you are short of sun for, and their notes close with a ✕. When
  one of your hikers stops at the Trail End or a Ranger Station the parks come up by themselves,
  and you can visit, reserve, buy or pass from the phone. Visiting a park — and tapping one on a
  sheet — tells you where it is, when it became a national park, and one fact about it.
  On your turn Hike lists where your hikers can go and what each stop would hand you — with your
  campfire lit, the taken stops too, with who holds them — and at a decision what each answer
  would do; it also shows the Nightfall campsites still open, and your tokens, flasks, camera and
  campfire down its right side. Each objective shows how far along it is. **Flasks start
  unarmed:** tap one (on Status or Hike) to arm it, and armed flasks fill themselves, in the order
  they were armed, from the water a stop pays you at the end of that turn; a player who goes the
  whole first season without emptying one gets a nudge. Whenever anyone collects resources, a
  small toast in the corner of every phone shows their Pokémon and what came in. A phone can also
  open the computer players' sheets (or every sheet, if the table allows it). The menu holds your
  Pokémon, the text size and scale for that phone, the rules of the board in play, and **Leave
  seat**.
- **Every seat's pawn is a Pokémon in a ranger's hat** — one of twenty, never two alike at a
  table, drawn in `src/art/pokemon.tsx` — with the seat's letters on a tag. Whoever joins gets one
  at random and can step through the unused ones from their phone; a seat's two hikers are that
  Pokémon, ♂ and ♀. A blank name takes the Pokémon's name.
- **Park cards are trail posters** (`src/components/ParkPoster.tsx`): the park's illustration edge
  to edge, its name on a dark banner with the state and the year it became a national park, a
  points medallion, and on a Pokémon-themed table, a Pokémon visiting from the corner — one suited
  to the park (water parks get Squirtle or Psyduck, deserts Diglett or Vulpix), always the same one
  for the same park.
  With Wildlife, the park the bison stands on carries its token, drawn as Tauros and sized to be
  spotted across the table; the trade and the cards call it Tauros too.
- **REI's cards are price tags** (`src/components/PriceTag.tsx`): kraft card with a punched hole
  and string, the price on a round sticker (struck through when a discount applies), upright on
  the phone and in the drawer and on their side in the tablet's shop, where the sticker is the
  buy button. On a **Pokémon-themed** table (the default; switch it at setup or in the table
  menu) the gear is Pokémon gear — Squirtle’s Water Filter, Snorlax’s Sleeping Bag and the rest,
  each with its Pokémon beside it, and Ditto for anything without an obvious owner — and a Pokémon
  visits every park card. With the theme off, REI and the parks are plain; the pawns stay
  Pokémon. Looks only, the rules are the same. Every item is drawn (`src/art/gear.tsx`) rather
  than an emoji, so it looks the same on every device.
- **Diorama stops** (a table setting, off to begin with, also in the table menu) draw every stop
  on the trail as a little isometric tile with its landmark standing on it — the Trailhead's
  signpost, the Valley's river spilling over the tile's edge, the Fire Lookout's tower — instead
  of a round scene (`src/art/diorama.tsx`).
- **Reserved parks sit in their own row**, marked Reserved, under the three parks and the deck,
  on the phone and in the tablet's shop.
- **The board moves.** A hiker walks from stop to stop along the trail to where it is going — on a
  long trip it may hop, skip or roll instead — a campfire spent to share a stop flares on that
  stop, and an emptied flask tips out and shows what it made. When Tauros trades, it stomps onto
  the stop, takes what it was given and hands a wildcard back; then it walks across the park
  cards to its next park, in the drawer if it is open or on a strip of cards that rises above the
  turn bar for it, and on any phone showing its Parks panel. Every phone's toast shows Tauros
  passing the wildcard over. Tent sites carry a drawn tent. None of it plays under *reduce motion*.
- **Every game gets a fresh Upstash Redis database**, provisioned on the spot through Upstash's
  `start-redis` endpoint (no account, no API key), and used until the game is over or abandoned.

> Fan project. Not affiliated with, endorsed by, or licensed from Keymaster Games, who publish
> *PARKS*. The rules engine, cards and artwork come from [parks-game](https://github.com/ClemL/parks-game).

## How a game goes

1. **Set the table.** The tablet opens on one screen that lasts until the deal: a band of the
   trail's scenery with the title, a **card for each seat** in one row — seats (2–5) are added and
   dropped beside it — and the settings under the cards: the Nightfall and Wildlife expansions,
   the house rules, the Pokémon theme and diorama stops, how fast the computers move, and whose
   sheets a phone may open. A **Full screen** button in the scenery's corner hides the browser's
   bars for the whole game; it stays until the tablet leaves full screen. The house rules sit on one card that names the ones switched on and
   opens all seven in a dialog of their own.
2. **Open the table.** The server provisions a new Upstash database for this game, and a **QR
   code** appears on every seat's card, so everyone can scan at once. The settings stay where they
   are, still editable, and **Start** takes Open's place. Names can be typed on the tablet or on
   the phone.
3. **Phones scan in.** Scanning a seat's code opens that seat on the phone. Scanning it again from
   another phone moves the seat there (the first phone is told), so a dead phone is never stuck.
4. **Start.** Open seats become computer players, each with its own name and playing style.
5. **Play.** The players run along the top in turn order, with whoever moves next marked **Up
   next**. Whoever is on the clock gets the turn bar along the bottom — what to do, and their pack —
   and walks a hiker on the tablet: tap the hiker (the rear one is picked to begin with), then any
   lit stop. A move onto an occupied stop asks before spending the campfire. Decisions — the
   camera, trades, tents, the bison, the token limit — open a sheet over the board, and each answer
   says what it would do to the player's sheet. At the Trail End or a Ranger Station the turn bar
   says to choose on the phone, or to open **Parks & gear**, where each park checks its cost
   against the player's pack, with **Visit / Reserve / Buy** right on the cards; **Pass** is on the
   turn bar. The phone of whoever is up buzzes, and lists what each reachable stop would pay them.
   - **Rules:** tap a stop you cannot walk to, or hold any stop or card, for its full rules; each
     phone's menu lists everything on the board.
   - **Undo:** for eight seconds after a tap on the tablet, the turn bar offers to take it back,
     along with any computer moves since — unless a card has come to light in the meantime (a
     refilled park or gear row, a bottle, a new season).
6. **Seasons and scoring.** Between seasons night falls on the Trail End: everyone's pawn sits by
   the fire, the tablet says what carries over (packs, relit campfires, refilled bottles, a new
   stop and season card to come) and who leads next, and a button turns to how the season went
   for each player — the parks they visited, what they collected and the photos they took, read
   from the public log. After the last season the final scores — with every objective revealed —
   show each player's pawn along a points trail, and under it each journal as a scorecard.

The table menu (☰) during play changes the pace and the peek rule, puts the tablet full screen or
takes it out, sets the tablet's text size and scale, shows any seat's code again for a late or replacement phone, hands a seat to the computer,
and abandons the game.

### Rules

All of the [parks-game rules as implemented](https://github.com/ClemL/parks-game#rules-as-implemented)
apply unchanged — the engine in `src/game/` is that repository's, with two corrections made while
porting: a view no longer carries the season cards and advanced sites still to come, and the log no
longer names a park reserved face down from the deck.

Seven rules are chosen at setup. Two are published rules and start on: **Reserve from the deck**
(a reserve may take the unseen top park) and **Last hiker goes home** (the rulebook's "last hiker
on the trail": once only one hiker is still out, it walks straight to the Trail End and takes the
Trail End's turn there; a game saved before this rule existed carries on without it). The rest are
this table's own and start off: **Ranger Station first** (spring's advanced site is always the
Ranger Station), **Gear from the deck** (with 3 or more sun at the Trail End, buy the top gear
card unseen for 1 sun less than its usual price; gear tops out at 4 sun, so 3 always covers it),
**A park in hand** (everyone starts holding one park, dealt face down into their
reservations; it does not take the first player token) and **Chain park visits** (at the Trail
End, a visit opens another visit, and another, while the pack covers one; a reserve or gear does
not start the chain, and mid-chain only visiting or stopping is on offer; after each visit's
story the phone and the tablet return to the parks) and **Short game** (the game ends after the
second season, summer, and is scored then; the computers plan for two seasons).

Two rules differ from parks-game: the **Outfitter Camp** lets the camper choose which card of the
fresh gear row to take, as its text says, and a player's **armed flasks** fill themselves at the
end of a turn (a flask can still be emptied by hand on the tablet).

What differs is who sees what, which is the point of the table:

| Information | Tablet | Your phone | Another phone |
| --- | --- | --- | --- |
| Trail, parks on offer, gear shop, campsites, camera and first-player holders | ✓ | ✓ | ✓ |
| Your resources, bottles, gear, photos, parks | while you act | ✓ | only if the table allows **every seat** |
| A computer player's sheet | — | ✓ | ✓ |
| Your secret objectives | never | ✓ (hideable) | never |
| Parks you reserved | while you stand at a park decision | ✓ | count only |
| Park and gear deck order, upcoming seasons, RNG | never | never | never |

At the final scoring everything except the deck is revealed.

## Changelog

`public/updates.txt` is the changelog: one entry per line, **oldest first**, so shipping one is a
one-line append. Each line reads `YYYY-MM-DDTHH:MM:00Z - What changed, as a plain sentence`
(`date -u +%Y-%m-%dT%H:%M:00Z` prints the timestamp). Only user-visible changes get a line.

The footer on the setup screen and on the phone's join and waiting pages shows the app's version,
when it was built and the newest entry; tapping the entry opens every entry, newest first. The file
is fetched, not bundled, so editing it needs no code change; if it is missing or empty the footer
shows the build info alone.

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
