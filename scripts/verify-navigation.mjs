import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Pass the path to an installed Playwright module; no project dependency required.
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
const origin = process.env.TEST_ORIGIN || 'http://localhost:3000';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
await mkdir('outputs/navigation', { recursive: true });
try {
  for (const [width, height] of [[320, 568], [390, 844], [430, 932], [667, 375]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.locator('.site-preloader').waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Открыть меню', exact: true }).click();
    const menu = page.getByRole('dialog');
    await menu.waitFor({ state: 'visible' });
    await page.waitForTimeout(350);
    const box = await menu.boundingBox();
    assert.equal(box.x, 0); assert.equal(box.y, 0);
    assert.equal(box.width, width); assert.equal(box.height, height);
    assert.equal(await menu.getByRole('link').count(), 5);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `outputs/navigation/menu-${width}x${height}.png` });
    await menu.getByRole('link', { name: /Контакт/ }).click();
    await menu.waitFor({ state: 'detached' });
    assert.equal(new URL(page.url()).hash, '#contact');
    await page.waitForFunction(() => Math.abs(document.getElementById('contact').getBoundingClientRect().top) < 110 || Math.abs(scrollY + innerHeight - document.documentElement.scrollHeight) < 2, null, { timeout: 4000 });
    const anchor = await page.locator('#contact').evaluate(el => ({ top: el.getBoundingClientRect().top, scroll: scrollY, height: innerHeight, total: document.documentElement.scrollHeight }));
    assert.ok(Math.abs(anchor.top) < 110 || Math.abs(anchor.scroll + anchor.height - anchor.total) < 2);
    await page.getByRole('button', { name: 'Открыть меню', exact: true }).click();
    await page.getByRole('button', { name: 'Закрыть меню', exact: true }).click();
    await menu.waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Открыть меню', exact: true }).click();
    await page.keyboard.press('Escape');
    await menu.waitFor({ state: 'detached' });
    assert.equal(await page.getByRole('button', { name: 'Открыть меню', exact: true }).evaluate(el => el === document.activeElement), true);
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}x${height}: bounds, links, anchor navigation, close, Escape, focus, no page errors`);
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route('**/media/claymore-poster.jpg', async route => { await new Promise(resolve => setTimeout(resolve, 4500)); await route.abort(); });
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.locator('.site-preloader').waitFor({ state: 'visible' });
  await page.screenshot({ path: 'outputs/navigation/preloader-mobile.png' });
  await page.locator('.site-preloader').waitFor({ state: 'detached', timeout: 5000 });
  console.log('PASS slow/failed hero image: preloader deadline releases page');
  await page.close();
  for (const options of [{ reducedMotion: 'reduce' }, { javaScriptEnabled: false }]) {
    const page = await browser.newPage(options);
    await page.goto(origin, { waitUntil: 'load' });
    await page.locator('.site-preloader').waitFor({ state: 'hidden', timeout: 5000 });
    assert.ok(await page.locator('#hero-title').isVisible());
    console.log(`PASS accessible fallback: ${JSON.stringify(options)}`);
    await page.close();
  }
} finally {
  await browser.close();
}
