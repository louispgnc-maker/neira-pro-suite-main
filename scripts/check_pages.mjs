import { chromium } from 'playwright';

async function capture(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('[PAGE][console]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[PAGE][pageerror]', err.toString()));
  try {
    const r = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    console.log('[PAGE] loaded', url, 'status', r && r.status());
    await page.waitForTimeout(1500);
  } catch (e) {
    console.log('[CAPTURE] navigation error', e && e.toString());
  }
  await browser.close();
}

(async () => {
  const base = process.env.BASE_URL || 'http://localhost:5173';
  const targets = [
    `${base}/avocats/espace-collaboratif`,
    `${base}/notaires/espace-collaboratif`,
    `${base}/`
  ];
  for (const t of targets) {
    console.log('--- Visiting', t);
    await capture(t);
  }
})();
