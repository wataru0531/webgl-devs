

// 指定されたオブジェクトの全てのプロパティ(メソッドなど)を、プロトタイプチェーンを遡って取得する関数
// →　ただし、最後のObjectのプロパティは取得しない。
// 最終的に、指定されたオブジェクトとそのすべての親プロトタイプオブジェクトに存在するプロパティのリストを 
// Set に格納し、返します。
const getAllProperties = (object) => {
  // console.log(object); // {createPreloader: ƒ, createRenderer: ƒ, createCamera: ƒ, createScene: ƒ, createGeometry: ƒ, …}
  // → Canvasクラスのメソッドやプロパティが入る(クラスに定義したメソッドはprototypeに入る)

  const properties = new Set();
  // console.log(properties)

  // 現在のオブジェクト の プロトタイプチェーン全体 を走査する
  // do { } while { } 
  // → do...while ループ構文で、特定の処理を繰り返し実行するための制御フロー文。
  //   少なくとも1回は処理を実行し、その後にループを継続するかどうかを条件に基づいて判断する
  // 処理のフロー → ①まず、do 内のコードブロックが1回実行される
  //              ②do ブロックの後に、while の条件が評価
  //                条件が 真 (true) であれば、再び do ブロックが実行
  //                条件が 偽 (false) になるまで繰り返される
  do {
    // Reflect →　主にオブジェクトの操作を行うための静的メソッドを提供
    // Reflect.ownkeys → オブジェクトの「全てのプロパティの名前（キー）」を取得するためのメソッド
    // ⭐️プロトタイプのオブジェクトのさらにプロトタイプには遡っては取得しない
    // console.log(Reflect.ownKeys(object));
    for (const key of window.Reflect.ownKeys(object)) {
      // console.log(key); // constructor createPreloader createRenderer createCamera createScene createGeometry createMedias onResize easeInOut onTouchDown onTouchMove onTouchUp onWheel update addEventListeners
      // [プロトタイプのオブジェクト, プロパティ] という感じ
      properties.add([object, key]);
    }
    // console.log(properties); // Set(15) {Array(2), Array(2), Array(2), Array(2), Array(2), …}

    // 繰り返しの条件 → trueならdoブロックを実行
    // ①object = Reflect.getPrototypeOf(object)) → objectにプロトタイプを代入
    // ②object !== Object.prototype →　そのobjectがObject.prototypeに達したかどうかを判定
    // → objectは最上位のprototypeオブジェクトとなっているので、falseが返るので1度でループ終了

    // console.log(Reflect.getPrototypeOf(object)); // objectのさらに遡ったプロトタイプのオブジェクト
    // console.log(Object.prototype); // すべてのオブジェクトが共有する最上位のプロトタイプ
    // {__defineGetter__: ƒ, __defineSetter__: ƒ, hasOwnProperty: ƒ, __lookupGetter__: ƒ, __lookupSetter__: ƒ, …}
    // → Object.prototype のこと。これが出るまでループ継続。
  } while ((object = Reflect.getPrototypeOf(object)) && object !== Object.prototype);

  // console.log(properties); // Set(15) {Array(2), Array(2), Array(2), Array(2), Array(2), …}
                              // こんな感じ → [{createPreloader: ƒ, createRenderer: ƒ, …}, "constructor"]
  return properties;
};

// クラスのインスタンス (self) のメソッド内のthisを、自動的にそのインスタンス自身にバインドするための関数
// → メソッドがインスタンス外で呼び出されても this が適切にそのインスタンスを指すようになる
// include → バインドしたいメソッドだけを指定する。配列内に指定した名前のメソッドだけがバインドされる
//           AutoBind(instance, { include: ["sayHello", "sayGoodbye"] });
// exclude → バインドしたくないメソッドを除外する。配列内に指定した名前のメソッドをバインド対象から除外
//           AutoBind(instance, { exclude: ["initialize", "destroy"] });
// ⭐️ここでは全て通してtrueを返す。
export default function AutoBind(self, { include, exclude } = {}) {
  // console.log(self); // Canvas {images: Array(11), scroll: {…}}
  // console.log(self.constructor.prototype); // {createPreloader: ƒ, createRenderer: ƒ, createCamera: ƒ, createScene: ƒ, createGeometry: ƒ, …}
  // → selfのprototypeのObjectオブジェクト

  // key が include または exclude の条件に一致する場合に、その key が対象となるかを決める
  const filter = (key) => {
    // console.log(key); // createPreloader createRenderer createCamera createScene createGeometry createMedias onResize easeInOut onTouchDown onTouchMove onTouchUp onWheel update addEventListeners
    
    // someのコールバックに渡される。
    const match = (pattern) => { // pattern には、include/exclude の配列の要素が渡ってくる(ここでは指定なし。)
      // console.log(pattern)
      // key === patten →　key と patternが等しいか
      // patten.test(key) → patternが正規表現オブジェクトである場合に、keyがその正規表現にマッチするかどうかを判定
      return typeof pattern === "string" ? key === pattern : pattern.test(key);
    }

    if (include) {
      // some → 配列内の 少なくとも1つの要素 が指定した条件を満たしているかどうかをチェックする
      // return したらここでこのfilter関数自体が終了する
      return include.some(match);
    }

    if (exclude) {
      return !exclude.some(match);
    }

    return true;
  };

  // console.log(getAllProperties(self.constructor.prototype)); // .Set(15) {Array(2), Array(2), Array(2), Array(2), Array(2), …}
  for (const [object, key] of getAllProperties(self.constructor.prototype)) { // selfのプロトタイプのオブジェクト
    // console.log(object, key); // objectのプロトタイプオブジェクトと、プロパティ名

    // keyがconstructor、
    // console.log(filter(key)); // 全てtrueが返る
    if (key === "constructor" || !filter(key)) {
      // console.log("continue"); // constructorのみ通す

      // return; // returnはもうここでこのfor文自体が終わる
      continue; // ループ内で現在の反復処理をスキップし、次の反復処理に移る
    }

    const descriptor = Reflect.getOwnPropertyDescriptor(object, key);
    // console.log(descriptor); // { writable: true, enumerable: false, configurable: true, value: ƒ }
    if (descriptor && typeof descriptor.value === "function") {
      // 各メソッドをバインドする
      self[key] = self[key].bind(self);
      // Canvas[createPreloader] = Canvas[createPreloader].bind(Canvas)
      // → このような形で、createPreloader()を実行すれば、createPreloaderの中のthis.は全てCanvasを参照する
    }
  }

  return self;
}
