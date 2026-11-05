// Vertex-color cube program for Level 1c.
// Shaders copied from cube-color-alternatives/4-vertex-interpolation.js.
// Positions and normals come from the cube-grid mesh in gl-core.js
// (x/z -0.5..0.5, y 0..1). Color is one RGB triple per cube corner.
// Fragment light is uLightDirection. There is no uColor on this program.

// language=GLSL
const vertexColorVertexSource = /* glsl */ `
  attribute vec3 aPosition;   // vertex position (model space)
  attribute vec3 aNormal;     // direction the face is pointing
  attribute vec3 aColor;      // this vertex's color (red, green, blue: 0..1)

  uniform mat4 uModel;        // rotates the cube (it spins over time)
  uniform mat4 uView;         // where the camera is and where it looks
  uniform mat4 uProjection;   // perspective: far things look smaller

  varying vec3 vNormal;       // handed to the fragment shader
  varying vec3 vColor;        // handed to the fragment shader

  void main() {
    // Turn the normal the same way the cube is turned. The cube now
    // rotates, so this matters: without it, the lighting would stay glued
    // to the screen instead of to the cube's faces.
    // mat3(uModel) keeps only the rotation part of the 4x4 matrix (it
    // drops the translation). For a pure rotation, that is exactly the
    // right way to turn a normal. (If you stretched the cube unevenly you
    // would need the "inverse transpose" instead, but we don't.)
    vNormal = normalize(mat3(uModel) * aNormal);

    // Pass the color along unchanged. The vertex shader runs only once
    // per VERTEX, but the fragment shader runs once per FRAGMENT.
    //
    // A FRAGMENT is a candidate pixel: one triangle's contribution to
    // one pixel. Usually that's one fragment per covered pixel, but where
    // triangles overlap, a pixel gets one fragment from each of them, and
    // the depth test (section 4) decides which one is kept.
    //
    // Between the two shaders, the RASTERIZER finds every fragment inside
    // the triangle and fills in its color by interpolating the three
    // vertex colors using BARYCENTRIC coordinates (weights that say how
    // close the fragment is to each vertex). This happens to every
    // varying, automatically.
    vColor = aColor;

    // model -> world -> view (camera) -> clip space.
    // (After the vertex shader, the GPU divides by w and the viewport
    // maps the result onto the canvas's pixels; see section 4.)
    // Read right to left: first turn the cube (uModel), then view it from
    // the camera (uView), then apply perspective (uProjection).
    gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
  }
`;

// language=GLSL
const vertexColorFragmentSource = /* glsl */ `
  precision mediump float;    // how accurate floating-point numbers are
                              // (medium is plenty)

  varying vec3 vNormal;       // received from the vertex shader (interpolated)
  varying vec3 vColor;        // received from the vertex shader (interpolated)
  uniform vec3 uLightDirection;

  void main() {
    // This runs once for EVERY FRAGMENT inside each triangle. vColor and
    // vNormal have already been interpolated between the triangle's three
    // vertices, so each fragment gets its own value. If all three
    // vertices have the same color, the result is that same color
    // everywhere.

    // Simple lighting so we can tell the faces of the cube apart.
    // The light shines from above and slightly to the side.
    vec3 lightDirection = normalize(uLightDirection);

    // dot() measures how closely two directions line up:
    //   1 = the face points straight at the light (brightest)
    //   0 = the face is sideways to the light
    //   negative = the face points away, so max() clamps it to 0 (dark)
    float brightness = max(dot(vNormal, lightDirection), 0.0);

    // Keep 30% "ambient" light so faces in shadow aren't pure black.
    float light = 0.3 + 0.7 * brightness;

    // gl_FragColor is the built-in output: this fragment's color. If the
    // fragment passes the depth test, it becomes the pixel's color.
    // Multiplying the color by light darkens it on dim faces.
    gl_FragColor = vec4(vColor * light, 1.0);   // 1.0 = fully opaque
  }
`;

const programVertex = gl.createProgram();
gl.attachShader(programVertex, compileShader(gl.VERTEX_SHADER, vertexColorVertexSource));
gl.attachShader(programVertex, compileShader(gl.FRAGMENT_SHADER, vertexColorFragmentSource));
gl.linkProgram(programVertex);
if (!gl.getProgramParameter(programVertex, gl.LINK_STATUS)) {
  throw new Error(gl.getProgramInfoLog(programVertex));
}

const uModelVertex = gl.getUniformLocation(programVertex, 'uModel');
const uViewVertex = gl.getUniformLocation(programVertex, 'uView');
const uProjectionVertex = gl.getUniformLocation(programVertex, 'uProjection');
const uLightVertex = gl.getUniformLocation(programVertex, 'uLightDirection');

// HSV to RGB. h, s, and v are 0..1.
function hsvToRgb(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    default: return [v, p, q];
  }
}

// Eight corner colors, once at load. Same colors on every landscape cube.
// Hues sit about 45 degrees apart so the set includes red, pink, and the rest
// of the wheel instead of collapsing to one dull color.
// Index: bit 0 = x > 0, bit 1 = y > 0.5, bit 2 = z > 0.
const cornerRGB = [];
for (let i = 0; i < 8; i++) {
  const hue = (i / 8 + (Math.random() - 0.5) * 0.04 + 1) % 1;
  const sat = 0.8 + Math.random() * 0.2;
  const val = 0.85 + Math.random() * 0.15;
  cornerRGB.push(hsvToRgb(hue, sat, val));
}

// xyz + normal from cubeVertices, then that corner's RGB. 9 floats, stride 36.
const vertexColorVertices = new Float32Array(VERTEX_COUNT * 9);
for (let vertex = 0; vertex < VERTEX_COUNT; vertex++) {
  const src = vertex * 6;
  const x = cubeVertices[src];
  const y = cubeVertices[src + 1];
  const z = cubeVertices[src + 2];
  const corner = (x > 0 ? 1 : 0) | (y > 0.5 ? 2 : 0) | (z > 0 ? 4 : 0);
  const rgb = cornerRGB[corner];
  const dst = vertex * 9;
  vertexColorVertices[dst] = x;
  vertexColorVertices[dst + 1] = y;
  vertexColorVertices[dst + 2] = z;
  vertexColorVertices[dst + 3] = cubeVertices[src + 3];
  vertexColorVertices[dst + 4] = cubeVertices[src + 4];
  vertexColorVertices[dst + 5] = cubeVertices[src + 5];
  vertexColorVertices[dst + 6] = rgb[0];
  vertexColorVertices[dst + 7] = rgb[1];
  vertexColorVertices[dst + 8] = rgb[2];
}

const bufferVertex = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, bufferVertex);
gl.bufferData(gl.ARRAY_BUFFER, vertexColorVertices, gl.STATIC_DRAW);

const aPositionVertex = gl.getAttribLocation(programVertex, 'aPosition');
const aNormalVertex = gl.getAttribLocation(programVertex, 'aNormal');
const aColorVertex = gl.getAttribLocation(programVertex, 'aColor');

// Rebind every draw. The solid program's stride is 24 and stays on its own buffer.
function bindVertexProgram() {
  gl.useProgram(programVertex);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufferVertex);

  const vertexStride = 9 * BYTES_PER_FLOAT;

  const maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
  for (let index = 0; index < maxAttribs; index++) {
    if (index !== aPositionVertex && index !== aNormalVertex && index !== aColorVertex) {
      gl.disableVertexAttribArray(index);
    }
  }

  gl.enableVertexAttribArray(aPositionVertex);
  gl.vertexAttribPointer(aPositionVertex, 3, gl.FLOAT, false, vertexStride, 0);

  gl.enableVertexAttribArray(aNormalVertex);
  gl.vertexAttribPointer(aNormalVertex, 3, gl.FLOAT, false, vertexStride, 3 * BYTES_PER_FLOAT);

  gl.enableVertexAttribArray(aColorVertex);
  gl.vertexAttribPointer(aColorVertex, 3, gl.FLOAT, false, vertexStride, 6 * BYTES_PER_FLOAT);
}

function drawVertexCube(model) {
  gl.uniformMatrix4fv(uModelVertex, false, model);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}
