
// GPUを利用した計算(GPGPU: General Purpose GPU Computing)を行うためのシステムを構築
// GPGPUを使う目的
// → 物理シミュレーションやパーティクルシステムのような重い計算をGPU上で並列処理できるようになる

// ・仕組み
// テクスチャ内の各ピクセルに計算対象のデータ(例えば、位置や速度)を格納
// → ピクセルごとのデータが独立しているため、大量のデータを並列に処理できる

// フラグメントシェーダーを計算ロジックとして使用
// → GLSLコードで計算ロジックを記述し、それをテクスチャに適用します。
// 　フレーム毎に新しいテクスチャが生成され、データが更新されます。

// ・依存関係を管理
// → 変数（データ）間の依存関係を管理することで、連続的な計算処理を実現

// 処理の流れ
// ・this.gpgpuRendererを生成
// ・this.dataTextureに空の仮のテクスチャを生成
// ・this.variableにuGridの仮のテクスチャを生成、変数を定義
// ・this.gpgpuRendererを初期化する
// ・this.gpgpuRenderer.compute()で処理を開始して、fragment.glslにdataTextureを流し込んでいく
// ・

import {
  WebGLRenderer,
  Scene,
  DataTexture, // 
  Mesh,
  Uniform,
  Texture,
  Vector2,
  PlaneGeometry,
  MeshBasicMaterial,
} from 'three';
import { GPUComputationRenderer, Variable } from 'three/addons/misc/GPUComputationRenderer.js'
import GUI from 'lil-gui';

import { Size } from '../types/types'
import { min } from 'three/webgpu';

import fragmentShader from '../shaders/gpgpu/gpgpu.glsl'


// TypeScriptの特性でクラスは型として扱える
interface Props {
  renderer: WebGLRenderer
  scene: Scene
  sizes: Size // canvasのサイズ。型 { width: number height: number }
  debug: GUI
}

interface Params {
  relaxation: number
  size: number
  distance: number
  strength: number
}


export default class GPGPU {
  time: number
  size: number
  sizes: Size  // canvasのサイズ
  gpgpuRenderer: GPUComputationRenderer // WebGL を使って、GPU 上でカスタムシェーダーによる計算を行う
                                        // → GPUを使った汎用計算をサポートするツール
  renderer: WebGLRenderer
  dataTexture: DataTexture // データを格納するための2Dテクスチャを作成。this.gpgpuRenderer.createTexture()で生成
  variable: Variable //  GPGPU計算に使用する変数。uniformで渡す
  targetVariable: Variable
  debugPlane: Mesh
  scene: Scene
  params: Params
  debug: GUI

  constructor({ renderer, scene, sizes, debug }: Props) {
    this.scene = scene
    this.renderer = renderer
    this.sizes = sizes // canvasのサイズ。型 { width: number height: number }
    this.debug = debug

    this.params = {
      relaxation: 0.965,
      size: 700, // 処理するデータの総数(700個)
      distance: 0.8,
      strength: 0.8,
    }

    // データを格納する正方形グリッドの1辺のサイズ。ここでは27とする
    // Math.ceil 切り上げ
    // Math.sqrt √。ここでは√700
    this.size = Math.ceil(Math.sqrt(this.params.size)); 
    // console.log(this.size); // 27
    this.time = 0

    this.createGPGPURenderer()
    this.createDataTexture() // データを格納するための2Dテクスチャを作成
    this.createVariable() // フラグメントシェーダーと初期テクスチャを基に、新しい「計算用変数」を作成します。
    this.setRendererDependencies() // 変数が他の変数に依存している場合、その関係を設定
    this.initiateRenderer()
    //this.createDebugPlane()
    this.setupDebug()
  }

  // GPGPU計算のための専用レンダラーの初期化
  createGPGPURenderer() {
    // console.log(this.size); // 27

    // this.size → GPGPU計算用のテクスチャ(データ格納用の2Dグリッド)の解像度を指定
    //             this.size = 27 なら、27 × 27 = 729 個のデータが計算対象になる
    // this.renderer → 共通のこのrendererは、Three.jsのレンダリングシステムを担当しており、
    //                 GPUComputationRenderer もこれを利用して GPU計算を実行する
    //                 これにより、Three.js のシーンと計算結果が連携可能になる
    this.gpgpuRenderer = new GPUComputationRenderer(this.size, this.size, this.renderer)
  }

  // GPGPUの計算に使用するデータを格納するためのテクスチャを作成
  // この時点で生成されるthis.dataTextureはまだ仮のテクスチャなので実際の計算データは含まれていない
  createDataTexture() {
    // グリッド上の各ピクセルが数値データ(例えば、位置や速度)を表す特殊なテクスチャ
    this.dataTexture = this.gpgpuRenderer.createTexture()
  }


  // GPGPU計算に使用する変数(this.variable)を初期化および設定
  createVariable() {
    // console.log(new Vector2(0, 0)); // _Vector2 {x: 0, y: 0}
    // gpgpuRenderer.addVariable → gpgpuRendererによって管理され、GPGPU 計算で使用される主要なデータの格納先

    // uGrid → シェーダー内で使用する変数の名
    // fragmentShader → GLSLコード。変数を用いて実際の計算を行う内容を記述
    // dataTexture → createDataTexture()で生成された仮のテクスチャ             
    this.variable = this.gpgpuRenderer.addVariable('uGrid', fragmentShader, this.dataTexture);


    // GLSLのシェーダー内で使用するuniformを初期化 → 紐づけることでglslの中で使えるようになる
    this.variable.material.uniforms.uTime = new Uniform(0)
    this.variable.material.uniforms.uRelaxation = new Uniform(this.params.relaxation)
    this.variable.material.uniforms.uGridSize = new Uniform(this.size)
    this.variable.material.uniforms.uMouse = new Uniform(new Vector2(0, 0))
    this.variable.material.uniforms.uDeltaMouse = new Uniform(new Vector2(0, 0))
    this.variable.material.uniforms.uMouseMove = new Uniform(0)
    this.variable.material.uniforms.uDistance = new Uniform(this.params.distance * 10); // distance: .6

    // console.log(this.variable); // {name: 'uGrid', initialValueTexture: DataTexture, material: ShaderMaterial, dependencies: null, renderTargets: Array(0), …}
  }

  // GPUComputationRenderer において、変数（this.variable）の依存関係を設定する
  // → 指定した変数が他のどの変数に依存しているかを設定
  //   第1引数：依存関係を設定する対象の変数
  //   第2引数：その変数が依存している変数のリスト(配列)
  // → this.variable(uGrid)がフレーム間で連続的に更新される必要があることをGPUComputationRendererに伝えている
  setRendererDependencies() {
    this.gpgpuRenderer.setVariableDependencies(this.variable, [this.variable])
  }

  initiateRenderer() {
    this.gpgpuRenderer.init() // GPUComputationRendererの初期化
  }

  // mediaのonMouseMoveで発火 → CanvasのonMouseMoveで発火。レイキャスティングの対象のuvを拾って渡す
  // → this.gpgpu.updateMouse(uv); 
  updateMouse(_uv: Vector2) {
    this.variable.material.uniforms.uMouseMove.value = 1
    // console.log( this.variable.material.uniforms.uMouseMove.value); // 1

    const current = this.variable.material.uniforms.uMouse.value as Vector2;
    // console.log(current); // 左下が(0, 0)、右上が(1, 1)

    // マウスの移動量(前回の位置から今回の位置までの変化量)を取得
    // subVectors → 2つのベクトルの減算を計算するために使用
    //              第１引数から第２引数を引く
    const d = current.subVectors(_uv, current);
    // console.log(d); // このdは検証用で後には使わない

    // currentの値をスカラー倍して、GPGPUの計算においてマウスの動きがより目立つようにする
    // multiplyScalar → current(ベクトル)のすべての成分(x, y)にスカラー値を掛けるメソッド
    const m = current.multiplyScalar(this.params.strength * 100); // this.params.strength: .8
    // console.log(m); // このmは検証用で後には使わない

    this.variable.material.uniforms.uDeltaMouse.value = current
    this.variable.material.uniforms.uMouse.value = _uv
  }

  // GPGPU計算の結果として生成されたテクスチャデータを取得 → mediasのrenderで取得
  getTexture() {
    // 現在の計算結果が格納された「レンダーターゲット（RenderTarget）」を取得
    return this.gpgpuRenderer.getCurrentRenderTarget(this.variable).textures[0]
  }

  // デバッグ
  setupDebug() {
    this.debug.add(this.params, 'relaxation').min(0.5).max(0.99).step(0.001).onChange((_: number) => {
        this.variable.material.uniforms.uRelaxation.value = _
    });

    this.debug.add(this.params, 'distance').min(0).max(1).step(0.001).onChange((_: number) => {
        this.variable.material.uniforms.uDistance.value = _ * 10
    });

    this.debug.add(this.params, 'strength').min(0).max(1).step(0.001)
  }

  // madia.tsでレンダリング
  // これでテクスチャが生成されて、variableのuGridにテクスチャを格納
  // glslの処理に移る
  // そして、この結果をmedia.tsで、getTexture()をして、テクスチャとして受け取る

  render(time: number, deltaTime: number) {// 経過時間、差分(浮動小数で大体一定の値)
    this.time = time

    this.variable.material.uniforms.uTime.value = this.time;
    this.variable.material.uniforms.uMouseMove.value *= 0.95;
    this.variable.material.uniforms.uDeltaMouse.value.multiplyScalar(this.variable.material.uniforms.uRelaxation.value);

    // GPGPU計算の処理を実行 
    // → .compute()を呼び出すたびに、計算が進み、状態が更新される
    this.gpgpuRenderer.compute();
  }

  // createDebugPlane() {
  //   this.debugPlane = new Mesh(
  //     new PlaneGeometry(1, 1),
  //     new MeshBasicMaterial({
  //       map: this.gpgpuRenderer.getCurrentRenderTarget(this.variable).texture,
  //     })
  //   )

  //   this.debugPlane.scale.set(8, 8, 1)
  //   //this.debugPlane.position.set(-4, 4, 0)

  //   this.scene.add(this.debugPlane)
  // }
}
