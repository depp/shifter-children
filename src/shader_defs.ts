/* Copyright 2015-2016 Dietrich Epp.

   This file is part of Kitten Teleporter.  The Kitten Teleporter source
   code is distributed under the terms of the MIT license.
   See LICENSE.txt for details. */

/*
 * Helper functions for loading shaders.  This should only be used
 * from shaders.ts.
 */

export interface Program {
	program: WebGLProgram;
}

export interface ShaderSources {
	[name: string]: string;
}

export interface ProgramInfo {
	name: string;
	vert: string;
	frag: string;
	unif: string;
	attr: string;
}

/*
 * Load a complete WebGL program, null on error.
 */
export function loadProgram(gl: WebGLRenderingContext,
														sources: ShaderSources,
														info: ProgramInfo,
														vert: string,
														frag: string): Program
{
	var name = info.name + ',' + vert + ',' + frag;
	var specs = [{
		type: 'vert',
		name: vert,
		gtype: gl.VERTEX_SHADER,
	}, {
		type: 'frag',
		name: frag,
		gtype: gl.FRAGMENT_SHADER,
	}];
	var i: number;
	var program = gl.createProgram();
	for (i = 0; i < specs.length; i++) {
		var stype = specs[i].type, gtype = specs[i].gtype, sname = specs[i].name;
		var fullname = sname + '.' + stype;
		if (!_.includes((<string> (<any> info)[stype]).split(' '), sname)) {
			console.error(info.name + ': cannot use shader: ' + fullname);
			break;
		}
		var shader = gl.createShader(gtype);
		var source = sources[fullname];
		if (!source) {
			console.error('Missing shader source: ' + fullname);
			gl.deleteShader(shader)
			break;
		}
		gl.shaderSource(shader, sources[fullname]);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.log('Errors for shader: ' + fullname);
			console.log(gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			break;
		}
		gl.attachShader(program, shader);
		gl.deleteShader(shader);
	}
	var attrib = info.attr.split(' ');
	for (i = 0; i < attrib.length; i++) {
		gl.bindAttribLocation(program, i, attrib[i]);
	}
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.log('Errors for program: ', name);
		console.log(gl.getProgramInfoLog(program));
		gl.deleteProgram(program);
		return null;
	}
	var obj: Program = { program: program };
	var uniforms = info.unif.split(' ');
	for (i = 0; i < uniforms.length; i++) {
		var uname = uniforms[i];
		var loc = gl.getUniformLocation(program, uname);
		/*
		if (!loc) {
			console.log('Missing uniform: ' + uname + ' (' + name + ')');
		}
		*/
		(<any> obj)[uname] = loc;
	}
	return obj;
}
