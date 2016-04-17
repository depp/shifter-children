/* Copyright 2016 Dietrich Epp.

   This file is part of Shifter Children.  The Shifter Children source
   code is distributed under the terms of the MIT license.  See
   LICENSE.txt for details. */
'use strict';
require('source-map-support').install();
var sim = require('../build/tsc/game/combatsim');

function dumpTable(fp, table) {
	var i, j, shape, shapes, itable, pos, e;
	fp.write(`\
<!doctype html>
<html>
<head>
<title>Combat Results</title>
<style type="text/css">
.win3 { background: #00f; }
.win2 { background: #99f; }
.win1 { background: #bbf; }
.even { background: #fff; }
.stale { background: #999; }
.lose1 { background: #fbb; }
.lose2 { background: #f99; }
.lose3 { background: #f00; }
</style>
</head>
<body>
<table>
`);
	shapes = [];
	for (i = 0; i < table.length; i++) {
		for (j = 1; j <= 2; j++) {
			shape = table[i]['shape' + j];
			if (shapes.indexOf(shape) < 0) {
				shapes.push(shape);
			}
		}
	}
	itable = {};
	for (i = 0; i < table.length; i++) {
		e = table[i];
		itable[e.shape1 + ',' + e.shape2] = e;
	}
	fp.write('<tr><th></th>');
	for (i = 0; i < shapes.length; i++) {
		fp.write('<th>' + shapes[i] + '</th>');
	}
	fp.write('</tr>\n');
	for (i = 0; i < shapes.length; i++) {
		fp.write('<tr><th>' + shapes[i] + '</th>');
		for (j = 0; j < shapes.length; j++) {
			e = itable[shapes[i] + ',' + shapes[j]];
			if (!e) {
				e = itable[shapes[j] + ',' + shapes[i]];
				e = {
					shape1: e.shape2,
					shape2: e.shape1,
					wins1: e.wins2,
					wins2: e.wins1,
					turns: e.turns,
				};
			}
			var delta = e.wins1 - e.wins2;
			var cls;
			if (delta > 0.9) {
				cls = 'win3';
			} else if (delta > 0.5) {
				cls = 'win2';
			} else if (delta > 0.25) {
				cls = 'win1';
			} else if (delta > -0.25) {
				cls = 'even';
				if (e.wins1 + e.wins2 < 0.5) {
					cls = 'stale';
				}
			} else if (delta > -0.5) {
				cls = 'lose1';
			} else if (delta > -0.9) {
				cls = 'lose2';
			} else {
				cls = 'lose3';
			}
			fp.write('<td class="' + cls + '">' +
							 Math.floor(100 * e.wins1 + 0.5) + ' / ' +
							 Math.floor(100 * e.wins2 + 0.5) + '<br>' +
							 Math.floor(e.turns / 15 + 0.5) +
							 '</td>');
		}
		fp.write('</tr>\n');
	}
	fp.write(`\
</table>
</body>
`);
}

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
		var results = [];
		for (var i = 0; i < matches.length; i++) {
			var match = matches[i];
			match.run(param);
			results.push({
				shape1: match.shape1,
				shape2: match.shape2,
				wins1: match.wins1 / itercount,
				wins2: match.wins2 / itercount,
				turns: match.turns / itercount,
			});
		}
		dumpTable(process.stdout, results);
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
