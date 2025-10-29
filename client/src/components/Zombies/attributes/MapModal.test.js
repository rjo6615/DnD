import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let capturedModalProps;
let mockCapturedBoardProps = [];

jest.mock('react-bootstrap', () => {
  const actual = jest.requireActual('react-bootstrap');
  const ModalMock = Object.assign(
    ({ children, ...props }) => {
      capturedModalProps = props;
      return (
        <div data-testid="mock-modal">
          {children}
        </div>
      );
    },
    {
      Header: ({ children }) => <div>{children}</div>,
      Body: ({ children }) => <div>{children}</div>,
      Footer: ({ children }) => <div>{children}</div>,
      Title: ({ children }) => <div>{children}</div>,
    }
  );

  return {
    ...actual,
    Modal: ModalMock,
  };
});

import * as CampaignMapBoardModule from './CampaignMapBoard';
import MapModal from './MapModal';

const actualCampaignMapBoard = CampaignMapBoardModule.default;

describe('MapModal docking props', () => {
  let campaignMapBoardSpy;

  beforeEach(() => {
    capturedModalProps = null;
    mockCapturedBoardProps = [];
    campaignMapBoardSpy = jest
      .spyOn(CampaignMapBoardModule, 'default')
      .mockImplementation((props) => {
        mockCapturedBoardProps.push(props);
        return actualCampaignMapBoard(props);
      });
  });

  afterEach(() => {
    campaignMapBoardSpy?.mockRestore();
  });

  it('applies docked dialog class and disables backdrop when docked', () => {
    render(<MapModal show isDocked dockedSide="right" />);

    expect(capturedModalProps).not.toBeNull();
    expect(capturedModalProps.dialogClassName).toContain('docked-modal');
    expect(capturedModalProps.dialogClassName).toContain('docked-modal--right');
    expect(capturedModalProps.centered).toBe(false);
    expect(capturedModalProps.backdrop).toBe(false);
    expect(capturedModalProps.enforceFocus).toBe(false);
  });

  it('uses default modal behavior when not docked', () => {
    render(<MapModal show />);

    expect(capturedModalProps).not.toBeNull();
    expect(capturedModalProps.dialogClassName).toBeUndefined();
    expect(capturedModalProps.centered).toBe(true);
    expect(capturedModalProps.backdrop).toBe(true);
    expect(capturedModalProps.enforceFocus).toBe(true);
  });
});

describe('MapModal folder expansion', () => {
  let campaignMapBoardSpy;

  beforeEach(() => {
    mockCapturedBoardProps = [];
    campaignMapBoardSpy = jest
      .spyOn(CampaignMapBoardModule, 'default')
      .mockImplementation((props) => {
        mockCapturedBoardProps.push(props);
        return actualCampaignMapBoard(props);
      });
  });

  afterEach(() => {
    campaignMapBoardSpy?.mockRestore();
  });
  const renderMapModal = (overrideProps = {}) => {
    const maps = [
      { mapId: 'map-1', title: 'Forest Path', folder: 'Encounters' },
      { mapId: 'map-2', title: 'Dungeon Depths', folder: 'Dungeons' },
      { mapId: 'map-3', title: 'Lonely Road' },
    ];

    return render(
      <MapModal
        show
        title="Test Map Modal"
        maps={maps}
        activeMapId="map-1"
        onHide={jest.fn()}
        onSelectMap={jest.fn()}
        onActivateMap={jest.fn()}
        onDeleteMap={jest.fn()}
        {...overrideProps}
      />
    );
  };

  it('expands folders that contain the active map by default and toggles visibility', async () => {
    renderMapModal();

    const encountersToggle = screen.getByTestId('map-modal-folder-encounters-toggle');
    expect(encountersToggle).toHaveAttribute('aria-expanded', 'true');
    expect(encountersToggle).toHaveAttribute('aria-controls', 'map-modal-folder-encounters-body');

    const encountersItem = await screen.findByTestId('map-modal-item-map-1');
    expect(encountersItem.dataset.folder).toBe('Encounters');

    await userEvent.click(encountersToggle);
    await waitFor(() =>
      expect(screen.queryByTestId('map-modal-item-map-1')).not.toBeInTheDocument()
    );

    await userEvent.click(encountersToggle);
    await waitFor(() =>
      expect(screen.getByTestId('map-modal-item-map-1')).toBeInTheDocument()
    );
  });

  it('allows collapsed folders to be expanded to reveal their maps', async () => {
    renderMapModal();

    const dungeonsToggle = screen.getByTestId('map-modal-folder-dungeons-toggle');
    expect(dungeonsToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('map-modal-item-map-2')).not.toBeInTheDocument();

    await userEvent.click(dungeonsToggle);
    const dungeonItem = await screen.findByTestId('map-modal-item-map-2');
    expect(dungeonItem.dataset.folder).toBe('Dungeons');

    const noFolderToggle = screen.getByTestId('map-modal-folder-no-folder-toggle');
    expect(noFolderToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('map-modal-item-map-3')).not.toBeInTheDocument();

    await userEvent.click(noFolderToggle);
    const noFolderItem = await screen.findByTestId('map-modal-item-map-3');
    expect(noFolderItem.dataset.folder).toBeUndefined();
  });
});

describe('MapModal figurine imagery', () => {
  let campaignMapBoardSpy;

  beforeEach(() => {
    mockCapturedBoardProps = [];
    campaignMapBoardSpy = jest
      .spyOn(CampaignMapBoardModule, 'default')
      .mockImplementation((props) => {
        mockCapturedBoardProps.push(props);
        return actualCampaignMapBoard(props);
      });
  });

  afterEach(() => {
    campaignMapBoardSpy?.mockRestore();
  });
  it('renders figurine overlays for board tokens with imagery metadata', async () => {
    render(
      <MapModal
        show
        onHide={jest.fn()}
        maps={[
          {
            mapId: 'map-1',
            title: 'Forest Path',
            imageUrl: 'https://example.com/map.png',
          },
        ]}
        activeMapId="map-1"
        tokensByMapId={{
          'map-1': {
            hero: {
              characterId: 'hero',
              x: 0.25,
              y: 0.5,
              imageUrl: ' https://example.com/figurines/hero.png ',
              cloudinaryPublicId: ' figurines/heroes/hero ',
            },
          },
        }}
        currentCharacterId="hero"
        activeCharacterId="hero"
        characterLookup={{
          hero: {
            label: 'Hero',
            entityType: 'character',
          },
        }}
        onTokenMove={jest.fn()}
        onTokenRemove={jest.fn()}
        readOnly={false}
      />
    );

    await waitFor(() => expect(mockCapturedBoardProps.length).toBeGreaterThan(0));
    const boardProps = mockCapturedBoardProps[mockCapturedBoardProps.length - 1];
    expect(boardProps.tokens).toHaveLength(1);
    expect(boardProps.tokens[0]).toMatchObject({
      characterId: 'hero',
      label: 'Hero',
      figurineImageUrl: 'https://example.com/figurines/hero.png',
      figurineImagePublicId: 'figurines/heroes/hero',
    });
  });

  it('renders figurine overlays when imagery metadata is only available in character lookup', async () => {
    render(
      <MapModal
        show
        onHide={jest.fn()}
        maps={[
          {
            mapId: 'map-1',
            title: 'Forest Path',
            imageUrl: 'https://example.com/map.png',
          },
        ]}
        activeMapId="map-1"
        tokensByMapId={{
          'map-1': {
            hero: {
              characterId: 'hero',
              x: 0.5,
              y: 0.5,
            },
          },
        }}
        currentCharacterId="hero"
        activeCharacterId="hero"
        characterLookup={{
          hero: {
            label: 'Hero',
            entityType: 'character',
            figurineImageUrl: ' https://example.com/figurines/lookup-hero.png ',
            figurineImagePublicId: ' figurines/heroes/lookup-hero ',
          },
        }}
        onTokenMove={jest.fn()}
        onTokenRemove={jest.fn()}
        readOnly={false}
      />
    );

    await waitFor(() => expect(mockCapturedBoardProps.length).toBeGreaterThan(0));
    const boardProps = mockCapturedBoardProps[mockCapturedBoardProps.length - 1];
    expect(boardProps.tokens).toHaveLength(1);
    expect(boardProps.tokens[0]).toMatchObject({
      characterId: 'hero',
      figurineImageUrl: 'https://example.com/figurines/lookup-hero.png',
      figurineImagePublicId: 'figurines/heroes/lookup-hero',
    });
  });

  it('treats the current character id case-insensitively for movable tokens', async () => {
    render(
      <MapModal
        show
        map={{ mapId: 'map-1', title: 'Dungeon', imageUrl: 'https://example.com/map.png' }}
        activeMapId="map-1"
        tokensByMapId={{
          'map-1': {
            'CHAR-1': {
              characterId: 'CHAR-1',
              x: 0.1,
              y: 0.2,
            },
          },
        }}
        currentCharacterId="char-1"
        activeCharacterId="char-1"
        characterLookup={{
          'CHAR-1': {
            label: 'Hero',
          },
        }}
        onTokenMove={jest.fn()}
      />
    );

    await waitFor(() => expect(mockCapturedBoardProps.length).toBeGreaterThan(0));
    const boardProps = mockCapturedBoardProps[mockCapturedBoardProps.length - 1];
    expect(boardProps.tokens).toHaveLength(1);
    expect(boardProps.tokens[0]).toMatchObject({
      characterId: 'CHAR-1',
      isMovable: true,
    });
  });

  it('treats prefixed character identifiers as movable for the current player', async () => {
    render(
      <MapModal
        show
        map={{ mapId: 'map-1', title: 'Dungeon', imageUrl: 'https://example.com/map.png' }}
        activeMapId="map-1"
        tokensByMapId={{
          'map-1': {
            'characters/hero': {
              characterId: 'characters/hero',
              x: 0.4,
              y: 0.6,
            },
          },
        }}
        currentCharacterId="hero"
        activeCharacterId="hero"
        characterLookup={{
          hero: { label: 'Hero' },
        }}
        onTokenMove={jest.fn()}
      />
    );

    await waitFor(() => expect(mockCapturedBoardProps.length).toBeGreaterThan(0));
    const boardProps = mockCapturedBoardProps[mockCapturedBoardProps.length - 1];
    expect(boardProps.tokens).toHaveLength(1);
    expect(boardProps.tokens[0]).toMatchObject({
      characterId: 'characters/hero',
      isMovable: true,
    });
  });
});

describe('MapModal background interaction resolution', () => {
  let campaignMapBoardSpy;

  beforeEach(() => {
    mockCapturedBoardProps = [];
    campaignMapBoardSpy = jest
      .spyOn(CampaignMapBoardModule, 'default')
      .mockImplementation((props) => {
        mockCapturedBoardProps.push(props);
        return actualCampaignMapBoard(props);
      });
  });

  afterEach(() => {
    campaignMapBoardSpy?.mockRestore();
  });

  it('derives placement identifiers from nested map metadata for background boards', async () => {
    const objectId = '507f1f77bcf86cd799439011';

    render(
      <MapModal
        show
        displayMode="background"
        map={{
          _id: { $oid: objectId },
          metadata: { identifier: { value: { $id: objectId } } },
          imageUrl: 'https://example.com/maps/campaign.jpg',
        }}
        activeMapId={`ObjectId("${objectId}")`}
        tokensByMapId={{
          [objectId]: {
            hero: { characterId: 'hero', x: 0.25, y: 0.75 },
          },
        }}
        currentCharacterId="hero"
        activeCharacterId="hero"
        characterLookup={{ hero: { label: 'Hero' } }}
        onTokenMove={jest.fn()}
        onTokenRemove={jest.fn()}
      />
    );

    const wrapper = await screen.findByTestId('map-modal-wrapper');
    expect(wrapper.className).toContain('map-modal-background--interactive');

    await waitFor(() => expect(mockCapturedBoardProps.length).toBeGreaterThan(0));
    const boardProps = mockCapturedBoardProps[mockCapturedBoardProps.length - 1];

    expect(boardProps.onTokenPositionChange).toEqual(expect.any(Function));
    expect(boardProps.onBackgroundClick).toEqual(expect.any(Function));
    expect(boardProps.onTokenRemove).toEqual(expect.any(Function));
  });
});

describe('MapModal background interactions', () => {
  let campaignMapBoardSpy;

  beforeEach(() => {
    mockCapturedBoardProps = [];
    campaignMapBoardSpy = jest
      .spyOn(CampaignMapBoardModule, 'default')
      .mockImplementation((props) => {
        mockCapturedBoardProps.push(props);
        return actualCampaignMapBoard(props);
      });
  });

  afterEach(() => {
    campaignMapBoardSpy?.mockRestore();
  });

  it('allows interactivity when only an _id is available for the map', async () => {
    const handleTokenMove = jest.fn().mockResolvedValue(true);

    render(
      <MapModal
        show
        displayMode="background"
        map={{ _id: 'map-abc', title: 'Fallback Map', imageUrl: 'https://example.com/map.png' }}
        tokensByMapId={{
          'map-abc': {
            hero: {
              characterId: 'hero',
              x: 0.25,
              y: 0.75,
            },
          },
        }}
        currentCharacterId="hero"
        characterLookup={{
          hero: {
            label: 'Hero',
          },
        }}
        onTokenMove={handleTokenMove}
        onTokenRemove={jest.fn()}
      />
    );

    await waitFor(() => expect(mockCapturedBoardProps.length).toBeGreaterThan(0));
    const boardProps = mockCapturedBoardProps[mockCapturedBoardProps.length - 1];
    expect(boardProps.tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ characterId: 'hero', label: 'Hero' }),
      ])
    );
    expect(boardProps.disabled).toBe(false);
    expect(typeof boardProps.onTokenPositionChange).toBe('function');

    await act(async () => {
      boardProps.onTokenPositionChange?.({ characterId: 'hero', x: 0.4, y: 0.5 });
    });

    await waitFor(() =>
      expect(handleTokenMove).toHaveBeenCalledWith(
        expect.objectContaining({
          mapId: 'map-abc',
          characterId: 'hero',
          x: 0.4,
          y: 0.5,
        })
      )
    );
  });

  it('keeps the background board interactive when the preview map lacks an identifier', async () => {
    const handleTokenMove = jest.fn().mockResolvedValue(true);

    render(
      <MapModal
        show
        displayMode="background"
        map={{
          title: 'Mystery Cavern',
          imageUrl: 'https://example.com/mystery-cavern.png',
        }}
        tokensByMapId={{
          'token-map': {
            hero: {
              characterId: 'hero',
              x: 0.2,
              y: 0.3,
            },
          },
        }}
        currentCharacterId="hero"
        characterLookup={{ hero: { label: 'Hero' } }}
        onTokenMove={handleTokenMove}
        onTokenRemove={jest.fn()}
      />
    );

    const wrapper = await screen.findByTestId('map-modal-wrapper');
    expect(wrapper.className).toContain('map-modal-background--interactive');

    await waitFor(() => expect(mockCapturedBoardProps.length).toBeGreaterThan(0));
    const boardProps = mockCapturedBoardProps[mockCapturedBoardProps.length - 1];

    await act(async () => {
      boardProps.onTokenPositionChange?.({ characterId: 'hero', x: 0.4, y: 0.6 });
    });

    await waitFor(() =>
      expect(handleTokenMove).toHaveBeenCalledWith(
        expect.objectContaining({
          mapId: 'token-map',
          characterId: 'hero',
          x: 0.4,
          y: 0.6,
        })
      )
    );
  });

  it('treats snake_case map identifiers as interactive background boards', async () => {
    const handleTokenMove = jest.fn().mockResolvedValue(true);

    render(
      <MapModal
        show
        displayMode="background"
        map={{
          map_id: 'legacy-map-123',
          metadata: { map_identifier: { value: { $id: 'legacy-map-123' } } },
          imageUrl: 'https://example.com/legacy-map.png',
        }}
        tokensByMapId={{
          'legacy-map-123': {
            hero: {
              characterId: 'hero',
              x: 0.5,
              y: 0.5,
            },
          },
        }}
        currentCharacterId="hero"
        characterLookup={{ hero: { label: 'Hero' } }}
        onTokenMove={handleTokenMove}
        onTokenRemove={jest.fn()}
      />
    );

    const wrapper = await screen.findByTestId('map-modal-wrapper');
    expect(wrapper.className).toContain('map-modal-background--interactive');

    await waitFor(() => expect(mockCapturedBoardProps.length).toBeGreaterThan(0));
    const boardProps = mockCapturedBoardProps[mockCapturedBoardProps.length - 1];
    expect(typeof boardProps.onTokenPositionChange).toBe('function');

    await act(async () => {
      boardProps.onTokenPositionChange?.({ characterId: 'hero', x: 0.6, y: 0.7 });
    });

    await waitFor(() =>
      expect(handleTokenMove).toHaveBeenCalledWith(
        expect.objectContaining({
          mapId: 'legacy-map-123',
          characterId: 'hero',
          x: 0.6,
          y: 0.7,
        })
      )
    );
  });

  it('allows interactivity when map identifiers only exist in the token payload', async () => {
    const handleTokenMove = jest.fn().mockResolvedValue(true);

    render(
      <MapModal
        show
        displayMode="background"
        map={{ title: 'Token Only Map', imageUrl: 'https://example.com/map.png' }}
        tokensByMapId={{
          '  map-xyz  ': {
            rogue: {
              characterId: 'rogue',
              x: 0.1,
              y: 0.2,
            },
          },
        }}
        currentCharacterId="rogue"
        characterLookup={{
          rogue: {
            label: 'Rogue',
          },
        }}
        onTokenMove={handleTokenMove}
        onTokenRemove={jest.fn()}
      />
    );

    await waitFor(() => expect(mockCapturedBoardProps.length).toBeGreaterThan(0));
    const boardProps = mockCapturedBoardProps[mockCapturedBoardProps.length - 1];
    expect(boardProps.tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ characterId: 'rogue', label: 'Rogue', isMovable: true }),
      ])
    );
    expect(boardProps.disabled).toBe(false);

    await act(async () => {
      boardProps.onTokenPositionChange?.({ characterId: 'rogue', x: 0.3, y: 0.4 });
    });

    await waitFor(() =>
      expect(handleTokenMove).toHaveBeenCalledWith(
        expect.objectContaining({
          mapId: 'map-xyz',
          characterId: 'rogue',
          x: 0.3,
          y: 0.4,
        })
      )
    );
  });

  it('prioritizes the provided background map even when saved maps exist', async () => {
    const backgroundMap = {
      _id: 'primary-map',
      title: 'Primary Map',
      imageUrl: 'https://example.com/primary-map.png',
    };

    render(
      <MapModal
        show
        displayMode="background"
        map={backgroundMap}
        maps={[
          {
            mapId: 'saved-map',
            title: 'Saved Map',
            imageUrl: 'https://example.com/saved-map.png',
          },
        ]}
        onTokenMove={jest.fn()}
        onTokenRemove={jest.fn()}
      />
    );

    await waitFor(() => expect(mockCapturedBoardProps.length).toBeGreaterThan(0));
    const boardProps = mockCapturedBoardProps[mockCapturedBoardProps.length - 1];

    expect(boardProps.map).toEqual(backgroundMap);
  });

  it('renders the background board without overlay controls', async () => {
    render(
      <MapModal
        show
        displayMode="background"
        map={{ _id: 'map-xyz', title: 'Full Screen Map', imageUrl: 'https://example.com/map.png' }}
      />
    );

    await screen.findByTestId('map-modal-wrapper');

    expect(screen.queryByTestId('map-modal-background-hide-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('map-modal-background-show-panel')).not.toBeInTheDocument();
  });
});
