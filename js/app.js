// Tabs, keys, and the single animation frame. GL, camera, maps, and
// flyerModels are already global. This file does not resize via
// updateCanvasDimensions or draw a 2D scene.

let startTime = performance.now();

const DEFAULT_LIGHT = [0.5, 1.0, 0.3];
const FLYER_GRAY = [0.62, 0.62, 0.62];
const FLYER_BLUE = [0.25, 0.45, 0.95];

function showScene(id) {
  document.querySelectorAll('.scene').forEach((panel) => {
    panel.classList.remove('active');
  });
  const panel = document.getElementById('scene-' + id);
  if (panel) panel.classList.add('active');
  buildLevel(id);
}

function levelOrbits(level) {
  return level === '1d' || level === '2' || level === '3' || level === '4';
}

function cubeModel(cube) {
  const xz = cube.xz || 1;
  return multiply(
    translation(cube.x, 0, cube.z),
    scaling(xz, cube.height, xz),
  );
}

function frame(time) {
  const seconds = (time - startTime) / 1000;

  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const aspect = canvas.width / canvas.height;
  const projection = perspective(Math.PI / 4, aspect, 0.1, 400);
  const eye = levelOrbits(currentLevel) ? orbitEye(seconds) : staticEye();
  const view = lookAt(eye, LOOK_AT, UP);

  const usesVertexColor = currentLevel === '1c' || currentLevel === '1d';

  if (usesVertexColor) {
    bindVertexProgram();
    gl.uniformMatrix4fv(uProjectionVertex, false, projection);
    gl.uniformMatrix4fv(uViewVertex, false, view);
    gl.uniform3fv(uLightVertex, DEFAULT_LIGHT);
  } else {
    bindSolidProgram();
    gl.uniformMatrix4fv(uProjectionSolid, false, projection);
    gl.uniformMatrix4fv(uViewSolid, false, view);
    gl.uniform3fv(uLightSolid, DEFAULT_LIGHT);
  }

  if (currentLevel === '0') {
    drawSolidCube(multiply(translation(0, 0, 0), scaling(2, 2, 2)), [1, 1, 1]);
  } else if (usesVertexColor) {
    for (const cube of cubes) {
      drawVertexCube(cubeModel(cube));
    }
  } else {
    for (const cube of cubes) {
      drawSolidCube(cubeModel(cube), cube.color);
    }
  }

  if (currentLevel === '3' || currentLevel === '4') {
    const flyer = flyerModels(seconds);
    bindSolidProgram();
    gl.uniformMatrix4fv(uProjectionSolid, false, projection);
    gl.uniformMatrix4fv(uViewSolid, false, view);
    gl.uniform3fv(uLightSolid, DEFAULT_LIGHT);
    drawSolidCube(flyer.body, FLYER_GRAY);
    drawSolidCube(flyer.satellites[0], FLYER_BLUE);
    drawSolidCube(flyer.satellites[1], FLYER_BLUE);
  }

  requestAnimationFrame(frame);
}

document.addEventListener('keydown', (event) => {
  switch (event.key) {
    case '0':
      showScene('0');
      break;
    case '1':
    case 'a':
    case 'A':
      showScene('1a');
      break;
    case 'b':
    case 'B':
      showScene('1b');
      break;
    case 'c':
    case 'C':
      showScene('1c');
      break;
    case 'd':
    case 'D':
      showScene('1d');
      break;
    case '2':
      showScene('2');
      break;
    case '3':
      showScene('3');
      break;
    case '4':
      showScene('4');
      break;
    case 'r':
    case 'R':
      startTime = performance.now();
      break;
    default:
      break;
  }
});

document.querySelectorAll('[data-level]').forEach((button) => {
  button.addEventListener('click', () => {
    showScene(button.dataset.level);
  });
});

document.querySelectorAll('[data-grid]').forEach((button) => {
  button.addEventListener('click', () => {
    currentGrid = Number(button.dataset.grid);
    buildLevel(currentLevel);
  });
});

loadMaps(() => {
  if (currentLevel === '2' || currentLevel === '3' || currentLevel === '4') {
    buildLevel(currentLevel);
  }
});

showScene('0');
requestAnimationFrame(frame);
