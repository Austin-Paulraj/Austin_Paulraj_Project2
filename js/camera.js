// Orbit eye from camera-move/index.js lines 424-429.
// Constants edited for this page: radius 22, height 14, speed 0.25, look-at origin.

const ORBIT_RADIUS = 22;
const ORBIT_HEIGHT = 14;
const ORBIT_SPEED = 0.25;
const LOOK_AT = [0, 0, 0];
const UP = [0, 1, 0];

function orbitEye(seconds) {
  const angle = seconds * ORBIT_SPEED;
  return [
    ORBIT_RADIUS * Math.cos(angle),
    ORBIT_HEIGHT,
    ORBIT_RADIUS * Math.sin(angle),
  ];
}

function staticEye() {
  return [18, 16, 22];
}
