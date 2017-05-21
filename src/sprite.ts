import { Camera } from './camera';
import * as load from './load';
import * as shader from './shader';

export interface Sprite {
	name: string;
	x: number;
	y: number;
	angle: number;
	colors: Float32Array;
};

var Loaded: boolean = false;
var Program: shader.SpriteProgram;
var SpriteTexture: WebGLTexture = null;
var VBuffer: WebGLBuffer = null;
var IBuffer: WebGLBuffer = null;
var IBufferSize = 0;
var TexScale = new Float32Array(2);

var VData: Float32Array;
var Count = 0;
var Alloc = 0;

export function init(gl: WebGLRenderingContext) {
	if (Loaded) {
		return;
	}
	Loaded = true;

	Program = shader.spriteProgram(gl, 'sprite', 'sprite');

	var img = load.getImage('sprites');
	if (img) {
		SpriteTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, SpriteTexture);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1)
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(
			gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.bindTexture(gl.TEXTURE_2D, null);
		TexScale[0] = 1 / img.width;
		TexScale[1] = 1 / img.height;
	}

	VBuffer = gl.createBuffer();
	IBuffer = gl.createBuffer();
}

export function upload(gl: WebGLRenderingContext): void {
	if (!Count) {
		return;
	}

	if (IBufferSize < Count) {
		var nsize = Math.max(IBufferSize, 32);
		while (nsize < Count) {
			nsize *= 2;
		}
		var idata = new Int16Array(nsize * 6);
		for (var i = 0; i < nsize; i++) {
			idata[i*6+0] = i*4+0;
			idata[i*6+1] = i*4+1;
			idata[i*6+2] = i*4+2;
			idata[i*6+3] = i*4+2;
			idata[i*6+4] = i*4+1;
			idata[i*6+5] = i*4+3;
		}
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, IBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idata, gl.STATIC_DRAW);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
		IBufferSize = nsize;
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, VBuffer);
	gl.bufferData(
		gl.ARRAY_BUFFER, VData.subarray(Count * 5 * 4 * 4), gl.DYNAMIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

export function draw(gl: WebGLRenderingContext, camera: Camera): void {
	var p = Program;
	if (!p || !Count || !SpriteTexture) {
		return;
	}
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
	gl.useProgram(p.program);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, IBuffer);
	gl.bindBuffer(gl.ARRAY_BUFFER, VBuffer);
	for (var i = 0; i < 5; i++) {
		gl.enableVertexAttribArray(i);
		gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 80, 16 * i);
	}

	gl.uniform1i(p.Sheet, 0);
	gl.uniformMatrix4fv(p.MVP, false, camera.uiMVP);

	gl.drawElements(gl.TRIANGLES, Count * 6, gl.UNSIGNED_SHORT, 0);

	for (var i = 0; i < 5; i++) {
		gl.disableVertexAttribArray(i);
	}
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.useProgram(null);
	gl.disable(gl.BLEND);
}

export function clear(): void {
	Count = 0;
}

export function Add(...sprites: Sprite[]): void {
	for (var sp of sprites) {
		if (Count >= Alloc) {
			var nalloc = Math.max(Alloc * 2, 32);
			var vdata = new Float32Array(nalloc * 80);
			vdata.set(VData
		}
	}
}
