import * as param from './param';

export interface Camera {
	// The user interface matrix.
	uiMVP: Float32Array;

	// The world matrix.
	MVP: Float32Array;
}

export var camera = (function() {
	var tr = <Float32Array> vec3.fromValues(
			-param.Width / 2, -param.Height / 2, 0);
	var fovY = param.Height, fovX = param.Width; // use aspect
	var pr = <Float32Array> mat4.create();
	pr[0] = 2 / fovX;
	pr[5] = 2 / fovY;
	var mvp = <Float32Array> mat4.create();
	mat4.translate(mvp, pr, tr);
	return { uiMVP: mvp };
})();
