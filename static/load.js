/* Copyright 2015 Dietrich Epp.

   This file is part of Kitten Teleporter.  The Kitten Teleporter source
   code is distributed under the terms of the MIT license.
   See LICENSE.txt for details. */
/* jshint browser: true, devel: true */

// Loader: creates a WebGL context, and then loads the rest of the game.
(function() {
	'use strict';
	var i;
	var ERR_WEBGL = 'Your browser does not seem to support WebGL.';
	var ERR_SCRIPT = 'Could not load game script.';

	var canvas = null, gl = null;

	function fail(reason) {
		if (!canvas && !gl) {
			return;
		}
		console.error(reason);
		maindiv.removeChild(canvas);
		var err = document.createElement('p');
		var text = document.createTextNode('Error: ' + reason);
		err.className = 'error';
		err.appendChild(text);
		maindiv.appendChild(err);
		canvas = null;
		gl = null;
	}

	var maindiv = document.getElementById('game');
	canvas = document.createElement('canvas');
	maindiv.appendChild(canvas);
	var param = { alpha: false };
	gl = canvas.getContext('webgl', param) ||
		canvas.getContext('experimental-webgl', param);
	if (!gl) {
		return fail(ERR_WEBGL);
	}

	var SCRIPTS = [];
	var remaining = SCRIPTS.length;
	function scriptLoad() {
		remaining--;
		if (remaining) {
			return;
		}
		try {
			window.Game.init(canvas, gl, fail);
		} catch (e) {
			console.error(e);
			fail(ERR_SCRIPT);
		}
	}
	function scriptErr() {
		fail(ERR_SCRIPT);
	}
	for (i = 0; i < SCRIPTS.length; i++) {
		var script = document.createElement('script');
		script.onload = scriptLoad;
		script.onerr = scriptErr;
		script.type = 'text/javascript';
		script.src = SCRIPTS[i];
		script.async = false;
		document.body.appendChild(script);
	}
})();
