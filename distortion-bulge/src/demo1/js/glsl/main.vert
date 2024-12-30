
// Cardのvertex

attribute vec2 uv;
attribute vec2 position;

uniform vec2 uResolution; // canvasの幅, 高さ
uniform vec2 uTextureResolution; // 画像自体の幅、高さ

varying vec2 vUv;

#pragma glslify: resizeUvCover = require("./partials/resize-uv-cover.glsl")

void main() {
  // canvasのサイズにテクスチャをcssのcoverのようにするuv
  vUv = resizeUvCover(uv, uTextureResolution, uResolution);

  // position → oglではtriangleなどのgeometryの場合は2次元で頂点が渡ってくる
  //            oglは軽量かつシンプルな WebGLライブラリであり、余分な計算や抽象化を省いているため
  gl_Position = vec4(position, 0, 1);
}
