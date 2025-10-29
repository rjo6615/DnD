const assignEventValue = (event, key, value) => {
  if (!event || value === undefined) {
    return;
  }

  try {
    event[key] = value; // eslint-disable-line no-param-reassign
  } catch (error) {
    try {
      Object.defineProperty(event, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value,
      });
    } catch (defineError) {
      // Ignore assignment failures.
    }
  }
};

export const enhanceMouseEvent = (event) => {
  if (!event) {
    return event;
  }

  assignEventValue(event, 'pointerType', 'mouse');
  if (event.pointerId === undefined || event.pointerId === null) {
    assignEventValue(event, 'pointerId', -1);
  }

  if (typeof event.button !== 'number') {
    assignEventValue(event, 'button', 0);
  }

  return event;
};

export const enhanceTouchEvent = (event) => {
  if (!event) {
    return event;
  }

  const primaryTouch =
    (event.changedTouches && event.changedTouches[0]) ||
    (event.touches && event.touches[0]) ||
    null;

  if (primaryTouch) {
    assignEventValue(event, 'clientX', primaryTouch.clientX);
    assignEventValue(event, 'clientY', primaryTouch.clientY);
    assignEventValue(event, 'pageX', primaryTouch.pageX);
    assignEventValue(event, 'pageY', primaryTouch.pageY);
    assignEventValue(event, 'pointerId', primaryTouch.identifier ?? 0);
  } else if (event.pointerId === undefined || event.pointerId === null) {
    assignEventValue(event, 'pointerId', 0);
  }

  assignEventValue(event, 'pointerType', 'touch');

  if (typeof event.button !== 'number') {
    assignEventValue(event, 'button', 0);
  }

  return event;
};
