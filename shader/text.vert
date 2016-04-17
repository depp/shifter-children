attribute vec2 Pos;
attribute vec2 TexCoord;
attribute vec2 Style;

varying vec2 vTexCoord;
varying vec4 vColor;

uniform mat4 MVP;
uniform vec2 TexScale;
uniform vec2 Offset;
uniform vec4 Color[16];

void main() {
    vTexCoord = TexCoord * TexScale;
    vColor = Color[int(Style.x)];
    float phase = Style.y * 0.004;
    vec2 off = floor(vec2(cos(phase), sin(phase)) * 5.0);
    gl_Position = MVP * vec4(Pos + Offset + off, 0.0, 1.0);
}
