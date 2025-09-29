import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';

jest.mock('./MapDisplay', () => {
  const mock = jest.fn(() => <div data-testid="map-display" />);
  return { __esModule: true, default: mock };
});

jest.mock('./CampaignMapBoard', () => {
  const mock = jest.fn((props) => {
    mock.lastProps = props;
    return <div data-testid="campaign-map-board" />;
  });
  return { __esModule: true, default: mock };
});

import MapModal from './MapModal';

const mockMapDisplay = require('./MapDisplay').default;
const mockCampaignMapBoard = require('./CampaignMapBoard').default;

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('MapModal', () => {
  beforeEach(() => {
    mockMapDisplay.mockClear();
    mockCampaignMapBoard.mockClear();
    delete mockCampaignMapBoard.lastProps;
  });

  it('renders MapDisplay when interactive props are absent', () => {
    render(
      <MapModal
        show
        map={{ mapId: 'map-1', title: 'Test Map' }}
        maps={[{ mapId: 'map-1', title: 'Test Map' }]}
      />
    );

    expect(mockMapDisplay).toHaveBeenCalled();
    expect(mockCampaignMapBoard).not.toHaveBeenCalled();
  });

  it('renders CampaignMapBoard with tokens when interactive props provided', () => {
    const map = {
      mapId: 'map-1',
      title: 'Interactive Map',
      tokens: {
        hero: { characterId: 'hero', x: 0.1, y: 0.2 },
        ally: { characterId: 'ally', x: 0.3, y: 0.4 },
      },
    };

    render(
      <MapModal
        show
        map={map}
        maps={[map]}
        activeMapId="map-1"
        tokensByMapId={{
          'map-1': {
            hero: { characterId: 'hero', x: 0.1, y: 0.2 },
            ally: { characterId: 'ally', x: 0.3, y: 0.4 },
          },
        }}
        currentCharacterId="hero"
        characterLookup={{
          hero: { color: '#123456', label: 'Hero' },
          ally: { color: '#654321', label: 'Ally' },
        }}
        onTokenMove={jest.fn().mockResolvedValue(true)}
      />
    );

    expect(mockCampaignMapBoard).toHaveBeenCalled();
    const boardProps = mockCampaignMapBoard.mock.calls[mockCampaignMapBoard.mock.calls.length - 1][0];
    expect(boardProps.tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          characterId: 'hero',
          isMovable: true,
          color: '#123456',
        }),
        expect.objectContaining({
          characterId: 'ally',
          isMovable: false,
          color: '#654321',
        }),
      ])
    );
    expect(screen.queryByTestId('map-modal-placement-hint')).not.toBeInTheDocument();
  });

  it('shows placement hint and triggers placement from background click', async () => {
    const onTokenMove = jest.fn().mockResolvedValue(true);
    const map = { mapId: 'map-1', title: 'Test Map' };

    render(
      <MapModal
        show
        map={map}
        maps={[map]}
        activeMapId="map-1"
        tokensByMapId={{ 'map-1': {} }}
        currentCharacterId="hero"
        characterLookup={{ hero: { color: '#111111', label: 'Hero' } }}
        onTokenMove={onTokenMove}
      />
    );

    expect(screen.getByTestId('map-modal-placement-hint')).toBeInTheDocument();
    const boardProps = mockCampaignMapBoard.mock.calls[0][0];

    await act(async () => {
      await boardProps.onBackgroundClick({ x: 0.25, y: 0.75 });
    });

    expect(onTokenMove).toHaveBeenCalledWith({
      mapId: 'map-1',
      characterId: 'hero',
      x: 0.25,
      y: 0.75,
    });
  });

  it('shows spinner while placement is pending', async () => {
    const deferred = createDeferred();
    const onTokenMove = jest.fn().mockReturnValue(deferred.promise);
    const map = {
      mapId: 'map-1',
      title: 'Test Map',
      tokens: { hero: { characterId: 'hero', x: 0.2, y: 0.2 } },
    };

    render(
      <MapModal
        show
        map={map}
        maps={[map]}
        activeMapId="map-1"
        tokensByMapId={{ 'map-1': { hero: { characterId: 'hero', x: 0.2, y: 0.2 } } }}
        currentCharacterId="hero"
        characterLookup={{ hero: { color: '#abcdef', label: 'Hero' } }}
        onTokenMove={onTokenMove}
      />
    );

    const boardProps = mockCampaignMapBoard.mock.calls[0][0];

    act(() => {
      boardProps.onTokenPositionChange({ characterId: 'hero', x: 0.4, y: 0.6 });
    });

    expect(await screen.findByTestId('map-modal-placement-pending')).toBeInTheDocument();

    await act(async () => {
      deferred.resolve(true);
      await deferred.promise;
    });

    await waitFor(() =>
      expect(screen.queryByTestId('map-modal-placement-pending')).not.toBeInTheDocument()
    );
  });

  it('displays an error when placement fails', async () => {
    const onTokenMove = jest.fn().mockRejectedValue(new Error('Nope'));
    const map = {
      mapId: 'map-1',
      title: 'Test Map',
      tokens: { hero: { characterId: 'hero', x: 0.2, y: 0.2 } },
    };

    render(
      <MapModal
        show
        map={map}
        maps={[map]}
        activeMapId="map-1"
        tokensByMapId={{ 'map-1': { hero: { characterId: 'hero', x: 0.2, y: 0.2 } } }}
        currentCharacterId="hero"
        characterLookup={{ hero: { color: '#abcdef', label: 'Hero' } }}
        onTokenMove={onTokenMove}
      />
    );

    const boardProps = mockCampaignMapBoard.mock.calls[0][0];

    await act(async () => {
      boardProps.onTokenPositionChange({ characterId: 'hero', x: 0.4, y: 0.6 });
    });

    expect(await screen.findByTestId('map-modal-placement-error')).toHaveTextContent('Nope');
  });
});
