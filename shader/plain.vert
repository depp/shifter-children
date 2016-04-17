attribute vec2 Pos;
attribute vec4 Color;

varying vec4 vColor;

uniform mat4 MVP;

void main() {
    vColor = Color;
    gl_Position = MVP * vec4(Pos, 0.0, 1.0);
}
