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

enum AttackType {
	Fight,
	Psychic,
	Fire,
	Magic,
	Air,
	Ground,
	Blessing,
	NoEvade,
}

export enum Status {
	None = 0,
	Dead        = 1 << 0,
	LowHealth   = 1 << 1,
	Darken      = 1 << 2,
	Abjure      = 1 << 3,
}

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
 * ===========================================================================
 * Actions
 * ===========================================================================
 */

/*
 * An "action" is any choice you can make during a character's turn in
 * battle.
 */

class ActionRecord {
	// The selected action.
	action: string;
	// The actor performing the action.
	source: number;
	// Whether this action is multiply targeted.
	isMultiplyTargeted: boolean;
	// Whether the source actor is confused.
	isConfused: boolean;
	// The targeted actor, if this is a singly-targeted action.  The
	// team will also be set.
	targetActor: number;
	// The team which is targeted, or if targetInvert is set, the team
	// which is not targeted.
	targetTeam: number;
	// Whether the target set is complemented.
	targetInvert: boolean;

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

interface AttackSpec {
	type: AttackType;
	effect?: string;
	power?: number;
}

export const Actions: ActionMap = {
	wereSlash: {
		targeting: Targeting.Single,
		hostile: true,
		time: 120,
		cooldown: 500,
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(rec, {
				type: AttackType.Fight,
				power: 25,
			});
		}
	},
	wereHowl: {
		targeting: Targeting.Multiple,
		hostile: false,
		time: 300,
		cooldown: 800,
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(rec, {
				type: AttackType.Psychic,
				effect: 'attackUp',
			});
		}
	},
	batBite: {
		targeting: Targeting.Single,
		hostile: true,
		time: 150,
		cooldown: 600,
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(rec, {
				type: AttackType.Fight,
				power: 25,
				effect: 'drain',
			});
		}
	},
	batScreech: {
		targeting: Targeting.Multiple,
		hostile: true,
		time: 300,
		cooldown: 800,
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(rec, {
				type: AttackType.Psychic,
				effect: 'frighten',
			});
		}
	},
	stonePound: {
		targeting: Targeting.Single,
		hostile: true,
		time: 250,
		cooldown: 600,
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(rec, {
				type: AttackType.Ground,
				power: 30,
				effect: 'stun',
			});
		}
	},
	stoneStomp: {
		targeting: Targeting.Multiple,
		hostile: true,
		time: 500,
		cooldown: 500,
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(rec, {
				type: AttackType.Ground,
				power: 20,
			});
		}
	},
	impBlast: {
		targeting: Targeting.Single,
		hostile: true,
		time: 200,
		cooldown: 600,
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(rec, {
				type: AttackType.Fire,
				power: 20,
				effect: 'burn',
			});
		}
	},
	impSmoke: {
		targeting: Targeting.Multiple,
		hostile: false,
		time: 300,
		cooldown: 600,
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(rec, {
				type: AttackType.NoEvade,
				effect: 'smoke',
			});
		}
	},
	glipMutate: {
		// Special
		targeting: Targeting.None,
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
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(rec, {
				type: AttackType.Psychic,
				effect: 'confuse',
			});
		}
	},
	mageBolt: {
		targeting: Targeting.Single,
		hostile: true,
		time: 225,
		cooldown: 500,
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(rec, {
				type: AttackType.Magic,
				power: 25,
			})
		}
	},
	mageHaste: {
		targeting: Targeting.Single,
		hostile: false,
		time: 450,
		cooldown: 450,
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(rec, {
				type: AttackType.Magic,
				effect: 'haste',
			})
		}
	},
	airGale: {
		targeting: Targeting.Multiple,
		hostile: true,
		time: 275,
		cooldown: 500,
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(rec, {
				type: AttackType.Air,
			});
		}
	},
	airToss: {
		targeting: Targeting.Single,
		hostile: true,
		time: 350,
		cooldown: 600,
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(rec, {
				type: AttackType.Air,
				effect: 'toss',
			});
		}
	},
	mirrorDarken: {
		targeting: Targeting.Single,
		hostile: true,
		time: 400,
		cooldown: 700,
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(rec, {
				type: AttackType.Magic,
				effect: 'darken',
			});
		}
	},
	mirrorCapture: {
		targeting: Targeting.Single,
		hostile: true,
		time: 400,
		cooldown: 700,
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(rec, {
				type: AttackType.Magic,
				effect: 'control',
			});
		}
	},
	unicornPurify: {
		targeting: Targeting.Single,
		hostile: false,
		time: 250,
		cooldown: 500,
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(rec, {
				type: AttackType.Blessing,
				power: 75,
			});
		}
	},
	unicornAbjure: {
		targeting: Targeting.Multiple,
		hostile: false,
		time: 250,
		cooldown: 500,
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(rec, {
				type: AttackType.Blessing,
				effect: 'abjure',
			});
		}
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
 * ===========================================================================
 * Shapes
 * ===========================================================================
 */

/*
 * A "shape" is one of the forms that a character can take, with
 * associated powers and attributes.
 */

export interface ComplianceMap {
	[type: number]: Compliance;
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
	var map: ComplianceMap = {};
	function add(c: Compliance, alist: AttackType[]) {
		for (var a of alist) {
			map[a] = c;
		}
	}
	add(Compliance.Absorb, [AttackType.Blessing]);
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
			resist: [AttackType.Psychic],
			vulnerable: [AttackType.Fire],
		}),
	},
	bat: {
		actions: ['batBite', 'batScreech'],
		compliance: mkCompliance({
			resist: [AttackType.Ground],
			vulnerable: [AttackType.Air],
		}),
	},
	stone: {
		actions: ['stonePound', 'stoneStomp'],
		compliance: mkCompliance({
			resist: [AttackType.Air],
			vulnerable: [AttackType.Fire, AttackType.Magic],
		}),
	},
	imp: {
		actions: ['impBlast', 'impSmoke'],
		compliance: mkCompliance({
			resist: [AttackType.Fight],
			vulnerable: [AttackType.Psychic],
		}),
	},
	air: {
		actions: ['airGale', 'airToss'],
		compliance: mkCompliance({
			resist: [AttackType.Ground, AttackType.Fight],
			vulnerable: [AttackType.Air, AttackType.Magic],
		}),
	},
	mage: {
		actions: ['mageBolt', 'mageHaste'],
		compliance: mkCompliance({
			resist: [AttackType.Psychic],
			vulnerable: [AttackType.Fight],
		}),
	},
	mirror: {
		actions: ['mirrorClone', 'mirrorCapture'],
		compliance: mkCompliance({
			resist: [AttackType.Fire, AttackType.Magic, AttackType.Psychic],
			vulnerable: [AttackType.Fight, AttackType.Ground],
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
 * ===========================================================================
 * Persistent status effects
 * ===========================================================================
 */

// An active persistent effect on an actor.
abstract class PersistentEffect {
	// Whether the effect is harmful.
	isHarmful: boolean;
	// Update the status effect.  Return true if the effect continues,
	// false if the effect should be removed.  Called once per frame.
	abstract update(actor: Actor): boolean;
	// Apply the status effect to the actor.  This must only modify the
	// actor's ephemeral properties, to make sure that
	// Actor.applyEffects() is idempotent.
	abstract apply(actor: Actor): void;
}

interface PersistentEffectType {
	new(compliance: Compliance): PersistentEffect;
}

interface PersistentEffectMap {
	[name: string]: PersistentEffectType;
}

const PersistentEffects: PersistentEffectMap = {
	attackUp: null,
	defenseDown: null,
	drain: null,
	frighten: null,
	confuse: null,
	stun: null,
	burn: null,
	smoke: null,
	haste: null,
	toss: null,
	darken: null,
	control: null,
	abjure: null,
};

/*
 * ===========================================================================
 * Actors
 * ===========================================================================
 *
 * Actors are player characters or enemies.
 */

// Spec for creating a new actor.
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
	persistentEffects: PersistentEffect[];
	// The actor's current status.
	curStatus: Status;
	// The actor's status last frame.
	prevStatus: Status;

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
		this.persistentEffects = [];
		this.curStatus = Status.None;
		this.prevStatus = Status.None;
	}

	// Update the actor state.
	update(): void {
		this.prevShape = this.curShape;
		this.prevHealth = this.curHealth;
		this.prevStatus = this.curStatus;
		if (this.curStatus & Status.Dead) {
			return;
		}
		for (var i = 0, fxs = this.persistentEffects; i < fxs.length;) {
			if (fxs[i].update(this)) {
				i++;
			} else {
				fxs.splice(i, 1);
			}
		}
		this.applyEffects();
	}

	// Apply all active status effects to the actor and fix any
	// properties that are out of range.  This is idempotent, it is
	// called whenever something happens to the actor.
	applyEffects(): void {
		this.curHealth = Math.max(0, Math.min(this.baseHealth, this.curHealth));
		this.curControl = this.baseControl
		this.curTeam = this.baseTeam;
		this.curSpeed = this.baseSpeed;
		this.curStatus = Status.None;
		if (this.curHealth === 0) {
			this.curStatus = Status.Dead;
			this.persistentEffects.length = 0;
		} else if (this.curHealth < this.baseHealth / 5) {
			this.curStatus = Status.LowHealth;
		}
		for (var fx of this.persistentEffects) {
			fx.apply(this);
		}
	}

	// Get the compliance to attacks of the given type.
	compliance(type: AttackType): Compliance {
		if (type == AttackType.NoEvade) {
			return Compliance.Normal;
		}
		var c = getShape(this.curShape).compliance[type] || Compliance.Normal;
		if (this.curStatus & Status.Darken) {
			switch (c) {
			case Compliance.Normal:
			case Compliance.Resist:
				c = Compliance.Vulnerable;
				break;
			case Compliance.Immune:
				c = Compliance.Normal;
				break;
			case Compliance.Reflect:
				break;
			}
		}
		return c;
	}
}

/*
 * ===========================================================================
 * Combat
 * ===========================================================================
 */

// Calculate attack damage.
function attackDamage(compliance: Compliance, power: number): number {
	switch (compliance) {
	case Compliance.Normal:
		break;
	case Compliance.Resist:
		power *= 0.5;
		break;
	case Compliance.Vulnerable:
		power *= 2;
		break;
	case Compliance.Immune:
		return 0;
	}
	var minDmg = (power * (2 / 3)) | 0;
	var maxDmg = (power * (4 / 3)) | 0;
	return Math.max(1, minDmg + (Math.random() * (maxDmg + 1 - minDmg)));
}

// Combat state manager.
export class Combat {
	actors: Actor[] = [];
	done: boolean = false;

	add(actor: Actor) {
		actor.index = this.actors.length;
		this.actors.push(actor);
	}

	// Update one step of combat.
	update(): void {
		var active: Actor = null;
		for (var actor of this.actors) {
			actor.update();
			if (!actor.time && !active) {
				active = actor;
			}
		}
		if (active) {
			var rec = active.action;
			if (rec) {
				var actionType = getAction(rec.action);
				active.action = null;
				active.time = actionType.cooldown;
				actionType.act(this, rec);
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
		}
	}

	// Have the computer choose an action for the given actor.
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
		var rec = new ActionRecord(actName);
		rec.source = actor.index;
		rec.isMultiplyTargeted = actionType.targeting !== Targeting.Single;
		rec.isConfused = false;
		rec.targetActor = null;
		rec.targetTeam = actor.curTeam;
		rec.targetInvert = actionType.hostile;
		actor.action = rec;
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
	 * Get the actors on a given team (if invert is false) or the actors
	 * on all other teams (if invert is true).
	 */
	private getTeam(team: number, invert: boolean): Actor[] {
		if (invert) {
			return this.actors.filter((a: Actor) => a.baseTeam === team);
		} else {
			return this.actors.filter((a: Actor) => a.baseTeam !== team);
		}
	}

	/*
	 * Get actual targets for an attack.
	 */
	getTargets(rec: ActionRecord): Actor[] {
		if (rec.isMultiplyTargeted) {
			return this.getTeam(rec.targetTeam, rec.targetInvert);
		}
		var targetActor = rec.targetActor;
		if (typeof targetActor === 'number') {
			return [this.actors[targetActor]];
		}
		return [randomUniform(
			rec.isConfused ?
				this.actors : this.getTeam(rec.targetTeam, rec.targetInvert))];
	}

	/*
	 * Perform an attack by an actor against other actors.
	 */
	attack(rec: ActionRecord, spec: AttackSpec): void {
		var source = this.actors[rec.source];
		var targets = this.getTargets(rec);
		for (var target of targets) {
			var compliance = target.compliance(spec.type);
			if (compliance === Compliance.Reflect) {
				target = randomUniform(
					this.actors.filter((a: Actor) => a.baseTeam !== target.baseTeam));
				if (!target) {
					console.warn('Invalid target');
					continue;
				}
				compliance = target.compliance(spec.type);
				if (compliance === Compliance.Reflect) {
					compliance = Compliance.Normal;
				}
			}
			if (compliance == Compliance.Immune) {
				continue;
			}
			var damage = 0;
			if (typeof spec.power === 'number') {
				damage = attackDamage(compliance, spec.power);
				target.curHealth -= damage;
			}
			var effect = spec.effect;
			if (effect && !PersistentEffects.hasOwnProperty(effect)) {
				console.warn('Invalid effect: ' + effect);
				effect = null;
			}
			if (effect) {
				switch (effect) {
				case 'drain':
					if (source !== target) {
						source.curHealth += damage;
						source.applyEffects();
					}
					break;
				}
				var effectType = PersistentEffects[effect];
				if (effectType) {
					var fx = new effectType(compliance);
					if (fx.isHarmful && (target.curStatus & Status.Abjure)) {
					} else {
						target.persistentEffects.push(fx);
					}
				}
			}
			target.applyEffects();
		}
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
