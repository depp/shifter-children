'use strict';
require('source-map-support').install();

var sim = require('../build/tsc/game/combatsim');

var matches = sim.matchAll();
var param = {
	health: 100,
	speed: 10,
	teamSize: 2,
};
for (var i = 0; i < matches.length; i++) {
	var match = matches[i];
	match.run(param);
}

console.log(process.argv);
console.log(matches);
