import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

/**
 * The footer: build info and the newest line of public/updates.txt, which opens
 * the whole changelog. The expected entries are read from the served file, so
 * these keep passing as entries are added.
 */

const TABLET = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };
const SIDEWAYS = { width: 844, height: 390 };

const opened: BrowserContext[] = [];
test.afterEach(async () => {
  for (const context of opened.splice(0)) await context.close();
});

async function device(browser: Browser, options: Parameters<Browser['newContext']>[0]): Promise<Page> {
  const context = await browser.newContext(options);
  opened.push(context);
  return context.newPage();
}

async function entries(page: Page): Promise<string[]> {
  const response = await page.request.get('/updates.txt');
  expect(response.ok()).toBeTruthy();
  return (await response.text())
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Uncaught errors, and console errors other than the browser's own note on a failed request. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) errors.push(`console: ${message.text()}`);
  });
  return errors;
}

const build = (page: Page) => page.locator('.footer__build');
const trigger = (page: Page) => page.locator('.footer__latest');
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Changelog' });

test.describe('the footer and its changelog', () => {
  test('shows the build info and only the newest entry, on one line', async ({ browser }) => {
    const page = await device(browser, { viewport: TABLET });
    const lines = await entries(page);
    await page.goto('/');
    await expect(build(page)).toHaveText(/^Trailside Seasons · v\d+\.\d+\.\d+ · built \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/);
    await expect(trigger(page)).toHaveCount(1);
    await expect(trigger(page)).toHaveText(lines[lines.length - 1]);
    await expect(trigger(page)).toHaveAttribute('title', lines[lines.length - 1]);
    // One line, cut short with an ellipsis rather than wrapping.
    const style = await trigger(page).evaluate((el) => {
      const css = getComputedStyle(el);
      return { whiteSpace: css.whiteSpace, overflow: css.textOverflow, height: el.getBoundingClientRect().height };
    });
    expect(style.whiteSpace).toBe('nowrap');
    expect(style.overflow).toBe('ellipsis');
    expect(style.height).toBeLessThan(40);
  });

  test('lists every entry, newest first', async ({ browser }) => {
    const page = await device(browser, { viewport: TABLET });
    const lines = await entries(page);
    await page.goto('/');
    await trigger(page).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page).getByRole('heading', { name: 'Changelog' })).toBeVisible();
    await expect(dialog(page).locator('.changelog__list li')).toHaveText([...lines].reverse());
  });

  test('closes on a click on the backdrop, and only there', async ({ browser }) => {
    const page = await device(browser, { viewport: TABLET });
    await page.goto('/');
    await trigger(page).click();
    await expect(dialog(page)).toBeVisible();

    // A click inside the sheet must not bubble up into a dismissal.
    await dialog(page).locator('.changelog__list li').first().click();
    await expect(dialog(page)).toBeVisible();
    await dialog(page).click({ position: { x: 6, y: 6 } });
    await expect(dialog(page)).toBeVisible();

    await page.locator('.scrim').click({ position: { x: 4, y: 4 } });
    await expect(dialog(page)).toHaveCount(0);
  });

  test('opens and closes from the keyboard, and gives focus back', async ({ browser }) => {
    const page = await device(browser, { viewport: TABLET });
    await page.goto('/');
    await trigger(page).focus();
    await page.keyboard.press('Enter');
    await expect(dialog(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close the changelog' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toHaveCount(0);
    await expect(trigger(page)).toBeFocused();
    await page.keyboard.press(' ');
    await expect(dialog(page)).toBeVisible();
  });

  test('a missing or blank changelog leaves the build info alone, quietly', async ({ browser }) => {
    const page = await device(browser, { viewport: TABLET });
    const errors = watchErrors(page);

    await page.route('**/updates.txt', (route) => route.fulfill({ status: 404, body: '' }));
    await page.goto('/');
    await expect(build(page)).toContainText('Trailside Seasons');
    await page.waitForLoadState('networkidle');
    await expect(trigger(page)).toHaveCount(0);

    await page.unroute('**/updates.txt');
    await page.route('**/updates.txt', (route) => route.fulfill({ status: 200, contentType: 'text/plain', body: '\n\r\n   \n' }));
    await page.goto('/');
    await expect(build(page)).toContainText('Trailside Seasons');
    await page.waitForLoadState('networkidle');
    await expect(trigger(page)).toHaveCount(0);

    expect(errors).toEqual([]);
  });

  test('fits a phone: no sideways scrolling, and the dialog stays on screen', async ({ browser }) => {
    const page = await device(browser, { viewport: PHONE, isMobile: true, hasTouch: true });
    await page.goto('/seat');
    await expect(build(page)).toBeVisible();
    await expect(trigger(page)).toHaveCount(1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await trigger(page).tap();
    const box = await dialog(page).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(PHONE.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(PHONE.height);
  });

  test('sits on the setup and join pages, and stays off the board and the phone in play', async ({ browser }) => {
    const tablet = await device(browser, { viewport: TABLET });
    await tablet.goto('/');
    await expect(tablet.locator('.footer')).toHaveCount(1);

    await tablet.getByRole('button', { name: 'Open the table' }).click();
    await expect(tablet.getByRole('button', { name: 'Start the game' })).toBeVisible({ timeout: 30_000 });
    await expect(tablet.locator('.footer')).toHaveCount(1);

    const href = await tablet.locator('a[aria-label="Seat 1 join link"]').getAttribute('href');
    const phone = await device(browser, { viewport: PHONE, isMobile: true, hasTouch: true });
    await phone.goto(href!);
    await expect(phone.getByLabel('Your name')).toBeVisible();
    await expect(phone.locator('.footer')).toHaveCount(1);
    await phone.getByLabel('Your name').fill('Kris');
    await phone.getByRole('button', { name: /^Take seat \d$/ }).click();
    await expect(phone.getByText('You’re in.')).toBeVisible();
    await expect(phone.locator('.footer')).toHaveCount(1);

    // The board and a phone in play are full-screen tools: every pixel goes to the game.
    await tablet.getByRole('button', { name: 'Start the game' }).click();
    await expect(tablet.locator('.trail')).toBeVisible();
    await expect(tablet.locator('.footer')).toHaveCount(0);
    await phone.setViewportSize(SIDEWAYS);
    await expect(phone.locator('.play')).toBeVisible({ timeout: 10_000 });
    await expect(phone.locator('.footer')).toHaveCount(0);
  });
});
