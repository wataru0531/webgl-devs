/**************************************************************

A SICK Distorted Image Gallery That Comes Alive With Every Move (WebGL/Shaders)
https://www.youtube.com/watch?v=ALSLgjLxyKI

// GSAPライブラリ
https://cdnjs.com/libraries/gsap

gsap easings  https://gsap.com/docs/v3/Eases/

***************************************************************/
// "数値" 指定時間後にトゥイーン。タイムラインの先頭からの時間（秒）で開始
// "+=1"  直前のトゥイーンの終了後に何秒だけ離すか delay: 1 と同じ
// "-=1"  直前のトゥイーンの終了に何秒だけ重ねるか delay: -1　と同じ

// ">"    直前のトゥイーンの終了時
// ">3"   直前のトゥイーンの終了後に何秒だけ離すか。3秒後にトゥイーンする
// "<"    直前のトゥイーンの開始時
// "<4"   直前のトゥイーンの開始時の何秒後か。4秒後にトゥイーン

// "ラベル名"  指定したラベルと同じタイミングでトゥイーン
// "ラベル名 += 数値"
// "ラベル名 -= 数値"

// stagger... each   ... デフォルト、1つ１つの要素に効く
//            amount ... 全体で何秒か

// Custom ease の使用例
// gsap.registerPlugin(CustomEase)
// CustomEase.create(
//   "hop",
//   "M0,0 C0,0 0.056,0.442 0.175,0.442 0.294,0.442 0.332,0 0.332,0 0.332,0 0.414,1 0.671,1 0.991,1 1,0 1,0"
// );

// //now you can reference the ease by ID (as a string):
// gsap.to(element, { duration: 1, y: -100, ease: "hop" });

import { utils } from "./utils.js";

const container = document.querySelector(".container");

let program;
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let targetMouseX = mouseX;
let targetMouseY = mouseY;

let texture = null;

let targetX = 0;
let targetY = 0;
let currentX = 0;
let currentY = 0;

// 第１引数 → 長さが25の空の配列を生成
// 第２引数のコールバック →　各要素をどのように生成するかを定義
const imgSources = Array.from({ length: 25 }, (_, idx) => `../images/${idx + 1}.avif`);
// console.log(imgSource);

function getRandomImage(){
  // floor 少数切り捨て
  // Math.floor  0（ゼロ）以上で、1未満 の浮動小数点数を生成。1は入らない
  return imgSources[Math.floor(Math.random() * imgSources.length)];
}

async function createImageGrid(){
  for(let i = 0; i < 300; i++){
    const wrapper = document.createElement("div");
    wrapper.className = "img-wrapper";

    // const img = document.createElement("img");
    // img.src = getRandomImage();
    // img.alt = "grid item";

    const imgSrc = getRandomImage();
    const imgAlt = "grid item";

    const img = await utils.loadImage(imgSrc, imgAlt);
    // console.log(img);

    wrapper.appendChild(img);
    container.appendChild(wrapper);
  }
}
// createImageGrid()

function updatePan(_mouseX, _mouseY){
  const maxX = container.offsetWidth - window.innerWidth;
  const maxY = container.offsetHeight - window.innerHeight;
  // console.log(`x: ${maxX}, y: ${maxY}`); // x: 800, y: 1088

  targetX = -((_mouseX / window.innerWidth) * maxX * .75);
  targetY = -((_mouseY / window.innerHeight) * maxY * .75);
}
// updatePan();

function animatePan(){
  const ease = .035;
  
  currentX += (targetX - currentX) * ease;
  currentY += (targetY - currentY) * ease;

  container.style.transform = `translate(${currentX}px, ${currentY}px)`;
  requestAnimationFrame(animatePan);
}

const canvas = document.querySelector("canvas");
// console.log(canvas)

const gl = canvas.getContext("webgl", {
  preserveDrawingBuffer: false,
  antialias: true,
  alpha: true,

});

function setupWebGL(){
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

function createShader(type, source){
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
    console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);

    return null;
  }

  // console.log(shader)
  return shader;
}

async function loadShaders(){
  try {
    const [ vertexResponse, fragmentResponse ] = await Promise.all([
      fetch("/js/shaders/vertex.glsl"),
      fetch("/js/shaders/fragment.glsl"),
    ]);

    const vertexSource = await vertexResponse.text();
    const fragmentSource = await fragmentResponse.text();
    // console.log(vertexSource, fragmentSource); // 文字列で出力される

    return { vertexSource, fragmentSource }
  } catch(error){
    console.log("Error loading Shades: ", error);
    throw error;
  }
}

async function initWebGL(){
  setupWebGL();

  const { vertexSource, fragmentSource } = await loadShaders();
  // console.log(vertexSource);
  const vertexShader = createShader(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);

  program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.useProgram(program);

  const vertices = new Float32Array([
    -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0
  ]);

  const vertexBuffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const positionLocation = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  const iChannel0Location = gl.getUniformLocation(program, "iChannel0");
  gl.uniform1i(iChannel0Location, 0);
}

// initWebGL()


function updateTexture(){
  const tempCanvas = document.createElement("canvas");
  const scale = 4;
  tempCanvas.width = Math.floor(window.innerWidth * scale);
  tempCanvas.height = Math.floor(window.innerHeight * scale);

  const tempCtx = tempCanvas.getContext("2d");

  tempCtx.imageSmoothingEnabled = true;
  tempCtx.imageSmoothingQuality = "high";
  tempCtx.fillStyle = "white";
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  const viewportRect = container.getBoundingClientRect();
  const matrix = new DOMMatrix(getComputedStyle(container).transform);

  tempCtx.setTransform(
    matrix.a,
    matrix.b,
    matrix.c,
    matrix.d,
    matrix.e * scale,
    matrix.f * scale
  );

  const images = container.getElementsByTagName("img");
  // console.log(images);

  for(let img of images){
    const rect = img.getBoundingClientRect();
    const parent = img.parentElement.getBoundingClientRect();
    
    tempCtx.drawImage(
      img,
      (parent.left - viewportRect.left) * scale,
      (parent.top - viewportRect.top) * scale,
      parent.width * scale,
      parent.height * scale
    );
  }

  tempCtx.setTransform(1, 0, 0, 1, 0, 0);

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    tempCanvas
  );

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}
// updateTexture()


function render(){
  const ease = .1;

  mouseX += (targetMouseX - mouseX) * ease;
  mouseY += (targetMouseY - mouseY) * ease;

  canvas.width = window.innerWidth;
  canvas.heigh = window.innerHeight;
  
  gl.viewport(0, 0, canvas.width, canvas.height);
  
  updateTexture();

  const resolutionLocation = gl.getUniformLocation(program, "iResolution");
  const mouseLocation = gl.getUniformLocation(program, "iMouse");

  gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
  gl.uniform2f(mouseLocation, mouseX, canvas.height - mouseY);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(render);
}

function setupEventListeners(){
  document.addEventListener("mousemove", ({ clientX, clientY }) => {
    // console.log("mousemove running!!")
    targetMouseX = clientX;
    targetMouseY = clientY;
    
    updatePan(clientX, clientY);
  });

  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    targetMouseX = window.innerWidth / 2;
    targetMouseY = window.innerHeight / 2;

    mouseX = targetMouseX;
    mouseY = targetMouseY;

    targetX = 0;
    targetY = 0;
    currentX = 0;
    currentY = 0;
  });
}

async function init(){
  await createImageGrid();

  const firstImage = container.querySelector("img");
  // console.log(firstImage);
  // console.dir(firstImage.complete);

  // 画像が完全に読み込まれているかどうかを確認
  await new Promise(resolve => {
    if(firstImage.complete){
      // complete　... 以下の時に読み込まれたら発火
      //               同期的に読み込まれたかを確認する(即座に状態(true/false))を返す
      // ・画像が完全に読み込まれた後。
      // ・画像の読み込みが明示的にキャンセルされた後。
      // ・キャッシュにすでに画像がある場合（再度の読み込みが不要な場合）

      // 注意: onloadは非同期的に読み込みが完了したタイミングで発火
      //       → 非同期的（画像読み込みが終わったときに発火）

      resolve();
    } else {
      firstImage.onload = resolve;
    }
  });

  await initWebGL();

  setupEventListeners();
  animatePan();
  render();
}

init();