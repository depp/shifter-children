/* Copyright 2015-2016 Dietrich Epp.

   This file is part of Kitten Teleporter.  The Kitten Teleporter source
   code is distributed under the terms of the MIT license.
   See LICENSE.txt for details. */

import * as camera from './camera';
import * as control from './control';
import * as load from './load';
import * as param from './param';
import * as sprite from './sprite';
import * as state from './state';
import * as text from './text';
import * as time from './time';

const MobyDick = 'Sample Text Here';

/*
 * Main game screen.
 */
export class GameScreen implements state.Screen, time.TimeTarget {
	private time: time.Time;

	constructor() {
		// Timing manager
		this.time = null;

		var obj = new text.TextObject();
		var b = new text.Builder();
		b.add({
			font: text.HeadFont,
			text: 'Blast Off!',
		});
		b.finish();
		obj.addLayout(b, { x: 20, y: 320 });
		b.clear();

		b.add({
			font: text.BodyFont,
			text: MobyDick,
		});
		b.finish({
			width: 480,
			indent: 40,
			align: text.TextAlign.Justify,
		});
		obj.addLayout(b, { x: 100, y: 300 });

		// vec2.set(obj.position, param.Width / 2, param.Height / 2);
		text.ui.add(obj);
	}

	/*
	 * Initialize the screen.
	 */
	start(r: state.RenderContext, args: any): void {
		var gl = r.gl;
		// Initialize graphics layers and controls
		text.init(gl);
		control.game.enable();

		// Create level structures
		this.time = new time.Time(this, r.time);
	}

	/*
	 * Destroy the screen
	 */
	stop(gl: WebGLRenderingContext): void {
		// Clean up graphics layers and controls
		text.ui.clear();
		control.game.disable();

		// Zero level structures
		this.time = null;
	}

	/*
	 * Render the game screen, updating the game state as necessary.
	 */
	render(r: state.RenderContext): void {
		var gl = r.gl;
		this.time.update(r.time);
		var frac = this.time.frac;

		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		text.ui.render(gl, camera.camera);
	}

	/*
	 * Advance the game by one frame.  Called by the timing manager.
	 *
	 * dt: The timestep, in s
	 */
	step(dt: number): void {
		var ctl = control.game;
		ctl.update();
		var move = ctl.move.value;
	}
}
