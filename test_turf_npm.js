const turf = require('@turf/turf');
const c = turf.circle([115, -8], 0.5, {steps: 36, units: 'kilometers'});
const p = turf.polygon([[[114.9, -8.1], [115.1, -8.1], [115.1, -7.9], [114.9, -7.9], [114.9, -8.1]]]);
const i = turf.intersect(turf.featureCollection([c, p]));
console.log('Intersection object:', i ? i.type : null);
