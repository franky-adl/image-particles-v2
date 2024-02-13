uniform vec2 u_resolution;
varying vec2 vCoordinates;
varying vec3 vPos;
uniform sampler2D t1;
uniform sampler2D t2;
uniform sampler2D mask;
uniform float u_time;

void main() {
  vec4 maskTexture = texture2D(mask, gl_PointCoord);
  vec2 myUV = vec2(vCoordinates.x/512., vCoordinates.y/512.);
  vec4 image = vec4(0.);

  float alternator = sin(u_time);
  float alternator2 = sin(u_time*0.5);
  if (alternator2 > 0.) {
    if (alternator > 0. && cos(u_time) > 0.) {
      image = mix(texture2D(t1, myUV), texture2D(t2, myUV), alternator);
    } else {
      image = texture2D(t2, myUV);
    }
  } else {
    if (alternator > 0. && cos(u_time) > 0.) {
      image = mix(texture2D(t2, myUV), texture2D(t1, myUV), alternator);
    } else {
      image = texture2D(t1, myUV);
    }
  }
  

  float alpha = 1. - clamp(0., 1., abs(vPos.z/900.));
  gl_FragColor = image;
  gl_FragColor.a *= 1. - smoothstep(0., 0.2, alternator)*maskTexture.r;
  // transform color from linear colorSpace to sRGBColorSpace
  // gl_FragColor = linearToOutputTexel( gl_FragColor );
}