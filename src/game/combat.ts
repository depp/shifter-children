/* Copyright 2016 Dietrich Epp.

   This file is part of Shifter Children.  The Shifter Children source
   code is distributed under the terms of the MIT license.  See
   LICENSE.txt for details. */

/*
 * This module contains all of the logic of how combat works in the
 * game.
 */

export enum Control {
	None,
	Player,
	Computer,
	Confused,
}

export enum Targeting {
	None,
	Single,
	Multiple,
}

enum Hit {
	Miss,
	Hit,
	Reflect
}

type AttackType =
	'fight' | 'psychic' | 'fire' | 'magic' | 'air' | 'ground' | 'blessing';
type AttackEffect
	= 'normal' | 'drain';

/*
 * A character's "compliance" (can't think of a better word) to an
 * action.  Determines whether a character is strong or vulnerable.
 */
enum Compliance {
	// Attack damages as normal.
	Normal,
	// Attack deals 50% damage.
	Resist,
	// Attack deals 200% damage.
	Vulnerable,
	// Attack does not hit, no status effects.
	Immune,
	// Attack is reflected to a random enemy of the target.
	Reflect,
	// Attack heals the target.
	Absorb,
}

type AttackCallback = (target: Actor, compliance: Compliance) => void;

/*
 * An "action" is any choice you can make during a character's turn in
 * battle.
 */

class ActionRecord {
	// The selected action.
	action: string;
	// The actor performing the action.
	source: number;
	// The targeted actor, if this is a singly-targeted action.  The
	// team will also be set.
	targetActor: number;
	// The team which is targeted, or if targetInvert is set, the team
	// which is not targeted.
	targetTeam: number;
	// Whether the target set is complemented.
	targetInvert: boolean;
	// How to handle retargeting if the target is not a valid target
	// when the action runs.  This cannot be Player.
	retargetControl: Control;

	constructor(action: string) {
		this.action = action;
	}
}

export interface Action {
	// The possible targets for the action.
	targeting: Targeting;
	// Whether the action is hostile.
	hostile: boolean;
	// Amount of time it takes to perform the action.
	time: number;
	// Amount of time to cool down after performing the action.
	cooldown: number;
	// Perform the action.
	act(combat: Combat, rec: ActionRecord): void;
}

export interface ActionMap {
	[name: string]: Action;
}

export const Actions: ActionMap = {
	wereSlash: {
		targeting: Targeting.Single,
		hostile: true,
		time: 120,
		cooldown: 500,
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(
				rec.source, [rec.targetActor], 'fight',
				(a: Actor, c: Compliance) => {

				});
		}
	},
	wereHowl: {
		targeting: Targeting.Multiple,
		hostile: false,
		time: 300,
		cooldown: 800,
		act: function(combat: Combat, rec: ActionRecord) {}
	},
	batBite: {
		targeting: Targeting.Single,
		hostile: true,
		time: 150,
		cooldown: 600,
		act: function(combat: Combat, rec: ActionRecord) {}
	},
	batScreech: {
		targeting: Targeting.Multiple,
		hostile: true,
		time: 300,
		cooldown: 800,
		act: function(combat: Combat, rec: ActionRecord) {}
	},
	stonePound: {
		targeting: Targeting.Single,
		hostile: true,
		time: 250,
		cooldown: 600,
		act: function(combat: Combat, rec: ActionRecord) {}
	},
	stoneStomp: {
		targeting: Targeting.Multiple,
		hostile: true,
		time: 500,
		cooldown: 500,
		act: function(combat: Combat, rec: ActionRecord) {}
	},
	impBlast: {
		targeting: Targeting.Single,
		hostile: true,
		time: 200,
		cooldown: 600,
		act: function(combat: Combat, rec: ActionRecord) {}
	},
	impSmoke: {
		targeting: Targeting.Multiple,
		hostile: false,
		time: 300,
		cooldown: 600,
		act: function(combat: Combat, rec: ActionRecord) {}
	},
	glipMutate: {
		targeting: Targeting.Multiple,
		hostile: false,
		time: 25,
		cooldown: 1200,
		act: function(combat: Combat, rec: ActionRecord) {}
	},
	glipLaugh: {
		targeting: Targeting.Single,
		hostile: true,
		time: 350,
		cooldown: 900,
		act: function(combat: Combat, rec: ActionRecord) {}
	},
	mageBolt: {
		targeting: Targeting.Single,
		hostile: true,
		time: 225,
		cooldown: 500,
		act: function(combat: Combat, rec: ActionRecord) {}
	},
	mageHaste: {
		targeting: Targeting.Single,
		hostile: false,
		time: 450,
		cooldown: 450,
		act: function(combat: Combat, rec: ActionRecord) {}
	},
	airGale: {
		targeting: Targeting.Multiple,
		hostile: true,
		time: 275,
		cooldown: 500,
		act: function(combat: Combat, rec: ActionRecord) {}
	},
	airToss: {
		targeting: Targeting.Single,
		hostile: true,
		time: 350,
		cooldown: 600,
		act: function(combat: Combat, rec: ActionRecord) {}
	},
	mirrorClone: {
		targeting: Targeting.Single,
		hostile: false,
		time: 400,
		cooldown: 700,
		act: function(combat: Combat, rec: ActionRecord) {}
	},
	mirrorCapture: {
		targeting: Targeting.Single,
		hostile: true,
		time: 400,
		cooldown: 700,
		act: function(combat: Combat, rec: ActionRecord) {}
	},
	unicornPurify: {
		targeting: Targeting.Single,
		hostile: false,
		time: 250,
		cooldown: 500,
		act: function(combat: Combat, rec: ActionRecord) {}
	},
	unicornAbjure: {
		targeting: Targeting.Multiple,
		hostile: false,
		time: 250,
		cooldown: 500,
		act: function(combat: Combat, rec: ActionRecord) {}
	},
};

const MissingAction: Action = {
	targeting: Targeting.None,
	hostile: false,
	time: 200,
	cooldown: 200,
	act: function(combat: Combat, rec: ActionRecord) {}
};

function getAction(name: string): Action {
	var a = Actions[name];
	if (a) {
		return a;
	}
	console.warn('Invalid action: ' + name);
	return MissingAction;
}

/*
 * A "shape" is one of the forms that a character can take, with
 * associated powers and attributes.
 */

export interface ComplianceMap {
	[type: string]: Compliance;
}

export interface Shape {
	// List of actions that this shape can perform.
	actions: string[];
	// Compliance to different damage types.
	compliance: ComplianceMap;
}

export interface ShapeMap {
	[name: string]: Shape;
}

interface CMBuilder {
	immune?: AttackType[];
	resist?: AttackType[];
	vulnerable?: AttackType[];
	reflect?: AttackType[];
	absorb?: AttackType[];
}

function mkCompliance(info?: CMBuilder) {
	var map: ComplianceMap = {
		blessing: Compliance.Absorb,
	};
	function add(c: Compliance, alist: AttackType[]) {
		for (var a of alist) {
			map[a] = c;
		}
	}
	if (info) {
		add(Compliance.Immune, info.immune);
		add(Compliance.Resist, info.resist);
		add(Compliance.Vulnerable, info.vulnerable);
		add(Compliance.Reflect, info.reflect);
		add(Compliance.Absorb, info.absorb);
	}
	return map;
}

export const Shapes: ShapeMap = {
	were: {
		actions: ['wereSlash', 'wereHowl'],
		compliance: mkCompliance({
			resist: ['psychic'],
			vulnerable: ['fire'],
		}),
	},
	bat: {
		actions: ['batBite', 'batScreech'],
		compliance: mkCompliance({
			resist: ['ground'],
			vulnerable: ['air'],
		}),
	},
	stone: {
		actions: ['stonePound', 'stoneStomp'],
		compliance: mkCompliance({
			resist: ['air'],
			vulnerable: ['fire', 'magic'],
		}),
	},
	imp: {
		actions: ['impBlast', 'impSmoke'],
		compliance: mkCompliance({
			resist: ['fight'],
			vulnerable: ['psychic'],
		}),
	},
	air: {
		actions: ['airGale', 'airToss'],
		compliance: mkCompliance({
			resist: ['ground', 'fight'],
			vulnerable: ['air', 'magic'],
		}),
	},
	mage: {
		actions: ['mageBolt', 'mageHaste'],
		compliance: mkCompliance({
			resist: ['psychic'],
			vulnerable: ['fight'],
		}),
	},
	mirror: {
		actions: ['mirrorClone', 'mirrorCapture'],
		compliance: mkCompliance({
			resist: ['fire', 'magic', 'psychic'],
			vulnerable: ['fight', 'ground'],
		}),
	},
	unicorn: {
		actions: ['unicornPurify', 'unicornAbjure'],
		compliance: {},
	},
	glip: {
		actions: ['glipMutate', 'glipLaugh'],
		compliance: {},
	},
};

const MissingShape: Shape = {
	actions: [],
	compliance: {},
};

function getShape(name: string): Shape {
	var s = Shapes[name];
	if (s) {
		return s;
	}
	console.warn('Invalid shape: ' + name);
	return MissingShape;
}

/*
 * A status effect on an actor.
 */
interface Status {
	// Update the status effect.  Return true if the effect continues,
	// false if the effect should be removed.
	update(actor: Actor): boolean;
}

/*
 * An actor is a player character or enemy.
 */

export interface ActorSpec {
	shape: string;
	health: number;
	speed: number;
}

// An actor in combat.
export class Actor {
	// The slot number for this actor.
	index: number;

	// The actor's current shape.
	curShape: string;
	// The actor's shape last frame.
	prevShape: string;

	// The team that the actor is on.
	baseTeam: number;
	// The base team controlling the actor.
	baseControl: Control;
	// The team controlling the actor at the moment.
	curTeam: number;
	// The system controlling the actor at the moment.
	curControl: Control;

	// The actor's base (maximum) health.
	baseHealth: number;
	// The actor's current health.
	curHealth: number;
	// The actor's health last frame.
	prevHealth: number;

	// Time remaining until this actor is active.
	time: number;
	// The actor's base speed.
	baseSpeed: number;
	// The actor's current speed.
	curSpeed: number;

	// The selected action.
	action: ActionRecord;

	// Active status effects.
	status: Status[];

	constructor(team: number, control: Control, spec: ActorSpec) {
		this.index = -1;
		this.curShape = spec.shape;
		this.prevShape = spec.shape;
		this.baseTeam = team;
		this.baseControl = control;
		this.curTeam = team;
		this.curControl = control;
		this.baseHealth = spec.health;
		this.curHealth = spec.health;
		this.prevHealth = spec.health;
		this.time = 200;
		this.baseSpeed = spec.speed;
		this.curSpeed = spec.speed;
		this.action = null;
		this.status = [];
	}
}

function getCompliance(actor: Actor, type: AttackType): Compliance {
	return getShape(actor.curShape).compliance[type] || Compliance.Normal;
}

export class Combat {
	actors: Actor[] = [];
	done: boolean = false;

	add(actor: Actor) {
		actor.index = this.actors.length;
		actor.prevShape = actor.curShape;
		actor.prevHealth = actor.curHealth;
		this.actors.push(actor);
	}

	// Update one step of combat.
	update(): void {
		var active: Actor = null;
		for (var actor of this.actors) {
			actor.prevShape = actor.curShape;
			actor.prevHealth = actor.curHealth;
			if (!actor.time && !active) {
				active = actor;
			}
		}
		if (active) {
			var act = active.action;
			if (act) {
				var actionType = getAction(act.action);
				active.action = null;
				active.time = actionType.cooldown;
				actionType.act(this, act);
			} else {
				switch (active.curControl) {
				case Control.Computer:
					this.computerAction(active);
					break;
				}
				if (!active.action) {
					console.warn('No action selected');
					active.action = new ActionRecord('');
				}
				active.time = getAction(active.action.action).time;
			}
		} else {
			for (var actor of this.actors) {
				actor.curControl = actor.baseControl
				actor.curTeam = actor.baseTeam;
				actor.curSpeed = actor.baseSpeed;
				for (var i = 0, sts = actor.status; i < sts.length;) {
					var st = sts[i];
					if (!st.update(actor)) {

					}
				}
			}
		}
	}

	/*
	 * Have the computer choose an action for the given actor.
	 */
	computerAction(actor: Actor): void {
		var shape = Shapes[actor.curShape];
		if (!shape) {
			return;
		}
		var actName = randomTri(shape.actions);
		if (!actName) {
			return;
		}
		var actionType = Actions[actName];
		if (!actionType) {
			return;
		}
		var act = new ActionRecord(actName);
		if (actionType.targeting == Targeting.Single) {
			act.targetActor = randomUniform(
				actionType.hostile ?
					this.enemies(actor.curTeam) : this.allies(actor.curTeam));
		}
		act.targetTeam = actor.curTeam;
		act.targetInvert = actionType.hostile;
	}

	/*
	 * Select all allies on the given team.
	 */
	allies(team: number): number[] {
		return this.selectActors((a: Actor) => a.baseTeam === team);
	}

	/*
	 * Select all enemies of the given team.
	 */
	enemies(team: number): number[] {
		return this.selectActors((a: Actor) => a.baseTeam !== team);
	}

	/*
	 * Select everybody, all actors.
	 */
	everybody(): number[] {
		return this.selectActors((a) => true);
	}

	/*
	 * Select a list of actors meeting the given criterion.
	 */
	selectActors(pred: (a: Actor) => boolean): number[] {
		var list: number[] = [];
		for (var actor of this.actors) {
			if (pred(actor)) {
				list.push(actor.index);
			}
		}
		return list;
	}

	/*
	 * Perform an attack by an actor against other actors.  The results
	 * of the attack are passed through the action callback function.
	 */
	attack(source: number, targets: number[], type: AttackType,
				 action: AttackCallback): void
	{
		var srcActor = this.actors[source];
		for (var target of targets) {
			var targetActor = this.actors[target];
			if (!targetActor) {
				console.warn('Invalid target');
				continue;
			}
			var compliance = getCompliance(targetActor, type);
			if (compliance === Compliance.Reflect) {
				targetActor = this.actors[
					randomUniform(this.enemies(targetActor.baseTeam))];
				if (!targetActor) {
					console.warn('Invalid target');
					continue;
				}
				compliance = getCompliance(targetActor, type);
				if (compliance === Compliance.Reflect) {
					compliance = Compliance.Normal;
				}
			}
			action(targetActor, compliance);
		}
	}

	/*
	 * Apply damage to targets.
	 */
	attackDamage(source: Actor, power: number,
							 effect: AttackEffect): AttackCallback
	{
		return (target: Actor, compliance: Compliance) => {
			var pow = power;
			switch (compliance) {
			case Compliance.Normal:
				break;
			case Compliance.Resist:
				pow *= 0.5;
				break;
			case Compliance.Vulnerable:
				pow *= 2;
				break;
			case Compliance.Immune:
				return;
			}
			var dmg: number;
			if (power > 0) {
				var minDmg = (pow * (2 / 3)) | 0, maxDmg = (pow * (4 / 3)) | 0;
				dmg = Math.max(1, minDmg + (Math.random() * (maxDmg + 1 - minDmg)));
				target.curHealth -= dmg;
			} else {
				dmg = 0;
			}
			switch (effect) {
			case 'drain':
				if (source !== target) {
					source.curHealth += dmg;
				}
				break;
			}
		};
	}
}

/*
 * Choose a random element from a list, weighted uniformly.
 */
function randomUniform<T>(choices: T[]): T {
	var n = choices.length;
	if (!choices || !n) {
		return null;
	}
	if (n === 1) {
		return choices[0];
	}
	return choices[Math.min(n - 1, (Math.random() * n) | 0)];
}

/*
 * Choose a random element from a list, using a triangular
 * distribution weighted most heavily towards the first element.
 */
function randomTri<T>(choices: T[]): T {
	var n = choices.length;
	if (!choices || !n) {
		return null;
	}
	if (n === 1) {
		return choices[0];
	}
	var t = (n + 1) * n / 2;
	var r = Math.random() * t;
	var i = 0;
	var c = 0;
	for (; i < choices.length - 1; i++) {
		c += (n - i);
		if (c > t) {
			break;
		}
	}
	return choices[i];
}
