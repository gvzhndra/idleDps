const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto(`file://${process.cwd()}/index.html`);
  
  // Wait a bit for JS to execute
  await new Promise(r => setTimeout(r, 2000));
  
  // Click an asset to trigger renderDetailPanel and Catchment
  await page.evaluate(() => {
    if (App && App.activeAssets && App.activeAssets.length > 0) {
      App.selectAsset(App.activeAssets[0].id);
    }
  });
  
  await new Promise(r => setTimeout(r, 3000));
  
  await browser.close();
})();
