import { chromium } from 'playwright';

(async()=>{
  const base = process.env.BASE_URL || 'http://localhost:8080';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('[PAGE][console]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[PAGE][pageerror]', err.toString()));

  try{
    await page.goto(base + '/avocats/dashboard', { waitUntil: 'networkidle' });
    console.log('Loaded dashboard');
    // collapse sidebar by clicking trigger
    await page.click('[data-sidebar="trigger"] button, button[data-sidebar="trigger"]', { timeout: 2000 }).catch(()=>{});
    // Wait a bit
    await page.waitForTimeout(300);
    // click tasks link (icon-only view)
    const tasksLink = await page.$('a[href="/avocats/tasks"]');
    if (!tasksLink) {
      console.log('Tasks link not found');
    } else {
      await tasksLink.click();
      await page.waitForTimeout(500);
      // check for H1 text
      const h1 = await page.$('h1');
      if (h1) {
        const txt = await h1.innerText();
        console.log('H1 text:', txt);
      } else {
        console.log('No H1 found after navigation');
      }
    }
  } catch(e){
    console.error('Error in script', e);
  } finally{
    await browser.close();
  }
})();
