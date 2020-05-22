precision mediump float;

const int ARR_SIZE = 16;
const float POINT_RADIUS = 10.0;

uniform sampler2D texture1;
uniform sampler2D texture2;
uniform vec3 baseColor;

uniform vec3 worldLightPosition;
uniform float ambientIntensity;
uniform float specularIntensity;
uniform float diffuseIntensity;
uniform float specularReflection;
uniform float diffuseReflection;
uniform float ambientReflection;
uniform float shininess;

varying vec3 fragPosition;
varying vec3 fragNormal;
varying vec2 fragTexCoord;

void main() {
    //vec4 color = vec4(baseColor, 1.0);
    vec4 color = texture(texture1, fragTexCoord);

    vec3 pos = fragPosition;
    vec3 normal = normalize(fragNormal);

    // Vector to camera
    vec3 v = normalize(cameraPosition - pos);

    // Vector to light source
    vec3 lm = normalize(worldLightPosition - pos);

    // Reflected light vector
    vec3 np = 2.0 * dot(lm, normal) * normal;
    vec3 rm = normalize(np - lm);

    // Light intensity
    float ip = ambientReflection * ambientIntensity + (
        diffuseReflection * diffuseIntensity * dot(lm, normal) +
        specularReflection * specularIntensity * pow(max(0.0, min(1.0, dot(rm, v))), shininess)
    );

    for (int i = 0; i < ARR_SIZE / 2; ++i)
    {
        vec4 pos2texel = texelFetch(texture2, ivec2(i * 2, 0), 0) ;
        vec4 pos2 = (pos2texel - 128.0) / 128.0 * pos2texel.z * 100.0;
        vec4 col2 = texelFetch(texture2, ivec2(i * 2 + 1, 0), 0);
        float wx = pow(pos.x - pos2.x, 2.0);
        float wy = pow(pos.y - pos2.y, 2.0);
        float wz = pow(pos.z - pos2.z, 2.0);
        bool ww = sqrt(wx + wy + wz) < POINT_RADIUS;
        float w = float(ww);
        color = (1.0  - w) * color + w * col2;
    }

    gl_FragColor = vec4(ip * color.rgb, 1.0);
}
