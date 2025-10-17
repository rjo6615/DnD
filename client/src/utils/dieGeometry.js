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

  return {
    vertices,
    faces: [
      [0, 2, 1],
      [0, 1, 3],
      [0, 3, 2],
      [1, 2, 3],
    ],
  };
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

  return {
    vertices,
    faces: [
      [0, 3, 2, 1],
      [4, 5, 6, 7],
      [0, 1, 5, 4],
      [2, 3, 7, 6],
      [1, 2, 6, 5],
      [3, 0, 4, 7],
    ],
  };
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

  return {
    vertices,
    faces: [
      [0, 4, 2],
      [2, 4, 1],
      [1, 4, 3],
      [3, 4, 0],
      [0, 2, 5],
      [2, 1, 5],
      [1, 3, 5],
      [3, 0, 5],
    ],
  };
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

  const faces = [];
  for (let i = 0; i < 10; i += 1) {
    const current = 2 + i;
    const next = 2 + ((i + 1) % 10);
    faces.push([0, current, 1, next]);
  }

  return { vertices, faces };
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
  if (length < EPSILON) {
    return [0, 0, 0];
  }
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

function computeFaceCentroid(face, vertices) {
  const sum = face.reduce(
    (acc, index) => acc.map((value, axis) => value + vertices[index][axis]),
    [0, 0, 0],
  );
  return sum.map((value) => value / face.length);
}

function computeFaceNormal(face, vertices) {
  const normal = [0, 0, 0];

  for (let i = 0; i < face.length; i += 1) {
    const current = vertices[face[i]];
    const next = vertices[face[(i + 1) % face.length]];
    normal[0] += (current[1] - next[1]) * (current[2] + next[2]);
    normal[1] += (current[2] - next[2]) * (current[0] + next[0]);
    normal[2] += (current[0] - next[0]) * (current[1] + next[1]);
  }

  return normalize(normal);
}

function ensureFaceOrientation(face, vertices) {
  if (face.length < 3) {
    return { indices: face, normal: [0, 0, 0] };
  }

  const centroid = computeFaceCentroid(face, vertices);
  let normal = computeFaceNormal(face, vertices);
  const orientation = dot(normal, centroid);

  if (orientation < 0) {
    const reversed = [...face].reverse();
    normal = normal.map((value) => -value);
    return { indices: reversed, normal };
  }

  return { indices: face, normal };
}

function mergeCoplanarFaces(faces, vertices) {
  const groups = new Map();

  faces.forEach((face) => {
    if (!Array.isArray(face) || face.length < 3) {
      return;
    }

    const v0 = vertices[face[0]];
    const v1 = vertices[face[1]];
    let edgeIndex = 2;
    let edge2 = subtract(vertices[face[edgeIndex]], v0);
    let edge1 = subtract(v1, v0);
    let normalVector = cross(edge1, edge2);

    while (norm(normalVector) < EPSILON && edgeIndex < face.length - 1) {
      edgeIndex += 1;
      edge2 = subtract(vertices[face[edgeIndex]], v0);
      edge1 = subtract(v1, v0);
      normalVector = cross(edge1, edge2);
    }

    if (norm(normalVector) < EPSILON) {
      return;
    }

    let normal = normalize(normalVector);
    let distance = dot(normal, v0);

    if (distance < 0) {
      normal = normal.map((value) => -value);
      distance = -distance;
    }

    const formatComponent = (value) => {
      const normalizedValue = Math.abs(value) < 1e-8 ? 0 : value;
      return normalizedValue.toFixed(6);
    };

    const key = `${normal.map((value) => formatComponent(value)).join(':')}:${formatComponent(distance)}`;

    if (!groups.has(key)) {
      groups.set(key, { normal, indices: new Set() });
    }

    const group = groups.get(key);
    face.forEach((index) => group.indices.add(index));
  });

  const merged = [];

  groups.forEach(({ normal, indices }) => {
    const unique = Array.from(indices);
    if (unique.length < 3) {
      return;
    }

    const centroid = computeFaceCentroid(unique, vertices);

    let basis = subtract(vertices[unique[0]], centroid);
    let basisIndex = 1;

    while (norm(basis) < EPSILON && basisIndex < unique.length) {
      basis = subtract(vertices[unique[basisIndex]], centroid);
      basisIndex += 1;
    }

    const u = normalize(basis);
    const v = normalize(cross(normal, u));

    const ordered = unique
      .map((index) => {
        const relative = subtract(vertices[index], centroid);
        const x = dot(relative, u);
        const y = dot(relative, v);
        const angle = Math.atan2(y, x);
        return { index, angle };
      })
      .sort((a, b) => a.angle - b.angle)
      .map(({ index }) => index);

    const oriented = ensureFaceOrientation(ordered, vertices);
    merged.push(oriented);
  });

  return merged;
}

const baseOrigin = baseTriangle[0];
const baseEdge1 = subtract(baseTriangle[1], baseOrigin);
const baseEdge2 = subtract(baseTriangle[2], baseOrigin);
const baseNormal = normalize(cross(baseEdge1, baseEdge2));
const baseMatrix = matrixFromColumns(baseEdge1, baseEdge2, baseNormal);
const baseInverse = inverse3x3(baseMatrix);
const baseCentroid = baseTriangle
  .reduce(
    (acc, vertex) => acc.map((value, index) => value + vertex[index] / 3),
    [0, 0, 0],
  );

function multiplyMatrixVector(matrix, vector) {
  return [
    matrix[0] * vector[0] + matrix[3] * vector[1] + matrix[6] * vector[2],
    matrix[1] * vector[0] + matrix[4] * vector[1] + matrix[7] * vector[2],
    matrix[2] * vector[0] + matrix[5] * vector[1] + matrix[8] * vector[2],
  ];
}

export function createPolyhedronFaces(sides, scale = 1) {
  const geometryFactory = polyhedraDefinitions[sides];

  if (!geometryFactory) {
    return null;
  }

  const { vertices, faces: presetFaces } = geometryFactory();
  const rawFaces = presetFaces || generateConvexHullTriangles(vertices);
  const processedFaces = Array.isArray(presetFaces)
    ? rawFaces.map((face) => ensureFaceOrientation(face, vertices))
    : mergeCoplanarFaces(rawFaces, vertices);
  const faceData = [];

  processedFaces.forEach(({ indices, normal: presetNormal }) => {
    if (!Array.isArray(indices) || indices.length < 3) {
      return;
    }

    const verts = indices.map((index) => vertices[index]);
    const v0 = verts[0];
    let v1 = verts[1];
    let v2 = verts[2];

    let edge1 = subtract(v1, v0);
    let edge2 = subtract(v2, v0);
    let faceNormal = cross(edge1, edge2);
    let edgeIndex = 3;

    while (norm(faceNormal) < EPSILON && edgeIndex < verts.length) {
      v2 = verts[edgeIndex];
      edge2 = subtract(v2, v0);
      faceNormal = cross(edge1, edge2);
      edgeIndex += 1;
    }

    faceNormal = normalize(faceNormal);
    const hasPresetNormal = Array.isArray(presetNormal) && norm(presetNormal) >= EPSILON;

    if (hasPresetNormal) {
      if (dot(faceNormal, presetNormal) < 0) {
        faceNormal = presetNormal.map((value) => -value);
      } else {
        faceNormal = presetNormal;
      }
    }

    const faceMatrix = matrixFromColumns(edge1, edge2, faceNormal);
    const transformMatrix = multiply3x3(faceMatrix, baseInverse);

    const centroidOffset = multiplyMatrixVector(transformMatrix, baseCentroid);
    const actualCentroid = computeFaceCentroid(indices, vertices);
    const translation = [
      (actualCentroid[0] - centroidOffset[0]) * scale,
      (actualCentroid[1] - centroidOffset[1]) * scale,
      (actualCentroid[2] - centroidOffset[2]) * scale,
    ];

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

    const normal = faceNormal;

    const centroid = computeFaceCentroid(indices, vertices);
    let basis = subtract(v0, centroid);
    let basisIndex = 1;

    while (norm(basis) < EPSILON && basisIndex < verts.length) {
      basis = subtract(verts[basisIndex], centroid);
      basisIndex += 1;
    }

    const u = normalize(basis);
    const v = normalize(cross(normal, u));

    let clipPath;
    let heightRatio;

    if (verts.length > 3) {
      const projected = verts.map((vertex) => {
        const relative = subtract(vertex, centroid);
        return {
          x: dot(relative, u),
          y: dot(relative, v),
        };
      });

      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;

      projected.forEach(({ x, y }) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      });

      const width = maxX - minX || EPSILON;
      const height = maxY - minY || EPSILON;

      const clipPoints = projected
        .map(({ x, y }) => {
          const px = ((x - minX) / width) * 100;
          const py = 100 - ((y - minY) / height) * 100;
          return `${px.toFixed(3)}% ${py.toFixed(3)}%`;
        })
        .join(', ');

      clipPath = `polygon(${clipPoints})`;
      heightRatio = Math.max(height / width, 0.01);
    }

    faceData.push({
      matrix: cssMatrix,
      normal,
      clipPath,
      heightRatio,
    });
  });

  return faceData;
}
