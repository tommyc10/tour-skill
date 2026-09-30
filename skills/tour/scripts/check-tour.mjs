#!/usr/bin/env node
/* Walk a tour in a real browser: screenshot every step, and flag steps whose target wasn't
 * found, console errors, and a tour that doesn't close or remember it's been seen.
 *
 * Needs Playwright:  npm i -D playwright && npx playwright install chromium
 *
 *   node check-tour.mjs --url http://localhost:5173 --out ./tour-shots
 *   node check-tour.mjs --url … --size 1280x800 --scheme light      # prefers-color-scheme
 *   node check-tour.mjs --url … --reduced                           # prefers-reduced-motion
 *   node check-tour.mjs --url … --start "[aria-label='Take the tour']"   # click to start
 *   node check-tour.mjs --url … --start "key:?"                     # press a key to start
 *   node check-tour.mjs --url … --init "localStorage.setItem('theme','light')"   # run before load
 *
 * Without --start it waits for the tour to open by itself (first visit). */

import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const url = opt('url');
if (!url) {
  console.error('Pass --url <the running app>.');
  process.exit(1);
}
const out = opt('out', './tour-shots');
const [w, h] = opt('size', '1440x900').split('x').map(Number);
const scheme = opt('scheme', 'dark');
const start = opt('start');
const init = opt('init');
const settle = Number(opt('settle', 700)); // ms per step: the glide is 320ms, content may animate in too

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: w, height: h },
  colorScheme: scheme,
  reducedMotion: args.includes('--reduced') ? 'reduce' : 'no-preference',
});
const errors = [];
// Failed requests are reported with their URL (the console message alone doesn't say which).
page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && errors.push(m.text()));
page.on('response', (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));
page.on('pageerror', (e) => errors.push(String(e)));
await page.addInitScript(() => localStorage.clear());
if (init) await page.addInitScript(init);

await page.goto(url);
if (start?.startsWith('key:')) {
  await page.waitForTimeout(500);
  await page.keyboard.press(start.slice(4));
} else if (start) {
  await page.click(start);
}
await page.waitForSelector('.tour-card', { timeout: 8000 }).catch(() => {
  console.error('The tour never opened. Pass --start, or check it auto-starts on a first visit.');
  process.exit(1);
});

const problems = [];
const count = await page.$eval('.tour-count', (el) => Number(el.textContent.split('/')[1]));
for (let i = 0; i < count; i++) {
  await page.waitForTimeout(settle);
  const s = await page.$eval('.tour', (el) => ({
    target: el.dataset.target,
    found: el.dataset.found,
    title: el.querySelector('.tour-title')?.textContent,
  }));
  const tag = `${String(i + 1).padStart(2, '0')}`;
  await page.screenshot({ path: `${out}/${scheme}-${w}-${tag}.png` });
  const note = s.target ? (s.found === 'true' ? `→ [data-tour="${s.target}"]` : `✗ [data-tour="${s.target}"] NOT FOUND`) : '(centred)';
  console.log(`${tag}  ${s.title}  ${note}`);
  if (s.target && s.found !== 'true') problems.push(`Step ${i + 1}: no visible [data-tour="${s.target}"]`);
  await page.keyboard.press('ArrowRight');
}

await page.waitForTimeout(400);
if (await page.$('.tour')) problems.push('The tour is still open after the last step.');
const remembered = await page.evaluate(() => Object.keys(localStorage).some((k) => /tour/i.test(k)));
if (!remembered) problems.push('Nothing tour-related was saved to localStorage, so it will start again on every visit.');
const inert = await page.$$eval('body > *', (els) => els.filter((el) => el.inert).length);
if (inert) problems.push(`${inert} element(s) are still inert after the tour closed.`);

errors.forEach((e) => problems.push(`Error: ${e}`));
console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join('\n- ')}` : '\nNo problems.');
console.log(`Screenshots in ${out}/`);
await browser.close();
process.exit(problems.length ? 1 : 0);
