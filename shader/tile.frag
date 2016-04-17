precision lowp float;

varying vec2 vTexCoord;

uniform sampler2D TileSheet;

void main() {
    gl_FragColor = texture2D(TileSheet, vTexCoord);
}
