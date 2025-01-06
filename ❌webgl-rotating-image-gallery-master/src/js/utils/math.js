

export function lerp(p1, p2, t) {
  return p1 + (p2 - p1) * t;
}

// イージング（動きの滑らかさ）を制御する関数。
// 使い方: t（0〜1の範囲）を使い、動きの加速・減速を滑らかにする
// 最初と最後がゆっくり、中間が速い動きを生成する
// easeInOut(0);   // 0
// easeInOut(0.5); // 0.5
// easeInOut(1); 
export function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

// 補間関数
// start（開始値)
// end（終了値
// value（0〜1の範囲）に基づいて補間する
export function interpolate(start, end, value) {
  return start * (1.0 - value) + end * value;
}

// 数値を特定の範囲内に制限する関数
// 使い方: number を min（最小値）と max（最大値）の範囲に収める
// 範囲外の値は、最小値または最大値に丸められる
// clamp(0, 100, 50);  // 50 (範囲内)
// clamp(0, 100, -10); // 0 (最小値)
export function clamp(min, max, number) {
  return Math.max(min, Math.min(number, max));
}

// ランダムな整数値を生成
export function random(min, max) {
  return Math.random() * (max - min) + min;
}

// 数値をある範囲から別の範囲に変換する関数
// 使い方: num を min1〜max1 の範囲から、min2〜max2 の範囲に変換します。
// 例えば、[0, 100] の値を [0, 1] に正規化したり、逆に [0, 1] を [0, 100] に拡張できます。
export function map(num, min1, max1, min2, max2, round = false) {
  const num1 = (num - min1) / (max1 - min1);
  const num2 = num1 * (max2 - min2) + min2;

  if (round) return Math.round(num2);

  return num2;
}
