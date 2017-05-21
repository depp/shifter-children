precision lowp float;

varying vec2 vTexCoord;
varying vec4 vColor0, vColor1, vColor2, vColor3;

uniform sampler2D Sheet;

void main() {
    vec4 t = texture2D(Sheet, vTexCoord);
    gl_FragColor =
        vColor0 * (t.a - t.r - t.g - t.b) +
        vColor1 * t.r +
        vColor2 * t.g +
        vColor3 * t.b;
}
