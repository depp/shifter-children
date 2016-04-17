attribute vec2 Pos;
varying vec2 vPos;
uniform vec2 Scale;
void main() {
    vPos = Pos * Scale;
    gl_Position = vec4(Pos, 0.0, 1.0);
}
