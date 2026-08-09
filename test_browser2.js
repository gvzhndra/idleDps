const puppeteer = require('puppeteer-core');
const os = require('os');
const path = require('path');
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/Users/putuharjaya/.cache/puppeteer/chrome/mac-132.0.6834.110/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto(`file://${process.cwd()}/console_capture.html`);
  await new Promise(r => setTimeout(r, 4000));
  
  const bodyHTML = await page.evaluate(() => document.body.innerHTML);
  console.log("BODY OUTPUT:\n" + bodyHTML);
  await browser.close();
})();
