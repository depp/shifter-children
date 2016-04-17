attribute vec2 Pos;
attribute vec2 TexCoord;

varying vec2 vTexCoord;

uniform mat4 MVP;
uniform vec2 VertScale;
uniform vec2 TexScale;
uniform vec2 Offset;

void main() {
    vTexCoord = TexCoord * TexScale;
    gl_Position = MVP * vec4(VertScale * (Pos + Offset), 0.0, 1.0);
}
