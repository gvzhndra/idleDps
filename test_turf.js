const fs = require('fs');
const code = fs.readFileSync('js/turf.min.js', 'utf8');
eval(code);
console.log('Turf loaded. Version:', turf.version || 'unknown');
try {
  const c = turf.circle([115, -8], 0.5, {steps: 36, units: 'kilometers'});
  const p = turf.polygon([[[114.9, -8.1], [115.1, -8.1], [115.1, -7.9], [114.9, -7.9], [114.9, -8.1]]]);
  
  // Try v7/v6 intersect
  const i = turf.intersect(turf.featureCollection([c, p]));
  console.log('Intersect success (v5 syntax)!', i ? i.type : 'null');
} catch (e) {
  console.log('Error v5 syntax:', e.message);
  try {
     const c = turf.circle([115, -8], 0.5, {steps: 36, units: 'kilometers'});
     const p = turf.polygon([[[114.9, -8.1], [115.1, -8.1], [115.1, -7.9], [114.9, -7.9], [114.9, -8.1]]]);
     const i2 = turf.intersect(c, p);
     console.log('Intersect success (v6 syntax)!', i2 ? i2.type : 'null');
  } catch(e2) {
     console.log('Error v6 syntax:', e2.message);
  }
}
