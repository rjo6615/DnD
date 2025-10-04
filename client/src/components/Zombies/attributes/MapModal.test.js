import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MapModal from './MapModal';

let capturedModalProps;

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

describe('MapModal docking props', () => {
  beforeEach(() => {
    capturedModalProps = null;
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
  it('renders figurine overlays for board tokens with imagery metadata', async () => {
    const { container } = render(
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

    const tokenElement = await screen.findByRole('button', { name: 'Hero' });
    expect(tokenElement).toBeInTheDocument();
    expect(tokenElement).toHaveAttribute('aria-label', 'Hero');

    const figurineImage = container.querySelector(
      '[data-token-id="hero"] .campaign-map-board__figurine-image'
    );
    expect(figurineImage).not.toBeNull();
    expect(figurineImage).toHaveAttribute('src', 'https://example.com/figurines/hero.png');
    expect(figurineImage).toHaveAttribute('data-figurine-public-id', 'figurines/heroes/hero');
    expect(figurineImage?.getAttribute('alt')).toBe('');
  });
});
