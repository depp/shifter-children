/* Copyright 2015-2016 Dietrich Epp.

   This file is part of Kitten Teleporter.  The Kitten Teleporter source
   code is distributed under the terms of the MIT license.
   See LICENSE.txt for details. */

type Color = Float32Array;

/*
 * Convert floating-point to normalized uint8.
 */
function u8(x: number): number {
	var y = Math.floor(x * 256);
	if (y >= 0) {
		if (y < 256) {
			return y;
		} else {
			return 255;
		}
	} else {
		return 0;
	}
}

/*
 * Create an RGB color vector.
 */
export function rgb(r: number, g: number, b: number): Color {
	return new Float32Array([r, g, b, 1]);
}

/*
 * Create an RGBA color vector.
 */
export function rgba(r: number, g: number, b: number, a: number): Color {
	return new Float32Array([r * a, g * a, b * a, a]);
}

/*
 * Convert a hexadecimal value to a color vector.
 */
export function hex(x: number): Color {
	var s = 1 / 255;
	return new Float32Array([
		s * ((x >> 16) & 0xff),
		s * ((x >> 8) & 0xff),
		s * (x & 0xff),
		1,
	]);
}

/*
 * Convert a color to a packed uint32.
 */
export function toU32(color: Color): number {
	/* FIXME: broken on big endian */
	return (u8(color[3]) << 24) | (u8(color[2]) << 16) |
		(u8(color[1]) <<  8) | u8(color[0]);
}

/*
 * Tint a color towards white by the given amount, 0-1.
 */
export function tint(out: Color, color: Color, amount: number) {
	var i: number, a = color[3];
	for (i = 0; i < 3; i++) {
		out[i] = (1 - amount) * color[i] + amount;
	}
	out[3] = a;
}

/*
 * Shade a color towards black by the given amount, 0-1.
 */
export function shade(out: Color, color: Color, amount: number) {
	var i: number, a = color[3];
	for (i = 0; i < 3; i++) {
		out[i] = color[i] * amount;
	}
	out[3] = a;
}

/*
 * Tint and shade a color.
 */
export function tintShade(out: Color, color: Color,
													tint: number, shade: number) {
	var rem = 1 - tint - shade;
	if (tint + shade > 1) {
		var s = 1 / (tint + shade);
		tint *= s;
		shade *= s;
		rem = 0;
	}
	var i: number, a = color[3];
	for (i = 0; i < 3; i++) {
		out[i] = color[i] * rem + tint;
	}
	out[3] = a;
}

const DropShadow = [0.4, 0.5, 0.6, 0.7];

interface DropShadowProgram {
	BlendColor: WebGLUniformLocation,
	BlendAmount: WebGLUniformLocation,
	Offset: WebGLUniformLocation,
}

/*
 * Draw an object with a drop shadow.  This will vary the BlendColor,
 * BlendAmount, and Offset uniforms to create the drop shadow, calling
 * the callback to make the actual draw call.
 *
 * gl: The WebGL context
 * p: The program, with BlendColor, BlendAmount, and Offset uniforms
 * func: Callback function to execute the draw call
 * thisArg: this argument for the callback
 */
export function dropShadow(gl: WebGLRenderingContext,
													 p: DropShadowProgram, func: () => void) {
	var n = DropShadow.length;
	for (var i = 0; i < DropShadow.length; i++) {
		var a = DropShadow[i], d = DropShadow.length - i;
		gl.uniform4f(p.BlendColor, 0, 0, 0, a);
		gl.uniform1f(p.BlendAmount, 1);
		gl.uniform2f(p.Offset, d, -d);
		func();
	}
	gl.uniform1f(p.BlendAmount, 0);
	gl.uniform2f(p.Offset, 0, 0);
	func();
}

export const White = rgb(1, 1, 1);
export const Gray = rgb(0.5, 0.5, 0.5);
export const Black = rgb(0, 0, 0);
export const Transparent = rgba(0, 0, 0, 0);
