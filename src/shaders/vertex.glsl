varying vec2 vUv;
varying vec3 vPos;
varying vec2 vCoordinates;
attribute vec3 aCoordinates;
attribute float aDirection;
attribute float aSpeed;
attribute float aOffset;
attribute float aPress;

uniform float move;
uniform float u_time;
uniform vec2 mouse;
uniform float mousePressed;

void main() {
    vUv = uv;
    vec3 pos = position;
    pos.x += sin(u_time*aSpeed)*3.;
    pos.y += sin(u_time*aSpeed)*3.;
    pos.z = mod(position.z + u_time*aSpeed + aOffset, 2000.) - 1000.;

    vec3 stable = position;
    float dist = distance(stable.xy, mouse);
    float area = 1. - smoothstep(0., 200., dist);

    stable.x += 50.*sin(u_time*aPress)*aDirection*area*mousePressed;
    stable.y += 50.*sin(u_time*aPress)*aDirection*area*mousePressed;
    stable.z += 200.*cos(u_time*aPress)*aDirection*area*mousePressed;

    // alternate between exploded and converged
    float alternator = sin(u_time);
    if (alternator > 0.) {
        // modelMatrix transforms the coordinates local to the model into world space
        stable.z += (3000.*aSpeed + aOffset)*alternator;
    }
    vec4 worldPos = modelMatrix * vec4(stable, 1.0);
    // viewMatrix transform the world coordinates into the world space viewed by the camera (view space)
    vec4 mvPosition = viewMatrix * worldPos;

    gl_PointSize = 2350. * (1. / - mvPosition.z);

    gl_Position = projectionMatrix * mvPosition;

    vCoordinates = aCoordinates.xy;
    vPos = pos;
}