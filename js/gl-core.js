// Solid-color cube program. Copied from cube-grid/index.js.
// Fragment light is uLightDirection. No draw and no resize listener.

const canvas = document.getElementById('c');
const gl = canvas.getContext('webgl');

// language=GLSL
const vertexShaderSource = /* glsl */ `
  attribute vec3 aPosition;   // corner position of the cube (model space)
  attribute vec3 aNormal;     // direction the face is pointing

  uniform mat4 uModel;        // moves/scales THIS cube into the world
  uniform mat4 uView;         // where the camera is and where it looks
  uniform mat4 uProjection;   // perspective: far things look smaller

  varying vec3 vNormal;       // handed to the fragment shader

  void main() {
    // Turn the normal the same way the cube is turned. Our cubes are only
    // stretched and moved, never rotated, so this changes nothing here.
    // It would matter if you added rotation.
    vNormal = normalize(mat3(uModel) * aNormal);

    // model -> world -> camera -> screen.
    // Read right to left: first place the cube in the world (uModel),
    // then view it from the camera (uView), then apply perspective (uProjection).
    gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
  }
`;

// language=GLSL
const fragmentShaderSource = /* glsl */ `
  precision mediump float;    // how accurate decimal numbers are (medium is plenty)

  uniform vec3 uColor;        // this cube's color (red, green, blue: 0..1)
  uniform vec3 uLightDirection;
  varying vec3 vNormal;       // received from the vertex shader

  void main() {
    // This runs once for EVERY PIXEL inside each triangle. The GPU blends
    // vNormal between the triangle's three corners, so each pixel gets
    // its own value. On a flat cube face all corners share the same
    // normal, so every pixel on that face gets the same one.

    // Simple lighting so we can tell the faces of a cube apart.
    // The light shines from above and slightly to the side.
    vec3 lightDirection = normalize(uLightDirection);

    // dot() measures how closely two directions line up:
    //   1 = the face points straight at the light (brightest)
    //   0 = the face is sideways to the light
    //   negative = the face points away, so max() clamps it to 0 (dark)
    float brightness = max(dot(vNormal, lightDirection), 0.0);

    // Keep 30% "ambient" light so faces in shadow aren't pure black.
    float light = 0.3 + 0.7 * brightness;

    // gl_FragColor is the built-in output: the final color of this pixel.
    // Multiplying the cube's color by light darkens it on dim faces.
    gl_FragColor = vec4(uColor * light, 1.0);   // 1.0 = fully opaque
  }
`;

function compileShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

const programSolid = gl.createProgram();
gl.attachShader(programSolid, compileShader(gl.VERTEX_SHADER, vertexShaderSource));
gl.attachShader(programSolid, compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource));
gl.linkProgram(programSolid);

const uModelSolid = gl.getUniformLocation(programSolid, 'uModel');
const uViewSolid = gl.getUniformLocation(programSolid, 'uView');
const uProjectionSolid = gl.getUniformLocation(programSolid, 'uProjection');
const uColorSolid = gl.getUniformLocation(programSolid, 'uColor');
const uLightSolid = gl.getUniformLocation(programSolid, 'uLightDirection');

// Unit cube: x/z -0.5..0.5, y 0..1. Each vertex is x, y, z, nx, ny, nz.
const cubeVertices = new Float32Array([
  // Front face (normal points toward +z)
  -0.5, 0, 0.5,   0, 0, 1,
   0.5, 0, 0.5,   0, 0, 1,
   0.5, 1, 0.5,   0, 0, 1,
  -0.5, 0, 0.5,   0, 0, 1,
   0.5, 1, 0.5,   0, 0, 1,
  -0.5, 1, 0.5,   0, 0, 1,

  // Back face (-z)
  -0.5, 0, -0.5,  0, 0, -1,
   0.5, 1, -0.5,  0, 0, -1,
   0.5, 0, -0.5,  0, 0, -1,
  -0.5, 0, -0.5,  0, 0, -1,
  -0.5, 1, -0.5,  0, 0, -1,
   0.5, 1, -0.5,  0, 0, -1,

  // Top face (+y)
  -0.5, 1, -0.5,  0, 1, 0,
  -0.5, 1,  0.5,  0, 1, 0,
   0.5, 1,  0.5,  0, 1, 0,
  -0.5, 1, -0.5,  0, 1, 0,
   0.5, 1,  0.5,  0, 1, 0,
   0.5, 1, -0.5,  0, 1, 0,

  // Bottom face (-y)
  -0.5, 0, -0.5,  0, -1, 0,
   0.5, 0,  0.5,  0, -1, 0,
  -0.5, 0,  0.5,  0, -1, 0,
  -0.5, 0, -0.5,  0, -1, 0,
   0.5, 0, -0.5,  0, -1, 0,
   0.5, 0,  0.5,  0, -1, 0,

  // Right face (+x)
   0.5, 0, -0.5,  1, 0, 0,
   0.5, 1, -0.5,  1, 0, 0,
   0.5, 1,  0.5,  1, 0, 0,
   0.5, 0, -0.5,  1, 0, 0,
   0.5, 1,  0.5,  1, 0, 0,
   0.5, 0,  0.5,  1, 0, 0,

  // Left face (-x)
  -0.5, 0, -0.5, -1, 0, 0,
  -0.5, 1,  0.5, -1, 0, 0,
  -0.5, 1, -0.5, -1, 0, 0,
  -0.5, 0, -0.5, -1, 0, 0,
  -0.5, 0,  0.5, -1, 0, 0,
  -0.5, 1,  0.5, -1, 0, 0,
]);
const VERTEX_COUNT = 36;

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);

const BYTES_PER_FLOAT = 4;
const stride = 6 * BYTES_PER_FLOAT;

const SPACING = 1;
// Image landscape stays this wide at every grid size. Cell width is TERRAIN_SPAN / gridSize.
const TERRAIN_SPAN = 16;

const aPositionSolid = gl.getAttribLocation(programSolid, 'aPosition');
const aNormalSolid = gl.getAttribLocation(programSolid, 'aNormal');

// Rebind every draw. A vertex-color bind leaves the attribute stride at 36.
function bindSolidProgram() {
  gl.useProgram(programSolid);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  const maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
  for (let index = 0; index < maxAttribs; index++) {
    if (index !== aPositionSolid && index !== aNormalSolid) {
      gl.disableVertexAttribArray(index);
    }
  }

  gl.enableVertexAttribArray(aPositionSolid);
  gl.vertexAttribPointer(aPositionSolid, 3, gl.FLOAT, false, stride, 0);

  gl.enableVertexAttribArray(aNormalSolid);
  gl.vertexAttribPointer(aNormalSolid, 3, gl.FLOAT, false, stride, 3 * BYTES_PER_FLOAT);
}

// Move a point by (x, y, z).
function translation(x, y, z) {
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1,
  ];
}

// Stretch a point by (sx, sy, sz).
function scaling(sx, sy, sz) {
  return [
    sx, 0,  0,  0,
    0,  sy, 0,  0,
    0,  0,  sz, 0,
    0,  0,  0,  1,
  ];
}

// Multiply two matrices: the result does b first, then a.
function multiply(a, b) {
  const result = new Array(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 4; k++) {
        result[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k];
      }
    }
  }
  return result;
}

// Perspective projection: makes far-away objects look smaller.
function perspective(fieldOfView, aspect, near, far) {
  const f = 1 / Math.tan(fieldOfView / 2);
  return [
    f / aspect, 0, 0,                               0,
    0,          f, 0,                               0,
    0,          0, (far + near) / (near - far),    -1,
    0,          0, (2 * far * near) / (near - far), 0,
  ];
}

// Camera matrix: place a camera at `eye`, looking at `target`.
function lookAt(eye, target, up) {
  const subtract = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const normalize = (a) => {
    const length = Math.hypot(a[0], a[1], a[2]);
    return [a[0] / length, a[1] / length, a[2] / length];
  };

  const zAxis = normalize(subtract(eye, target));
  const xAxis = normalize(cross(up, zAxis));
  const yAxis = cross(zAxis, xAxis);

  return [
    xAxis[0], yAxis[0], zAxis[0], 0,
    xAxis[1], yAxis[1], zAxis[1], 0,
    xAxis[2], yAxis[2], zAxis[2], 0,
    -dot(xAxis, eye), -dot(yAxis, eye), -dot(zAxis, eye), 1,
  ];
}

// Rotate a point by `angle` radians around the x axis (tips forward/back).
// In column-major order, each line below is one COLUMN of the matrix.
function rotationX(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
        1, 0,  0, 0,
        0, c,  s, 0,
        0, -s, c, 0,
        0, 0,  0, 1,
    ];
}

// Rotate a point by `angle` radians around the y axis (spins like a top).
function rotationY(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return [
        c, 0, -s, 0,
        0, 1, 0,  0,
        s, 0, c,  0,
        0, 0, 0,  1,
    ];
}

function drawSolidCube(model, color) {
  gl.uniformMatrix4fv(uModelSolid, false, model);
  gl.uniform3fv(uColorSolid, color);
  gl.drawArrays(gl.TRIANGLES, 0, VERTEX_COUNT);
}
