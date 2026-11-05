// Cube lists for each tab. SPACING, colorAtCell, changeColorAtCell,
// heightImageData, mapsReady, and changeMapReady come from earlier
// scripts. 1b, 1c, and 1d share one random list per grid size. Candy
// terrain and the Level 4 recolor are cached apart, so a grid change
// on one does not repaint the other.

let currentLevel = null;
let currentGrid = 64;
let cubes = [];

const familyGrid = {
  flat: 64,
  random: 64,
  terrain: 64,
  terrainFine: 64,
};

const cubeCache = {};

function familyOf(id) {
  if (id === '1a') return 'flat';
  if (id === '1b' || id === '1c' || id === '1d') return 'random';
  if (id === '2') return 'terrain';
  if (id === '3' || id === '4') return 'terrainFine';
  return 'none';
}

// Resolution buttons write currentGrid, then call buildLevel for the
// same level, so the new size sticks on that family. A tab in another
// family restores the size last used there.
function syncGrid(id) {
  const family = familyOf(id);
  if (family === 'none') return;
  if (family === familyOf(currentLevel)) {
    familyGrid[family] = Number(currentGrid);
  }
  currentGrid = familyGrid[family];
}

function gridRecords(gridSize, makeCube, step) {
  const spacing = step === undefined ? SPACING : step;
  const list = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const cube = makeCube(col, row);
      const record = {
        x: (col - (gridSize - 1) / 2) * spacing,
        z: (row - (gridSize - 1) / 2) * spacing,
        height: cube.height,
        color: cube.color,
      };
      if (cube.xz) record.xz = cube.xz;
      list.push(record);
    }
  }
  return list;
}

// Level 1 keeps the cell pitch and draws a narrower cube, so neighbors
// do not share a face. Terrain levels stay flush.
const LEVEL1_FILL = 0.72;

function flatCubes(gridSize) {
  const cell = TERRAIN_SPAN / gridSize;
  return gridRecords(gridSize, () => ({
    height: 1,
    color: [0.75, 0.75, 0.75],
    xz: cell * LEVEL1_FILL,
  }), cell);
}

function randomCubes(gridSize) {
  const key = 'random:' + gridSize;
  if (cubeCache[key]) return cubeCache[key];
  const cell = TERRAIN_SPAN / gridSize;
  const list = gridRecords(gridSize, () => ({
    height: 0.5 + Math.random() * 4,
    color: [0.75, 0.75, 0.75],
    xz: cell * LEVEL1_FILL,
  }), cell);
  cubeCache[key] = list;
  return list;
}

function terrainCubes(gridSize, colorFn, cachePrefix) {
  const key = cachePrefix + ':' + gridSize;
  if (cubeCache[key]) return cubeCache[key];
  const cell = TERRAIN_SPAN / gridSize;
  const list = gridRecords(gridSize, (col, row) => {
    const gray = grayAtCell(col, row, gridSize);
    return {
      height: 0.15 + (gray / 255) * (5 - 0.15),
      color: colorFn(col, row, gridSize),
      xz: cell,
    };
  }, cell);
  cubeCache[key] = list;
  return list;
}

function buildLevel(id) {
  const next = String(id);
  syncGrid(next);
  currentLevel = next;

  if (next === '0') {
    cubes = [];
    return;
  }

  if (next === '1a') {
    cubes = flatCubes(currentGrid);
    return;
  }

  if (next === '1b' || next === '1c' || next === '1d') {
    cubes = randomCubes(currentGrid);
    return;
  }

  if (next === '2' || next === '3') {
    if (!mapsReady || !heightImageData) {
      cubes = [];
      return;
    }
    cubes = terrainCubes(currentGrid, colorAtCell, 'terrain');
    return;
  }

  if (next === '4') {
    if (!mapsReady || !heightImageData || !changeMapReady) {
      cubes = [];
      return;
    }
    cubes = terrainCubes(currentGrid, changeColorAtCell, 'change');
    return;
  }

  cubes = [];
}
