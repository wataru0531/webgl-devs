
// タッチデバイスならtrueを返す

export function isTouch() {
  // iOSデバイスでスタンドアロンモードでWebアプリが実行されているかどうかを判定
  // → スタンドアロンモードとは、アプリのようにホーム画面から直接起動する形のこと。
  //   navigatorオブジェクトに standalone というプロパティがある場合、
  //   _iOSデバイスがスタンドアロンモードで動いていると判定して、タッチデバイスだと判定
  if ('standalone' in navigator) {
    return true // iOS devices
  }
  // console.log(window); // navigatorを持つ

  // コースタッチスクリーン（粗い操作が必要なタッチスクリーン）を持つデバイスかどうかを判定
  // → 画面が「粗い指の動き」を検出できるタイプかどうかを判定
  //   コースタッチスクリーンがあれば、タッチデバイスだと判断して true を返す
  const hasCoarse = window.matchMedia('(pointer: coarse)').matches
  if (hasCoarse) {
    return true
  }

  // 精密なポインティングデバイス（マウスやトラックパッド）を持つデバイスを判定
  // → 「精密なポインティングデバイス」が使われているかをチェックし、
  //    もし使われていれば、タッチデバイスではないと判断して false を返す
  const hasPointer = window.matchMedia('(pointer: fine)').matches
  if (hasPointer) {
    return false // prioritize mouse control
  }

  // Otherwise, fall-back to older style mechanisms.
  return 'ontouchstart' in window || 
          navigator.maxTouchPoints > 0 ||
          (window.DocumentTouch && document instanceof DocumentTouch)
}


// タッチデバイスかどうか判定
// const isTouchDevices = Boolean(
//   "ontouchstart" in window ||
//   (window.DocumentTouch && document instanceof DocumentTouch)
// );