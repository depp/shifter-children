/* Copyright 2015-2016 Dietrich Epp.

   This file is part of Kitten Teleporter.  The Kitten Teleporter source
   code is distributed under the terms of the MIT license.
   See LICENSE.txt for details. */

/*
 * Quick and dirty OpenGL text layout
 *
 * Font is Upheaval by AEnigma, 100% free according to DaFont, at
 * 20px.  The font was converted using a quick and dirty Python
 * script and py-freetype.
 *
 * http://www.dafont.com/upheaval.font
 */

import * as color from './color';
import * as load from './load';
import * as shader from './shader';

export const HeadFont = 0;
export const BodyFont = 1;

// Attribute offsets
const APos = 0;       // int16 x 2
const ATexCoord = 4;  // int16 x 2
const AStyle = 8;     // int16 x 2
const ATotal = 12;

// Whether the program is loaded
var Loaded: boolean = false;
// The shader program
var Program: shader.TextProgram = null;
// The font texture
var FontTexture: WebGLTexture = null;
var TexScale: Float32Array = new Float32Array(2);

export function init(gl: WebGLRenderingContext): void {
	if (Loaded) {
		return;
	}
	Loaded = true;

	Program = shader.textProgram(gl, 'text', 'text');

	var img = load.getImage('fonts');
	if (img) {
		FontTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, FontTexture);
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(
			gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.bindTexture(gl.TEXTURE_2D, null);
		TexScale[0] = 1 / img.width;
		TexScale[1] = 1 / img.height;
	}
}

class TextLayer {
	_dirty: boolean;
	private _count: number;
	private _vbuffer: WebGLBuffer;
	private _objects: TextObject[];

	constructor() {
		this._dirty = false;
		this._count = 0;
		this._vbuffer = null;
		this._objects = [];
	}

	/*
	 * Remove all layouts from the text layer.
	 */
	clear(): void {
		for (var i = 0; i < this._objects.length; i++) {
			this._objects[i]._parent = null;
		}
		this._objects.length = 0;
		this._count = 0;
		this._dirty = false;
	};

	/*
	 * Render the text layer.
	 */
	render(gl: WebGLRenderingContext, camera: { uiMVP: Float32Array }) {
		var p = Program;
		if (!p || !FontTexture || !this._objects.length) {
			return;
		}
		var i: number;

		for (i = 0; i < this._objects.length; i++) {
			this._objects[i]._update();
		}

		if (this._dirty) {
			this._dirty = false;
			this._count = 0;

			var count = 0;
			for (i = 0; i < this._objects.length; i++) {
				count += this._objects[i]._count;
			}
			if (!count) {
				return;
			}

			if (!this._vbuffer) {
				this._vbuffer = gl.createBuffer();
			}
			gl.bindBuffer(gl.ARRAY_BUFFER, this._vbuffer);
			gl.bufferData(gl.ARRAY_BUFFER, count * ATotal * 6, gl.DYNAMIC_DRAW);
			var offset = 0;
			for (i = 0; i < this._objects.length; i++) {
				var lcount = this._objects[i]._count;
				if (!lcount) {
					continue;
				}
				gl.bufferSubData(
					gl.ARRAY_BUFFER,
					offset * ATotal * 6,
					this._objects[i]._i16.subarray(0, lcount * (ATotal / 2) * 6));
				offset += lcount;
			}
			this._count = count;
		} else {
			if (!this._count) {
				return;
			}
		}

		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.useProgram(p.program);
		gl.bindBuffer(gl.ARRAY_BUFFER, this._vbuffer);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.SHORT, false, ATotal, APos);
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 2, gl.SHORT, false, ATotal, ATexCoord);
		gl.enableVertexAttribArray(2);
		gl.vertexAttribPointer(2, 2, gl.SHORT, false, ATotal, AStyle);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, FontTexture);

		gl.uniformMatrix4fv(p.MVP, false, camera.uiMVP);
		gl.uniform2fv(p.TexScale, TexScale);
		gl.uniform1i(p.Font, 0);
		gl.uniform4fv(p.Color, [
			0, 1, 1, 1,
			1, 0, 1, 1,
			1, 1, 0, 1,
			1, 1, 1, 1,
		]);

		/*
		color.dropShadow(gl, p, () => {
			gl.drawArrays(gl.TRIANGLES, 0, this._count * 6);
		});
		*/
		gl.drawArrays(gl.TRIANGLES, 0, this._count * 6);

		gl.disableVertexAttribArray(0);
		gl.disableVertexAttribArray(1);
		gl.disableVertexAttribArray(2);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.useProgram(null);
		gl.disable(gl.BLEND);
	};

	/*
	 * Add a text object to the text layer.
	 */
	add(obj: TextObject): void {
		if (this._objects.indexOf(obj) === -1) {
			obj._parent = this;
			this._objects.push(obj);
			if (obj._count) {
				this._dirty = true;
			}
		}
	};

	/*
	 * Remove a text object from the text layer.
	 */
	remove(obj: TextObject): void {
		var idx = this._objects.indexOf(obj);
		if (idx !== -1) {
			obj._parent = null;
			this._objects.splice(idx, 1);
			if (obj._count) {
				this._dirty = true;
			}
		}
	};
}

export var ui = new TextLayer;

/********************************************************************/

const AttrSpace = 1, AttrLB = 2, AttrPB = 3;
const AttrMap: { [c: string]: number } = {
	' ': AttrSpace,
	'\n': AttrPB,
	'\u2028': AttrLB,
	'\u2029': AttrPB,
};

export interface TextRun {
	font: number;
	text: string;
	scale?: number;
	style?: number;
}

export enum TextAlign {
	Left,
	Right,
	Center,
	Justify,
}

export interface TextFinishOptions {
	// Maximum width of the text, or 0 for unlimited
	width?: number;
	// Space between lines of text
	lineheight?: number;
	// Text alignment
	align?: TextAlign;
	// Indentation of first line of text
	indent?: number;
}

interface Break {
	// Break opportunity type: AttrSpace, AttrLB, AttrPB
	attr: number;
	// Index of next glyph
	idx: number;
	// Index of next glyph, moved back over trailing whitespace
	idxTrim: number;
	// Pen advance
	adv: number;
	// Pen advance without trailing whitespace
	advTrim: number;
	// The previous line break, if this break is chosen
	prev: Break;
	// The penalty for choosing this break.
	penalty: number;
}

interface Line {
	// X, Y position of the first glyph in the line.
	x: number;
	y: number;
	// Actual width of the line
	width: number;
	// Half-open range of glyphs in the line.
	g0: number;
	g1: number;
}

/*
 * Penalty for each line break.  Each line break incurs this penalty.
 */
const PenaltyBreak = 1;

/*
 * Penalty for ragged lines not matching the target width.  Let A be
 * the difference between the line width and target width, measured in
 * line heights.  That difference is squared and multiplied by this
 * penalty.
 */
const PenaltyRagged = 20;

/*
 * Penalty for overwide lines.  Each line break wider than the target
 * width incurs this penalty.
 */
const PenaltyOverwide = 2000;

export class LayoutMetrics {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	adv: number;
}

/*
 * A builder for text layouts.
 */
export class Builder {
	private _gadv: Int16Array;
	_gdat: Int16Array; // rect pos, rect tex, vec2 sty
	private _gatt: Int8Array;
	_size: number;
	private _alloc: number;
	private _ascender: number;
	private _descender: number;
	private _lineheight: number;
	metrics: LayoutMetrics;

	constructor() {
		this._alloc = 0;
		this.clear()
	}

	clear(): void {
		this._size = 0;
		this._ascender = 0;
		this._descender = 0;
		this._lineheight = 0;
		this.metrics = null;
	}

	/*
	 * Reserve enough space for the given number of extra glyphs.
	 */
	_reserve(n: number): void {
		var nsize = this._size + n;
		if (nsize <= this._alloc) {
			return;
		}
		var nalloc = Math.max(this._alloc, 32);
		while (nsize > nalloc) {
			nalloc *= 2;
		}
		var gadv = new Int16Array(nalloc);
		var gdat = new Int16Array(nalloc * 10);
		var gatt = new Int8Array(nalloc);
		if (this._size > 0) {
			gadv.set(this._gadv);
			gdat.set(this._gdat);
			gatt.set(this._gatt);
		}
		this._gadv = gadv;
		this._gdat = gdat;
		this._gatt = gatt;
		this._alloc = nalloc;
	}

	/*
	 * Add text to the end of the text flow.
	 */
	add({ font, text, scale = 1, style = 0 }: TextRun): void {
		var finfo = AssetInfo.fonts[font];
		this._ascender = Math.max(this._ascender, finfo.ascender * scale);
		this._descender = Math.min(this._descender, finfo.descender * scale);
		this._lineheight = Math.max(this._lineheight, finfo.height * scale);
		var n = text.length, i0 = this._size, i1 = this._size + n;
		var gidx = new Int16Array(n);
		this._reserve(n);
		{
			var glyph = finfo.glyph, char = finfo.char;
			for (var i = 0, j = this._size; i < text.length; i++, j++) {
				var c = text[i];
				var g = char.indexOf(text[i]);
				var adv = 0;
				var x0 = 0, y0 = 0, x1 = 0, y1 = 0;
				var u0 = 0, v0 = 0, u1 = 0, v1 = 0;
				if (g >= 0) {
					adv = glyph[g*7+0] * scale;
					var sx = glyph[g*7+1], sy = glyph[g*7+2];
					var bx = glyph[g*7+3], by = glyph[g*7+4];
					var tx = glyph[g*7+5], ty = glyph[g*7+6];
					x0 = scale * bx; x1 = x0 + scale * sx;
					y1 = scale * by; y0 = y1 - scale * sy;
					u0 = tx; u1 = tx + sx;
					v1 = ty; v0 = ty + sy;
				} else {
					g = 0;
				}
				gidx[i] = g;
				this._gadv[j] = adv;
				this._gdat[j*10+0] = x0;
				this._gdat[j*10+1] = y0;
				this._gdat[j*10+2] = x1;
				this._gdat[j*10+3] = y1;
				this._gdat[j*10+4] = u0;
				this._gdat[j*10+5] = v0;
				this._gdat[j*10+6] = u1;
				this._gdat[j*10+7] = v1;
				this._gdat[j*10+8] = style;
				this._gdat[j*10+9] = 0;
				this._gatt[j] = AttrMap[c] || 0;
			}
		}
		if (finfo.kern && false) {
			var n = finfo.glyphcount, kern = finfo.kern;
			for (var i = i0; i < i1; i++) {
				this._gadv[i] += kern[gidx[i] * n + gidx[i + 1]];
			}
		}
		this._size = i1;
	}

	/*
	 * Calculate line break positions.
	 */
	private _breakText(options?: TextFinishOptions): Line[] {
		const { width = 0, align = TextAlign.Left, indent = 0,
						lineheight = this._lineheight } = options || {};
		var gadv = this._gadv, gatt = this._gatt, n = this._size;
		if (!n) {
			return [];
		}
		var lines: Line[] = [];
		var br: Break[] = [{
			attr: AttrPB,
			idx: 0,
			idxTrim: 0,
			adv: 0,
			advTrim: 0,
			prev: null,
			penalty: 0,
		}];
		gatt[n - 1] = AttrPB;
		var adv = 0, advTrim = 0, idx = 0, idxTrim = 0;
		while (idx < this._size) {
			var attr = this._gatt[idx];
			adv += this._gadv[idx];
			idx++;
			if (attr != AttrSpace) {
				advTrim = adv;
				idxTrim = idx;
			}
			if (!attr) {
				continue;
			}
			if (attr == AttrSpace) {
				if (width <= 0 || gatt[idx + 1]) {
					continue;
				}
			}
			br.push({ attr, idx, idxTrim, adv, advTrim, prev: null, penalty: 0 });
			if (attr != AttrPB) {
				continue;
			}
			for (var i = 1; i < br.length; i++) {
				var bi = br[i];
				var bestPenalty = Infinity;
				var bestBreak: Break = null;
				for (var j = i - 1; j >= 0; j--) {
					var bj = br[j];
					var bwidth = bi.advTrim - bj.adv, twidth = width;
					if (bj.attr == AttrPB) {
						twidth -= indent;
					}
					var penalty = bj.penalty + PenaltyBreak;
					var delta = (bwidth - twidth) / lineheight;
					if (bi.attr == AttrPB) {
						if (bwidth > twidth) {
							penalty += delta * delta * PenaltyRagged;
							penalty += PenaltyOverwide;
						}
					} else {
						penalty += delta * delta * PenaltyRagged;
						if (bwidth > twidth) {
							penalty += PenaltyOverwide;
						}
					}
					if (penalty < bestPenalty || !bestBreak) {
						bestPenalty = penalty;
						bestBreak = bj;
					}
					if (bj.attr != AttrSpace) {
						break;
					}
				}
				bi.penalty = bestPenalty;
				bi.prev = bestBreak;
			}
			for (var b = br[br.length - 1].prev; b.prev !== null; b = b.prev) {
				b.attr = AttrLB;
			}
			for (var i = 1; i < br.length; i++) {
				var b = br[i];
				if (b.attr == AttrSpace) {
					continue;
				}
				var p = b.prev;
				var lwidth = b.advTrim - p.adv;
				var x = 0;
				var twidth = width;
				if (p.attr == AttrPB) {
					twidth -= indent;
					x += indent;
				}
				var delta = twidth - lwidth;
				var g0 = p.idx, g1 = b.idxTrim;
				switch (align) {
				case TextAlign.Left:
					break;
				case TextAlign.Right:
					x += delta;
					break;
				case TextAlign.Center:
					x += delta >> 1;
					break;
				case TextAlign.Justify:
					if (b.attr != AttrPB) {
						var nwhite = 0;
						for (var j = g0; j < g1; j++) {
							if (gatt[j] == AttrSpace) {
								nwhite++;
							}
						}
						var wpos = 0, wlast = 0;
						for (var j = g0; j < g1; j++) {
							if (gatt[j] == AttrSpace) {
								wpos++;
								var wcur = Math.floor(delta * wpos / nwhite + 0.5);
								gadv[j] += wcur - wlast;
								wlast = wcur;
							}
						}
					}
					break;
				}
				lines.push({ x, y: 0, width: lwidth, g0, g1 });
			}
			br.length = 1;
			br[0].idx = idx;
			br[0].idxTrim = idx;
			idxTrim = idx;
			br[0].adv = adv;
			br[0].advTrim = adv;
			advTrim = adv;
		}
		var ypos = 0;
		for (var i = 0; i < lines.length; i++) {
			lines[i].y = ypos;
			ypos -= lineheight;
		}
		return lines;
	}

	/*
	 * Finish creating the text layout.
	 */
	finish(options?: TextFinishOptions): void {
		var lines = this._breakText(options);
		{
			var x0 = 0, y0 = 0, x1 = 0, y1 = 0;
			if (lines.length > 0) {
				{
					var {x, y, width} = lines[0];
					x0 = x;
					y0 = y + this._descender;
					x1 = x + width;
					y1 = y + this._ascender;
				}
				for (var i = 1; i < lines.length; i++) {
					var {x, y, width} = lines[i];
					x0 = Math.min(x0, x);
					y0 = Math.min(y0, y + this._descender);
					x1 = Math.max(x1, x + width);
					y1 = Math.max(y1, y + this._ascender);
				}
			}
			var r = new LayoutMetrics();
			r.x0 = x0;
			r.y0 = y0;
			r.x1 = x1;
			r.y1 = y1;
			this.metrics = r;
		}
		{
			var gdat = this._gdat, gadv = this._gadv, adv = 0;
			for (var i = 0; i < gadv.length; i++) {
				adv += gadv[i];
				gdat[i*10+9] = adv;
			}
			this.metrics.adv = adv;
			for (var i = 0; i < lines.length; i++) {
				var {x, y, g0, g1} = lines[i];
				for (var j = g0; j < g1; j++) {
					gdat[j*10+0] += x;
					gdat[j*10+1] += y;
					gdat[j*10+2] += x;
					gdat[j*10+3] += y;
					x += gadv[j];
				}
			}
		}
	}
}

/********************************************************************/

export interface TextAddOptions {
	x?: number;
	y?: number;
}

/*
 * Text object on display.
 *
 * The 'position' and 'color' attributes can be animated with tweens.
 */
export class TextObject {
	_parent: TextLayer;
	// Triangles (pos.x, pos.y, tex.x, tex.y, style.x, style.y)
	_i16: Int16Array;
	_count: number;
	// Values currently baked into the array
	private _xoff: number;
	private _yoff: number;
	// Values specified by the user
	position: Float32Array;

	constructor() {
		this._parent = null;
		this._i16 = null;
		this._count = 0;
		this._xoff = 0;
		this._yoff = 0;
		this.position = new Float32Array(2);
	}

	_update(): void {
		if (!this._count) {
			return;
		}
		var i: number, n = this._count * 6;

		// Update positions
		var x = Math.round(this.position[0]);
		var y = Math.round(this.position[1]);
		var dx = x - this._xoff, dy = y - this._yoff;
		if (dx !== 0 || dy !== 0) {
			var i16 = this._i16;
			for (i = 0; i < n; i++) {
				i16[i*6+0] += dx;
				i16[i*6+1] += dy;
			}
			this._xoff = x;
			this._yoff = y;
			this._markDirty();
		}
	}

	_markDirty(): void {
		if (this._parent) {
			this._parent._dirty = true;
		}
	}

	/*
	 * Add a built layout to the text object.
	 */
	addLayout(b: Builder, options?: TextAddOptions): void {
		var { x = 0, y = 0 } = options || {};
		var gdat = b._gdat, n = b._size, q = 0;
		for (var i = 0; i < n; i++) {
			if (gdat[i*10+0] == gdat[i*10+2] || gdat[i*10+1] == gdat[i*10+3]) {
				continue;
			}
			q++;
		}
		if (!q) {
			return;
		}
		var pos = this._count;
		var data = new Int16Array(6 * 6 * (q + pos));
		if (this._i16) {
			data.set(this._i16);
		}
		x += this._xoff;
		y += this._yoff;
		for (var i = 0, j = pos; i < n; i++) {
			var x0 = gdat[i*10+0], y0 = gdat[i*10+1];
			var x1 = gdat[i*10+2], y1 = gdat[i*10+3];
			var u0 = gdat[i*10+4], v0 = gdat[i*10+5];
			var u1 = gdat[i*10+6], v1 = gdat[i*10+7];
			var s0 = gdat[i*10+8], s1 = gdat[i*10+9];
			if (x0 == x1 || y0 == y1) {
				continue;
			}
			x0 += x;
			y0 += y;
			x1 += x;
			y1 += y;
			data.set([
				x0, y0, u0, v0, s0, s1,
				x1, y0, u1, v0, s0, s1,
				x0, y1, u0, v1, s0, s1,
				x0, y1, u0, v1, s0, s1,
				x1, y0, u1, v0, s0, s1,
				x1, y1, u1, v1, s0, s1,
			], 6 * 6 * j);
			j++;
		}
		this._i16 = data;
		this._count = pos + q;
		this._markDirty();
	}

	clear(): TextObject {
		this._count = 0;
		this._markDirty();
		return this;
	}
}
