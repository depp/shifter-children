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
	damage?: number;
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
				damage: 25,
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
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(rec, {
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
		act: function(combat: Combat, rec: ActionRecord) {
			combat.attack(rec, {
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
				damage: 25,
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
				damage: 75,
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
				adjustDamage(
					randomDamage(this.damage),
					actor.compliance(this.type)))
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
		this.time = 200;
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
}

// Adjust damage according to target compliance.
function adjustDamage(damage: number, compliance: Compliance) {
	var sign = damage >= 0 ? +1 : -1;
	switch (compliance) {
	case Compliance.Normal:
		break;
	case Compliance.Resist:
		damage *= 0.5;
		break;
	case Compliance.Vulnerable:
		damage *= 2;
		break;
	case Compliance.Immune:
		return 0;
	case Compliance.Absorb:
		sign = -sign;
		return 0;
	}
	return sign * Math.max(1, damage | 0);
}

// Adjust damage randomly.
function randomDamage(damage: number): number {
	var minDamage = (damage * (2 / 3)) | 0;
	var maxDamage = (damage * (4 / 3)) | 0;
	return minDamage + (Math.random() * (maxDamage + 1 - minDamage));
}

/*
 * ===========================================================================
 * Combat
 * ===========================================================================
 */

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
				switch (active.control) {
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
		var shape = Shapes[actor.shape];
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
		rec.targetTeam = actor.team;
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
			if (typeof spec.damage === 'number') {
				damage = target.damage(
					adjustDamage(compliance, randomDamage(spec.damage)));
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
