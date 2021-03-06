/* Copyright 2016 Dietrich Epp.

   This file is part of Shifter Children.  The Shifter Children source
   code is distributed under the terms of the MIT license.  See
   LICENSE.txt for details. */

import * as combat from './combat';

const MaxTurns = 2000;

interface SimParam {
	health: number;
	speed: number;
	teamSize: number;
	count?: number;
}

export class Match {
	shape1: string;
	shape2: string;
	wins1: number = 0;
	wins2: number = 0;
	ties: number = 0;
	count: number = 0;
	turns: number = 0;

	constructor(shape1: string, shape2: string) {
		this.shape1 = shape1;
		this.shape2 = shape2;
	}

	run(param: SimParam, listener?: combat.EvtHandler) {
		var { health, speed, teamSize, count = 1 } = param;
		var s1: combat.ActorSpec = { shape: this.shape1, health, speed };
		var s2: combat.ActorSpec = { shape: this.shape2, health, speed };
		for (var iter = 0; iter < count; iter++) {
			var c = new combat.Combat();
			c.listen(listener);
			for (var i = 0; i < teamSize; i++) {
				c.add(new combat.Actor(1, combat.Control.Computer, s1));
			}
			for (var i = 0; i < teamSize; i++) {
				c.add(new combat.Actor(2, combat.Control.Computer, s2));
			}
			var turn = 0;
			while (!c.done && turn < MaxTurns) {
				turn++;
				c.update();
			}
			this.turns += turn;
			if (c.teams[1] && !c.teams[2]) {
				this.wins1++;
			} else if (!c.teams[1] && c.teams[2]) {
				this.wins2++;
			} else {
				this.ties++;
			}
			this.count++;
		}
	}
}

export function matchAll(): Match[] {
	var shapes = combat.ShapeNames;
	var matches: Match[] = [];
	for (var i = 0; i < shapes.length; i++) {
		for (var j = i; j < shapes.length; j++) {
			matches.push(new Match(shapes[i], shapes[j]));
		}
	}
	return matches;
}
