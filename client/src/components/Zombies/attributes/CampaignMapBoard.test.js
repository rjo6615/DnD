import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
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
        onBackgroundClick={overrides.onBackgroundClick}
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

  it('fires onBackgroundClick when the background is clicked without dragging', () => {
    const onBackgroundClick = jest.fn();
    const { container } = renderBoard({ onBackgroundClick });

    const layer = container.querySelector('.campaign-map-board__tokens-layer');
    expect(layer).not.toBeNull();
    if (!layer) {
      return;
    }

    layer.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 400,
      height: 400,
    });

    const pointerDownEvent = createEvent.pointerDown(layer, {
      button: 0,
      pointerId: 10,
      clientX: 200,
      clientY: 200,
      pageX: 200,
      pageY: 200,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(layer, pointerDownEvent);

    const pointerUpEvent = createEvent.pointerUp(layer, {
      button: 0,
      pointerId: 10,
      clientX: 200,
      clientY: 200,
      pageX: 200,
      pageY: 200,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(layer, pointerUpEvent);

    expect(onBackgroundClick).toHaveBeenCalledTimes(1);
    const [coords] = onBackgroundClick.mock.calls[0];
    expect(coords).toEqual(
      expect.objectContaining({
        x: expect.any(Number),
        y: expect.any(Number),
      })
    );
    expect(coords.x).toBeGreaterThanOrEqual(0);
    expect(coords.x).toBeLessThanOrEqual(1);
    expect(coords.y).toBeGreaterThanOrEqual(0);
    expect(coords.y).toBeLessThanOrEqual(1);
    expect(pointerUpEvent.defaultPrevented).toBe(true);
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

  it('marks the last dragged token and enables rotation controls', async () => {
    const onTokenPositionChange = jest.fn();
    const { container, findByRole } = renderBoard({ onTokenPositionChange });

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

    const pointerMoveEvent = createEvent.pointerMove(tokenElement, {
      button: 0,
      pointerId: 1,
      clientX: 150,
      clientY: 120,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(tokenElement, pointerMoveEvent);

    tokenElement = container.querySelector('[data-token-id="char-1"]');
    expect(tokenElement).not.toBeNull();

    const pointerUpEvent = createEvent.pointerUp(tokenElement, {
      button: 0,
      pointerId: 1,
      clientX: 150,
      clientY: 120,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(tokenElement, pointerUpEvent);

    await waitFor(() => {
      const latestToken = container.querySelector('[data-token-id="char-1"]');
      expect(latestToken).not.toBeNull();
      expect(latestToken).toHaveClass('lastDragged');
    });

    tokenElement = container.querySelector('[data-token-id="char-1"]');
    expect(tokenElement).not.toBeNull();

    if (tokenElement) {
      const pointerOverEvent = createEvent.pointerOver(tokenElement, {
        pointerId: 3,
        bubbles: true,
        cancelable: true,
      });
      fireEvent(tokenElement, pointerOverEvent);
    }

    const rotationHandle = await findByRole('button', { name: /rotate figurine/i });
    expect(rotationHandle).not.toBeNull();

    tokenElement = container.querySelector('[data-token-id="char-1"]');
    expect(tokenElement).not.toBeNull();
    if (tokenElement) {
      tokenElement.getBoundingClientRect = () => ({
        left: 100,
        top: 100,
        right: 180,
        bottom: 180,
        width: 80,
        height: 80,
      });
    }

    const pointerDownHandle = createEvent.pointerDown(rotationHandle, {
      button: 0,
      pointerId: 2,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(pointerDownHandle, 'clientX', { value: 180 });
    Object.defineProperty(pointerDownHandle, 'clientY', { value: 140 });
    Object.defineProperty(pointerDownHandle, 'pointerType', { value: 'mouse' });
    Object.defineProperty(pointerDownHandle, 'buttons', { value: 1, configurable: true });
    fireEvent(rotationHandle, pointerDownHandle);

    const pointerUpWithoutDrag = createEvent.pointerUp(document.body, {
      pointerId: 2,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(pointerUpWithoutDrag, 'clientX', { value: 120 });
    Object.defineProperty(pointerUpWithoutDrag, 'clientY', { value: 180 });
    Object.defineProperty(pointerUpWithoutDrag, 'pointerType', { value: 'mouse' });
    fireEvent(document.body, pointerUpWithoutDrag);

    const pointerMoveAfterRelease = createEvent.pointerMove(document.body, {
      pointerId: 2,
      bubbles: true,
      cancelable: true,
      buttons: 0,
    });
    Object.defineProperty(pointerMoveAfterRelease, 'clientX', { value: 120 });
    Object.defineProperty(pointerMoveAfterRelease, 'clientY', { value: 180 });
    Object.defineProperty(pointerMoveAfterRelease, 'pointerType', { value: 'mouse' });
    Object.defineProperty(pointerMoveAfterRelease, 'buttons', { value: 0, configurable: true });
    fireEvent(document.body, pointerMoveAfterRelease);

    await waitFor(() => {
      const latestToken = container.querySelector('[data-token-id="char-1"]');
      expect(latestToken).not.toBeNull();
      expect(Number(latestToken?.getAttribute('data-rotation'))).toBeCloseTo(0, 3);
    });

    const pointerDownHandleActive = createEvent.pointerDown(rotationHandle, {
      button: 0,
      pointerId: 4,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(pointerDownHandleActive, 'clientX', { value: 180 });
    Object.defineProperty(pointerDownHandleActive, 'clientY', { value: 140 });
    Object.defineProperty(pointerDownHandleActive, 'pointerType', { value: 'mouse' });
    Object.defineProperty(pointerDownHandleActive, 'buttons', { value: 1, configurable: true });
    fireEvent(rotationHandle, pointerDownHandleActive);

    const pointerMoveHandle = createEvent.pointerMove(document.body, {
      pointerId: 4,
      bubbles: true,
      cancelable: true,
      buttons: 1,
    });
    Object.defineProperty(pointerMoveHandle, 'clientX', { value: 140 });
    Object.defineProperty(pointerMoveHandle, 'clientY', { value: 180 });
    Object.defineProperty(pointerMoveHandle, 'pointerType', { value: 'mouse' });
    Object.defineProperty(pointerMoveHandle, 'buttons', { value: 1, configurable: true });
    fireEvent(document.body, pointerMoveHandle);

    const pointerUpHandle = createEvent.pointerUp(document.body, {
      pointerId: 4,
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(pointerUpHandle, 'clientX', { value: 140 });
    Object.defineProperty(pointerUpHandle, 'clientY', { value: 180 });
    Object.defineProperty(pointerUpHandle, 'pointerType', { value: 'mouse' });
    fireEvent(document.body, pointerUpHandle);

    expect(onTokenPositionChange).toHaveBeenCalledWith(
      expect.objectContaining({
        characterId: 'char-1',
        rotation: expect.any(Number),
        x: expect.any(Number),
        y: expect.any(Number),
      })
    );

    let lastCall =
      onTokenPositionChange.mock.calls[onTokenPositionChange.mock.calls.length - 1]?.[0];
    expect(lastCall).toBeDefined();
    expect(lastCall.rotation).toBeCloseTo(90, 3);

    tokenElement = container.querySelector('[data-token-id="char-1"]');
    expect(tokenElement).not.toBeNull();
    expect(Number(tokenElement?.getAttribute('data-rotation'))).toBeCloseTo(90, 3);

    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    lastCall = onTokenPositionChange.mock.calls[onTokenPositionChange.mock.calls.length - 1]?.[0];
    expect(lastCall).toBeDefined();
    expect(lastCall.rotation).toBeCloseTo(75, 3);

    tokenElement = container.querySelector('[data-token-id="char-1"]');
    expect(tokenElement).not.toBeNull();
    expect(Number(tokenElement?.getAttribute('data-rotation'))).toBeCloseTo(75, 3);
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

  it('keeps enemy figurine scale aligned with their size category', () => {
    const { container } = renderBoard({
      token: {
        variant: 'enemy',
        size: 'large',
      },
    });

    const tokenElement = container.querySelector('[data-token-id="char-1"]');
    expect(tokenElement).not.toBeNull();
    const scaleValue = Number.parseFloat(
      tokenElement?.style.getPropertyValue('--figurine-size-scale') ?? ''
    );
    expect(scaleValue).toBeCloseTo(2, 5);
  });

  it('provides a finite figurine scale when no size is specified', () => {
    const { container } = renderBoard({
      token: {
        size: undefined,
      },
    });

    const tokenElement = container.querySelector('[data-token-id="char-1"]');
    expect(tokenElement).not.toBeNull();
    const scaleValue = Number.parseFloat(
      tokenElement?.style.getPropertyValue('--figurine-size-scale') ?? ''
    );
    expect(Number.isFinite(scaleValue)).toBe(true);
    expect(scaleValue).toBeCloseTo(1, 5);
  });

  it('derives figurine footprint from image size when map metadata defines pixels per square', async () => {
    const { container } = render(
      <CampaignMapBoard
        map={{ ...baseMap, pixelsPerSquare: 256 }}
        tokens={[
          {
            ...baseToken,
            size: undefined,
            figurineImageUrl: 'https://example.com/figurines/large.png',
          },
        ]}
      />
    );

    const tokenElement = container.querySelector('[data-token-id="char-1"]');
    expect(tokenElement).not.toBeNull();

    const figurineImage = tokenElement?.querySelector('.campaign-map-board__figurine-image');
    expect(figurineImage).not.toBeNull();

    if (figurineImage) {
      Object.defineProperty(figurineImage, 'naturalWidth', {
        configurable: true,
        value: 512,
      });
      Object.defineProperty(figurineImage, 'naturalHeight', {
        configurable: true,
        value: 512,
      });

      fireEvent.load(figurineImage);

      await waitFor(() => {
        expect(tokenElement?.style.getPropertyValue('--figurine-size-scale')).toBe('2');
      });
    }
  });

  it('defaults to medium figurine scale when metadata is unavailable', async () => {
    const { container } = render(
      <CampaignMapBoard
        map={baseMap}
        tokens={[
          {
            ...baseToken,
            size: undefined,
            figurineImageUrl: 'https://example.com/figurines/colossal.png',
          },
        ]}
      />
    );

    const tokenElement = container.querySelector('[data-token-id="char-1"]');
    expect(tokenElement).not.toBeNull();

    const figurineImage = tokenElement?.querySelector('.campaign-map-board__figurine-image');
    expect(figurineImage).not.toBeNull();

    if (figurineImage) {
      Object.defineProperty(figurineImage, 'naturalWidth', {
        configurable: true,
        value: 1024,
      });
      Object.defineProperty(figurineImage, 'naturalHeight', {
        configurable: true,
        value: 1024,
      });

      fireEvent.load(figurineImage);

      await waitFor(() => {
        expect(tokenElement?.style.getPropertyValue('--figurine-size-scale')).toBe('1');
      });
    }
  });

  it('keeps explicit figurine sizes even when image footprint is larger', async () => {
    const { container } = render(
      <CampaignMapBoard
        map={{ ...baseMap, pixelsPerSquare: 256 }}
        tokens={[
          {
            ...baseToken,
            size: 'medium',
            figurineImageUrl: 'https://example.com/figurines/oversized.png',
          },
        ]}
      />
    );

    const tokenElement = container.querySelector('[data-token-id="char-1"]');
    expect(tokenElement).not.toBeNull();

    const figurineImage = tokenElement?.querySelector('.campaign-map-board__figurine-image');
    expect(figurineImage).not.toBeNull();

    if (figurineImage) {
      Object.defineProperty(figurineImage, 'naturalWidth', {
        configurable: true,
        value: 512,
      });
      Object.defineProperty(figurineImage, 'naturalHeight', {
        configurable: true,
        value: 512,
      });

      fireEvent.load(figurineImage);

      await waitFor(() => {
        expect(tokenElement?.style.getPropertyValue('--figurine-size-scale')).toBe('1');
      });
    }
  });

  it('ignores wheel input when zooming is disabled', async () => {
    const { container } = render(
      <CampaignMapBoard map={baseMap} tokens={[baseToken]} allowWheelZoom={false} />
    );

    const boardElement = container.querySelector('.campaign-map-board');
    expect(boardElement).not.toBeNull();
    if (!boardElement) {
      return;
    }

    expect(boardElement.style.getPropertyValue('--campaign-map-zoom')).toBe('');

    fireEvent.wheel(boardElement, { deltaY: -240 });

    await waitFor(() => {
      expect(boardElement.style.getPropertyValue('--campaign-map-zoom')).toBe('');
    });
  });

  it('applies zoom styling when wheel input is allowed', async () => {
    const { container } = render(
      <CampaignMapBoard map={baseMap} tokens={[baseToken]} allowWheelZoom />
    );

    const boardElement = container.querySelector('.campaign-map-board');
    expect(boardElement).not.toBeNull();
    if (!boardElement) {
      return;
    }

    expect(boardElement.style.getPropertyValue('--campaign-map-zoom')).toBe('1');

    fireEvent.wheel(boardElement, { deltaY: -240 });

    await waitFor(() => {
      const zoomValue = boardElement.style.getPropertyValue('--campaign-map-zoom');
      expect(parseFloat(zoomValue)).toBeGreaterThan(1);
    });
  });
});
