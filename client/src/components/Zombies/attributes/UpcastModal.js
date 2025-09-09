import React, { useEffect, useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

/**
 * Modal allowing the user to choose a spell slot level to cast a spell at.
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether the modal is visible.
 * @param {function} props.onHide - Callback when the modal is closed.
 * @param {number} props.baseLevel - Minimum level of the spell.
 * @param {Object} props.slots - Mapping of slot level => remaining slot count.
 * @param {function} props.onSelect - Callback invoked with the chosen level.
 * @param {string} [props.higherLevels] - Description of benefits when upcasting.
 */
export default function UpcastModal({
  show,
  onHide,
  baseLevel = 1,
  slots = {},
  onSelect,
  higherLevels,
}) {
  const availableLevels = Object.keys(slots)
    .map(Number)
    .filter((lvl) => lvl >= baseLevel && slots[lvl] > 0)
    .sort((a, b) => a - b);

  const [level, setLevel] = useState(availableLevels[0] || baseLevel);

  useEffect(() => {
    if (availableLevels.length > 0) setLevel(availableLevels[0]);
  }, [availableLevels.join(','), show]);

  const handleConfirm = () => {
    if (onSelect) onSelect(level);
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
        {availableLevels.length > 0 ? (
          <Form.Select
            aria-label="Slot Level"
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
          >
            {availableLevels.map((lvl) => (
              <option key={lvl} value={lvl}>{`Level ${lvl}`}</option>
            ))}
          </Form.Select>
        ) : (
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
          disabled={availableLevels.length === 0}
        >
          Cast
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

