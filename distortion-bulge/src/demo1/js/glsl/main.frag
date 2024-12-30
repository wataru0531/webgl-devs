
// Cardのフラグメント

precision mediump float;

// uniform float uTime;
uniform sampler2D uTexture;
uniform vec2 uMouse; // canvas上で、左下が(0, 0)、右上が(1, 1)
uniform vec2 uMouseIntro; // Vec2(0.5, 0)

uniform float uIntro; // ビューポートに入った時に1。外れたら0に。マウスエンター時は常に1、リーブ時も1を保つ
uniform float uBulge; // ビューポートに入った時に1に設定 → 0。外れたら1。マウスエンター時は常に1、リーブ時は0

uniform float uRadius; // 0.95 
uniform float uStrength; // 1.1


varying vec2 vUv;

// bulge ... 膨らむ
vec2 bulge(vec2 uv, vec2 center) {
  // center ... ホバー時 → 左下が(0, 0)、右上が(1, 1)の座表とする。リーブ時もuMouseの状態
  //            ビューポートから、外れた時 → Vec2(0.5, 0)
  uv -= center;
  // → (1, 1)の部分をホバーした場合は、そこが(0, 0)に
  // → つまり、ホバーした箇所が(0, 0)になる

  // dist → ホバーした箇所から遠いほど、大きな値
  // length → uv が center からどれだけ離れているかの距離を取得。
  float dist = length(uv) / uRadius; 

  // distの値をべき乗 → ホバー位置から遠いピクセルほど値が急激に増加。かなり歪む
  // pow → pow() は、べき乗を計算する関数。数学的には、pow(a, b)は、a の b乗を返す
  float distPow = pow(dist, 4.); 

  // strengthAmount ... カーソルの位置から離れているフラグメントほど値が小さくなる
  // 中心に位置すれば、値は.5になるので
  float strengthAmount = uStrength / (1.0 + distPow); // strength → 1.1

  uv *= (1. - uBulge) + uBulge * strengthAmount; // uBulge ホバー時に1に。リーブ時も1のまま
  // → strengthAmountの値が1に近づけば近づくほど、値に変化はない
  //   逆に小さければ小さいほど、*= でcanvasの外側のフラグメントを取得しにいき歪みが大きくなる

  uv += center; // 元に戻す

  return uv;
}

void main() {
  // uMouseIntro → 初期位置(ビューポートに入る前)。Vec2(0.5, 0)の状態
  // uMouse → ビューポートに入ったら常にuMouseを起点としていく
  // uIntro → マウスリーブ時は常に1。
  vec2 center = mix(uMouseIntro, uMouse, uIntro);
  vec2 bulgeUV = bulge(vUv, center);

  vec4 tex = texture2D(uTexture, bulgeUV);

  gl_FragColor.rgb = tex.rgb;
  gl_FragColor.a = 1.0;
}
