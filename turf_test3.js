const turf = require('./js/turf.min.js');
console.log('Turf version:', turf ? 'loaded' : 'undefined');
try {
  const c = turf.circle([115, -8], 0.5, {steps: 36, units: 'kilometers'});
  const p = turf.polygon([[[114.9, -8.1], [115.1, -8.1], [115.1, -7.9], [114.9, -7.9], [114.9, -8.1]]]);
  const i = turf.intersect(turf.featureCollection([c, p]));
  console.log('Intersect v5?', !!i);
} catch(e) {
  console.log('Error v5:', e.message);
  try {
     const c = turf.circle([115, -8], 0.5, {steps: 36, units: 'kilometers'});
     const p = turf.polygon([[[114.9, -8.1], [115.1, -8.1], [115.1, -7.9], [114.9, -7.9], [114.9, -8.1]]]);
     const i2 = turf.intersect(c, p);
     console.log('Intersect v6?', !!i2);
  } catch(e2) {
     console.log('Error v6:', e2.message);
  }
}
