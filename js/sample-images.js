// Level 2 sampler. Hidden 2D canvas, drawImage, getImageData (W3Schools pattern).
// Paths are relative to first-run/index.html. SPACING comes from gl-core.js.

let mapsReady = false;
let changeMapReady = false;
let colorImageData = null;
let changeColorImageData = null;
let heightImageData = null;
let heightGray = null;
let heightGrayWidth = 0;
let heightGrayHeight = 0;

const HEIGHT_BLUR_RADIUS = 16;
const HEIGHT_BLUR_PASSES = 3;

function loadMaps(onReady) {
  const colorImage = new Image();
  const heightImage = new Image();
  const changeImage = new Image();
  let colorData = null;
  let heightData = null;
  let changeData = null;
  let pending = 3;
  let coreFailed = false;

  function finishOne() {
    pending -= 1;
    if (pending !== 0) return;
    if (!coreFailed && colorData && heightData) {
      colorImageData = colorData;
      heightImageData = heightData;
      mapsReady = true;
    }
    if (changeData) {
      changeColorImageData = changeData;
      changeMapReady = true;
    }
    if (typeof onReady === "function") onReady();
  }

  colorImage.onload = function () {
    try {
      colorData = readPixels(colorImage);
    } catch (err) {
      coreFailed = true;
      mapsReady = false;
    }
    finishOne();
  };

  heightImage.onload = function () {
    try {
      heightData = readPixels(heightImage);
      const gray = grayFromImageData(heightData);
      for (let pass = 0; pass < HEIGHT_BLUR_PASSES; pass++) {
        boxBlurGray(gray, heightData.width, heightData.height, HEIGHT_BLUR_RADIUS);
      }
      heightGray = gray;
      heightGrayWidth = heightData.width;
      heightGrayHeight = heightData.height;
    } catch (err) {
      coreFailed = true;
      mapsReady = false;
    }
    finishOne();
  };

  changeImage.onload = function () {
    try {
      changeData = readPixels(changeImage);
    } catch (err) {
      changeMapReady = false;
    }
    finishOne();
  };

  colorImage.onerror = function () {
    coreFailed = true;
    mapsReady = false;
    finishOne();
  };

  heightImage.onerror = function () {
    coreFailed = true;
    mapsReady = false;
    finishOne();
  };

  changeImage.onerror = function () {
    changeMapReady = false;
    finishOne();
  };

  colorImage.src = "images/ColorMap.png";
  heightImage.src = "images/HeightMap.png";
  changeImage.src = "images/Change_UP_ColorMap.png";
}

// Off-DOM canvas so the page never shows it. Same drawImage / getImageData steps
// as the W3Schools canvas getImageData example.
function readPixels(image) {
  const pixelCanvas = document.createElement("canvas");
  pixelCanvas.width = image.width;
  pixelCanvas.height = image.height;
  const ctx = pixelCanvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, pixelCanvas.width, pixelCanvas.height);
}

// col and row are grid indices, not world x/z.
function texel(imageData, col, row, gridSize) {
  const px = Math.min(imageData.width - 1, Math.floor((col + 0.5) / gridSize * imageData.width));
  const py = Math.min(imageData.height - 1, Math.floor((row + 0.5) / gridSize * imageData.height));
  const i = (py * imageData.width + px) * 4;
  const d = imageData.data;
  return [d[i], d[i + 1], d[i + 2]];
}

// Mean of (r+g+b)/3. The ImageData stays as loaded; only this copy is blurred.
function grayFromImageData(imageData) {
  const src = imageData.data;
  const gray = new Float32Array(imageData.width * imageData.height);
  for (let i = 0, p = 0; i < src.length; i += 4, p++) {
    gray[p] = (src[i] + src[i + 1] + src[i + 2]) / 3;
  }
  return gray;
}

// One separable box pass. Samples past the edge repeat the edge pixel.
function boxBlurGray(gray, width, height, radius) {
  const tmp = new Float32Array(gray.length);
  const windowSize = radius * 2 + 1;
  const prefix = new Float32Array(Math.max(width, height) + 1);

  for (let y = 0; y < height; y++) {
    const row = y * width;
    prefix[0] = 0;
    for (let x = 0; x < width; x++) prefix[x + 1] = prefix[x] + gray[row + x];
    for (let x = 0; x < width; x++) {
      let left = x - radius;
      let right = x + radius;
      let sum = 0;
      if (left < 0) {
        sum += gray[row] * -left;
        left = 0;
      }
      if (right >= width) {
        sum += gray[row + width - 1] * (right - width + 1);
        right = width - 1;
      }
      sum += prefix[right + 1] - prefix[left];
      tmp[row + x] = sum / windowSize;
    }
  }

  for (let x = 0; x < width; x++) {
    prefix[0] = 0;
    for (let y = 0; y < height; y++) prefix[y + 1] = prefix[y] + tmp[y * width + x];
    for (let y = 0; y < height; y++) {
      let top = y - radius;
      let bottom = y + radius;
      let sum = 0;
      if (top < 0) {
        sum += tmp[x] * -top;
        top = 0;
      }
      if (bottom >= height) {
        sum += tmp[(height - 1) * width + x] * (bottom - height + 1);
        bottom = height - 1;
      }
      sum += prefix[bottom + 1] - prefix[top];
      gray[y * width + x] = sum / windowSize;
    }
  }
}

// Same cell center as texel, read from the blurred gray copy.
function grayAtCell(col, row, gridSize) {
  const px = Math.min(heightGrayWidth - 1, Math.floor((col + 0.5) / gridSize * heightGrayWidth));
  const py = Math.min(heightGrayHeight - 1, Math.floor((row + 0.5) / gridSize * heightGrayHeight));
  return heightGray[py * heightGrayWidth + px];
}

function heightAtWorld(x, z, gridSize) {
  if (!mapsReady || !heightGray) return 0.15;
  const cell = TERRAIN_SPAN / gridSize;
  const col = Math.max(0, Math.min(gridSize - 1, Math.round(x / cell + (gridSize - 1) / 2)));
  const row = Math.max(0, Math.min(gridSize - 1, Math.round(z / cell + (gridSize - 1) / 2)));
  const gray = grayAtCell(col, row, gridSize);
  return 0.15 + (gray / 255) * (5 - 0.15);
}

function colorAtCell(col, row, gridSize) {
  const rgb = texel(colorImageData, col, row, gridSize);
  return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
}

function changeColorAtCell(col, row, gridSize) {
  const rgb = texel(changeColorImageData, col, row, gridSize);
  return [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
}
