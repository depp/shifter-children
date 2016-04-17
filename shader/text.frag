precision lowp float;

varying vec2 vTexCoord;
varying vec4 vColor;

uniform sampler2D Font;

void main() {
    float a = texture2D(Font, vTexCoord).r;
    gl_FragColor = a * vColor;
}
