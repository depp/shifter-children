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
	AttackUp    = 1 << 4,
	Confuse     = 1 << 5,
	Stun        = 1 << 6,
	Burn        = 1 << 7,
	Frighten    = 1 << 8,
	Smoke       = 1 << 9,
	Haste       = 1 << 10,
}

const DamageInterval = 10;

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
	// The actor performing the action.
	source: Actor;
	// The selected action.
	action: Action;
	// The name of the selected action.
	actionName: string;
	// Whether the source actor is confused.
	isConfused: boolean;
	// The targeted actor, if this is a singly-targeted action.  The
	// team will also be set.
	targetActor: Actor;
	// The team which is targeted, or if targetInvert is set, the team
	// which is not targeted.
	targetTeam: number;
	// Whether the target set is complemented.
	targetInvert: boolean;

	constructor(source: Actor, action: string) {
		this.source = source;
		this.action = getAction(action);
		this.actionName = action;
	}
}

interface Action {
	// The possible targets for the action.
	targeting: Targeting;
	// Whether the action is hostile.
	hostile: boolean;
	// Amount of time it takes to perform the action.
	time: number;
	// Amount of time to cool down after performing the action.
	cooldown: number;
	// Perform the action.  Return true if the action happens, false if
	// the action fizzles (e.g. no valid targets).
	act(combat: Combat, rec: ActionRecord): boolean;
}

interface ActionMap {
	[name: string]: Action;
}

interface AttackSpec {
	type: AttackType;
	effect?: string;
	damage?: number;
}

const Actions: ActionMap = {
	wereSlash: {
		targeting: Targeting.Single,
		hostile: true,
		time: 120,
		cooldown: 500,
		act: function(combat: Combat, rec: ActionRecord): boolean {
			return combat.attack(rec, {
				type: AttackType.Fight,
				damage: 25,
			});
		}
	},
	wereHowl: {
		targeting: Targeting.Multiple,
		hostile: false,
		time: 300,
		cooldown: 800,
		act: function(combat: Combat, rec: ActionRecord): boolean {
			return combat.attack(rec, {
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
		act: function(combat: Combat, rec: ActionRecord): boolean {
			return combat.attack(rec, {
				type: AttackType.Fight,
				damage: 25,
				effect: 'drain',
			});
		}
	},
	batScreech: {
		targeting: Targeting.Multiple,
		hostile: true,
		time: 300,
		cooldown: 800,
		act: function(combat: Combat, rec: ActionRecord): boolean {
			return combat.attack(rec, {
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
		act: function(combat: Combat, rec: ActionRecord): boolean {
			return combat.attack(rec, {
				type: AttackType.Ground,
				damage: 30,
				effect: 'stun',
			});
		}
	},
	stoneStomp: {
		targeting: Targeting.Multiple,
		hostile: true,
		time: 500,
		cooldown: 500,
		act: function(combat: Combat, rec: ActionRecord): boolean {
			return combat.attack(rec, {
				type: AttackType.Ground,
				damage: 20,
			});
		}
	},
	impBlast: {
		targeting: Targeting.Single,
		hostile: true,
		time: 200,
		cooldown: 600,
		act: function(combat: Combat, rec: ActionRecord): boolean {
			return combat.attack(rec, {
				type: AttackType.Fire,
				damage: 20,
				effect: 'burn',
			});
		}
	},
	impSmoke: {
		targeting: Targeting.Multiple,
		hostile: false,
		time: 300,
		cooldown: 600,
		act: function(combat: Combat, rec: ActionRecord): boolean {
			return combat.attack(rec, {
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
		act: function(combat: Combat, rec: ActionRecord): boolean {
			return false;
		}
	},
	glipLaugh: {
		targeting: Targeting.Single,
		hostile: true,
		time: 350,
		cooldown: 900,
		act: function(combat: Combat, rec: ActionRecord): boolean {
			return combat.attack(rec, {
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
		act: function(combat: Combat, rec: ActionRecord): boolean {
			return combat.attack(rec, {
				type: AttackType.Magic,
				damage: 25,
			})
		}
	},
	mageHaste: {
		targeting: Targeting.Single,
		hostile: false,
		time: 450,
		cooldown: 450,
		act: function(combat: Combat, rec: ActionRecord): boolean {
			return combat.attack(rec, {
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
		act: function(combat: Combat, rec: ActionRecord): boolean {
			return combat.attack(rec, {
				type: AttackType.Air,
			});
		}
	},
	airToss: {
		targeting: Targeting.Single,
		hostile: true,
		time: 350,
		cooldown: 600,
		act: function(combat: Combat, rec: ActionRecord): boolean {
			return combat.attack(rec, {
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
		act: function(combat: Combat, rec: ActionRecord): boolean {
			return combat.attack(rec, {
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
		act: function(combat: Combat, rec: ActionRecord): boolean {
			return combat.attack(rec, {
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
		act: function(combat: Combat, rec: ActionRecord): boolean {
			return combat.attack(rec, {
				type: AttackType.Blessing,
				damage: 75,
			});
		}
	},
	unicornAbjure: {
		targeting: Targeting.Multiple,
		hostile: false,
		time: 250,
		cooldown: 500,
		act: function(combat: Combat, rec: ActionRecord): boolean {
			return combat.attack(rec, {
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
	act: function(combat: Combat, rec: ActionRecord) {
		return true;
	}
};

function getAction(name: string): Action {
	var a = Actions[name];
	if (a) {
		return a;
	}
	if (name !== null) {
		console.warn('Invalid action: ' + name);
	}
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

interface ComplianceMap {
	[type: number]: Compliance;
}

interface Shape {
	// List of actions that this shape can perform.
	actions: string[];
	// Compliance to different damage types.
	compliance: ComplianceMap;
}

interface ShapeMap {
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
		if (!alist) {
			return;
		}
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

const Shapes: ShapeMap = {
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
		actions: ['mirrorDarken', 'mirrorCapture'],
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

export const ShapeNames: string[] = Object.keys(Shapes);
ShapeNames.sort();

/*
 * ===========================================================================
 * Persistent status effects
 * ===========================================================================
 */

// An active persistent effect on an actor.
interface PersistentEffect {
	// Whether the effect is harmful.
	isHarmful: boolean;
	// Time remaining on the effect.
	time: number;
	// Update the status effect.  Called once per frame.
	update(actor: Actor): void;
	// Apply the status effect to the actor.  This must only modify the
	// actor's ephemeral properties, to make sure that
	// Actor.applyEffects() is idempotent.
	apply(actor: Actor): void;
}

// A persistent effect which applies a status flag.
class StatusEffect implements PersistentEffect {
	constructor(private status: Status, public isHarmful: boolean,
							public time: number) {}
	update(actor: Actor): void {}
	apply(actor: Actor): void {
		actor.status |= this.status;
	}
}

// A persistent effect which periodically damages the target.
class DamageEffect implements PersistentEffect {
	private tick: number = 0;
	constructor(
		private status: Status,
		public isHarmful: boolean,
		public time: number,
		private type: AttackType,
		private damage: number) {}
	update(actor: Actor): void {
		this.tick++;
		if (this.tick == DamageInterval) {
			this.tick = 0;
			actor.damage(
				randomDamage(
					adjustDamage(this.damage, actor.compliance(this.type))));
		}
	}
	apply(actor: Actor): void {
		actor.status |= this.status;
	}
}

interface PersistentEffectType {
	(): PersistentEffect;
}

interface PersistentEffectMap {
	[name: string]: PersistentEffectType;
}

const PersistentEffects: PersistentEffectMap = {
	attackUp: () => new StatusEffect(Status.AttackUp, false, 20),
	darken: () => new StatusEffect(Status.Darken, true, 20),
	drain: null,
	frighten: () => new StatusEffect(Status.Frighten, true, 20),
	confuse: () => new StatusEffect(Status.Confuse, true, 20),
	stun: () => new StatusEffect(Status.Stun, true, 5),
	burn: () => new DamageEffect(Status.Burn, true, 20, AttackType.Fire, 5),
	smoke: () => new StatusEffect(Status.Smoke, false, 20),
	haste: () => new StatusEffect(Status.Haste, false, 20),
	toss: null,
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
	shape: string;

	// The team that the actor is on.
	baseTeam: number;
	// The base team controlling the actor.
	baseControl: Control;
	// The team controlling the actor at the moment.
	team: number;
	// The system controlling the actor at the moment.
	control: Control;

	// The actor's base (maximum) health.
	baseHealth: number;
	// The actor's current health.
	health: number;

	// Time remaining until this actor is active.
	time: number;
	// The actor's base speed.
	baseSpeed: number;
	// The actor's current speed.
	speed: number;

	// The selected action.
	action: ActionRecord;

	// Active status effects.
	persistentEffects: PersistentEffect[];
	// The actor's current status.
	status: Status;

	constructor(team: number, control: Control, spec: ActorSpec) {
		this.index = -1;
		this.shape = spec.shape;
		this.baseTeam = team;
		this.baseControl = control;
		this.team = team;
		this.control = control;
		this.baseHealth = spec.health;
		this.health = spec.health;
		this.time = 100 + 100 * Math.random();
		this.baseSpeed = spec.speed;
		this.speed = spec.speed;
		this.action = null;
		this.persistentEffects = [];
		this.status = Status.None;
	}

	// Update the actor state.
	update(): void {
		if (this.status & Status.Dead) {
			return;
		}
		for (var i = 0, fxs = this.persistentEffects; i < fxs.length;) {
			var fx = fxs[i];
			fx.update(this);
			fx.time--;
			if (fx.time <= 0) {
				fxs.splice(i, 1);
			}
		}
		this.applyEffects();
		if ((this.status & Status.Dead) === 0) {
			this.time -= this.speed;
		} else {
			// console.log('  IS DEAD: ' + this.index);
		}
	}

	// Apply all active status effects to the actor and fix any
	// properties that are out of range.  This is idempotent, it is
	// called whenever something happens to the actor.
	applyEffects(): void {
		this.control = this.baseControl
		this.team = this.baseTeam;
		this.speed = this.baseSpeed;
		this.status = Status.None;
		if (this.health <= 0) {
			this.status = Status.Dead;
			this.persistentEffects.length = 0;
		} else if (this.health < this.baseHealth / 5) {
			this.status = Status.LowHealth;
		}
		for (var fx of this.persistentEffects) {
			fx.apply(this);
		}
		if (this.status & Status.Haste) {
			this.speed = (this.speed * 1.5) | 0;
		}
		if (this.status & Status.Stun) {
			this.speed = 0;
		}
	}

	// Get the compliance to attacks of the given type.
	compliance(type: AttackType): Compliance {
		if (type == AttackType.NoEvade) {
			return Compliance.Normal;
		}
		var c = getShape(this.shape).compliance[type] || Compliance.Normal;
		if (this.status & Status.Darken) {
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

	// Damage the actor.  Return the actual amount of damage taken,
	// excluding any "overkill".
	damage(damage: number): number {
		var oldHealth = this.health;
		var newHealth = Math.max(0, Math.min(this.baseHealth, oldHealth - damage));
		this.health = newHealth;
		// console.log('    damage: ' + damage);
		return newHealth - oldHealth;
	}

	// Add an effect to the actor.
	addEffect(effect: string, compliance: Compliance): void {
		var factory = PersistentEffects[effect];
		if (!factory) {
			return;
		}
		var fx = factory();
		if (fx.isHarmful && (this.status & Status.Abjure)) {
			return;
		}
		switch (compliance) {
		case Compliance.Immune:
		case Compliance.Resist:
			return;
		case Compliance.Vulnerable:
			fx.time *= 2;
			break;
		}
		this.persistentEffects.push(fx);
	}

	// Test whether the actor is a valid attack target.
	isValidTarget(): boolean {
		return (this.status & Status.Dead) == 0;
	}

	// Actor is ready to act or select an action.
	isReady(): boolean {
		return (this.status & Status.Dead) == 0 && this.time <= 0;
	}
}

// Adjust damage according to target compliance.
function adjustDamage(damage: number, compliance: Compliance) {
	var sign: number, magnitude: number;
	if (damage < 0) {
		sign = -1;
		magnitude = -damage;
	} else {
		sign = +1;
		magnitude = damage;
	}
	switch (compliance) {
	case Compliance.Normal:
		break;
	case Compliance.Resist:
		magnitude *= 0.5;
		break;
	case Compliance.Vulnerable:
		magnitude *= 2;
		break;
	case Compliance.Immune:
		return 0;
	case Compliance.Absorb:
		sign = -sign;
		return 0;
	}
	// console.log('    adjust: ' + sign + ' * ' + magnitude);
	return sign * Math.max(1, magnitude | 0);
}

// Adjust damage randomly.
function randomDamage(damage: number): number {
	var x0 = damage * (2 / 3);
	var x1 = damage * (4 / 3);
	var base = Math.floor(Math.min(x0, x1) + 0.5);
	var random = Math.floor(Math.max(x0, x1) + 0.5) - base;
	return base + Math.max(random, Math.floor(Math.random() * (random + 1)));
}

/*
 * ===========================================================================
 * Combat
 * ===========================================================================
 */

export interface TeamCount {
	[team: number]: number;
}

// Combat state manager.
export class Combat {
	actors: Actor[] = [];
	done: boolean = false;
	teams: TeamCount = {};

	add(actor: Actor) {
		actor.index = this.actors.length;
		this.actors.push(actor);
		var n = this.teams[actor.baseTeam];
		this.teams[actor.baseTeam] = (n || 0) + 1;
	}

	// Update one step of combat.
	update(): void {
		// console.log('---');
		// Choose actions for any actors ready to choose an action.
		for (var actor of this.actors) {
			// console.log('Actor ' + actor.index + ' health=' + actor.health);
			if (actor.isReady() && !actor.action) {
				var rec: ActionRecord = null;
				switch (actor.control) {
				case Control.Computer:
					rec = this.computerAction(actor);
					break;
				}
				if (!rec) {
					console.warn('No action selected');
					rec = new ActionRecord(actor, null);
				}
				actor.action = rec;
				actor.time = rec.action.time;
			}
		}
		// Perform at most one action, otherwise, update all actors.
		var didAct = false;
		for (var actor of this.actors) {
			if (actor.isReady() && actor.action) {
				// Take a previously selected action.
				var rec = actor.action;
				// console.log('Action: ' + rec.actionName);
				var action = rec.action;
				actor.action = null;
				if (action.act(this, rec)) {
					actor.time = action.cooldown;
				} else {
					actor.time = 50;
				}
				didAct = true;
				break;
			}
		}
		if (!didAct) {
			for (var actor of this.actors) {
				actor.update();
			}
		}
		// Check for the end of the battle.
		for (var team in this.teams) {
			this.teams[team] = 0;
		}
		for (var actor of this.actors) {
			if ((actor.status & Status.Dead) === 0) {
				this.teams[actor.baseTeam]++;
			}
		}
		var teamCount = 0;
		for (var team in this.teams) {
			if (this.teams[team] > 0) {
				teamCount++;
			}
		}
		if (teamCount <= 1) {
			this.done = true;
		}
	}

	// Have the computer choose an action for the given actor.
	computerAction(actor: Actor): ActionRecord {
		var shape = Shapes[actor.shape];
		if (!shape) {
			console.warn('Invalid shape: ' + actor.shape);
			return null;
		}
		var actName = randomTri(shape.actions);
		if (!actName) {
			console.warn('No actions');
			return null;
		}
		var actionType = Actions[actName];
		if (!actionType) {
			console.warn('Invalid action: ' + actName);
			return null;
		}
		// console.log('Action: ' + actName);
		var rec = new ActionRecord(actor, actName);
		rec.isConfused = false;
		rec.targetActor = null;
		rec.targetTeam = actor.team;
		rec.targetInvert = rec.action.hostile;
		return rec;
	}

	// Find legal targets.  If team is null, then select all valid
	// targets.  If team is not null, then select targets according to
	// their team: if invert is false, select targets on that team, if
	// invert is true, select targets on all other teams.
	getTargets(team: number, invert: boolean): Actor[] {
		if (typeof team !== 'number') {
			return this.actors.filter(
				(a: Actor) => a.isValidTarget());
		}
		if (invert) {
			return this.actors.filter(
				(a: Actor) => a.baseTeam !== team && a.isValidTarget());
		} else {
			return this.actors.filter(
				(a: Actor) => a.baseTeam === team && a.isValidTarget());
		}
	}

	// Get actual targets for an attack.
	getAttackTargets(rec: ActionRecord): Actor[] {
		switch (rec.action.targeting) {
		case Targeting.Multiple:
			return this.getTargets(rec.targetTeam, rec.targetInvert);
		case Targeting.Single:
			var target = rec.targetActor;
			if (!target) {
				target = randomUniform(
					this.getTargets(
						rec.isConfused ? null : rec.targetTeam,
						rec.targetInvert));
			}
			return target ? [target] : [];
		default:
			return [];
		}
	}

	// Perform an attack by an actor against other actors.  Returns true
	// if the attack happens, false if it fizzles because there are no
	// targets.
	attack(rec: ActionRecord, spec: AttackSpec): boolean {
		var source = rec.source;
		var targets = this.getAttackTargets(rec);
		// console.log('Attack');
		if (!targets.length) {
			// console.log('fizzle');
			return false;
		}
		for (var target of targets) {
			var compliance = target.compliance(spec.type);
			// console.log(Compliance[compliance]);
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
			if (typeof spec.damage === 'number') {
				damage = target.damage(
					randomDamage(adjustDamage(spec.damage, compliance)));
			}
			var effect = spec.effect;
			if (effect && !PersistentEffects.hasOwnProperty(effect)) {
				console.warn('Invalid effect: ' + effect);
				effect = null;
			}
			if (effect) {
				switch (effect) {
				case 'drain':
					if (source !== target && damage !== 0) {
						source.damage(-damage);
						source.applyEffects();
					}
					break;
				}
				target.addEffect(effect, compliance);
			}
			target.applyEffects();
		}
		return true;
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
		if (c > r) {
			break;
		}
	}
	return choices[i];
}
