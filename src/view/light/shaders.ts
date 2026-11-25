// The light, as the graphics card works it out: four small programs that
// each read a picture and write one. They run one after the other on the
// field as the camera drew it (StageFilter.ts says in what order).
//
// They are written for WebGL 1, which every browser a portal sends has.
// A loop there has a fixed length, so the number of lights is written in.

/** How many lights a frame can have. Two uniforms each: a card must have room for about fifty in all. */
export const MAX_LIGHTS = 16;

const HEAD = `#pragma phaserTemplate(shaderName)
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
`;

/**
 * The field under the hour's light. Every color the camera drew is
 * multiplied by the light that falls there: the hour's own, dimmed where a
 * cloud's shadow passes, and each light near by. A light may be stronger
 * than one, and what it burns out to white is what blooms afterwards. What
 * shines by itself (fire, magic, sparks: the emit picture) is added after,
 * so the hour does not dim it.
 */
export const LIGHT_FRAG = `${HEAD}
uniform sampler2D uMainSampler;
uniform sampler2D uEmit;
uniform vec2 uView;
uniform vec2 uScroll;
uniform float uTime;
uniform vec3 uAmbient;
uniform vec3 uSun;
uniform vec2 uSunDir;
uniform float uClouds;
uniform vec3 uBack;
uniform float uEmitAmount;
uniform vec2 uGlow;
uniform vec4 uLights[${MAX_LIGHTS}];
uniform vec3 uColors[${MAX_LIGHTS}];
varying vec2 outTexCoord;

float hash(vec2 p) {
  p = fract(p * vec2(0.1031, 0.1030));
  p += dot(p, p.yx + 33.33);
  return fract((p.x + p.y) * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  vec4 base = texture2D(uMainSampler, outTexCoord);
  // Where this is on the view, in the field's own units from its top left.
  vec2 p = vec2(outTexCoord.x, 1.0 - outTexCoord.y) * uView;
  vec2 w = p + uScroll;
  // The sun falls where nothing is in its way. Shade drifts over the field in long patches drawn out the way the
  // light goes, as the shadows of trees and clouds are when the sun is low: in them there is only the sky's cool
  // light. The field is patches of warm and cool, and that is what makes it look lit and not tinted.
  float sunlit = 1.0;
  if (uClouds > 0.0) {
    vec2 q = vec2(dot(w, uSunDir), dot(w, vec2(-uSunDir.y, uSunDir.x)));
    float n = noise(vec2(q.x * 0.0013, q.y * 0.0046) + vec2(uTime * 0.011, uTime * 0.004)) * 0.62
      + noise(vec2(q.x * 0.0034, q.y * 0.012) - vec2(uTime * 0.015, 0.0)) * 0.38;
    sunlit = 1.0 - uClouds * smoothstep(0.44, 0.6, n);
  }
  vec3 light = uAmbient + uSun * sunlit;
  vec3 air = vec3(0.0);
  vec3 lamps = vec3(0.0);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    vec4 l = uLights[i];
    if (l.w > 0.0) {
      // The ground is seen from above and aslant, so a pool of light on it is wider than it is deep.
      vec2 d = (p - l.xy) * vec2(1.0, 1.32);
      float f = max(0.0, 1.0 - dot(d, d) / (l.z * l.z));
      f *= f;
      lamps += uColors[i] * (l.w * f);
      // A little of it hangs in the air round the light itself.
      air += uColors[i] * (l.w * f * f * 0.05);
    }
  }
  // Many lights on one spot do not add up without end: ten fires side by side are not ten times as bright as one.
  light += lamps / (1.0 + lamps * 0.6);
  // An enemy's red is what a player looks for, and no hour may take it away: at night a blue light turned a
  // captain's red to purple, which is the hero's side of the palette. What is red keeps a plain light, as bright
  // as the day's.
  float red = smoothstep(0.16, 0.36, base.r - max(base.g, base.b));
  light = mix(light, vec3(max(0.86, dot(light, vec3(0.3, 0.59, 0.11)))), red * 0.88);
  vec3 shine = texture2D(uEmit, outTexCoord).rgb * uEmitAmount;
  // What shines hides a little of what is behind it, as well as adding to it: a bolt keeps its color on bright sand,
  // where adding alone would only turn everything white.
  float solid = min(0.6, max(shine.r, max(shine.g, shine.b)) * 0.8);
  vec3 c = (base.rgb * light + air) * (1.0 - solid) + shine;
  // Past the field's edge there is nothing to light.
  c = mix(uBack, c, base.a);
  // How much of this glows afterwards, kept beside the color: what is lit past white, and whatever shines by itself.
  // It is measured before the color is brought back under white, which is the only time it can be.
  float top = max(c.r, max(c.g, c.b));
  float glow = max(smoothstep(uGlow.x, uGlow.y, top), min(1.0, dot(shine, vec3(0.42))));
  // Near white, brightness is eased toward it and not cut off at it, so that a strong light keeps its color.
  vec3 over = max(c - 0.85, 0.0);
  c = min(c, 0.85) + 0.15 * (1.0 - exp(-over * 5.0));
  gl_FragColor = vec4(c, glow);
}
`;

/** What glows, made four times smaller each way: the start of the bloom. The light pass said how much of each pixel does. */
export const BRIGHT_FRAG = `${HEAD}
uniform sampler2D uMainSampler;
uniform vec2 uTexel;
varying vec2 outTexCoord;

void main() {
  vec4 a = texture2D(uMainSampler, outTexCoord + uTexel * vec2(-1.0, -1.0));
  vec4 b = texture2D(uMainSampler, outTexCoord + uTexel * vec2(1.0, -1.0));
  vec4 c = texture2D(uMainSampler, outTexCoord + uTexel * vec2(-1.0, 1.0));
  vec4 d = texture2D(uMainSampler, outTexCoord + uTexel * vec2(1.0, 1.0));
  gl_FragColor = vec4((a.rgb * a.a + b.rgb * b.a + c.rgb * c.a + d.rgb * d.a) * 0.25, 1.0);
}
`;

/** A blur along one line. Run across and then down, it is a round one. */
export const BLUR_FRAG = `${HEAD}
uniform sampler2D uMainSampler;
uniform vec2 uStep;
varying vec2 outTexCoord;

void main() {
  vec3 c = texture2D(uMainSampler, outTexCoord).rgb * 0.227027;
  c += texture2D(uMainSampler, outTexCoord + uStep * 1.384615).rgb * 0.316216;
  c += texture2D(uMainSampler, outTexCoord - uStep * 1.384615).rgb * 0.316216;
  c += texture2D(uMainSampler, outTexCoord + uStep * 3.230769).rgb * 0.070270;
  c += texture2D(uMainSampler, outTexCoord - uStep * 3.230769).rgb * 0.070270;
  gl_FragColor = vec4(c, 1.0);
}
`;

/**
 * The lens: what a camera does to a lit scene. The glow of what is bright
 * is added, the colors are graded, the rim is darkened, and a little grain
 * keeps flat color from looking drawn.
 *
 * It does not put anything out of focus. It did once, the top and the
 * bottom of the whole picture, and a reviewer found an enemy with a
 * crossbow and a captain blurred there: what has to be seen to be dodged
 * is never soft. The ground alone is out of focus now, and that is done
 * with the ground's own picture (FieldLight.ts), not here.
 */
export const LENS_FRAG = `${HEAD}
uniform sampler2D uMainSampler;
uniform sampler2D uBloom;
uniform float uBloomAmount;
uniform float uVignette;
uniform vec3 uShade;
uniform float uContrast;
uniform float uSaturation;
uniform float uGrain;
uniform float uTime;
uniform float uAspect;
varying vec2 outTexCoord;

float hash(vec2 p) {
  p = fract(p * vec2(0.1031, 0.1030));
  p += dot(p, p.yx + 33.33);
  return fract((p.x + p.y) * p.y);
}

void main() {
  vec2 uv = outTexCoord;
  vec3 c = texture2D(uMainSampler, uv).rgb;
  c += texture2D(uBloom, uv).rgb * uBloomAmount;
  // The grade: darks lean to the hour's shade, the curve is steepened a little, color is deepened.
  float luma = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(luma), c, uSaturation);
  c = mix(c, c * c * (3.0 - 2.0 * c), uContrast);
  c = mix(c * uShade, c, smoothstep(0.0, 0.55, luma));
  vec2 q = (uv - 0.5) * vec2(min(uAspect, 1.6) / 1.6, 1.0);
  c *= 1.0 - uVignette * smoothstep(0.32, 0.86, length(q));
  c += (hash(uv * 977.0 + fract(uTime) * 61.0) - 0.5) * uGrain;
  gl_FragColor = vec4(c, 1.0);
}
`;
