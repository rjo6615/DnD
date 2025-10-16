const SQRT3 = Math.sqrt(3);

const EPSILON = 1e-6;

function normalizeVertices(points) {
  return points.map(([x, y, z]) => {
    const length = Math.hypot(x, y, z);
    return [x / length, y / length, z / length];
  });
}

function createTetrahedron() {
  const vertices = normalizeVertices([
    [1, 1, 1],
    [1, -1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
  ]);

  return { vertices };
}

function createCube() {
  const vertices = normalizeVertices([
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
  ]);

  return { vertices };
}

function createOctahedron() {
  const vertices = normalizeVertices([
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ]);

  return { vertices };
}

function createIcosahedron() {
  const phi = (1 + Math.sqrt(5)) / 2;
  const vertices = normalizeVertices([
    [-1, phi, 0],
    [1, phi, 0],
    [-1, -phi, 0],
    [1, -phi, 0],
    [0, -1, phi],
    [0, 1, phi],
    [0, -1, -phi],
    [0, 1, -phi],
    [phi, 0, -1],
    [phi, 0, 1],
    [-phi, 0, -1],
    [-phi, 0, 1],
  ]);

  return { vertices };
}

function createDodecahedron() {
  const phi = (1 + Math.sqrt(5)) / 2;
  const invPhi = 1 / phi;
  const vertices = normalizeVertices([
    [-1, -1, -1],
    [1, -1, -1],
    [1, 1, -1],
    [-1, 1, -1],
    [-1, -1, 1],
    [1, -1, 1],
    [1, 1, 1],
    [-1, 1, 1],
    [0, -invPhi, -phi],
    [0, invPhi, -phi],
    [0, -invPhi, phi],
    [0, invPhi, phi],
    [-invPhi, -phi, 0],
    [invPhi, -phi, 0],
    [-invPhi, phi, 0],
    [invPhi, phi, 0],
    [-phi, 0, -invPhi],
    [-phi, 0, invPhi],
    [phi, 0, -invPhi],
    [phi, 0, invPhi],
  ]);

  return { vertices };
}

function createPentagonalTrapezohedron() {
  const top = [0, 0, 1];
  const bottom = [0, 0, -1];
  const ring = [];
  const radius = 0.92;
  const offset = 0.33;
  const step = (Math.PI * 2) / 10;

  for (let i = 0; i < 10; i += 1) {
    const angle = i * step;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = i % 2 === 0 ? offset : -offset;
    ring.push([x, z, y]);
  }

  const vertices = normalizeVertices([top, bottom, ...ring]);

  return { vertices };
}

const polyhedraDefinitions = {
  4: createTetrahedron,
  6: createCube,
  8: createOctahedron,
  10: createPentagonalTrapezohedron,
  12: createDodecahedron,
  20: createIcosahedron,
};

const baseTriangleHeight = SQRT3 / 2;
const baseTriangle = [
  [0, (2 * baseTriangleHeight) / 3, 0],
  [-0.5, -baseTriangleHeight / 3, 0],
  [0.5, -baseTriangleHeight / 3, 0],
];

const baseEdgeLength = Math.hypot(
  baseTriangle[1][0] - baseTriangle[0][0],
  baseTriangle[1][1] - baseTriangle[0][1],
);

function subtract(a, b) {
  return a.map((v, i) => v - b[i]);
}

function dot(a, b) {
  return a.reduce((sum, v, i) => sum + v * b[i], 0);
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function norm(a) {
  return Math.hypot(...a);
}

function normalize(a) {
  const length = norm(a);
  return a.map((v) => v / length);
}

function matrixFromColumns(c1, c2, c3) {
  return [
    c1[0], c1[1], c1[2],
    c2[0], c2[1], c2[2],
    c3[0], c3[1], c3[2],
  ];
}

function inverse3x3(m) {
  const [a11, a21, a31, a12, a22, a32, a13, a23, a33] = m;
  const det =
    a11 * (a22 * a33 - a23 * a32) -
    a12 * (a21 * a33 - a23 * a31) +
    a13 * (a21 * a32 - a22 * a31);

  if (Math.abs(det) < 1e-8) {
    throw new Error('Singular matrix');
  }

  const invDet = 1 / det;

  return [
    (a22 * a33 - a23 * a32) * invDet,
    (a23 * a31 - a21 * a33) * invDet,
    (a21 * a32 - a22 * a31) * invDet,
    (a13 * a32 - a12 * a33) * invDet,
    (a11 * a33 - a13 * a31) * invDet,
    (a12 * a31 - a11 * a32) * invDet,
    (a12 * a23 - a13 * a22) * invDet,
    (a13 * a21 - a11 * a23) * invDet,
    (a11 * a22 - a12 * a21) * invDet,
  ];
}

function multiply3x3(a, b) {
  const result = [];

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      let sum = 0;
      for (let k = 0; k < 3; k += 1) {
        sum += a[row + k * 3] * b[k + col * 3];
      }
      result[row + col * 3] = sum;
    }
  }

  return result;
}

function generateConvexHullTriangles(vertices) {
  const faces = [];
  const seen = new Set();
  const centroid = vertices
    .reduce(
      (acc, vertex) => acc.map((value, index) => value + vertex[index]),
      [0, 0, 0],
    )
    .map((value) => value / vertices.length);

  for (let i = 0; i < vertices.length - 2; i += 1) {
    for (let j = i + 1; j < vertices.length - 1; j += 1) {
      for (let k = j + 1; k < vertices.length; k += 1) {
        const v0 = vertices[i];
        const v1 = vertices[j];
        const v2 = vertices[k];
        const edge1 = subtract(v1, v0);
        const edge2 = subtract(v2, v0);
        const normal = cross(edge1, edge2);
        const area = norm(normal);

        if (area < EPSILON) {
          continue;
        }

        let hasPositive = false;
        let hasNegative = false;

        for (let m = 0; m < vertices.length; m += 1) {
          if (m === i || m === j || m === k) {
            continue;
          }
          const distance = dot(normal, subtract(vertices[m], v0));
          if (distance > EPSILON) {
            hasPositive = true;
          } else if (distance < -EPSILON) {
            hasNegative = true;
          }

          if (hasPositive && hasNegative) {
            break;
          }
        }

        if (hasPositive && hasNegative) {
          continue;
        }

        const key = [i, j, k].sort((a, b) => a - b).join('-');

        if (seen.has(key)) {
          continue;
        }

        seen.add(key);

        const orientation = dot(normal, subtract(centroid, v0));
        if (orientation > 0) {
          faces.push([i, k, j]);
        } else {
          faces.push([i, j, k]);
        }
      }
    }
  }

  return faces;
}

const baseU = normalize(subtract(baseTriangle[1], baseTriangle[0]));
const baseVTemp = subtract(baseTriangle[2], baseTriangle[0]);
const baseV = normalize(
  subtract(baseVTemp, baseU.map((v) => v * dot(baseVTemp, baseU))),
);
const baseW = cross(baseU, baseV);
const baseMatrix = matrixFromColumns(baseU, baseV, baseW);
const baseInverse = inverse3x3(baseMatrix);

export function createPolyhedronFaces(sides, scale = 20) {
  const geometryFactory = polyhedraDefinitions[sides];

  if (!geometryFactory) {
    return null;
  }

  const { vertices, faces: presetFaces } = geometryFactory();
  const faces = presetFaces || generateConvexHullTriangles(vertices);
  const faceData = [];

  faces.forEach((face) => {
    const verts = face.map((index) => vertices[index]);
    const centroid = verts.reduce(
      (acc, vertex) => acc.map((v, i) => v + vertex[i] / 3),
      [0, 0, 0],
    );

    const uVec = subtract(verts[1], verts[0]);
    const faceScale = norm(uVec) / baseEdgeLength;
    const u = normalize(uVec);
    const vTemp = subtract(verts[2], verts[0]);
    const v = normalize(
      subtract(vTemp, u.map((value) => value * dot(vTemp, u))),
    );
    const w = cross(u, v);

    const faceMatrix = matrixFromColumns(
      u.map((value) => value * faceScale),
      v.map((value) => value * faceScale),
      w,
    );
    const transformMatrix = multiply3x3(faceMatrix, baseInverse);

    const translation = centroid.map((value) => value * scale);

    const cssMatrix = [
      transformMatrix[0] * scale,
      transformMatrix[3] * scale,
      transformMatrix[6] * scale,
      0,
      transformMatrix[1] * scale,
      transformMatrix[4] * scale,
      transformMatrix[7] * scale,
      0,
      transformMatrix[2] * scale,
      transformMatrix[5] * scale,
      transformMatrix[8] * scale,
      0,
      translation[0],
      translation[1],
      translation[2],
      1,
    ];

    const normal = normalize(w);

    faceData.push({
      matrix: cssMatrix,
      normal,
    });
  });

  return faceData;
}
