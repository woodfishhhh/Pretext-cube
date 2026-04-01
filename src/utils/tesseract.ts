import * as THREE from 'three';

// 16 vertices of a tesseract in 4D space
export const generateVertices = (): number[][] => {
  const vertices = [];
  for (let i = 0; i < 16; i++) {
    vertices.push([
      (i & 1) ? 1 : -1,
      (i & 2) ? 1 : -1,
      (i & 4) ? 1 : -1,
      (i & 8) ? 1 : -1,
    ]);
  }
  return vertices;
};

// 32 edges of a tesseract
export const generateEdges = (): [number, number][] => {
  const edges: [number, number][] = [];
  for (let i = 0; i < 16; i++) {
    for (let j = 0; j < 4; j++) {
      const neighbor = i ^ (1 << j);
      if (i < neighbor) {
        edges.push([i, neighbor]);
      }
    }
  }
  return edges;
};

// Rotates a 4D point in the given planes (xw and yw, etc)
export const rotate4D = (v: number[], angleXW: number, angleYZ: number): number[] => {
  let [x, y, z, w] = v;

  // Rotate in XW plane
  let cxw = Math.cos(angleXW);
  let sxw = Math.sin(angleXW);
  let nx = x * cxw - w * sxw;
  let nw = x * sxw + w * cxw;
  x = nx;
  w = nw;

  // Rotate in YZ plane
  let cyz = Math.cos(angleYZ);
  let syz = Math.sin(angleYZ);
  let ny = y * cyz - z * syz;
  let nz = y * syz + z * cyz;
  y = ny;
  z = nz;

  return [x, y, z, w];
};

// Perspective projection from 4D to 3D
export const project4DTo3D = (v: number[], distance4D: number): THREE.Vector3 => {
  const w = v[3];
  const f = distance4D / (distance4D - w);
  return new THREE.Vector3(v[0] * f, v[1] * f, v[2] * f);
};

const cubeQuads = [
  [0, 2, 6, 4],
  [1, 5, 7, 3],
  [0, 4, 5, 1],
  [2, 3, 7, 6],
  [0, 1, 3, 2],
  [4, 6, 7, 5],
] as const;

export const generateCubeSurfaceIndices = (offset: number): number[] => {
  const indices: number[] = [];

  for (const [a, b, c, d] of cubeQuads) {
    indices.push(
      offset + a, offset + b, offset + c,
      offset + a, offset + c, offset + d,
    );
  }

  return indices;
};
