const fs = require('fs');
eval(fs.readFileSync('js/turf.min.js', 'utf8'));
const turf = globalThis.turf || window.turf || module.exports;

if (!turf) {
  console.log("Turf not found in global context, let's require it");
  const t = require('./js/turf.min.js');
  if (t && t.intersect) {
    const c = t.circle([115, -8], 0.5, {steps: 36, units: 'kilometers'});
    const p = t.polygon([[[114.9, -8.1], [115.1, -8.1], [115.1, -7.9], [114.9, -7.9], [114.9, -8.1]]]);
    try {
      console.log('intersect:', t.intersect(t.featureCollection([c, p])) ? 'success v5' : 'fail');
    } catch(e) {
      console.log('v5 error:', e.message);
      console.log('intersect v6/v7:', t.intersect(c, p) ? 'success v6/v7' : 'fail');
    }
  }
}
