/* Copyright 2015-2016 Dietrich Epp.

   This file is part of Kitten Teleporter.  The Kitten Teleporter source
   code is distributed under the terms of the MIT license.
   See LICENSE.txt for details. */

import * as param from './param';

/*
 * A simulation object.
 */
export interface TimeTarget {
	step(dt: number): void;
}

/*
 * Timing manager.  Calculates when to advance the simulation and what
 * the timestep is.
 *
 * Has a 'frac' property, for interpolating between successive
 * simulation frames.  It is between 0 and 1.
 *
 * target: An object with a 'step' method, which is passed the
 * timestep
 */
export class Time {
	// The object to periodically update
	private _target: TimeTarget;
	// Target update frequency, in Hz
	private _rate: number;
	// Target update interval, in s
	private _dt: number;
	// Target update interval, in ms
	private _dtMsec: number;

	// Previous update timestamp
	private _step0: number;
	// Next update timestamp
	private _step1: number;
	// Last update timestamp
	private _lastTime: number;
	// The current fractional position between updates, in the range 0-1
	frac: number;

	constructor(target: TimeTarget, curTime: number) {
		this._target = target;

		this._rate = param.RATE;
		this._dt = 1.0 / param.RATE;
		this._dtMsec = 1e3 * this._dt;

		this._step0 = curTime;
		this._step1 = curTime - 1;
		this._lastTime = curTime;
		this.frac = 0;
	}

	/*
	 * Update the timer state.
	 *
	 * time: Timestamp in ms
	 */
	update(curTime: number): void {
		var lastTime = this._lastTime;
		this._lastTime = curTime;

		if (curTime >= this._step1) {
			// At least one update
			if (curTime > lastTime + param.MAX_UPDATE_INTERVAL * 1e3) {
				// Too much time since last call, skip missing time
				console.warn('Lag');
				this._step(curTime);
				this.frac = 0;
				return;
			}
			do {
				this._step(this._step1);
			} while (curTime >= this._step1);
		}

		var frac = (curTime - this._step0) / (this._step1 - this._step0);
		this.frac = Math.max(0, Math.min(1, frac));
	};

	/*
	 * Advance the simulation by one frame.
	 *
	 * time: The time at which the update takes place, in ms
	 */
	private _step(stepTime: number): void {
		this._target.step(this._dt);
		this._step0 = stepTime;
		this._step1 = stepTime + this._dt * 1e3;
	}
}
