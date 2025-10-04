import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { createEvent } from '@testing-library/dom';
import CampaignMapBoard from './CampaignMapBoard';

describe('CampaignMapBoard pointer interactions', () => {
  const baseMap = {
    mapId: 'map-1',
    title: 'Test Map',
    imageUrl: 'https://example.com/map.png',
  };

  const baseToken = {
    characterId: 'char-1',
    x: 0.25,
    y: 0.25,
    color: '#000',
    label: 'Test Token',
  };

  const renderBoard = (overrides = {}) =>
    render(
      <CampaignMapBoard
        map={baseMap}
        tokens={[{ ...baseToken, ...overrides.token }]}
        onTokenDragStart={overrides.onTokenDragStart}
        onTokenDrag={overrides.onTokenDrag}
        onTokenDragEnd={overrides.onTokenDragEnd}
        onTokenPositionChange={overrides.onTokenPositionChange}
        onTokenRemove={overrides.onTokenRemove}
      />
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignores non-primary pointer input and does not start a drag', () => {
    const onTokenDragStart = jest.fn();
    const onTokenDrag = jest.fn();
    const { container } = renderBoard({
      onTokenDragStart,
      onTokenDrag,
    });

    let tokenElement = container.querySelector('[data-token-id="char-1"]');
    expect(tokenElement).not.toBeNull();

    const pointerDownEvent = createEvent.pointerDown(tokenElement, {
      button: 2,
      pointerId: 2,
      clientX: 150,
      clientY: 150,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(pointerDownEvent, 'button', {
      configurable: true,
      value: 2,
    });
    fireEvent(tokenElement, pointerDownEvent);

    expect(onTokenDragStart).not.toHaveBeenCalled();

    tokenElement = container.querySelector('[data-token-id="char-1"]');
    expect(tokenElement).not.toBeNull();

    const pointerMoveEvent = createEvent.pointerMove(tokenElement, {
      button: 2,
      pointerId: 2,
      clientX: 150,
      clientY: 150,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(tokenElement, pointerMoveEvent);

    expect(pointerMoveEvent.defaultPrevented).toBe(false);
    expect(onTokenDrag).not.toHaveBeenCalled();

    tokenElement = container.querySelector('[data-token-id="char-1"]');
    expect(tokenElement).not.toBeNull();

    const pointerUpEvent = createEvent.pointerUp(tokenElement, {
      button: 2,
      pointerId: 2,
      clientX: 150,
      clientY: 150,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(tokenElement, pointerUpEvent);

    expect(pointerUpEvent.defaultPrevented).toBe(false);
  });

  it('supports dragging with the primary pointer button', () => {
    const onTokenDragStart = jest.fn();
    const onTokenDrag = jest.fn();
    const onTokenDragEnd = jest.fn();
    const onTokenPositionChange = jest.fn();

    const { container } = renderBoard({
      onTokenDragStart,
      onTokenDrag,
      onTokenDragEnd,
      onTokenPositionChange,
    });

    const applyLayerRect = () => {
      const layer = container.querySelector('.campaign-map-board__tokens-layer');
      expect(layer).not.toBeNull();
      if (layer) {
        layer.getBoundingClientRect = () => ({
          left: 0,
          top: 0,
          width: 400,
          height: 400,
        });
      }
      return layer;
    };

    applyLayerRect();

    let tokenElement = container.querySelector('[data-token-id="char-1"]');
    expect(tokenElement).not.toBeNull();

    const pointerDownEvent = createEvent.pointerDown(tokenElement, {
      button: 0,
      pointerId: 1,
      clientX: 100,
      clientY: 100,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(tokenElement, pointerDownEvent);

    applyLayerRect();

    expect(pointerDownEvent.defaultPrevented).toBe(true);
    expect(onTokenDragStart).toHaveBeenCalledWith({
      token: expect.objectContaining({ characterId: 'char-1' }),
      characterId: 'char-1',
    });

    tokenElement = container.querySelector('[data-token-id="char-1"]');
    expect(tokenElement).not.toBeNull();

    const pointerMoveEvent = createEvent.pointerMove(tokenElement, {
      button: 0,
      pointerId: 1,
      clientX: 200,
      clientY: 100,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(tokenElement, pointerMoveEvent);

    expect(pointerMoveEvent.defaultPrevented).toBe(true);

    tokenElement = container.querySelector('[data-token-id="char-1"]');
    expect(tokenElement).not.toBeNull();

    const pointerUpEvent = createEvent.pointerUp(tokenElement, {
      button: 0,
      pointerId: 1,
      clientX: 200,
      clientY: 100,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(tokenElement, pointerUpEvent);

    expect(pointerUpEvent.defaultPrevented).toBe(true);
  });

  it('renders a figurine image overlay when provided and preserves accessibility labels', () => {
    const { container } = renderBoard({
      token: {
        figurineImageUrl: ' https://example.com/figurines/hero.png ',
        figurineImagePublicId: ' figurines/heroes/hero ',
      },
    });

    const tokenElement = container.querySelector('[data-token-id="char-1"]');
    expect(tokenElement).not.toBeNull();
    expect(tokenElement).toHaveAttribute('aria-label', 'Test Token');

    const figurineImage = tokenElement.querySelector('.campaign-map-board__figurine-image');
    expect(figurineImage).not.toBeNull();
    expect(figurineImage).toHaveAttribute('src', 'https://example.com/figurines/hero.png');
    expect(figurineImage).toHaveAttribute('data-figurine-public-id', 'figurines/heroes/hero');
    expect(figurineImage?.getAttribute('alt')).toBe('');
  });
});
