
// fragment.glsl

precision mediump float;


uniform sampler2D uTexture;
varying vec2 vUv;

uniform vec2 uResolution; // 元々の画像の幅、高さ
uniform float uProgress; // 
uniform vec3 uColor; // #242424 → 黒

uniform vec2 uContainerRes; // html上の画像の幅、高さ
uniform float uGridSize; // 20

// ✅ 0 〜 1の疑似乱数を生成
// 座表st → s = 横軸、 t = 縦軸
// fract() → 少数部分だけ取り出す。3.75 の場合は 0.75 を取得
//           マイナスもプラスになってとれてくる
// sin() → -1 〜 1を返す
float random (vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// 画像を「正方形比率を保ったまま」コンテナ内に中央配置するためのUV補正関数
// → object-fit: contain をGLSLでやっている感じ
// uResolution → 元々の画像の大きさ
vec2 squaresGrid(vec2 vUv) {
	float imageAspectX = 1.; // 👉 画像を、1 : 1 と仮定
	float imageAspectY = 1.;

	// コンテナのアスペクト比
	// → 画像が縦長か横長かを数値で判定している

	// ✅ 横が縦の何倍あるか
	// containerAspectX > 1 → PCのような横長
	// containerAspectX < 1 → スマホのような縦長
	float containerAspectX = uResolution.x / uResolution.y; 

	// ✅ 縦が横の何倍あるか ... 縦を基準とする考え方
	// containerAspectY > 1 → 縦長
	// containerAspectX < 1 → 横長
	float containerAspectY = uResolution.y / uResolution.x;

	// ✅ どれだけ縮めるかを決める → はみ出さないように縮小率を決める
	vec2 ratio = vec2(
		min(containerAspectX / imageAspectX, 1.0),
		min(containerAspectY / imageAspectY, 1.0)
	);
	// 16 : 9 の横長 →　vec2(1.0, 0.5625)
	// 4 : 3 の横長 → vec2(1.0, 0.75)
	// 3 : 5 の縦長 → vec2(0.6, 1.0)

	// 縮小したUVを中央に移動させる
	vec2 squareUvs = vec2(
		vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
		vUv.y * ratio.y + (1.0 - ratio.y) * 0.5  // 0.4375
	);

	return squareUvs;
}


void main() {
	vec2 newUvs = vUv;            

	// uResolution 元々の画像の幅、高さ
	// imageAspectX > 1 → 横長
	// imageAspectX < 1 → 縦長
	// imageAspectY > 1 → 縦長
	// imageAspectY < 1 → 横長
	// 16  : 9 の場合、1.77
	float imageAspectX = uResolution.x / uResolution.y; // 横が縦の何倍か
	float imageAspectY = uResolution.y / uResolution.x; // 縦が横の何倍か
	
	// HTML上のDOMのアスペクト比
	// 4 : 3 の場合、1.33
	float containerAspectX = uContainerRes.x / uContainerRes.y;
	float containerAspectY = uContainerRes.y / uContainerRes.x;

	vec2 ratio = vec2(
		min(containerAspectX / imageAspectX, 1.0),
		min(containerAspectY / imageAspectY, 1.0)
	);

	vec2 coverUvs = vec2(
		vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
		vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
	);

	//generate grid
	vec2 squareUvs = squaresGrid(coverUvs);
	float gridSize = floor(uContainerRes.x/20.);
	vec2 grid = vec2(floor(squareUvs.x*gridSize)/gridSize,floor(squareUvs.y*gridSize)/gridSize);
	vec4 gridTexture = vec4(uColor,0.);
	

	//image texture    
	vec4 texture = texture2D(uTexture,coverUvs);
	float height = 0.2;

	float progress = (1.+height)-(uProgress*(1.+height+height)); //goes from 1+height to -height


	float dist = 1.-distance(grid.y,progress);

	float clampedDist = smoothstep(height,0.,distance(grid.y,progress));

	float randDist=step(1.-height*random(grid),dist);
	dist=step(1.-height,dist);
	
	float rand = random(grid); 

	float alpha = dist*(clampedDist+rand-0.5*(1.-randDist));
	alpha=max(0.,alpha);
	gridTexture.a = alpha;

	texture.rgba *= step(progress,grid.y);
	
	gl_FragColor = vec4(mix(texture,gridTexture,gridTexture.a));
}