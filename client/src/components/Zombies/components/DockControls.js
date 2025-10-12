import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

const SIDE_LABELS = {
  left: 'left',
  right: 'right',
};

export default function DockControls({ dockedSide = null, onDockChange, isDocked = false }) {
  const handleDock = useCallback(
    (side) => {
      if (typeof onDockChange !== 'function' || !SIDE_LABELS[side]) {
        return;
      }

      if (dockedSide === side) {
        onDockChange(null);
      } else {
        onDockChange(side);
      }
    },
    [dockedSide, onDockChange]
  );

  if (typeof onDockChange !== 'function') {
    return null;
  }

  const renderButton = (side) => {
    const isActive = dockedSide === side;
    const className = [
      'dock-control',
      `dock-control--${side}`,
      isDocked ? 'dock-control--docked-context' : null,
      isActive ? 'dock-control--active' : null,
    ]
      .filter(Boolean)
      .join(' ');

    const iconDirection = side === 'left' ? 'left' : 'right';
    const title = isActive ? `Undock from the ${side} side` : `Dock to the ${side} side`;

    return (
      <Button
        key={side}
        type="button"
        size="sm"
        variant="outline-light"
        className={className}
        aria-pressed={isActive}
        aria-label={`Dock to the ${side}`}
        title={title}
        onClick={() => handleDock(side)}
      >
        <i className={`fas fa-arrow-${iconDirection}`} aria-hidden="true" />
      </Button>
    );
  };

  return <>{renderButton('left')}{renderButton('right')}</>;
}

DockControls.propTypes = {
  dockedSide: PropTypes.oneOf([null, 'left', 'right']),
  onDockChange: PropTypes.func,
  isDocked: PropTypes.bool,
};

DockControls.defaultProps = {
  dockedSide: null,
  onDockChange: null,
  isDocked: false,
};
