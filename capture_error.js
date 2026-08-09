const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER_ERROR:', msg.text());
    }
  });
  page.on('pageerror', err => {
    console.log('BROWSER_PAGEERROR:', err.message);
  });
  
  await page.goto(`file://${process.cwd()}/index.html`);
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
