varying vec3 fragPosition;
varying vec3 fragNormal;
varying vec2 fragTexCoord;

void main() {
    //vColor = color + (1.0 - color.a) * vec3(1.0, 1.0, 1.0);
    vec4 pos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    fragPosition = fragPosition;
	fragNormal = normal;
	fragTexCoord = uv;

    gl_Position = pos;
}
