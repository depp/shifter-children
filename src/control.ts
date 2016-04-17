/* Copyright 2015-2016 Dietrich Epp.

   This file is part of Kitten Teleporter.  The Kitten Teleporter source
   code is distributed under the terms of the MIT license.
   See LICENSE.txt for details. */

/*
 * Control definitions.
 */

import { ControlSet, ControlButton, Control2D } from './input';

interface ControlGroup {
	enable(): void;
	disable(): void;
	update(): void;
}

function makeGroup<T>(name: string,
											func: (ctl: ControlSet) => T) : T & ControlGroup {
	var ctl = new ControlSet();
	var obj: any = func(ctl);
	obj.enable = () => { ctl.enable(); };
	obj.disable = () => { ctl.disable(); };
	obj.update = () => { ctl.update(); };
	return obj;
}

interface GameControl {
	move: Control2D;
	jump: ControlButton;
}

export var game = makeGroup('game', function(ctl: ControlSet): GameControl {
	ctl.addKey({
		name: 'Exit',
		key: 'escape',
		press: () => { console.log('Key ESCAPE'); },
	});

	return {
		move: ctl.add2D({
			name: 'Move',
			left: 'left a',
			right: 'right d',
			up: 'up w',
			down: 'down s',
		}),

		jump: ctl.addButton({
			name: 'Jump',
			key: 'space',
		}),
	};
});
