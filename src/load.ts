/* Copyright 2015-2016 Dietrich Epp.

   This file is part of Kitten Teleporter.  The Kitten Teleporter source
   code is distributed under the terms of the MIT license.
   See LICENSE.txt for details. */

/*
 * Asset loading and loading screen.
 */

import * as shader from './shader';
import * as state from './state';

interface ImageSet {
	[name: string]: HTMLImageElement;
}

interface LevelSet {
	[name: string]: any;
}

var Loaded = false;
var Images: ImageSet;
var Levels: LevelSet;

/*
 * Load all images.
 *
 * func: Callback when complete
 */
function loadImages(func: () => void) {
	Images = {};
	var info = AssetInfo.images;
	var count = _.size(info), loaded = 0;
	_.forOwn(info, (path: string, name: string) => {
		var img = new Image();
		img.addEventListener('load', () => {
			loaded++;
			if (loaded >= count) {
				func();
			}
		}, false);
		img.src = 'images/' + path;
		Images[name] = img;
	});
	if (!count) {
		func();
	}
}

/*
 * Get an image by name.
 */
export function getImage(name: string): HTMLImageElement {
	var img = Images[name];
	if (!img) {
		console.warn('No such image: ' + name);
		return null;
	}
	return img;
}

/*
 * Load all assets.
 *
 * func: Callback when complete
 */
function loadAll(func: () => void) {
	if (Loaded) {
		return;
	}
	var count = 1, loaded = 0;
	function func2() {
		loaded++;
		if (loaded >= count) {
			Loaded = true;
			func();
		}
	}
	_.forEach(AssetInfo.fonts, (font: Assets.FontInfo) => {
		font.glyph = new Int16Array(
			_.map(
				(<any> font.glyph).split(','),
				(s: string) => { return parseInt(s); }));
		var nglyph = (font.glyph.length / 7) | 0;
		font.glyphcount = nglyph;
		if (font.kern) {
			var kstr = <string> (<any> font).kern;
			var kern = new Int8Array(nglyph * nglyph);
			_.forEach(
				kstr.split(':'),
				(gkern: string) => {
					var d = _.map(gkern.split(','), (s: string) => parseInt(s));
					var left = d[0];
					var n = ((d.length - 1) / 2) | 0;
					for (var i = 0; i < n; i++) {
						var right = d[i * 2 + 1];
						var amt = d[i * 2 + 2];
						kern[left * nglyph + right] = amt;
					}
				});
			font.kern = kern;
		}
	});
	loadImages(func2);
}

/*
 * Loading screen.
 */
export class LoadScreen implements state.Screen {
	private bgProg: shader.LoadScreenProgram;
	private vbuf: WebGLBuffer;

	constructor() {
		this.bgProg = null;
		this.vbuf = null;
	}

	/*
	 * Initialize the screen.
	 */
	start(r: state.RenderContext, args: any): void {
		loadAll(() => { state.set('Game', null); });
		var gl = r.gl;
		this.bgProg = shader.loadScreenProgram(gl, 'fullscreen', 'loading_bg');
		var vdata = new Float32Array([
			// Fullscreen quad
			-1.0, -1.0, +3.0, -1.0, -1.0, +3.0,
		]);
		this.vbuf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuf);
		gl.bufferData(gl.ARRAY_BUFFER, vdata, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
	}

	/*
	 * Destroy the screen.
	 */
	stop(gl: WebGLRenderingContext): void {}

	/*
	 * Render the loading screen.
	 */
	render(r: state.RenderContext): void {
		var gl = r.gl;
		var p = this.bgProg;
		if (!p) {
			return;
		}
		var t = r.time * 1e-3;
		gl.useProgram(p.program);
		gl.uniform2fv(
			p.Scale,
			r.aspect >= 1.0 ? [r.aspect, 1.0] : [1.0, 1.0 / r.aspect]);
		gl.uniform4fv(p.Color, [
			4.0, 2.0, 1.0, 1.0,
			1.0, 2.0, 4.0, 1.0,
		]);
		gl.uniform4fv(p.Wave, [
			1, (t * 3.0) % (Math.PI * 2.0), 0.25, 1.0,
			3, (t * -0.5) % (Math.PI * 2.0), 0.75, 3.0,
		]);
		gl.uniform1fv(p.InvRadius, [
			(1 + 0.1 * Math.sin(t * 0.6)) * 1.8,
			(1 + 0.1 * Math.sin(t * 0.6 + 0.5)) * 2.2,
		]);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuf);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);

		gl.drawArrays(gl.TRIANGLES, 0, 3);

		gl.disableVertexAttribArray(0);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.useProgram(null);
	}
}
