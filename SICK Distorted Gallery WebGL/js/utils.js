

export const utils = {
  lerp,
  setTransform,
  delay,
  reduceText,
  splitTextIntoSpans,
  random,
  generateRgb,
  generateHex,
  isDevice,
  isTouchDevices,
  shuffleArray,
  mapRand,
  animateCounter,
  debounce,

  loadImage,
  preloadImages,
  generateImageUrls,
  getArrayImagSources,
  getRandomImage,

  fetchJsonData,
  initLenis,
  preloadFonts,
  getCSSVariableValue,
  
  getMousePos,
  getClipPos,
  getMapPos,
}


// そのCSSに設定されているcssの値を取得
function getCSSVariableValue(_element, _variableName) {
  return getComputedStyle(_element).getPropertyValue(_variableName).trim();
};


// マウスの位置を取得
function getMousePos(e) {
  return { x : e.clientX,  y : e.clientY };
};

// クリップ座標  中央が(0, 0)で、-1 〜 1 で返す
function getClipPos(e) {
  return {
    x:   ( e.clientX / viewport.width  ) * 2 - 1,
    y: - ( e.clientY / viewport.height ) * 2 + 1,
  };
}

// 中央が(0, 0)で、座標を返す処理
function getMapPos(_width, _height){
  // console.log(_width, _height); // 256.8 187.6
  const clipPos = getClipPos();
  // console.log(clipPos);

  return {
    x: clipPos.x * _width / 2,
    y: clipPos.y * _height / 2
  }
}


// Lenisとgsap(ScrollTrigger)の更新を連動させる仕組みを構築
// gsapの内部のtickerが独自に動く仕組みになっていて、それをlenisと同期していく
function initLenis() {
  const lenis = new Lenis();

  // Lenisでスクロールが発生するたびに、ScrollTrigger.updateを発火させる
  // この設定により、スクロール位置の変化に合わせてScrollTriggerが更新され、アニメーションが同期して動作する
  lenis.on('scroll', ScrollTrigger.update)

  // gsap.ticker.add → gsapのタイムライン(gsap内部で起きている独自の更新のタイミング)にLenisのrafメソッドを追加
  // → gsapのアニメーション更新タイミングとLenisのスクロール更新タイミングが同期され、スムーズにスクロールとアニメーションが連動
  //   ここではgsapのタイミングに合わせてLenisのスクロール状態も更新されるようにしている
  gsap.ticker.add((time)=>{   // lenis.raf() → Lenisのスクロールアニメーションを更新
    // console.log(time)
    lenis.raf(time * 1000)
  });

  // lagSmoothing(0) → gsapのtickerのラグ(遅れ)を調整する機能を無効化
  // → gsapはフレームレートが低下してラグが発生した場合に、アニメーションが一時的にカクつかないように、ある程度の範囲で自動補正を行う
  //   デフォルト設定では、フレームレートが大きく落ち込んだときにアニメーションをリセットしたり、スムーズさを保つために動作を調整したりしている
  //   Lenisとの連携では、補正がかかるとスクロールやアニメーションの同期が崩れることがあるため、gsapのこの機能を無効化している
  // この設定により、gsap側でスクロールやアニメーションに遅延が発生した場合でも、lenisとうまく同期するようにしている
  gsap.ticker.lagSmoothing(0);
};

// WebFont.js ここではGoogleフォントを
// https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js
function preloadFonts() {
  return new Promise((resolve) => {
    WebFont.load({
      google: {
        families: ['Inter:wght@100..900'],
      },
      active: () => { // active: resolve, // 正常に読み込まれたら発火したいコールバック
        // console.log("正常にフォントが読み込まれました。");
        resolve();
      },
    });
  });
};

// デバウンス
// → リサイズやホイールのイベントなどで最終的な1回の処理を実行する処理
// 　 例えばリサイズが止まった時にだけ発火する
//    return function(){} → この部分がイベントにコールバックとして登録され、
//    _callbackが実行される
function debounce(_callback, _delay){
  let timerId = null;

  return function(...args) {
    if(timerId) clearTimeout(timerId);
    // console.log(timerId)

    timerId = setTimeout(() => {
      // console.log(timerId)
      // console.log("callback done!!")
      // console.log(...args)

      _callback(...args);
      // _callback.apply(this, args); // thisのコンテキストを使いたい場合
    }, _delay);
  }
}


// jsonデータを非同期で取得する処理
// _url → パス
// _variableName → データの変数名。dataはオブジェクトで取得できるため
async function fetchJsonData(_url, _variableName){
  try{
    const jsonData = await fetch(_url);
    // console.log(data); // Response {type: 'basic', url: 'http://127.0.0.1:5500/data.json', redirected: false, status: 200, ok: true, …}
    
    // json() → 非同期にJSONデータを読み込み、その結果をPromiseオブジェクトとして返す
    //          JSON文字列をオブジェクトに変換
    // await  → Promiseを解決。内部的にはresolveが発火
    const data = await jsonData.json();
    // console.log(galleryItems)

    return data[_variableName];
  }catch(error){
    console.error("データの取得に失敗", error);
  }
}

// 画像を生成し、画像のロードの完了を待つ関数
function loadImage(_src, _alt = ""){
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = _src;
    img.alt = _alt;
  })
}

// CSSの背景画像を含めた画像の読み込みが終わるまで待機する関数
function preloadImages(selector = 'img') {
  const elements = [...document.querySelectorAll(selector)];
  // console.log(elements); // NodeList(79) [div.grid__item-img, ...]
  const imagePromises = [];

  elements.forEach((element) => {
    // 背景画像の場合
    // console.log(getComputedStyle(element)); // 指定した要素に適用されているスタイルを表すオブジェクト
    const backgroundImage = getComputedStyle(element).backgroundImage;
    // console.log(backgroundImage);
    // url("image.jpg")、url('image.jpg')、url(image.jpg) にマッチさせる
    const urlMatch = backgroundImage.match(/url\((['"])?(.*?)\1\)/);
    // console.log(urlMatch); // (3) ['url("http://127.0.0.1:5501/images/1.avif")', '"', 'http://127.0.0.1:5501/images/1.avif', index: 0, input: 'url("http://127.0.0.1:5501/images/1.avif")', groups: undefined]
    if (urlMatch) {
      const url = urlMatch[2];
      imagePromises.push(utils.loadImage(url));
    }
    // console.log(element.tagName); // div
    if (element.tagName === 'IMG') { // img要素の場合の処理
      const src = element.src;
      if (src) {
        imagePromises.push(utils.loadImage(src));
      }
    }
  });

  return Promise.all(imagePromises);
}

// 画像のurlの配列を生成
// const images = utils.generateImageUrls({ _length: 24, _range: 20, _extension: "avif" })
function generateImageUrls({ _length, _path = "./images", _range, _extension }){
  return Array.from({ length: _length }, (_, idx) => {
    const fileIndex = (idx % _range) + 1;
    return `${_path}/${fileIndex}.${_extension}`;
  })
}

// 画像の配列を生成
function getArrayImagSources(_length, _path = "./images", _extension = "avif"){
  const imgSources = Array.from({ length: _length }, (_, idx) => `${_path}/${idx + 1}.${_extension}`);

  return imgSources;
}

// 配列の中の画像をランダム
function getRandomImage(_imagesArray){
  return _imagesArray[Math.floor(Math.random() * _imagesArray.length)];
}


// 線形補間 t...補完係数
function lerp(start, end, t, limit = .001) {
  let current = start * (1 - t) + end * t;

  // end と currentの中間値の値が.001未満になれば、endを返す(要調整)
  if (Math.abs(end - current) < limit) current = end;

  return current;
}
// console.log(lerp(10, 15, 0.9991));


// transformを付与。_elはDOM
function setTransform(_el, _transform) {
  _el.style.transform = _transform;
}

// 与えた秒数、処理を遅らせる。ms
function delay(time = 500){
  return new Promise(resolve => setTimeout(resolve, time))
}

// 文字をspanでラップする関数
// const splitTexts = element.innerHTML.trim().split("");
// → 文字の配列を引数にわたす
function reduceText(_splitTexts){
  return _splitTexts.reduce((accu, curr) => {
    // console.log(accu, curr)
    curr = curr.replace(/\s+/, "&nbsp;")

    // return accu + curr
    return `${accu}<span class="char">${curr}</span>`
  }, "")
}

// 文字列をspanでラップして返す関数
function splitTextIntoSpans(_selector){
  let elements = document.querySelectorAll(_selector);
  elements.forEach(element => {
    let text = element.innerText;
    // console.log(text); // Front
    // console.log(text.split("")); // (5) ['F', 'r', 'o', 'n', 't']
    
    // 1文字づつspanで返して配列で格納。.joinで連結
    let splitTexts = text.split("").map(char => {
      return `<span>${char === " " ? "$nbsp;" : char}</span>`
    });
    // console.log(splitTexts); // (5) ['<span>F</span>', '<span>r</span>', '<span>o</span>', '<span>n</span>', '<span>t</span>']
    
    let joinedTexts = splitTexts.join("");
    // console.log(joinedTexts); // <span>F</span><span>r</span><span>o</span><span>n</span><span>t</span>

    element.innerHTML = joinedTexts;
  });
}

// ランダムな整数値を取得
function random(min, max) {
  const num = Math.floor(Math.random() * (max - min)) + min;
  return num;
}

// rgbカラーコードを生成
function generateRgb() {
  return `rgb(${random(0, 255)}, ${random(0, 255)}, ${random(0, 255)})`;
}

// 16進数のカラーコードを生成
function generateHex(){
  const letters = "0123456789ABCDEF"; // ※letters ... 文字の意味
  let hash = "#";

  for(let i = 0; i < 6; i++){
    // Math.floor()  ... 小数点切り捨て
    // Math.random() ... 0以上〜1未満の範囲で乱数を生成。
    // Math.random() * 16 とすることで、0〜15までの数値がランダムで生成される。

    // lettersの中からランダムに文字列を取得して#以下を選択
    hash += letters[Math.floor(Math.random() * 16)];
  }

  return hash;
}


// モバイルデバイスかタブレットだったらtrueを返す。PCだったらfalseを返す
function isDevice() {
  const ua = window.navigator.userAgent;
  // console.log(ua) // Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36
  
  // 検索対象の文字列や配列の中で、特定のサブ文字列や要素が最初に現れる位置を返す。見つからなかった場合は-1を返す。
  // console.log(ua.indexOf("iPhone")) // -1
  // if(ua.indexOf('iPhone') > 0 || ua.indexOf('iPod') > 0 || ua.indexOf('Android') > 0 && ua.indexOf('Mobile') > 0){
  //   return 'mobile';
  // }else if(ua.indexOf('iPad') > 0 || ua.indexOf('Android') > 0){
  //   return 'tablet';
  // }else{
  //   return 'desktop';
  // }

  const isMobile = (ua.indexOf('iPhone') > -1 || ua.indexOf('iPod') > -1 || ua.indexOf('Android') > -1 && ua.indexOf('Mobile') > -1);
  const isTablet = (ua.indexOf('iPad') > -1 || ua.indexOf('Android') > -1);
  if(isMobile || isTablet) return true;

  return false;
}

// タッチデバイスかどうか判定
function isTouchDevices(){
  const isTouchDevices = Boolean(
    "ontouchstart" in window ||
    (window.DocumentTouch && document instanceof DocumentTouch)
  );

  return isTouchDevices;
}

// 配列の要素をランダムにシャッフル。
// Fisher-Yates（フィッシャー・イェーツ）アルゴリズム
function shuffleArray(_array){
  // console.log(_array)
  const newArray = _array.slice(); // 複製。元の配列には影響なし

  // 配列全体を後ろからループ
  // console.log(_array.length - 1) // 4 最後の要素を取得
  // i > 0 ... i が 0までループを継続。つまり、indexが0の時終了。
  for(let i = newArray.length - 1; i >= 0; i--){
    // 配列のインデックスをランダムに返す。0から
    const randomIndex = Math.floor(Math.random() * (i + 1)); // floor 少数切り捨て
    // console.log(i, randomIndex) // インデックス、ランダムな数値
    
    // ここで配列の要素の回数ループを回し、要素を入れ替える。
    [newArray[i], newArray[randomIndex]] = [newArray[randomIndex], newArray[i]];

    // console.log(newArray)
  }

  return newArray;
}

function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Math.sqrt() ... 与えられた数値の平方根を返す。スクエアルート
  return Math.sqrt(dx * dx + dy * dy);
}
// console.log(distance(0, 0, 3, 4)); // 5 (3-4-5の三角形)

// インデックスが範囲を超えた場合に適切にラップする関数
// 配列が[0, 1, 2]とあったとして、4のインデックスに増えるところを次のインデックスを0にする
// -1、+1になるところを配列のlength-1にわわせることができる
// gsap.utils.wrapのバニラ版
function wrap(current, min, max) {
  const range = max - min; // range 3

  return ((current - min) % range + range) % range + min;
}

// 最小値から最大値までのランダムな値を取得
function mapRand(min, max, isInt = false) {
  // Math.random 0 〜 1未満
  // Math.round  四捨五入
  let rand = Math.random() * (max - min) + min;
  rand = isInt ? Math.round(rand) : rand; // Math.round 四捨五入

  return rand;
}


// カウンター
function animateCounter(_counterElement, _callback){
  const counterElement = document.querySelector(_counterElement);

  let currentValue = 0;
  const updateInterval = 200;
  const maxDuration = 2000;
  const endValue = 100;
  const startTime = Date.now(); // Date.now() → 1970年1月1日00:00:00 UTC」から数えたミリ秒の経過時間
  // console.log(startTime);

  function updateCounter(){
    const elapsedTime = Date.now() - startTime;
    // console.log(elapsedTime); // 
    
    // 経過時間が2000ms未満だったらカウントを増加し続ける
    if (elapsedTime < maxDuration) {
      currentValue = Math.min(
        currentValue + Math.floor(Math.random() * 30) + 10, // 最低でも8は保証
        endValue
      );
      counterElement.textContent = currentValue;
      setTimeout(updateCounter, updateInterval);

    } else {
      // maxDuration後に行いたい処理
      counterElement.textContent = currentValue;

      setTimeout(() => {
        gsap.to(counterElement, {
          y: -20,
          duration: 1,
          ease: "power4.inOut",
          onStart: () => {
            _callback(); // 
          }
        })
      }, -500);
    }
  }

  updateCounter()

}
