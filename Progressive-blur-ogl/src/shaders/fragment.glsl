

precision highp float;

uniform vec2 uImageSize; // 画像のもともとの大きさ
uniform vec2 uPlaneSize; // 3D空間上のスケール
uniform vec2 uViewportSize; // cameraから見た時の幅や高さ
uniform float uBlurStrength; // 1。heroは変化する。スクロールすると.2から増加していく
uniform float uTime; // { value: 100 * Math.random() }, // .04づつプラス

uniform sampler2D tMap; // 

varying vec2 vUv;

/*
  by @arthurstammet
  https://shadertoy.com/view/tdXXRM
*/
// fract ... 整数部分を切り捨て、小数部分だけを取得
// tvNoise → 関数は 0 から 1 の間の疑似乱数を生成
// p ... uv座表
float tvNoise (vec2 p, float ta, float tb) {
  return fract(sin(p.x * ta + p.y * tb) * 5678.);
}

// テクスチャの色情報を返す。
// アルファ以外を除いただけだが、コードの再利用性、可読性、拡張性を高めるための一歩として有用
vec3 draw(sampler2D image, vec2 uv) {
  return texture2D(image, vec2(uv.x, uv.y)).rgb;   
}

// 2Dベクトル(co)を基に疑似乱数を生成
// uvが (0,0)に近いほど小さい値に、(1,1)に近いほど大きな値になる
float rand(vec2 co){
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

/*
  inspired by https://www.shadertoy.com/view/4tSyzy
  @anastadunbar
*/
// 特定の座標(uv)の周辺にあるピクセルをランダムにサンプリングし、平均化することでブラー(ぼかし)効果を作り出す
vec3 blur(vec2 uv, sampler2D image, float blurAmount){
  vec3 blurredImage = vec3(0.);
  
  // グラデーション効果...画面の垂直位置によってブラー強度を変化させる
  // → 中の変数は変動しないので、スクロールするとcanvasの上部とmeshが擦れることでエフェクトが生まれる仕組み
  // gl_FragCoord → canvasの左下が(0, 0)、左上を(1, 1)としている
  // smoothstep(min, max, 0から1に補完される入力値)
  // → min以下は、0
  //   max以上は、1
  // gl_FragCoord.yの高さが上方向と下方向に近づくにつれ、smoothstepの補間によってブラーが強くかかる
  // uViewportSize →　約14 約16。
  // 上方向のフラグメントでは1が返ってきて
  float gradient = smoothstep(0.8, 0.0, 3.4 - (gl_FragCoord.y / uViewportSize.y) / uViewportSize.y) * uBlurStrength + 
                   smoothstep(0.8, 0.0, (gl_FragCoord.y / uViewportSize.y) / uViewportSize.y) * uBlurStrength;
  
  // ぼかし効果を強化するために、画像の異なる位置からサンプリングを繰り返し行う処理
  #define repeats 40.
  for (float i = 0.; i < repeats; i++) { 
    // ぼかしをランダム化するためのベクトルqを計算
    // degrees() ... ラジアンを度数法に変換
    vec2 q = vec2(cos(degrees((i / repeats) * 360.)), sin(degrees((i / repeats) * 360.))) * (rand(vec2(i, uv.x + uv.y)) + blurAmount); 
    vec2 uv2 = uv + (q * blurAmount * gradient);
    blurredImage += draw(image, uv2) / 2.;

    q = vec2(cos(degrees((i / repeats) * 360.)), sin(degrees((i / repeats) * 360.))) * (rand(vec2(i + 2., uv.x + uv.y + 24.)) + blurAmount); 
    uv2 = uv + (q * blurAmount * gradient);
    blurredImage += draw(image, uv2) / 2.;
  }
  return blurredImage / repeats;
}

void main() {
  // 元々の画像と3Dオブジェクト(平面)のアスペクト比を調整し、それに基づいて画像のUV座標を補正していく
  // uPlaneSize ... 3D空間における平面のサイズ(幅と高さ)
  // uImageSize ... 画像の元々のサイズ(幅と高さ)
  // setScaleでHTMLの画像の大きさの割合を、3D空間におけるplaneの割合を統合させてはいるが、
  vec2 ratio = vec2(
    // 
    min((uPlaneSize.x / uPlaneSize.y) / (uImageSize.x / uImageSize.y), 1.0),
    // 
    min((uPlaneSize.y / uPlaneSize.x) / (uImageSize.y / uImageSize.x), 1.0)
  );

  vec2 uv = vec2(
    vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
    vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
  );

  float t = uTime + 123.0;
  float ta = t * 0.654321;
  float tb = t * (ta * 0.123456);
  vec4 noise = vec4(1. - tvNoise(uv, ta, tb));
  
  vec4 final = vec4(blur(uv, tMap, 0.08), 1.);

  final = final - noise * 0.08;

  gl_FragColor = final;
}