import React, { useEffect, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';

const toRoman = (n) => ['I','II','III','IV','V','VI','VII','VIII','IX','X'][n-1] || n;

/**
 * Modal allowing the user to choose a spell slot level to cast a spell at.
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether the modal is visible.
 * @param {function} props.onHide - Callback when the modal is closed.
 * @param {number} props.baseLevel - Minimum level of the spell.
 * @param {Object} props.slots - Mapping of { regular: {level: count}, warlock: {level: count} }.
 * @param {function} props.onSelect - Callback invoked with the chosen level and slot type.
 * @param {string} [props.higherLevels] - Description of benefits when upcasting.
 */
export default function UpcastModal({
  show,
  onHide,
  baseLevel = 1,
  slots = { regular: {}, warlock: {} },
  onSelect,
  higherLevels,
}) {
  const regularLevels = Object.keys(slots.regular || {})
    .map(Number)
    .filter((lvl) => lvl >= baseLevel && slots.regular[lvl] > 0)
    .sort((a, b) => a - b);
  const warlockLevels = Object.keys(slots.warlock || {})
    .map(Number)
    .filter((lvl) => lvl >= baseLevel && slots.warlock[lvl] > 0)
    .sort((a, b) => a - b);

  const firstRegular = regularLevels[0];
  const firstWarlock = warlockLevels[0];
  const initial =
    typeof firstRegular === 'number'
      ? { level: firstRegular, type: 'regular' }
      : typeof firstWarlock === 'number'
      ? { level: firstWarlock, type: 'warlock' }
      : { level: null, type: null };

  const [selection, setSelection] = useState(initial);

  useEffect(() => {
    setSelection(initial);
  }, [initial.level, initial.type, show]);

  const handleConfirm = () => {
    if (onSelect && selection.level) onSelect(selection.level, selection.type);
    if (onHide) onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Cast at Level</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {higherLevels && (
          <p className="text-muted mb-2">{higherLevels}</p>
        )}
        {regularLevels.length > 0 && (
          <div className="mb-2 d-flex flex-wrap gap-2 justify-content-center">
            {regularLevels.map((lvl) => (
              <div
                key={`regular-${lvl}`}
                className={`spell-slot upcast-slot${
                  selection.type === 'regular' && selection.level === lvl
                    ? ' selected'
                    : ''
                }`}
                onClick={() => setSelection({ level: lvl, type: 'regular' })}
              >
                <div className="slot-level">{toRoman(lvl)}</div>
                <div className="slot-boxes">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="slot-small slot-active" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {warlockLevels.length > 0 && (
          <div className="d-flex flex-wrap gap-2 justify-content-center">
            {warlockLevels.map((lvl) => (
              <div
                key={`warlock-${lvl}`}
                className={`spell-slot upcast-slot warlock-slot${
                  selection.type === 'warlock' && selection.level === lvl
                    ? ' selected'
                    : ''
                }`}
                onClick={() => setSelection({ level: lvl, type: 'warlock' })}
              >
                <div className="slot-level">{toRoman(lvl)}</div>
                <div className="slot-boxes">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="slot-small slot-active" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {regularLevels.length === 0 && warlockLevels.length === 0 && (
          <p>No spell slots of this level available.</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={!selection.level}
        >
          Cast
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

