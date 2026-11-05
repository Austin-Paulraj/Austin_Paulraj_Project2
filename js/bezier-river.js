// Bézier math from bezier-curve-playground-2d/index.js.
// bezierPoint is lines 110-124 with z added on both branches.
// lerp is lines 144-146 with z added. deCasteljauLevels is lines 161-173 unchanged.
// translation, multiply, and scaling come from gl-core.js.

// Four cubics meet end to end. Kappa is the circle constant
// 4 * (sqrt(2) - 1) / 3, scaled per axis so an oval stays smooth.
const BEZIER_KAPPA = 0.5522847498;
const BODY_SCALE = 1.6;
const SATELLITE_SCALE = 0.5;
const BODY_LAP_SECONDS = 12;
const SATELLITE_LAP_SECONDS = 3;

function ellipseCubics(rx, rz, y) {
  const kx = rx * BEZIER_KAPPA;
  const kz = rz * BEZIER_KAPPA;
  return [
    [
      { x: rx, y: y, z: 0 },
      { x: rx, y: y, z: kz },
      { x: kx, y: y, z: rz },
      { x: 0, y: y, z: rz },
    ],
    [
      { x: 0, y: y, z: rz },
      { x: -kx, y: y, z: rz },
      { x: -rx, y: y, z: kz },
      { x: -rx, y: y, z: 0 },
    ],
    [
      { x: -rx, y: y, z: 0 },
      { x: -rx, y: y, z: -kz },
      { x: -kx, y: y, z: -rz },
      { x: 0, y: y, z: -rz },
    ],
    [
      { x: 0, y: y, z: -rz },
      { x: kx, y: y, z: -rz },
      { x: rx, y: y, z: -kz },
      { x: rx, y: y, z: 0 },
    ],
  ];
}

// Oval above the terrain. Center height 8. Terrain tops out near 5.
const OVAL = ellipseCubics(11, 7, 8);
// Equal radii, so this closed cubic loop reads as a circle.
const ORBIT = ellipseCubics(1.7, 1.7, 0);

// Evaluate B(t) with the Bernstein form. z uses the same weights as x and y.
function bezierPoint(p, t) {
  const s = 1 - t;  // Short name for (1 - t).
  if (p.length === 3) {
    const w0 = s * s, w1 = 2 * s * t, w2 = t * t;
    return {
      x: w0 * p[0].x + w1 * p[1].x + w2 * p[2].x,
      y: w0 * p[0].y + w1 * p[1].y + w2 * p[2].y,
      z: w0 * p[0].z + w1 * p[1].z + w2 * p[2].z,
    };
  }
  const w0 = s * s * s, w1 = 3 * s * s * t, w2 = 3 * s * t * t, w3 = t * t * t;
  return {
    x: w0 * p[0].x + w1 * p[1].x + w2 * p[2].x + w3 * p[3].x,
    y: w0 * p[0].y + w1 * p[1].y + w2 * p[2].y + w3 * p[3].y,
    z: w0 * p[0].z + w1 * p[1].z + w2 * p[2].z + w3 * p[3].z,
  };
}

// Linear interpolation: the point a fraction t of the way from a to b.
function lerp(a, b, t) {
  return {
    x: (1 - t) * a.x + t * b.x,
    y: (1 - t) * a.y + t * b.y,
    z: (1 - t) * a.z + t * b.z,
  };
}

// The de Casteljau algorithm: a second way to find B(t), using only lerp.
// Take the control points, lerp each neighboring pair by t to get one fewer
// point, and repeat until one point is left. That last point is B(t).
//
// We return every level so we can draw the construction:
//   levels[0] = the control points          (4 points for a cubic)
//   levels[1] = lerps of those              (3 points)
//   levels[2] = lerps of those              (2 points)
//   levels[3] = the single point B(t)       (1 point)
//
// The segment joining the two points of the second-to-last level touches
// the curve at B(t): it lies along the tangent. (Its length times the
// degree equals |B'(t)|.)
function deCasteljauLevels(p, t) {
  const levels = [p];
  let current = p;
  while (current.length > 1) {
    const next = [];
    for (let i = 0; i < current.length - 1; i++) {
      next.push(lerp(current[i], current[i + 1], t));
    }
    levels.push(next);
    current = next;
  }
  return levels;
}

// t wraps across the four cubics. The last endpoint is the first, so the wrap does not jump.
function pointOnLoop(cubics, t) {
  const wrapped = t - Math.floor(t);
  const scaled = wrapped * cubics.length;
  const index = Math.min(cubics.length - 1, Math.floor(scaled));
  return bezierPoint(cubics[index], scaled - index);
}

// Mesh bottom is y = 0, so the translation sits half a scale below the center.
function placedCube(center, scale) {
  return multiply(
    translation(center.x, center.y - scale * 0.5, center.z),
    scaling(scale, scale, scale),
  );
}

function flyerModels(seconds) {
  const bodyCenter = pointOnLoop(OVAL, seconds / BODY_LAP_SECONDS);
  const orbitT = seconds / SATELLITE_LAP_SECONDS;
  const orbitA = pointOnLoop(ORBIT, orbitT);
  const orbitB = pointOnLoop(ORBIT, orbitT + 0.5);
  return {
    body: placedCube(bodyCenter, BODY_SCALE),
    satellites: [
      placedCube({
        x: bodyCenter.x + orbitA.x,
        y: bodyCenter.y + orbitA.y,
        z: bodyCenter.z + orbitA.z,
      }, SATELLITE_SCALE),
      placedCube({
        x: bodyCenter.x + orbitB.x,
        y: bodyCenter.y + orbitB.y,
        z: bodyCenter.z + orbitB.z,
      }, SATELLITE_SCALE),
    ],
  };
}
