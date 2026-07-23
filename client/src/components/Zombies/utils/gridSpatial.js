const SIZE_SQUARES = Object.freeze({ tiny: 1, small: 1, medium: 1, large: 2, huge: 3, gargantuan: 4 });

const number = (value) => Number.isFinite(Number(value)) ? Number(value) : null;
const idOf = (value) => String(value?.characterId ?? value?.combatantId ?? value?.enemyId ?? value?._id ?? value?.id ?? '');

export const getOccupiedSquareSize = (combatant = {}) => {
  const explicit = number(combatant.gridSize ?? combatant.occupiedSquares);
  if (explicit !== null && explicit > 0) return Math.max(1, Math.floor(explicit));
  return SIZE_SQUARES[String(combatant.size ?? combatant.creatureSize ?? 'medium').toLowerCase()] || 1;
};

const getGridDimensions = (mapState = {}) => ({
  columns: Math.max(1, Math.floor(number(mapState.gridColumns ?? mapState.columns ?? mapState.gridWidth) || 24)),
  rows: Math.max(1, Math.floor(number(mapState.gridRows ?? mapState.rows ?? mapState.gridHeight) || 24)),
});

const tokenFor = (combatant, mapState) => {
  const tokens = mapState?.tokens ?? mapState?.campaignMap?.tokens ?? [];
  const entries = Array.isArray(tokens) ? tokens.map((token) => ['', token]) : Object.entries(tokens || {});
  const match = entries.find(([key, token]) => idOf(token) === idOf(combatant) || String(key) === idOf(combatant));
  return match?.[1] || combatant?.token || combatant;
};

/**
 * Returns every logical cell in a creature's square footprint. `anchorCell` is
 * always the top-left occupied cell (token positions normalize to that cell).
 */
export const getOccupiedGridCells = ({ anchorCell, size, sizeCategory } = {}) => {
  const x = number(anchorCell?.x ?? anchorCell?.gridX);
  const y = number(anchorCell?.y ?? anchorCell?.gridY);
  if (x === null || y === null) return [];
  const footprintSize = getOccupiedSquareSize({
    size: sizeCategory ?? size,
    gridSize: typeof size === 'number' ? size : undefined,
  });
  const cells = [];
  for (let row = 0; row < footprintSize; row += 1) {
    for (let column = 0; column < footprintSize; column += 1) {
      cells.push({ x: Math.floor(x) + column, y: Math.floor(y) + row });
    }
  }
  return cells;
};

/** Logical grid footprint. Token coordinates are top-left normalized map coordinates. */
export const getOccupiedGridSpace = (combatant, mapState = {}) => {
  if (!combatant) return null;
  const token = tokenFor(combatant, mapState);
  const { columns, rows } = getGridDimensions(mapState?.campaignMap || mapState);
  const column = number(token.gridX ?? token.column ?? token.col);
  const row = number(token.gridY ?? token.row);
  const normalizedX = number(token.x ?? token.position?.x);
  const normalizedY = number(token.y ?? token.position?.y);
  const x = column ?? (normalizedX === null ? null : Math.floor(normalizedX * columns));
  const y = row ?? (normalizedY === null ? null : Math.floor(normalizedY * rows));
  if (x === null || y === null) return null;
  const size = getOccupiedSquareSize(token?.size ? token : combatant);
  const cells = getOccupiedGridCells({ anchorCell: { x, y }, size });
  return {
    left: cells[0].x,
    top: cells[0].y,
    right: cells[cells.length - 1].x,
    bottom: cells[cells.length - 1].y,
    size,
    cells,
  };
};

/** Chebyshev edge-to-edge distance, matching the board's diagonal-adjacency rule. */
export const getGridDistanceFeet = (sourceCombatant, targetCombatant, mapState = {}) => {
  const source = getOccupiedGridSpace(sourceCombatant, mapState);
  const target = getOccupiedGridSpace(targetCombatant, mapState);
  if (!source || !target) return Infinity;
  const horizontalGap = Math.max(0, target.left - source.right, source.left - target.right);
  const verticalGap = Math.max(0, target.top - source.bottom, source.top - target.bottom);
  return Math.max(horizontalGap, verticalGap) * 5;
};

export default getGridDistanceFeet;
