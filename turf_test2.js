const fs = require('fs');
let code = fs.readFileSync('js/turf.min.js', 'utf8');
// Mock browser environment
const window = { globalThis: {} };
window.globalThis = window;
eval(code);
console.log(Object.keys(window));
