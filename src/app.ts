/* Copyright 2015-2016 Dietrich Epp.

   This file is part of Kitten Teleporter.  The Kitten Teleporter source
   code is distributed under the terms of the MIT license.
   See LICENSE.txt for details. */

/// <reference path="../typings/browser.d.ts" />
/// <reference path="assets.d.ts" />

// This is first, so we get console.log.
import './util'

import * as input from './input';
import * as state from './state';
import { GameScreen } from './game';
import { LoadScreen } from './load';

state.register({
	Game: () => { return new GameScreen(); },
	Load: () => { return new LoadScreen(); },
});
state.set('Load', null);

// The canvas DOM element.
var canvas: HTMLCanvasElement = null;
// The requestAnimationFrame handle.
var handle: number = null;
// The WebGL rendering context.
var gl: WebGLRenderingContext = null;
// The current canvas height.
var canvasHeight: number = 0;
// The last size of the canvas.
var lastWidth: number = 0, lastHeight: number = 0;
// The delay in millis before automatically resizing.
const RESIZE_DELAY = 500;
// The timestamp of the last resize.
var lastResize: number = -1;

/*
 * Initialize the application.
 *
 * c: The canvas object to use
 * g: The WebGL context to use
 */
function init(c: HTMLCanvasElement, g: WebGLRenderingContext): void {
	if (canvas && gl) {
		return;
	}
	canvas = c;
	gl = g;
	window.addEventListener('resize', resize, false);
	input.init();
	resize();
	start();
}

/*
 * Start running the application, if it is not running already.
 */
function start(): void {
	if (handle) {
		return;
	}
	handle = window.requestAnimationFrame(render);
}

/*
 * Stop running the application if it is running.
 */
function stop(): void {
	if (!handle) {
		return;
	}
	window.cancelAnimationFrame(handle);
	handle = undefined;
}

/*
 * Handle resize events.
 */
function resize(): void {
	var w = canvas.clientWidth;
	var h = Math.max(1, Math.round(w * 9 / 16));
	if (h != canvasHeight) {
		canvas.style.height = h + 'px';
		canvasHeight = h;
	}
}

/*
 * Main rendering loop.
 */
function render(curTime: number): void {
	var w = canvas.clientWidth, h = canvas.clientHeight;
	var needsResize = lastResize < 0 ||
			(curTime > lastResize + RESIZE_DELAY &&
			 (w != lastWidth || h != lastHeight));
	if (needsResize) {
		canvas.width = lastWidth = w;
		canvas.height = lastHeight = h;
		lastResize = curTime;
	}

	gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
	state.render({
		time: curTime,
		gl: gl,
		width: gl.drawingBufferWidth,
		height: gl.drawingBufferHeight,
		aspect: w / h,
	});

	// Do this last... if we get an exception, it won't get called.
	// Don't do it if we've canceled.
	if (handle) {
		handle = window.requestAnimationFrame(render);
	}
}

(<any> window)['Game'] = {
	init: init,
	start: start,
	stop: stop,
	resize: resize
};
