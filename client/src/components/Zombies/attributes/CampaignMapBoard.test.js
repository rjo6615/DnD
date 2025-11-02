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
    expect(pointerDownEvent.defaultPrevented).toBe(true);

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

  it('clamps map panning to the viewport bounds', async () => {
    const { container } = renderBoard();

    const layer = container.querySelector('.campaign-map-board__tokens-layer');
    const stage = container.querySelector('.campaign-map-board__stage');

    expect(layer).not.toBeNull();
    expect(stage).not.toBeNull();

    if (!layer || !stage) {
      return;
    }

    layer.setPointerCapture = jest.fn();
    layer.releasePointerCapture = jest.fn();

    const baseRect = {
      left: -200,
      top: -150,
      width: 1400,
      height: 1000,
    };

    const parsePanValue = (property) => {
      const raw = stage.style.getPropertyValue(property);
      const parsed = Number.parseFloat(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    layer.getBoundingClientRect = () => {
      const offsetX = parsePanValue('--campaign-map-pan-x');
      const offsetY = parsePanValue('--campaign-map-pan-y');

      return {
        left: baseRect.left + offsetX,
        right: baseRect.left + offsetX + baseRect.width,
        top: baseRect.top + offsetY,
        bottom: baseRect.top + offsetY + baseRect.height,
        width: baseRect.width,
        height: baseRect.height,
      };
    };

    const mouseDownEvent = createEvent.mouseDown(layer, {
      button: 0,
      clientX: 400,
      clientY: 300,
      pageX: 400,
      pageY: 300,
      bubbles: true,
      cancelable: true,
    });

    fireEvent(layer, mouseDownEvent);

    const mouseMoveRight = createEvent.mouseMove(layer, {
      button: 0,
      clientX: 1200,
      clientY: 300,
      pageX: 1200,
      pageY: 300,
      bubbles: true,
      cancelable: true,
    });

    fireEvent(layer, mouseMoveRight);
    expect(mouseMoveRight.defaultPrevented).toBe(true);

    await waitFor(() => {
      const panX = Number.parseFloat(stage.style.getPropertyValue('--campaign-map-pan-x'));
      expect(panX).toBeCloseTo(-baseRect.left, 5);
    });

    const mouseMoveLeft = createEvent.mouseMove(layer, {
      button: 0,
      clientX: -1200,
      clientY: 300,
      pageX: -1200,
      pageY: 300,
      bubbles: true,
      cancelable: true,
    });

    fireEvent(layer, mouseMoveLeft);
    expect(mouseMoveLeft.defaultPrevented).toBe(true);

    await waitFor(() => {
      const panX = Number.parseFloat(stage.style.getPropertyValue('--campaign-map-pan-x'));
      const expectedMinX = window.innerWidth - (baseRect.left + baseRect.width);
      expect(panX).toBeCloseTo(expectedMinX, 5);
    });

    const mouseMoveDown = createEvent.mouseMove(layer, {
      button: 0,
      clientX: -1200,
      clientY: 1200,
      pageX: -1200,
      pageY: 1200,
      bubbles: true,
      cancelable: true,
    });

    fireEvent(layer, mouseMoveDown);
    expect(mouseMoveDown.defaultPrevented).toBe(true);

    await waitFor(() => {
      const panY = Number.parseFloat(stage.style.getPropertyValue('--campaign-map-pan-y'));
      expect(panY).toBeCloseTo(-baseRect.top, 5);
    });

    const mouseMoveUp = createEvent.mouseMove(layer, {
      button: 0,
      clientX: -1200,
      clientY: -1200,
      pageX: -1200,
      pageY: -1200,
      bubbles: true,
      cancelable: true,
    });

    fireEvent(layer, mouseMoveUp);
    expect(mouseMoveUp.defaultPrevented).toBe(true);

    await waitFor(() => {
      const panY = Number.parseFloat(stage.style.getPropertyValue('--campaign-map-pan-y'));
      const expectedMinY = window.innerHeight - (baseRect.top + baseRect.height);
      expect(panY).toBeCloseTo(expectedMinY, 5);
    });

    const mouseUpEvent = createEvent.mouseUp(layer, {
      button: 0,
      clientX: -1200,
      clientY: -1200,
      pageX: -1200,
      pageY: -1200,
      bubbles: true,
      cancelable: true,
    });

    fireEvent(layer, mouseUpEvent);
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
      const pointerEventsSupported = 'PointerEvent' in window;
      const hoverEvent = pointerEventsSupported
        ? createEvent.pointerOver(tokenElement, {
            pointerId: 3,
            bubbles: true,
            cancelable: true,
          })
        : createEvent.mouseOver(tokenElement, {
            bubbles: true,
            cancelable: true,
          });
      fireEvent(tokenElement, hoverEvent);
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

    const pointerEventsSupported = 'PointerEvent' in window;

    if (pointerEventsSupported) {
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
    } else {
      const mouseDownHandle = createEvent.mouseDown(rotationHandle, {
        button: 0,
        clientX: 180,
        clientY: 140,
        bubbles: true,
        cancelable: true,
      });
      fireEvent(rotationHandle, mouseDownHandle);

      const mouseUpWithoutDrag = createEvent.mouseUp(document.body, {
        clientX: 120,
        clientY: 180,
        bubbles: true,
        cancelable: true,
      });
      fireEvent(document.body, mouseUpWithoutDrag);

      const mouseMoveAfterRelease = createEvent.mouseMove(document.body, {
        clientX: 120,
        clientY: 180,
        bubbles: true,
        cancelable: true,
        buttons: 0,
      });
      fireEvent(document.body, mouseMoveAfterRelease);
    }

    await waitFor(() => {
      const latestToken = container.querySelector('[data-token-id="char-1"]');
      expect(latestToken).not.toBeNull();
      expect(Number(latestToken?.getAttribute('data-rotation'))).toBeCloseTo(0, 3);
    });

    if (pointerEventsSupported) {
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
    } else {
      const mouseDownHandleActive = createEvent.mouseDown(rotationHandle, {
        button: 0,
        clientX: 180,
        clientY: 140,
        bubbles: true,
        cancelable: true,
      });
      fireEvent(rotationHandle, mouseDownHandleActive);

      const mouseMoveHandle = createEvent.mouseMove(document.body, {
        clientX: 140,
        clientY: 180,
        bubbles: true,
        cancelable: true,
        buttons: 1,
      });
      fireEvent(document.body, mouseMoveHandle);

      const mouseUpHandle = createEvent.mouseUp(document.body, {
        clientX: 140,
        clientY: 180,
        bubbles: true,
        cancelable: true,
      });
      fireEvent(document.body, mouseUpHandle);
    }

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

  it('falls back to image dimensions when metadata is unavailable', async () => {
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
        expect(tokenElement?.style.getPropertyValue('--figurine-size-scale')).toBe('2');
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
});
