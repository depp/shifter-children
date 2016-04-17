/* Copyright 2016 Dietrich Epp.

   This file is part of Shifter Children.  The Shifter Children source
   code is distributed under the terms of the MIT license.  See
   LICENSE.txt for details. */
'use strict';
require('source-map-support').install();

var sim = require('../build/tsc/game/combatsim');

function listen(type, evt) {
	console.log(type, evt);
}

var matches = sim.matchAll();
var param = {
	health: 100,
	speed: 10,
	teamSize: 2,
	count: 1,
};
for (var i = 0; i < matches.length; i++) {
	var match = matches[i];
	match.run(param, listen);
	console.log(match);
}
