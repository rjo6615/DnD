import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
jest.mock('./MapDisplay', () => ({
  __esModule: true,
  default: jest.fn(({ map }) => (
    <div data-testid="map-display">{map?.title || 'no-map'}</div>
  )),
}));

import MapModal from './MapModal';
import MapDisplay from './MapDisplay';

beforeEach(() => {
  jest.clearAllMocks();
});

test('renders read-only map preview when no management callbacks provided', () => {
  const map = {
    title: 'Ancient Ruins',
    imageUrl: 'https://example.com/ruins.png',
  };

  render(<MapModal show map={map} />);

  expect(screen.queryByTestId('map-modal-sidebar')).not.toBeInTheDocument();
  expect(MapDisplay).toHaveBeenCalledTimes(1);
  expect(MapDisplay.mock.calls[0][0].map).toEqual(map);
});

test('renders map manager list with actions and handles callbacks', async () => {
  const maps = [
    { mapId: 'map-1', title: 'Old Map' },
    { mapId: 'map-2', title: 'New Map' },
  ];
  const onSelectMap = jest.fn();
  const onActivateMap = jest.fn();
  const onDeleteMap = jest.fn();

  render(
    <MapModal
      show
      maps={maps}
      map={maps[0]}
      activeMapId="map-1"
      onSelectMap={onSelectMap}
      onActivateMap={onActivateMap}
      onDeleteMap={onDeleteMap}
    />
  );

  expect(screen.getByTestId('map-modal-sidebar')).toBeInTheDocument();
  expect(screen.getByTestId('map-modal-item-map-1')).toBeInTheDocument();
  expect(screen.getByTestId('map-modal-item-map-2')).toBeInTheDocument();
  expect(screen.getByTestId('map-modal-active-badge-map-1')).toBeInTheDocument();

  await userEvent.click(screen.getByTestId('map-modal-item-map-2'));
  expect(onSelectMap).toHaveBeenCalledWith('map-2');

  await userEvent.click(screen.getByTestId('map-modal-activate-map-2'));
  expect(onActivateMap).toHaveBeenCalledWith('map-2');

  await userEvent.click(screen.getByTestId('map-modal-delete-map-1'));
  expect(onDeleteMap).toHaveBeenCalledWith('map-1');
});

test('shows loading indicator when map manager is loading', () => {
  render(
    <MapModal
      show
      maps={[]}
      isLoading
      onDeleteMap={jest.fn()}
    />
  );

  expect(screen.getByTestId('map-modal-sidebar')).toBeInTheDocument();
  expect(screen.getByTestId('map-modal-loading')).toBeInTheDocument();
});
