/**************************************************************

DOM操作ヘルパー( DOMApi )

***************************************************************/

const INode = {
  qs(selector, scope) {  // querySelector(セレクタ文字列, DOM)
    return (scope || document).querySelector(selector);
  },

  qsAll(selector, scope) { // querySelectorAll
    const els = (scope || document).querySelectorAll(selector);
    return Array.from(els);
  },

  // HTML文字列をDOM要素に変換。"hello"などの文字列ではない
  // → "<p>Hello, World!</p>" をDOMにする
  htmlToEl(htmlStr) {
    const div = document.createElement("div");
    div.innerHTML = htmlStr;
    return div.firstElementChild;
  },

  // targetがDOMかどうか判定。セレクタ文字列だったらfalseを返す
  // element  ... querySelectorで取得してきたDOM など
  // selector ... #canvas、.canvasなど、CSSで指定するものをセレクタ。ただの文字列
  isElement(target) {
    // console.log(target instanceof Element)
    return target instanceof Element;
  },

  // DOMだったらDOMを返し、selector文字列だったらDOMにして返す
  getElement(elementOrSelector) {
    return this.isElement(elementOrSelector) ? elementOrSelector : this.qs(elementOrSelector);
  },

  getRect(el) { // DOMRectオブジェクトを返却
    el = this.getElement(el);
    return el.getBoundingClientRect();
  },

  // データセットを渡されたkey情報をもとにして、data-webの値を取得
  // 例　INode.getDS(el, "webgl");
  getDS(elementOrSelector, key) {
    const el = this.getElement(elementOrSelector);
    // console.log(el);
    // console.log(el.dataset?.[key]);

    return el.dataset?.[key];
  },

  // 指定された要素が特定のdata-属性を持っているかどうかを判定
  // hasDS(el, 'webgl'); → data-webgl のwebglを持っているかどうか
  hasDS(el, key) {
    el = this.getElement(el);
    return key in el?.dataset;
  },

  getById(_id){
    return document.getElementById(_id);
  },

  createElement(_tagName){
    return document.createElement(_tagName);
  }
};

export { INode };
