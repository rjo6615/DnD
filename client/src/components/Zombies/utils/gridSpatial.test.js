import { getGridDistanceFeet, getOccupiedGridCells, getOccupiedGridSpace } from './gridSpatial';

const map = { gridColumns: 20, gridRows: 20 };

it.each([
  ['medium', 1], ['large', 4], ['huge', 9], ['gargantuan', 16],
])('returns the shared %s footprint cells', (size, count) => {
  const cells = getOccupiedGridCells({ anchorCell: { x: 3, y: 7 }, sizeCategory: size });
  expect(cells).toHaveLength(count);
  expect(cells[0]).toEqual({ x: 3, y: 7 });
});

it('measures Medium-to-Large adjacency from occupied square edges', () => {
  const barbarian = { characterId: 'barbarian', gridX: 4, gridY: 5, size: 'medium' };
  const troll = { characterId: 'troll', gridX: 5, gridY: 5, size: 'large' };
  expect(getGridDistanceFeet(barbarian, troll, map)).toBe(5);
  expect(getOccupiedGridSpace(troll, map)).toMatchObject({ left: 5, top: 5, right: 6, bottom: 6 });
});

it('counts diagonal adjacency as 5 feet and one empty square as 10 feet', () => {
  const large = { gridX: 5, gridY: 5, size: 'large' };
  expect(getGridDistanceFeet({ gridX: 4, gridY: 4, size: 'medium' }, large, map)).toBe(5);
  expect(getGridDistanceFeet({ gridX: 3, gridY: 5, size: 'medium' }, large, map)).toBe(10);
});

it('never returns a negative distance for overlapping footprints', () => {
  expect(getGridDistanceFeet({ gridX: 5, gridY: 5 }, { gridX: 4, gridY: 4, size: 'huge' }, map)).toBe(0);
});

it('resolves normalized map-token coordinates independently of sprite bounds', () => {
  const state = { gridColumns: 20, gridRows: 20, tokens: [
    { characterId: 'a', x: 0.2, y: 0.25, size: 'medium' },
    { characterId: 'b', x: 0.25, y: 0.25, size: 'large' },
  ] };
  expect(getGridDistanceFeet({ characterId: 'a' }, { characterId: 'b' }, state)).toBe(5);
});
