import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Form, Modal, Row, Col } from 'react-bootstrap';
import { rollDiceWithBox, setDiceBoxThemeColor } from '../../../utils/diceBoxManager';
import { DEFAULT_DICE_COLOR, normalizeDiceColor } from '../../../utils/diceColors';

const MAX_DICE_COUNT = 50;
const MAX_DIE_SIDES = 1000;
const COMMON_DICE_OPTIONS = [4, 6, 8, 10, 12, 20, 100];
const DEFAULT_DIE_SIDES = COMMON_DICE_OPTIONS.includes(20)
  ? 20
  : COMMON_DICE_OPTIONS[0];

const DiceRollerModal = ({
  show = false,
  onHide = () => {},
  onRollComplete = () => {},
  diceColor,
}) => {
  const [diceCount, setDiceCount] = useState('1');
  const [selectedSides, setSelectedSides] = useState(DEFAULT_DIE_SIDES);
  const [customSides, setCustomSides] = useState('');
  const [rolling, setRolling] = useState(false);
  const [error, setError] = useState('');

  const normalizedColor = useMemo(
    () => normalizeDiceColor(diceColor) || DEFAULT_DICE_COLOR,
    [diceColor],
  );

  const parsedCount = useMemo(() => {
    const parsed = Number.parseInt(diceCount, 10);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [diceCount]);

  const resolvedSides = useMemo(() => {
    if (selectedSides === 'custom') {
      const parsed = Number.parseInt(customSides, 10);
      return Number.isFinite(parsed) ? parsed : NaN;
    }
    const parsed = Number(selectedSides);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [selectedSides, customSides]);

  const isValidCount = Number.isInteger(parsedCount) && parsedCount >= 1 && parsedCount <= MAX_DICE_COUNT;
  const isValidSides =
    Number.isInteger(resolvedSides) && resolvedSides >= 2 && resolvedSides <= MAX_DIE_SIDES;

  useEffect(() => {
    if (show) {
      setDiceBoxThemeColor(normalizedColor);
    }
  }, [show, normalizedColor]);

  useEffect(() => {
    if (!show) {
      setRolling(false);
      setError('');
    }
  }, [show]);

  const handleCountChange = useCallback((event) => {
    setDiceCount(event.target.value);
  }, []);

  const handleSidesChange = useCallback((event) => {
    const value = event.target.value;
    setSelectedSides(value === 'custom' ? 'custom' : Number.parseInt(value, 10));
  }, []);

  const handleCustomSidesChange = useCallback((event) => {
    setCustomSides(event.target.value);
  }, []);

  const handleRoll = useCallback(
    async (event) => {
      event?.preventDefault();
      if (rolling) {
        return;
      }

      if (!isValidCount) {
        setError(`Enter a dice count between 1 and ${MAX_DICE_COUNT}.`);
        return;
      }

      if (!isValidSides) {
        setError(`Choose dice with between 2 and ${MAX_DIE_SIDES} sides.`);
        return;
      }

      setError('');
      setRolling(true);
      onHide();

      try {
        const response = await rollDiceWithBox([
          {
            count: parsedCount,
            sides: resolvedSides,
          },
        ]);

        const values = Array.isArray(response?.rolls?.[0])
          ? response.rolls[0].map((value) => Number(value) || 0)
          : [];
        const total = values.reduce((sum, value) => sum + value, 0);

        onRollComplete({
          total,
          count: parsedCount,
          sides: resolvedSides,
          values,
          usedFallback: Boolean(response?.usedFallback),
        });
      } catch (rollError) {
        console.error('Rolling the dice failed.', rollError);
      } finally {
        setRolling(false);
      }
    },
    [
      rolling,
      isValidCount,
      isValidSides,
      parsedCount,
      resolvedSides,
      onHide,
      onRollComplete,
    ],
  );

  const canRoll = isValidCount && isValidSides && !rolling;

  return (
    <Modal centered show={show} onHide={onHide} aria-label="Dice roller">
      <Modal.Header closeButton>
        <Modal.Title>Dice Roller</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleRoll}>
        <Modal.Body>
          <Row className="dice-roller-modal__fields g-3" xs={1} sm={2}>
            <Col>
              <Form.Group controlId="dice-roller-count">
                <Form.Label>Number of Dice</Form.Label>
                <Form.Control
                  type="number"
                  min="1"
                  max={MAX_DICE_COUNT}
                  value={diceCount}
                  onChange={handleCountChange}
                  disabled={rolling}
                  autoFocus
                />
              </Form.Group>
            </Col>
            <Col>
              <Form.Group controlId="dice-roller-type">
                <Form.Label>Dice Type</Form.Label>
                <Form.Select
                  value={selectedSides === 'custom' ? 'custom' : String(selectedSides)}
                  onChange={handleSidesChange}
                  disabled={rolling}
                >
                  {COMMON_DICE_OPTIONS.map((sides) => (
                    <option key={`sides-${sides}`} value={String(sides)}>
                      d{sides}
                    </option>
                  ))}
                  <option value="custom">Custom…</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          {selectedSides === 'custom' ? (
            <Form.Group className="mt-3" controlId="dice-roller-custom-sides">
              <Form.Label>Custom Dice Sides</Form.Label>
              <Form.Control
                type="number"
                min="2"
                max={MAX_DIE_SIDES}
                value={customSides}
                onChange={handleCustomSidesChange}
                disabled={rolling}
                placeholder="Enter the number of sides"
              />
            </Form.Group>
          ) : null}
          {error ? (
            <div className="text-danger mt-3" role="alert">
              {error}
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={rolling}>
            Close
          </Button>
          <Button type="submit" variant="primary" disabled={!canRoll}>
            {rolling ? 'Rolling…' : 'Roll'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

DiceRollerModal.propTypes = {
  show: PropTypes.bool,
  onHide: PropTypes.func,
  onRollComplete: PropTypes.func,
  diceColor: PropTypes.string,
};

export default DiceRollerModal;
