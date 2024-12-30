
// テクスチャのキャッシュを作る仕組み
// → this.assetsに、画像名: Texture の形をつくる

import { Texture } from 'ogl';

class LoaderManager {
  constructor() {
    // この中に、画像名: Texture を格納していく
    this.assets = {} 
  }

  // this.assets → 画像名: Texture を格納
  // {image_0: Texture, image_1: Texture, image_2: Texture, image_3: Texture, image_4: Texture, …}
  get(_name) {
    return this.assets[_name];
  }

  // データから、画像名と画像urlを取得して、loadTextureを発火
  // → loadTexture ... 画像名: Texture として紐づけて、this.assetsに保存

  // _data → 画像の名前、画像のパスのオブジェクトの配列
  //         [{ name: `image_${this.#index}`, texture: `./img/${this.#src}`}]
  // _gl → ブラウザで3Dや2Dのグラフィックスを描画するためのAPI
  //       WebGLの描画機能にアクセスするためのもの
  load(_data, _gl) {
    // この場合は波括弧は必要ない。Promiseオブジェクトがreturnされる
    return new Promise((resolve) => {
      const promises = [];

      for (let i = 0; i < _data.length; i++) {
        const { textureName, textureUrl } = _data[i]

        if (textureUrl && !this.assets[textureName]) {
          promises.push(this.loadTexture(textureUrl, textureName, _gl)); // テクスチャをロード
        }
      }

      Promise.all(promises).then((_el) => {
        // console.log(_el); // [img]
        resolve(_el)
      });
    });
  }

  // テクスチャを生成し、画像名: Texture として紐づけて、assetsに保存
  // それが完了したら、生成した画像を返す
  loadTexture(_textureUrl, _textureName, _gl) {
    // 同じ名前のテクスチャが格納されないようにする
    if (!this.assets[_textureName]) {
      this.assets[_textureName] = {}
    }

    return new Promise(resolve => {
      const image = new Image()
      const texture = new Texture(_gl);
      // console.log(texture); // Texture {gl: WebGL2RenderingContext, id: 1, image: undefined, target: 3553, type: 5121, …}

      image.onload = () => { // image.srcで画像の読み込みが完了したら発火する
        texture.image = image
        // console.log(texture); // Texture {gl: WebGL2RenderingContext, id: 1, image: img, target: 3553, type: 5121, …}
        this.assets[_textureName] = texture;
        // console.log(this.assets); // {image_0: Texture, image_1: Texture, image_2: Texture, image_3: Texture, image_4: Texture, …}
        
        resolve(image);
      }
      image.src = _textureUrl;
    })
  }
}

export default new LoaderManager()
