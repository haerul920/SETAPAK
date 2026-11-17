/**
 * Shader langit (docs/BACKGROUND.md, lapisan 1). GLSL ES 1.00 supaya jalan di WebGL1 maupun WebGL2.
 * Isi: gradien tiga warna dengan fbm lembut (tanpa banding), kabut bergerak, sinar cahaya radial,
 * kaustik air, bara dan abu untuk peristiwa api, dan distorsi kecil saat menggulir cepat.
 */
export const VERTEX = /* glsl */ `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const FRAGMENT = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uVel;
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uBottom;
uniform vec3 uLight;
uniform float uFog;
uniform float uRays;
uniform float uCaustic;
uniform float uEmber;
uniform float uQuality;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm2(vec2 p) {
  return 0.6 * noise(p) + 0.4 * noise(p * 2.03 + 7.1);
}

void main() {
  float asp = uRes.x / uRes.y;
  vec2 p = vUv;
  // distorsi kecil saat menggulir cepat (efek percepatan waktu)
  p.x += sin(vUv.y * 18.0 + uTime * 2.0) * 0.004 * uVel;
  p.y += sin(vUv.x * 14.0 - uTime * 1.5) * 0.003 * uVel;

  float t = 1.0 - p.y;
  vec3 col = mix(uTop, uMid, smoothstep(0.0, 0.55, t));
  col = mix(col, uBottom, smoothstep(0.45, 1.0, t));

  // kabut bergerak lambat (dua oktaf, dilengkungkan sekali)
  vec2 q = vec2(p.x * asp, p.y) * 2.2 + vec2(uTime * 0.02, uTime * 0.012);
  float fg = fbm2(q + fbm2(q * 1.3 + uTime * 0.01));
  float fogAmt = uFog * smoothstep(0.28, 0.85, fg) * (0.3 + 0.7 * t);
  col = mix(col, uLight * 0.5 + uBottom * 0.5, fogAmt * 0.45);

  if (uQuality > 0.5) {
    // sinar cahaya dari titik di atas layar; radial murah tanpa blur berulang
    vec2 lp = vec2(0.5 + (uMouse.x - 0.5) * 0.16, 1.18);
    vec2 d = (p - lp) * vec2(asp, 1.0);
    float ang = atan(d.x, -d.y);
    float len = length(d);
    float ray = pow(max(0.0, sin(ang * 13.0 + uTime * 0.05) * 0.5 + 0.5), 3.0) * (0.6 + 0.4 * sin(ang * 6.0 - uTime * 0.07));
    ray *= smoothstep(1.5, 0.0, len) * uRays;
    col += uLight * ray * 0.17;

    // kaustik air: pola gelombang cahaya, paling terlihat di bagian atas
    if (uCaustic > 0.01) {
      float c = sin(p.x * asp * 20.0 + uTime * 0.8 + sin(p.y * 16.0 + uTime * 0.6) * 2.0) * sin(p.y * 18.0 - uTime * 0.7 + sin(p.x * asp * 14.0) * 2.0);
      c = pow(abs(c), 6.0);
      col += vec3(0.28, 0.5, 0.58) * c * uCaustic * (0.25 + 0.75 * (1.0 - t)) * 0.3;
    }
  }

  // bara dan abu naik di sekitar peristiwa api
  if (uEmber > 0.01) {
    vec2 gp = vec2(p.x * asp * 16.0, p.y * 11.0 - uTime * 1.4);
    vec2 id = floor(gp);
    vec2 f = fract(gp) - 0.5;
    float h = hash(id);
    vec2 off = (vec2(hash(id + 3.1), hash(id + 7.7)) - 0.5) * 0.6;
    float d2 = length(f - off);
    float spark = step(0.84, h) * smoothstep(0.14, 0.0, d2) * (0.5 + 0.5 * sin(uTime * 6.0 + h * 30.0));
    col += vec3(1.0, 0.5, 0.18) * spark * uEmber * 0.9;
    col = mix(col, col * 0.78 + vec3(0.04, 0.035, 0.03), uEmber * 0.25);
  }

  // dithering halus supaya gradien tidak berpita
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 160.0;
  gl_FragColor = vec4(col, 1.0);
}
`;
