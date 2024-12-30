
// Backgroundのfragment

precision highp float;

uniform vec3 uColor1; // #fdfaee　かなり薄い黄色
uniform vec3 uColor2; // #d6abb4 ピンクっぽい
uniform float uTime; // 経過時間
uniform float uScroll; // スクロール量。ここでは0 〜 2。body全体で1

varying vec2 vUv; // 0, 0, 2, 0, 0, 2, 

#pragma glslify: cnoise2 = require(glsl-noise/classic/2d); // 2Dのノイズ
#pragma glslify: cnoise3 = require(glsl-noise/classic/3d); // 2Dのノイズ

const float noiseScale = 1.; // 値を大きくするとノイズが細かくなる

void main() {
  // uScroll → 0 〜 2
  // sin → -1 〜 1
  // noise ... 値を大きくするとノイズが細かくなる
  float noise = cnoise2(vUv * noiseScale + uScroll + sin(uTime / 10.));

  // float noise = cnoise3(vec3(vUv.x * noiseScale + uScroll + sin(uTime/10.), vUv.y * noiseScale + uScroll * cos(uTime/10.), uTime));


  // mix(a, b, t) → tが0ならaを、tが1ならbを線形補間の値で取得する
  // 　　　　　　　　　ただし、-1は0に判定されるので、ここでは-1から0の値は補完されず0が取得されつづける
  // → -1〜0までが0になるので、uColor1の薄い黄色が強く出る
  // 　mix()によって、ピンクと黄色のノイズの割合が決定する
  vec3 color = mix(uColor1, uColor2, noise);
  // vec3 color = mix(uColor2, uColor1, noise);

  gl_FragColor.rgb = color;
  gl_FragColor.a = 1.0;
}
