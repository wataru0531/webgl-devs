
// Backgroundのvertex

attribute vec2 uv; // 0, 0, 2, 0, 0, 2, 
attribute vec2 position; // -1, -1, 3, -1, -1, 3　図の通りこの頂点が渡ってくる

uniform vec2 uResolution;

varying vec2 vUv;

void main() {
  vUv = uv;

  // oglライブラリでgl_Positionを設定する際、
  // Three.jsで使用されるprojectionMatrixやmodelViewMatrixを手動で計算する必要はない
  // oglはこれらの計算を内部で自動的に処理するため、gl_Positionの設定がシンプルに保たれている

  gl_Position = vec4(position, 0, 1);
}
