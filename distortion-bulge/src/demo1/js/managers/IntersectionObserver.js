
// IntersectionObserverの処理
// 初期化した状態でexport

class IntersectObserver {
  // クラスフィールドとして宣言しておく
  // → 「このクラスがどのようなプロパティを持つのか」を簡単に把握できる。
  //    特に、クラスが大きくなると constructorだけでは全てのプロパティを見つけるのが
  //    難しくなる場合があるので記述することにメリットがある
  entries = {}
  observer

  constructor() {
    this.observer = new IntersectionObserver(this.onElementObserved, {
      threshold: 0.0,
    })
  }

  // コールバック
  onElementObserved = (entries) => {
    // console.log(entries); //(6) [IntersectionObserverEntry, IntersectionObserverEntry, IntersectionObserverEntry, IntersectionObserverEntry, IntersectionObserverEntry, IntersectionObserverEntry]

    entries.forEach((_entry) => {
      // console.log(_entry)
      const id = _entry.target.dataset.intersectId; //  監視対象の要素に割り振られるId

      if (id && this.entries[id]) {
        if (_entry.isIntersecting) {
          this.entries[id].methodIn(_entry); // show
        } else {
          this.entries[id].methodOut(_entry) // hide
        }
      }
    })
  }

  // 監視対処を決定 Card.jsで発火
  // _idx ... 各画像のインデックス
  // _el  ... canvas
  // 
  observe(_idx, _el, methodIn, methodOut) {
    // 監視対象のentriesに、{ canvas, this.show, this.hide} を格納
    this.entries[_idx] = { _el, methodIn, methodOut }
    // console.log(this.entries); // {0: {…}, 1: {…}, 2: {…}, 3: {…}, 4: {…}, 5: {…}}
                               // { _el: canvas.card__canvas, methodIn: ƒ, methodOut: ƒ}
    this.observer.observe(_el)
  }

  unobserve(_idx, el) {
    this.observer.unobserve(el)
    delete this.entries[_idx]
  }

  
}

export default new IntersectObserver()
