import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

/**
 * The whole table in a real browser: one tablet page and a phone page per
 * player, against the production build and the stand-in Upstash (see
 * playwright.config.ts) — so every game here provisions its own database.
 */

const TABLET = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };
/** Once the game is dealt, a phone is played held sideways. */
const SIDEWAYS = { width: 844, height: 390 };

/** Every device a test opens, closed after it — a page left open keeps polling into the next test. */
const opened: BrowserContext[] = [];
test.afterEach(async () => {
  for (const context of opened.splice(0)) await context.close();
});

async function device(browser: Browser, options: Parameters<Browser['newContext']>[0]): Promise<Page> {
  const context = await browser.newContext(options);
  opened.push(context);
  return context.newPage();
}

const newTablet = (browser: Browser) => device(browser, { viewport: TABLET });

async function openTable(
  page: Page,
  options: { seats?: number; brisk?: boolean; base?: boolean; deckGear?: boolean; parkInHand?: boolean } = {},
): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Trailside Seasons' })).toBeVisible();
  if (options.seats) await setSeats(page, options.seats);
  if (options.brisk) await page.getByRole('radio', { name: 'Brisk' }).click();
  if (options.base) {
    // No expansions: no tents, so a plain site opens no decision.
    for (const name of ['Nightfall', 'Wildlife']) {
      const toggle = page.getByRole('switch', { name });
      if ((await toggle.getAttribute('aria-checked')) === 'true') await toggle.click();
    }
  }
  if (options.deckGear) await page.getByRole('switch', { name: 'Gear from the deck' }).click();
  if (options.parkInHand) await page.getByRole('switch', { name: 'A park in hand' }).click();
  await page.getByRole('button', { name: 'Open the table' }).click();
  await expect(page.getByRole('button', { name: 'Start the game' })).toBeVisible({ timeout: 30_000 });
}

/** Steps the seat count to `seats` with the stepper on the settings tile. */
async function setSeats(page: Page, seats: number): Promise<void> {
  const count = page.locator('output[aria-label="Seats"]');
  for (let i = 0; i < 6; i++) {
    const now = Number(await count.innerText());
    if (now === seats) return;
    await page.getByRole('button', { name: now > seats ? 'One seat fewer' : 'One seat more' }).click();
    await expect(count).not.toHaveText(String(now));
  }
  throw new Error(`could not set ${seats} seats`);
}

async function seatLink(tablet: Page, seat: number): Promise<string> {
  const href = await tablet.locator(`a[aria-label="Seat ${seat} join link"]`).getAttribute('href');
  if (!href) throw new Error(`no link for seat ${seat}`);
  return href;
}

async function joinOnPhone(browser: Browser, url: string, name: string): Promise<Page> {
  const phone = await device(browser, { viewport: PHONE, isMobile: true, hasTouch: true });
  await phone.goto(url);
  await phone.getByLabel('Your name').fill(name);
  await phone.getByRole('button', { name: /^Take seat \d$/ }).click();
  await expect(phone.getByText('You’re in.')).toBeVisible();
  return phone;
}

/** Closes the who-is-who roster a phone shows when the game is dealt, if it is up. */
async function dismissRoster(phone: Page): Promise<void> {
  const roster = phone.locator('.roster');
  if (await roster.count()) await roster.getByRole('button', { name: 'Let’s hike' }).click();
  await expect(phone.locator('.roster')).toHaveCount(0);
}

/**
 * Clicks, and waits for the tablet's call to the server to come back, so the
 * next look at the screen sees the game after this action rather than during.
 */
async function act(tablet: Page, click: () => Promise<void>): Promise<void> {
  const answered = tablet.waitForResponse((r) => /\/api\/games\/(move|control)$/.test(new URL(r.url()).pathname));
  await click();
  await answered;
  await tablet.waitForTimeout(100);
}

/**
 * Answers whatever a person has to do on the tablet, once: a decision sheet,
 * a park decision, or a move. Returns false when nobody on the tablet is up.
 */
async function playOnce(tablet: Page): Promise<boolean> {
  const sheet = tablet.locator('.sheet[role=dialog]').filter({ hasNot: tablet.locator('#season-title, #final-title, #menu-title') });
  if (await sheet.count()) {
    const primary = sheet.locator('.choice--primary:not([disabled])');
    const choice = (await primary.count()) ? primary.first() : sheet.locator('.choice:not([disabled])').first();
    await act(tablet, () => choice.click());
    return true;
  }
  // A park decision: the parks stay in their drawer, and Pass is on the turn bar.
  const pass = tablet.locator('.turnbar .rail-btn--pass');
  if (await pass.count()) {
    await act(tablet, () => pass.click());
    return true;
  }
  const target = tablet.locator('.site--target .site__face');
  if (await target.count()) {
    await act(tablet, () => target.first().click());
    return true;
  }
  // Every reachable site is occupied: share one, which asks before spending the campfire.
  const shared = tablet.locator('.site--campfire .site__face');
  if (await shared.count()) {
    await shared.first().click();
    await act(tablet, () => tablet.getByRole('button', { name: 'Spend the campfire' }).click());
    return true;
  }
  return false;
}

test.describe('round the tablet', () => {
  test('opens on the settings, provisions a database, and seats a phone by its QR code', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet);
    await expect(tablet.getByText('A fresh Upstash Redis database for this game')).toBeVisible();
    for (const seat of [1, 2, 3, 4]) {
      await expect(tablet.getByRole('img', { name: `Scan to take seat ${seat}` })).toBeVisible();
    }

    const phone = await joinOnPhone(browser, await seatLink(tablet, 1), 'Kris');
    await expect(phone.getByRole('heading', { name: 'Kris' })).toBeVisible();
    await expect(tablet.getByText('Phone joined · seat 1')).toBeVisible();
    await expect(tablet.locator('.seat-card__name', { hasText: 'Kris' })).toBeVisible();

    // The settings stay on the same screen once the table is open, and change the room.
    await tablet.getByRole('radio', { name: 'Brisk' }).click();
    await expect(tablet.getByRole('radio', { name: 'Brisk' })).toHaveAttribute('aria-checked', 'true');

    // A reload picks the same table back up.
    const code = await tablet.locator('.setup__title .code').innerText();
    await tablet.reload();
    await expect(tablet.locator('.setup__title .code')).toHaveText(code);
    await expect(tablet.getByRole('radio', { name: 'Brisk' })).toHaveAttribute('aria-checked', 'true');
  });

  test('a second phone scanning the same seat takes it over', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2 });
    const url = await seatLink(tablet, 1);
    const first = await joinOnPhone(browser, url, 'Kris');
    await joinOnPhone(browser, url, 'Kris');
    await expect(first.getByText('Another phone has taken this seat')).toBeVisible({ timeout: 10_000 });
  });

  test('people move on the tablet; each phone shows its own sheet and only the computers’ besides', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 3, brisk: true });
    const kris = await joinOnPhone(browser, await seatLink(tablet, 1), 'Kris');
    await joinOnPhone(browser, await seatLink(tablet, 2), 'Srini');
    await tablet.getByRole('button', { name: 'Start the game' }).click();
    await expect(tablet.locator('.trail')).toBeVisible();
    await kris.setViewportSize(SIDEWAYS);

    // The phones never walk a hiker: there is no trail on them to tap.
    await expect(kris.getByText(/make your move on the tablet|thinking|’s turn/)).toBeVisible({ timeout: 10_000 });
    await expect(kris.locator('.site, .market')).toHaveCount(0);

    // Another person's sheet is locked; the computer's is open.
    await expect(kris.getByRole('button', { name: /Srini/ })).toBeDisabled();
    await expect(kris.getByRole('button', { name: /Pikachu|Eevee|Charizard|Snorlax/ })).toBeEnabled();

    // The tablet plays the people's turns until the log has moved on a good way.
    let played = 0;
    for (let i = 0; i < 120 && played < 6; i++) {
      if (await playOnce(tablet)) played++;
      else await tablet.waitForTimeout(300);
    }
    expect(played).toBeGreaterThanOrEqual(6);

    // Kris's objectives are on Kris's phone, each with how far along it is, and nowhere on the tablet.
    const objectives = await kris.locator('.objective b').allInnerTexts();
    expect(objectives).toHaveLength(2);
    await expect(kris.locator('.objective .objective__progress')).toHaveCount(2);
    const tabletText = await tablet.locator('body').innerText();
    for (const name of objectives) expect(tabletText).not.toContain(name);

    // Hidden objectives stay hidden through a reload.
    await kris.getByRole('button', { name: /Hide/ }).click();
    await expect(kris.getByText(/^Hidden\./)).toBeVisible();
    await kris.reload();
    await expect(kris.getByText(/^Hidden\./)).toBeVisible();
    await expect(kris.locator('.objective')).toHaveCount(0);
    await kris.getByRole('button', { name: /Show/ }).click();
    await expect(kris.locator('.objective')).toHaveCount(2);
  });

  test('abandoning the table signs every phone out', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2 });
    const phone = await joinOnPhone(browser, await seatLink(tablet, 1), 'Teja');
    await tablet.getByRole('button', { name: 'Abandon table' }).click();
    await expect(tablet.getByRole('button', { name: 'Open the table' })).toBeVisible();
    await expect(phone.getByText('This game has ended')).toBeVisible({ timeout: 10_000 });
  });

  test('a table of computers plays itself', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2, brisk: true });
    await tablet.getByRole('button', { name: 'Start the game' }).click();
    await expect(tablet.locator('.turnbar--thinking')).toBeVisible();
    const before = await tablet.locator('.site__hikers .hiker').evaluateAll((els) => els.map((e) => e.closest('.site')?.className));
    await expect
      .poll(async () => tablet.locator('.site__hikers .hiker').evaluateAll((els) => els.map((e) => e.closest('.site')?.className)), {
        timeout: 15_000,
      })
      .not.toEqual(before);
  });

  test('on your turn the phone previews the sites the tablet lights up', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2, brisk: true });
    const kris = await joinOnPhone(browser, await seatLink(tablet, 1), 'Kris');
    await tablet.getByRole('button', { name: 'Start the game' }).click();
    await kris.setViewportSize(SIDEWAYS);

    await expect(tablet.locator('.site--target').first()).toBeVisible({ timeout: 20_000 });
    await expect(kris.getByText('Your turn — make your move on the tablet.')).toBeVisible({ timeout: 10_000 });
    await expect(tablet.locator('.turnbar--acting')).toContainText('Walk a hiker');

    // Both hikers start on the Trailhead, so the phone lists one group: the sites the tablet lit.
    // Each tile's name leads with its step on the switchback.
    const lit = (await tablet.locator('.site--target .site__name').allInnerTexts()).map((name) => name.replace(/^\d+\s*/, ''));
    // The moves have their own panel, which comes up by itself when the turn does.
    await dismissRoster(kris);
    await expect(kris.getByRole('tab', { name: /^Hike/ })).toHaveAttribute('aria-selected', 'true', { timeout: 10_000 });
    const listed = await kris.locator('#panel-moves .preview__group').first().locator('.reach__name').allInnerTexts();
    expect(listed.length).toBeGreaterThan(0);
    expect(listed).toEqual(lit);
    // It only reads: nothing on the phone can make the move.
    await expect(kris.locator('.preview button')).toHaveCount(0);
  });

  test('the parks and gear stay hidden until asked for, even at the Trail End', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2, brisk: true });
    await joinOnPhone(browser, await seatLink(tablet, 1), 'Kris');
    await tablet.getByRole('button', { name: 'Start the game' }).click();

    const drawer = tablet.locator('#market-drawer');
    const end = tablet.locator('.site--target', { hasText: 'Trail End' }).locator('.site__face');
    await expect(end).toBeVisible({ timeout: 20_000 });
    await expect(drawer).toBeHidden();
    await act(tablet, () => end.click());

    // The decision is announced on the turn bar; the cards wait in the drawer, and on Kris's phone.
    await expect(tablet.locator('.turnbar--acting')).toContainText('At the Trail End');
    await expect(drawer).toBeHidden();
    await expect(tablet.locator('.trail__sites')).toBeVisible();
    await tablet.getByRole('button', { name: 'Parks & gear' }).click();
    await expect(tablet.locator('.shop')).toBeVisible();
    await expect(tablet.getByRole('heading', { name: 'Visit or reserve a park' })).toBeVisible();
    await expect(tablet.locator('.shop-park').first().locator('.check').first()).toBeVisible();

    await act(tablet, () => tablet.getByRole('button', { name: 'Pass', exact: true }).click());
    await expect(tablet.locator('.shop')).toHaveCount(0);
    // Left open, the drawer goes back to the cards on offer; closing it puts it away.
    await expect(drawer.locator('.market')).toBeVisible();
    await tablet.getByRole('button', { name: 'Hide parks and gear' }).click();
    await expect(drawer).toBeHidden();
  });

  test('with the deck-gear house rule, the top of the gear deck is for sale unseen', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2, brisk: true, deckGear: true });
    await expect(tablet.getByRole('switch', { name: 'Gear from the deck' })).toHaveAttribute('aria-checked', 'true');
    const kris = await joinOnPhone(browser, await seatLink(tablet, 1), 'Kris');
    await tablet.getByRole('button', { name: 'Start the game' }).click();
    await kris.setViewportSize(SIDEWAYS);

    const end = tablet.locator('.site--target', { hasText: 'Trail End' }).locator('.site__face');
    await expect(end).toBeVisible({ timeout: 20_000 });
    await dismissRoster(kris);
    await act(tablet, () => end.click());

    // On the tablet: the deck is in the gear shop, closed to a pack without 3 sun.
    await tablet.getByRole('button', { name: 'Parks & gear' }).click();
    const deck = tablet.locator('.shop-gear--deck');
    await expect(deck).toContainText('Top of the gear deck');
    const sun = Number((await tablet.locator('.turnbar .rail__pack-tokens > span').first().innerText()).trim());
    const buy = deck.getByRole('button', { name: /Buy the top card of the gear deck/ });
    if (sun >= 3) await expect(buy).toBeEnabled();
    else await expect(buy).toBeDisabled();

    // On the phone: the same offer, in the REI panel, side by side with the row's three cards.
    await kris.getByRole('tab', { name: /^REI/ }).click();
    await expect(kris.locator('#panel-gear .gear-offer--deck')).toContainText('Top of the gear deck');
    const tops = await kris.locator('#panel-gear .gear-offer').evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(tops).toHaveLength(4);
    expect(new Set(tops).size).toBe(1);
    await act(tablet, () => tablet.getByRole('button', { name: 'Pass', exact: true }).click());
  });

  test('tapping a site that is not lit reads its rules, upright', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2, brisk: true });
    await tablet.getByRole('button', { name: 'Start the game' }).click();
    await expect(tablet.locator('.trail__sites')).toBeVisible();

    // The Trailhead is never a place to walk to.
    await tablet.locator('.site__face').first().click();
    const rules = tablet.getByRole('dialog', { name: 'Trailhead' });
    await expect(rules).toBeVisible();
    await expect(rules).toContainText('Hikers start here');
    // The board reads from one side, so the rules do too.
    await expect(rules).toHaveClass(/sheet--bottom/);
    await expect(rules.getByRole('button', { name: 'Turn this toward the next seat' })).toHaveCount(0);
    await rules.getByRole('button', { name: 'Close the rules' }).click();
    await expect(rules).toHaveCount(0);

    // The rules of the whole board live on each phone's menu, not on the tablet; and the
    // tablet's menu carries no table code, nor the players' homecoming counts.
    await expect(tablet.getByRole('button', { name: 'Rules', exact: true })).toHaveCount(0);
    await expect(tablet.getByRole('button', { name: 'Table menu' })).toHaveText('');
    await expect(tablet.locator('.order')).not.toContainText(/home|held/);
  });

  test('a mis-tap can be taken back for a few seconds, and the next seat is marked', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2, brisk: true, base: true });
    await joinOnPhone(browser, await seatLink(tablet, 1), 'Kris');
    await tablet.getByRole('button', { name: 'Start the game' }).click();

    await expect(tablet.locator('.turnbar--acting')).toContainText('Kris', { timeout: 20_000 });
    await expect(tablet.locator('.order__seat--next')).toHaveCount(1);
    const before = await tablet.locator('.site__hikers').allInnerTexts();

    // A site that only pays out: no decision follows, so the take-back is on the turn bar.
    await act(tablet, () => tablet.locator('.site--target', { has: tablet.locator('.site__does .tok-row') }).first().locator('.site__face').click());
    const undo = tablet.getByRole('button', { name: /^Take back: moved to/ });
    await expect(undo).toBeVisible();
    await act(tablet, () => undo.click());

    await expect(tablet.locator('.turnbar--acting')).toContainText('Kris');
    await expect(tablet.locator('.site--target').first()).toBeVisible();
    expect(await tablet.locator('.site__hikers').allInnerTexts()).toEqual(before);
    await expect(undo).toHaveCount(0);
  });

  test('once dealt, a phone is played sideways', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2, brisk: true });
    const kris = await joinOnPhone(browser, await seatLink(tablet, 1), 'Kris');
    await tablet.getByRole('button', { name: 'Start the game' }).click();

    const prompt = kris.getByRole('heading', { name: 'Turn your phone sideways' });
    await expect(prompt).toBeVisible({ timeout: 10_000 });
    await expect(kris.locator('.play__frame')).toBeHidden();

    await kris.setViewportSize(SIDEWAYS);
    await expect(prompt).toBeHidden();
    await dismissRoster(kris);
    await kris.getByRole('tab', { name: 'Status' }).click();
    await expect(kris.getByRole('tab', { name: 'Status' })).toHaveAttribute('aria-selected', 'true');
    // No running score in the header: the sheet carries the details. A score, not the
    // letters: a table code can spell "VP".
    await expect(kris.locator('.play__bar')).not.toContainText(/\d\s*VP\b/);
    // The parks and the gear are a swipe away, to browse; nothing to press until a hiker stops for them.
    await kris.getByRole('tab', { name: 'Parks' }).click();
    await expect(kris.locator('#panel-parks .offer').first()).toBeVisible();
    await expect(kris.locator('#panel-parks .offer-btn')).toHaveCount(0);
  });

  test('at a park decision the phone brings up the parks, and can answer it', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2, brisk: true });
    const kris = await joinOnPhone(browser, await seatLink(tablet, 1), 'Kris');
    await tablet.getByRole('button', { name: 'Start the game' }).click();
    await kris.setViewportSize(SIDEWAYS);

    const end = tablet.locator('.site--target', { hasText: 'Trail End' }).locator('.site__face');
    await expect(end).toBeVisible({ timeout: 20_000 });
    await dismissRoster(kris);
    await act(tablet, () => end.click());
    // The tablet keeps the parks in their drawer: the decision is the phone's to show.
    await expect(tablet.locator('.turnbar--acting')).toContainText('At the Trail End');
    await expect(tablet.locator('#market-drawer')).toBeHidden();

    // The phone turns to the parks by itself, with the decision's buttons live.
    await expect(kris.getByRole('tab', { name: /^Parks/ })).toHaveAttribute('aria-selected', 'true', { timeout: 10_000 });
    await expect(kris.locator('#panel-parks').getByRole('button', { name: /^Reserve/ }).first()).toBeEnabled();
    await kris.getByRole('tab', { name: /^REI/ }).click();
    await expect(kris.locator('#panel-gear').getByRole('button', { name: 'Buy' }).first()).toBeVisible();

    // Passing on the phone answers the stop: the tablet's turn bar moves on.
    await kris.locator('#panel-gear').getByRole('button', { name: 'Pass', exact: true }).click();
    await expect(tablet.locator('.turnbar')).not.toContainText('At the Trail End', { timeout: 10_000 });
    await expect(kris.locator('#panel-parks .offer-btn')).toHaveCount(0);
  });

  test('the phone’s menu trades its Pokémon, sizes the text, and reads the rules', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2, brisk: true });
    const kris = await joinOnPhone(browser, await seatLink(tablet, 1), 'Kris');

    // A typed name keeps the name and still wears a Pokémon, on the phone and the tablet alike.
    const card = tablet.locator('.seat-card', { hasText: 'Kris' });
    const first = (await kris.locator('.pk-picker__name').innerText()).trim();
    await expect(card.locator('.pawn')).toHaveAttribute('aria-label', `Kris (${first})`);
    await kris.getByRole('button', { name: /Next unused/ }).click();
    await expect(kris.locator('.pk-picker__name')).not.toHaveText(first);
    const second = (await kris.locator('.pk-picker__name').innerText()).trim();
    await expect(card.locator('.pawn')).toHaveAttribute('aria-label', `Kris (${second})`, { timeout: 10_000 });

    await tablet.getByRole('button', { name: 'Start the game' }).click();
    await kris.setViewportSize(SIDEWAYS);
    await dismissRoster(kris);
    // The hikers on the board are that Pokémon, ♂ and ♀.
    await expect(tablet.getByRole('img', { name: `${second} ♂ (Kris)` }).first()).toBeAttached();

    await kris.getByRole('tab', { name: 'Menu' }).click();
    const menu = kris.locator('#panel-menu');
    await expect(menu.getByRole('heading', { name: 'Rules' })).toBeVisible();
    await expect(menu.locator('.rules-list')).toContainText('Trail End');
    await menu.getByRole('radio', { name: 'Larger' }).click();
    await expect.poll(() => kris.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('20px');
    // Remembered on this phone through a reload.
    await kris.reload();
    await expect.poll(() => kris.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('20px');
    await expect(kris.locator('.play__bar')).not.toContainText('Table');
  });

  test('the parks panel shows the pack, and its note closes for good', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2, brisk: true });
    const kris = await joinOnPhone(browser, await seatLink(tablet, 1), 'Kris');
    await tablet.getByRole('button', { name: 'Start the game' }).click();
    await kris.setViewportSize(SIDEWAYS);
    await dismissRoster(kris);

    await kris.getByRole('tab', { name: 'Parks' }).click();
    const parks = kris.locator('#panel-parks');
    await expect(parks.getByRole('list', { name: 'Your pack' })).toBeVisible();
    await expect(parks.locator('.pack-strip__item')).toHaveCount(5);
    await expect(parks).not.toContainText('Your pack covers it');

    await parks.getByRole('button', { name: 'Close the Parks note' }).click();
    await expect(parks.getByRole('heading', { name: 'Parks' })).toHaveCount(0);
    await kris.reload();
    await expect(kris.locator('#panel-parks').getByRole('heading', { name: 'Parks' })).toHaveCount(0);
    // The menu brings it back.
    await kris.getByRole('tab', { name: 'Menu' }).click();
    await kris.getByRole('button', { name: 'Show the Parks and REI notes again' }).click();
    await expect(kris.locator('#panel-parks').getByRole('heading', { name: 'Parks' })).toHaveCount(1);
  });

  test('a notice about an old game sits clear of the seat cards', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await tablet.goto('/');
    // A handle the server cannot open, as from an older build.
    await tablet.evaluate(() => localStorage.setItem('tablet-parks.host', 'not-a-handle'));
    await tablet.reload();
    const notice = tablet.getByText('That game was opened by a different version of the app. Set up a new one.');
    await expect(notice).toBeVisible({ timeout: 10_000 });
    const a = (await notice.boundingBox())!;
    const b = (await tablet.getByRole('heading', { name: 'Who’s hiking?' }).boundingBox())!;
    const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    expect(overlap).toBe(false);
  });

  test('a flask is armed from the phone, numbered in order, and disarmed again', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2, brisk: true });
    const kris = await joinOnPhone(browser, await seatLink(tablet, 1), 'Kris');
    await tablet.getByRole('button', { name: 'Start the game' }).click();
    await kris.setViewportSize(SIDEWAYS);
    await dismissRoster(kris);

    // Every player starts with one flask, unarmed.
    await kris.getByRole('tab', { name: 'Status' }).click();
    const flask = kris.locator('#panel-sheet .flask').first();
    await expect(flask).toHaveAttribute('aria-pressed', 'false');
    await flask.click();
    await expect(flask).toHaveAttribute('aria-pressed', 'true');
    await expect(flask.locator('.flask__order')).toHaveText('1');
    // Armed on the server, so a reload keeps it; the Hike panel shows the same flask, armed.
    await kris.reload();
    await kris.getByRole('tab', { name: /^Hike/ }).click();
    const hike = kris.locator('#panel-moves');
    await expect(hike.locator('.hike__flasks h3')).toContainText('1');
    await expect(hike.locator('.flask').first()).toHaveAttribute('aria-pressed', 'true');
    await expect(hike.getByRole('list', { name: 'Your pack' }).locator('li')).toHaveCount(5);
    await hike.locator('.flask').first().click();
    await expect(hike.locator('.flask').first()).toHaveAttribute('aria-pressed', 'false');
    await expect(hike.locator('.flask__order')).toHaveCount(0);
  });

  test('with a park in hand, each phone holds one park the others cannot see', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2, brisk: true, parkInHand: true });
    const kris = await joinOnPhone(browser, await seatLink(tablet, 1), 'Kris');
    await tablet.getByRole('button', { name: 'Start the game' }).click();
    await kris.setViewportSize(SIDEWAYS);
    await dismissRoster(kris);
    await kris.getByRole('tab', { name: 'Status' }).click();
    const reserved = kris.locator('#panel-sheet .mat__block', { has: kris.getByRole('heading', { name: 'Reserved' }) });
    await expect(reserved.locator('.mini-park')).toHaveCount(1);
    const name = (await reserved.locator('.mini-park__name').innerText()).trim();
    await expect(tablet.locator('body')).not.toContainText(name);
  });

  test('REI sells Pokémon gear, and the table can turn it back to plain', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2, brisk: true });
    const kris = await joinOnPhone(browser, await seatLink(tablet, 1), 'Kris');
    await tablet.getByRole('button', { name: 'Start the game' }).click();
    await kris.setViewportSize(SIDEWAYS);
    await dismissRoster(kris);
    await kris.getByRole('tab', { name: /^REI/ }).click();
    const names = kris.locator('#panel-gear .gear-offer:not(.gear-offer--deck) h3');
    await expect(names.first()).toContainText('’s ');
    await expect(kris.locator('#panel-gear .gear-icon__pk')).toHaveCount(3);

    await tablet.getByRole('button', { name: 'Table menu' }).click();
    await tablet.getByRole('radio', { name: 'Plain gear' }).click();
    await expect(names.first()).not.toContainText('’s ', { timeout: 10_000 });
    await expect(kris.locator('#panel-gear .gear-icon__pk')).toHaveCount(0);
  });

  test('a hiker walks to its stop on the tablet, and every phone hears what it collected', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2, brisk: true, base: true });
    const kris = await joinOnPhone(browser, await seatLink(tablet, 1), 'Kris');
    await tablet.getByRole('button', { name: 'Start the game' }).click();
    await kris.setViewportSize(SIDEWAYS);
    await dismissRoster(kris);

    // Somebody moves — Kris from the tablet, or the computer — and the pawn travels there.
    for (let i = 0; i < 40; i++) {
      if (await tablet.locator('.traveller').count()) break;
      if (!(await playOnce(tablet))) await tablet.waitForTimeout(250);
    }
    await expect(tablet.locator('.traveller').first()).toBeAttached();
    // A stop that pays shows up on the phones as a toast with who collected it. Not every
    // stop pays, so the table plays on until one has.
    let toasted = false;
    for (let i = 0; i < 60 && !toasted; i++) {
      toasted = (await kris.locator('.gain-toast').count()) > 0;
      if (!toasted && !(await playOnce(tablet))) await tablet.waitForTimeout(300);
    }
    expect(toasted).toBe(true);
    await expect(kris.locator('.gain-toast').first().locator('.pawn')).toBeVisible();
  });

  test('a blank name becomes a Pokémon, and the deal shows everyone who is who', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2, brisk: true });
    const phone = await joinOnPhone(browser, await seatLink(tablet, 1), '');
    const name = (await phone.locator('.phone__who h1').innerText()).trim();
    expect(name).not.toMatch(/^Player/);
    await tablet.getByRole('button', { name: 'Start the game' }).click();
    await phone.setViewportSize(SIDEWAYS);

    const roster = phone.locator('.roster');
    await expect(roster).toBeVisible({ timeout: 10_000 });
    await expect(roster.getByRole('heading', { name })).toBeVisible();
    await expect(roster).toContainText(`${name} ♂`);
    await expect(roster).toContainText(`${name} ♀`);
    await expect(roster.locator('.roster__others li')).toHaveCount(1);
    // It gets out of the way by itself after a few seconds.
    await expect(roster).toHaveCount(0, { timeout: 8_000 });
    // And the tablet's pawns carry the hikers' marks.
    await expect(tablet.locator('.site__hikers .pawn__mark').first()).toBeVisible();
  });
});
