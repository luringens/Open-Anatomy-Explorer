attribute vec4 color;
varying vec4 labelColor;
varying vec3 fragPosition;
varying vec3 fragNormal;
varying vec2 fragTexCoord;

void main() {
    vec4 pos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    fragPosition = position;
	fragNormal = normal;
	fragTexCoord = uv;
    labelColor = color;

    gl_Position = pos;
}
