const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const html = fs.readFileSync('index.html', 'utf8');

const dom = new JSDOM(html, {
  url: "http://localhost/",
  runScripts: "dangerously",
  resources: "usable"
});

dom.window.onerror = function(msg, url, lineNo, columnNo, error) {
  console.log('JSDOM ERROR:', msg, url, lineNo, columnNo, error);
};

dom.window.console.error = function(...args) {
  console.log('JSDOM CONSOLE ERROR:', ...args);
};

setTimeout(() => {
  console.log('JSDOM loaded.');
}, 2000);
