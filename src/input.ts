/* Copyright 2015-2016 Dietrich Epp.

   This file is part of Kitten Teleporter.  The Kitten Teleporter source
   code is distributed under the terms of the MIT license.
   See LICENSE.txt for details. */

interface Binding {
	(e: KeyboardEvent): void;
}

interface Control {
	name: string;
	reset(): void;
	update(): void;
}

export interface ControlButton {
	state: boolean;
	press: boolean;
	release: boolean;
}

export interface Control2D {
	value: { [i: number]: number };
}

interface KeyBindings {
	[key: string]: Binding[];
}

/*
 * Initialize the input system, and register needed callbacks.
 */
export function init() {
	document.addEventListener('keydown', handleKeyDown);
	document.addEventListener('keyup', handleKeyUp);
}

// List of active control sets.
var activeControls: ControlSet[] = [];

// Map from key codes to lists of callbacks.
var bindings: KeyBindings;

var KEY_CODES : { [name: string]: number} = {
	backspace:   8,
	tab:         9,
	enter:      13,
	shift:      16,
	control:    17,
	alt:        18,
	escape:     27,
	space:      32,
	pageup:     33,
	pagedown:   34,
	end:        35,
	home:       36,
	left:       37,
	up:         38,
	right:      39,
	down:       40,
	insert:     45,
	'delete':   46,
	tilde:      192,
};

/*
 * Map a key name to the corresponding key code.
 * name: Key name
 */
function keyCode(name: string): number {
	if (name.length == 1) {
		var code = name.charCodeAt(0);
		if (code >= 97 && code <= 122) {
			return code + 65 - 97;
		}
		if (code >= 48 && code <= 57) {
			return code;
		}
	}
	return KEY_CODES[name] || null;
}

var ACTION_NAMES = ['up', 'down'];

/*
 * Parse a list of keys and return a list of keycodes.
 */
function parseKeyCodes(key: string): number[] {
	var result: number[] = [];
	var keys = key.split(/ +/);
	for (var i = 0; i < keys.length; i++) {
		var name = keys[i];
		var code = keyCode(name);
		if (!code) {
			console.warn('Unknown key: ' + name);
			continue;
		}
		result.push(code);
	}
	return result;
}

/*
 * A button, which could be mapped to multiple keys.  The button is
 * pressed as long as at least one of the keys is pressed.
 */
class Button {
	keys: { [code: string]: boolean };
	count: number;

	constructor() {
		this.keys = {};
		this.count = 0;
	}

	/*
	 * Reset this button's state.
	 */
	reset(): void {
		_.forOwn(this.keys, (value: boolean, key: string) => {
			this.keys[key] = false;
		});
		this.count = 0;
	}

	/*
	 * Handle an event for this button.
	 */
	handleEvent(e: KeyboardEvent): void {
		if (e.type == 'keydown') {
			if (!this.keys[e.keyCode]) {
				this.keys[e.keyCode] = true;
				this.count++;
			}
		} else {
			if (this.keys[e.keyCode]) {
				this.keys[e.keyCode] = false;
				this.count--;
			}
		}
	}
}

/*
 * Set of control mappings, can be enabled and disabled.  Control sets
 * start out disabled, you must enable them.
 */
export class ControlSet {
	private _active: boolean;
	_bindings: { [key: string]: Binding[] };
	private _controls: Control[];

	constructor() {
		// Whether the control set is active, accepting events.
		this._active = false;

		// Map from key + action to callback list.
		this._bindings = {};

		// List of control objects.
		// control.name: Human readable name of the control
		// control.reset: Function to reset the control
		// control.update: Function to update the control state
		this._controls = [];
	}

	/*
	 * Add callbacks to a control set.
	 *
	 * key: The keys mapped to the callbacks
	 * actions.down: List of callbacks for key down events
	 * actions.up: List of callbacks for key up events
	 */
	private _addBindings(key: string,
											 actions: { down?: Binding[], up?: Binding[] }): void {
		var codes = parseKeyCodes(key);
		for (var i = 0; i < ACTION_NAMES.length; i++) {
			var aname = ACTION_NAMES[i];
			var callbacks: Binding[] = (<any> actions)[aname];
			if (!callbacks) {
				continue;
			}
			var suffix = '.' + aname;
			for (var j = 0; j < codes.length; j++) {
				var name = codes[j] + suffix;
				var cblist = this._bindings[name];
				if (!cblist) {
					cblist = [];
					this._bindings[name] = cblist;
				}
				cblist.push.apply(cblist, callbacks);
			}
		}
		if (this._active) {
			bindings = undefined;
		}
	}

	/*
	 * Add a key to the control set.
	 *
	 * A key responds to instantaneous "press" events in real time.  It is
	 * only suitable for user interface events, since the event timing is
	 * not precise.
	 *
	 * options.name: The name of the input binding.
	 * options.key: The key names, a string
	 * options.press: The callback for when the key is pressed
	 */
	addKey(options: { name: string, key: string, press: Binding }) {
		var control = {
			name: options.name,
			reset: () => {},
			update: () => {},
		};
		this._addBindings(options.key, {
			down: [options.press]
		});
		this._controls.push(control);
	}

	/*
	 * Add a button to the control set.
	 *
	 * A button records its current state at the current timestamp.  This
	 * returns an object with button state properties.  The 'state'
	 * property gives the current state of the button.  The 'press'
	 * property indicates that the button transitioned from not pressed to
	 * pressed during the current update.  The 'release' property
	 * indicates that the button transitioned from pressed to not pressed
	 * during the current update.
	 *
	 * options.name: The name of the input binding
	 * options.key: The keys mapped to this button
	 */
	addButton(options: { name: string, key: string }): ControlButton {
		var control = {
			name: options.name,
			result: {
				state: false,
				press: false,
				release: false,
			},
			press: false,
			release: false,
			button: new Button(),
			reset: function() {
				var r = this.result;
				r.state = false;
				r.press = false;
				r.release = false;
				this.press = false;
				this.release = false;
			},
			handleEvent: function(e: KeyboardEvent) {
				this.button.handleEvent(e);
				var r = this.result;
				var v0 = r.state, v1 = this.button.count !== 0;
				if (v1) {
					if (!v0) {
						this.press = true;
						r.state = true;
					}
				} else {
					if (v0) {
						this.release = true;
						r.state = false;
					}
				}
			},
			update: function() {
				var r = this.result;
				r.press = this.press;
				r.release = this.release;
				this.press = false;
				this.release = false;
				this.button.reset();
			},
		};
		var handlers = [control.handleEvent.bind(control)];
		this._addBindings(options.key, { down: handlers, up: handlers });
		this._controls.push(control);
		return control.result;
	}

	/*
	 * Add a 2D control to the control set.
	 *
	 * Keys can be specified as a string, with key names separated by
	 * spaces, or a list of key names.  Returns an object with a 'value'
	 * property which is updated every frame.
	 *
	 * options.name: The name of the input binding
	 * options.left: Keys for moving left
	 * options.right: Keys for moving right
	 * options.up: Keys for moving up
	 * options.down: Keys for moving down
	 * options.normalize: Whether to limit the output to the unit circle.
	 */
	add2D(options: { name: string, left: string, right: string, up: string,
									 down: string, normalize?: boolean }): Control2D {
		var control = {
			name: options.name,
			result: {
				value: [0, 0],
			},
			normalize: !!options.normalize,
			x0: new Button(),
			x1: new Button(),
			y0: new Button(),
			y1: new Button(),
			reset: function() {
				this.x0.reset();
				this.x1.reset();
				this.y0.reset();
				this.y1.reset();
				this.result.value[0] = 0;
				this.result.value[1] = 0;
			},
			update: function() {
				var x = (this.x1.count !== 0 ? 1 : 0) + (this.x0.count !== 0 ? -1 : 0);
				var y = (this.y1.count !== 0 ? 1 : 0) + (this.y0.count !== 0 ? -1 : 0);
				if (this.normalize) {
					var mag = Math.sqrt(x * x + y * y);
					if (mag > 1.0) {
						var a = 1.0 / mag;
						x *= a;
						y *= a;
					}
				}
				var v = this.result.value;
				v[0] = x;
				v[1] = y;
			},
		};
		var nameMap: { [x: string]: string } =
			{ left: 'x0', right: 'x1', down: 'y0', up: 'y1' };
		_.forOwn(nameMap, (value: string, key: string) => {
			function handleEvent(e: KeyboardEvent) {
				(<Button> (<any> control)[value]).handleEvent(e);
			}
			var handlers = [handleEvent];
			this._addBindings((<any> options)[key], { down: handlers, up: handlers });
		});
		this._controls.push(control);
		return control.result;
	}

	/*
	 * Enable the control set, it will start processing input.
	 */
	enable(): void {
		if (this._active) {
			return;
		}
		activeControls.push(this);
		bindings = undefined;
	}

	/*
	 * Disable the control set, it will stop processing input.
	 */
	disable(): void {
		if (!this._active) {
			return;
		}
		for (var i = 0; i < activeControls.length; i++) {
			if (activeControls[i] === this) {
				activeControls.splice(i, 1);
				break;
			}
		}
		bindings = undefined;
	}

	/*
	 * Update controls to the given time stamp.
	 */
	update(): void {
		for (var i = 0; i < this._controls.length; i++) {
			this._controls[i].update();
		}
	}
}

/*
 * Update the global binding map.
 */
function updateBindings(): void {
	var m: KeyBindings = {};
	_.forEach(activeControls, (controlSet: ControlSet) => {
		_.forOwn(controlSet._bindings, (value: Binding[], name: string) => {
			var cblist = m[name];
			if (!cblist) {
				cblist = [];
				m[name] = cblist;
			}
			cblist.push.apply(cblist, value);
		});
	});
	bindings = m;
}

/*
 * Handle a key event.
 */
function handleKey(e: KeyboardEvent, suffix: string): boolean {
	if (!bindings) {
		updateBindings();
	}
	var cblist = bindings[e.keyCode + suffix];
	if (!cblist) {
		return;
	}
	for (var i = 0; i < cblist.length; i++) {
		cblist[i](e);
	}
	e.preventDefault();
	return false;
}

/*
 * Handle the key down event.
 */
function handleKeyDown(e: KeyboardEvent) {
	handleKey(e, '.down');
}

/*
 * Handle the key up event.
 */
function handleKeyUp(e: KeyboardEvent) {
	handleKey(e, '.up');
}

/*
 * Handle the key up event.
 */
function handleKeyPress(e: KeyboardEvent) {
	handleKey(e, '.press');
}
