
// このglslの目的は 計算 を行うことです。
// そのため、初期の段階ではuGrid のテクスチャ(データテクスチャ)は空の仮のテクスチャであっても問題ない。

// uGrid
// → GPGPUにおけるデータのストレージ
//   フラグメントシェーダーでは、このテクスチャからピクセルごとのデータを取得し、
//   新しい値を計算して書き戻していく
// uGridの初期値が仮であっても、計算が進むにつれて意味のあるデータが蓄積され、
// 目的の効果（例えば、物理シミュレーションやパーティクルの挙動）が実現される


uniform float uRelaxation; // 0.965
uniform float uGridSize; // canvasのサイズ。{ width: number height: number }
uniform vec2 uMouse; // 左下が(0, 0)、右上が(1, 1)
uniform vec2 uDeltaMouse; // マウスの動きの差分。ここでは80倍している
uniform float uMouseMove; // 画像ホバー時に1になり渡ってくる
uniform float uDistance; // 8


void main(){
  // 
  // gl_FragCoord → canvasの幅、高さ。0から1の範囲 ではなく、ピクセル単位の座標。
  // resolution.xy → は画面の解像度(幅、高さ)
  // → resolutionは、new GPUComputationRenderer(this.size, this.size, this.renderer)
  //   この部分で自動的に解像度が決めれて、resolutionに相当するuniformとして自動的にシェーダーに渡される
  //   27, 27
  vec2 uv = gl_FragCoord.xy / resolution.xy;

  // uGrid 
  vec4 color = texture(uGrid, uv);

  float dist = distance(uv, uMouse);
  dist = 1. - (smoothstep(0., uDistance / uGridSize, dist));


  vec2 delta = uDeltaMouse;

  color.rg += delta * dist;
  color.rg *= min(uRelaxation, uMouseMove);
  
  gl_FragColor = color;
}