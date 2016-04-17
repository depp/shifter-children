/* Copyright 2015-2016 Dietrich Epp.

   This file is part of Kitten Teleporter.  The Kitten Teleporter source
   code is distributed under the terms of the MIT license.
   See LICENSE.txt for details. */

/*
 * State manager.  This module is modified by other modules to
 * register state classes here.  This breaks circular dependencies
 * between the modules.
 */

export interface RenderContext {
	time: number;
	gl: WebGLRenderingContext;
	width: number;
	height: number;
	aspect: number;
}

export interface Screen {
	start(r: RenderContext, args: any): void;
	stop(gl: WebGLRenderingContext): void;
	render(r: RenderContext): void;
}

interface ScreenConstructor {
	(): Screen;
}

interface ScreenSet {
	[name: string]: ScreenConstructor;
}

type AnyScreen = Screen | ScreenConstructor;

interface PendingScreen {
	name: string;
	screen: AnyScreen;
	args: any;
}

// The current screen.
var current: Screen = null;
// The pending screen, at the next update.
var pending: PendingScreen = null;
// All screens: initially functions, later objects.
var screens: { [name: string]: AnyScreen } = {};

/*
 * Register screens.
 *
 * Each name maps to a screen object, or a function which returns a
 * screen object.
 */
export function register(newScreens: ScreenSet): void {
	_.defaults(screens, newScreens);
}

/*
 * Set the active screen.
 *
 * name: The name of the screen to activate
 * args: Argument object to pass to the screen's start method
 */
export function set(name: string, args: any): void {
	if (!screens.hasOwnProperty(name)) {
		console.error('No such screen: ' + name);
		return;
	}
	pending = { name: name, screen: screens[name], args: args };
}

/*
 * Render the active screen.
 */
export function render(r: RenderContext): void {
	var newScreen = pending;
	pending = null;
	if (newScreen) {
		if (current) {
			current.stop(r.gl);
			current = null;
		}
		var obj = newScreen.screen, scr: Screen;
		if (typeof newScreen.screen == 'function') {
			scr = (<ScreenConstructor> obj)();
			screens[name] = obj;
		} else {
			scr = <Screen> obj;
		}
		scr.start(r, newScreen.args);
		current = scr;
	}
	if (current) {
		current.render(r);
	}
}
