import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

/**
 * The whole table in a real browser: one tablet page and a phone page per
 * player, against the production build and the stand-in Upstash (see
 * playwright.config.ts) — so every game here provisions its own database.
 */

const TABLET = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

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

async function openTable(page: Page, options: { seats?: number; brisk?: boolean; base?: boolean } = {}): Promise<void> {
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
  if (await tablet.locator('.shop').count()) {
    // Exact: the gear row can hold an "Annual Park Pass".
    await act(tablet, () => tablet.getByRole('button', { name: 'Pass', exact: true }).click());
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
    await expect(tablet.locator('.seat-tag__name', { hasText: 'Kris' })).toBeVisible();

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

    // The phones never move anything: there are no game controls on them.
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
    await expect(tablet.locator('.rail--thinking')).toBeVisible();
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

    await expect(tablet.locator('.site--target').first()).toBeVisible({ timeout: 20_000 });
    await expect(kris.getByText('Your turn — make your move on the tablet.')).toBeVisible({ timeout: 10_000 });
    await expect(tablet.locator('.rail--acting')).toContainText('Walk a hiker');

    // Both hikers start on the Trailhead, so the phone lists one group: the sites the tablet lit.
    const lit = await tablet.locator('.site--target .site__name').allInnerTexts();
    const listed = await kris.locator('.preview__group').first().locator('.reach__name').allInnerTexts();
    expect(listed.length).toBeGreaterThan(0);
    expect(listed).toEqual(lit);
    // It only reads: nothing on the phone can make the move.
    await expect(kris.locator('.preview button')).toHaveCount(0);
  });

  test('at the Trail End the cards take the table, and passing gives it back to the trail', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2, brisk: true });
    await joinOnPhone(browser, await seatLink(tablet, 1), 'Kris');
    await tablet.getByRole('button', { name: 'Start the game' }).click();

    const end = tablet.locator('.site--target', { hasText: 'Trail End' }).locator('.site__face');
    await expect(end).toBeVisible({ timeout: 20_000 });
    await act(tablet, () => end.click());

    await expect(tablet.locator('.shop')).toBeVisible();
    await expect(tablet.getByRole('heading', { name: 'Visit or reserve a park' })).toBeVisible();
    await expect(tablet.locator('.trail-strip')).toBeVisible();
    await expect(tablet.locator('.shop-park').first().locator('.check').first()).toBeVisible();
    await expect(tablet.locator('.trail__sites')).toHaveCount(0);

    await act(tablet, () => tablet.getByRole('button', { name: 'Pass', exact: true }).click());
    await expect(tablet.locator('.shop')).toHaveCount(0);
    await expect(tablet.locator('.trail__sites')).toBeVisible();
  });

  test('tapping a site that is not lit reads its rules, turned toward a seat on request', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2, brisk: true });
    await tablet.getByRole('button', { name: 'Start the game' }).click();
    await expect(tablet.locator('.trail__sites')).toBeVisible();

    // The Trailhead is never a place to walk to.
    await tablet.locator('.site__face').first().click();
    const rules = tablet.getByRole('dialog', { name: 'Trailhead' });
    await expect(rules).toBeVisible();
    await expect(rules).toContainText('Hikers start here');
    await rules.getByRole('button', { name: 'Turn this toward the next seat' }).click();
    await expect(rules).toHaveClass(/sheet--top/);
    await rules.getByRole('button', { name: 'Close the rules' }).click();
    await expect(rules).toHaveCount(0);

    await tablet.getByRole('button', { name: 'Rules', exact: true }).click();
    await expect(tablet.getByRole('dialog', { name: 'Everything on the board' })).toContainText('Trail End');
  });

  test('a mis-tap can be taken back for a few seconds, and the next seat is marked', async ({ browser }) => {
    const tablet = await newTablet(browser);
    await openTable(tablet, { seats: 2, brisk: true, base: true });
    await joinOnPhone(browser, await seatLink(tablet, 1), 'Kris');
    await tablet.getByRole('button', { name: 'Start the game' }).click();

    await expect(tablet.locator('.rail--acting')).toContainText('Kris', { timeout: 20_000 });
    await expect(tablet.locator('.rail__chip--next')).toHaveCount(1);
    const before = await tablet.locator('.site__hikers').allInnerTexts();

    // A site that only pays out: no decision follows, so the take-back is on Kris's rail.
    await act(tablet, () => tablet.locator('.site--target', { has: tablet.locator('.site__does .tok-row') }).first().locator('.site__face').click());
    const undo = tablet.getByRole('button', { name: /^Take back: moved to/ });
    await expect(undo).toBeVisible();
    await act(tablet, () => undo.click());

    await expect(tablet.locator('.rail--acting')).toContainText('Kris');
    await expect(tablet.locator('.site--target').first()).toBeVisible();
    expect(await tablet.locator('.site__hikers').allInnerTexts()).toEqual(before);
    await expect(undo).toHaveCount(0);
  });
});
