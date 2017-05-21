attribute vec3 Pos;
attribute vec4 Color0;
attribute vec4 Color1;
attribute vec4 Color2;
attribute vec4 Color3;

varying vec2 vTexCoord;
varying vec4 vColor0, vColor1, vColor2, vColor3;

uniform mat4 MVP;

void main() {
    vTexCoord = Pos.zw;
    vColor0 = Color0;
    vColor1 = Color1;
    vColor2 = Color2;
    vColor3 = Color3;
    gl_Position = MVP * vec4(Pos.xy, 0.0, 1.0);
}
