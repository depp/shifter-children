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

var Commands = {
	table: function(itercount) {
		itercount = parseInt(itercount);
		if (itercount <= 0) {
			console.log('No iterations');
			process.exit(1);
		}
		var matches = sim.matchAll();
		var param = {
			health: 100,
			speed: 10,
			teamSize: 2,
			count: itercount,
		};
		for (var i = 0; i < matches.length; i++) {
			var match = matches[i];
			match.run(param);
			console.log(match);
		}
	},
	combat: function(shape1, shape2) {
		var param = {
			health: 100,
			speed: 10,
			teamSize: 2,
		};
		var match = new sim.Match(shape1, shape2);
		match.run(param, listen);
	},
};

(function() {
	var args = process.argv.slice(2);
	if (!args.length) {
		console.log(
			'Commands:\n' +
				'    table ITERCOUNT\n' +
				'    combat SHAPE SHAPE'
		);
		process.exit(1);
	}
	var cmd = args.shift();
	var func = Commands[cmd];
	if (!func) {
		console.log('Invalid command: ' + cmd);
	}
	func.apply(null, args);
})();
