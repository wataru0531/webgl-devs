
precision mediump float;

// UV座標をテクスチャとキャンバスのアスペクト比に基づいて調整し、
// テクスチャを適切にキャンバス内で拡大・縮小してカバーする

// 実現/解決すること
// テクスチャの歪み防止
// 中央揃え

// uv ... uv座表 0 〜 1
// size ... テクスチャの幅と高さ 896, 1344
// resolution ... canvasの幅と高さ 240, 600

vec2 resizeUvCover(vec2 uv, vec2 size, vec2 resolution) {
    vec2 ratio = vec2(
        // キャンバスと画像のアスペクト比を比較するための計算
        min((resolution.x / resolution.y) / (size.x / size.y), 1.0), // x軸。幅に対するアスペクト比 .6
        min((resolution.y / resolution.x) / (size.y / size.x), 1.0)  // y軸。高さに対するアスペクト比 1.6 なので、1が返る
    );
    // → canvasのアスペクトは、0.4
    //   テクスチャのアスペクトは、0.67
    // → テクスチャの方が、高さの幅に対する割合が大きいのでアスペクト比が合わずはみ出る。
    // → 0.4 / 0.67 で、0.59となり、テクスチャの0.67に0.59をかけてやれば、幅にアスペクト比が同じになる。

    return vec2(
        // (1. - ratio.x) ... 中央揃えを行うためのオフセット
        //                    (1.0 - ratio.x)の余白ができるため、uv座標にその半分をプラすることで中央揃えができる
        uv.x * ratio.x + (1.0 - ratio.x) * 0.5, 
        uv.y * ratio.y + (1.0 - ratio.y) * 0.5  
    );
}

#pragma glslify: export(resizeUvCover)
