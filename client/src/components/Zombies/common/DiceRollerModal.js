import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Form, InputGroup, Modal } from 'react-bootstrap';
import { rollDiceWithBox, setDiceBoxThemeColor } from '../../../utils/diceBoxManager';
import { DEFAULT_DICE_COLOR, normalizeDiceColor } from '../../../utils/diceColors';

const COMMON_DICE = [4, 6, 8, 10, 12, 20];
const MAX_DICE_COUNT = 50;
const MAX_DIE_SIDES = 1000;

const parseDiceExpression = (expression) => {
  if (typeof expression !== 'string') {
    return { error: 'Enter a dice expression such as 2d6 + 1.' };
  }

  const sanitized = expression.replace(/\s+/g, '').toLowerCase();

  if (!sanitized) {
    return { error: 'Enter a dice expression such as 2d6 + 1.' };
  }

  const pattern = /([+-]?)(\d*d\d+|\d+)/g;
  let match;
  let lastIndex = 0;
  const dice = [];
  const modifiers = [];

  while ((match = pattern.exec(sanitized)) !== null) {
    if (match.index !== lastIndex) {
      return { error: 'Invalid characters in dice expression.' };
    }

    lastIndex = pattern.lastIndex;
    const token = match[0];
    const sign = token.startsWith('-') ? -1 : 1;
    const unsigned = token.replace(/^[-+]/, '');

    if (unsigned.includes('d')) {
      const [countPart, sidesPart] = unsigned.split('d');
      const count = countPart ? Number.parseInt(countPart, 10) : 1;
      const sides = Number.parseInt(sidesPart, 10);

      if (!Number.isFinite(count) || count <= 0 || count > MAX_DICE_COUNT) {
        return { error: `Dice count must be between 1 and ${MAX_DICE_COUNT}.` };
      }

      if (!Number.isFinite(sides) || sides <= 1 || sides > MAX_DIE_SIDES) {
        return { error: `Dice must have between 2 and ${MAX_DIE_SIDES} sides.` };
      }

      dice.push({
        count,
        sides,
        sign,
      });
    } else {
      const value = Number.parseInt(unsigned, 10);
      if (!Number.isFinite(value)) {
        return { error: 'Invalid number in dice expression.' };
      }
      modifiers.push(sign * value);
    }
  }

  if (lastIndex !== sanitized.length) {
    return { error: 'Invalid characters in dice expression.' };
  }

  if (dice.length === 0) {
    return { error: 'Add at least one dice term such as 1d6.' };
  }

  const normalizedExpression = [
    ...dice.map(({ count, sides, sign }, index) => {
      const prefix = index === 0 && sign === 1 ? '' : sign === 1 ? '+' : '-';
      return `${prefix}${count}d${sides}`;
    }),
    ...modifiers.map((value) => (value >= 0 ? `+${value}` : `${value}`)),
  ]
    .join(' ')
    .trim();

  return { dice, modifiers, normalizedExpression };
};

const formatDiceValues = (values) =>
  values.map((value) => Number.isFinite(value) ? value : '?').join(' + ');

const DiceRollerModal = ({ show = false, onHide = () => {}, diceColor }) => {
  const [expression, setExpression] = useState('1d20');
  const [error, setError] = useState('');
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);

  const normalizedColor = useMemo(
    () => normalizeDiceColor(diceColor) || DEFAULT_DICE_COLOR,
    [diceColor],
  );

  useEffect(() => {
    if (show) {
      setDiceBoxThemeColor(normalizedColor);
    }
  }, [show, normalizedColor]);

  useEffect(() => {
    if (!show) {
      setError('');
      setRolling(false);
    }
  }, [show]);

  const handleExpressionChange = useCallback((event) => {
    setExpression(event.target.value);
  }, []);

  const handleQuickAdd = useCallback((sides) => {
    setExpression((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) {
        return `1d${sides}`;
      }
      if (/[-+\s]$/.test(trimmed)) {
        return `${trimmed}1d${sides}`;
      }
      return `${trimmed}${trimmed.endsWith('+') || trimmed.endsWith('-') ? '' : ' + '}1d${sides}`;
    });
  }, []);

  const handleRoll = useCallback(
    async (event) => {
      event?.preventDefault();
      if (rolling) {
        return;
      }

      const parsed = parseDiceExpression(expression);
      if (parsed.error) {
        setError(parsed.error);
        return;
      }

      setError('');
      setRolling(true);

      try {
        const { dice, modifiers, normalizedExpression } = parsed;
        const requests = dice.map(({ count, sides }) => ({ count, sides }));
        const response = await rollDiceWithBox(requests);
        const rolls = Array.isArray(response?.rolls) ? response.rolls : [];

        const diceBreakdown = dice.map((group, index) => {
          const values = Array.isArray(rolls[index]) ? rolls[index] : [];
          const subtotal = values.reduce((total, value) => total + (Number(value) || 0), 0);
          const signedTotal = subtotal * group.sign;
          return {
            ...group,
            values,
            subtotal,
            signedTotal,
          };
        });

        const modifiersTotal = modifiers.reduce((total, value) => total + value, 0);
        const diceTotal = diceBreakdown.reduce((total, item) => total + item.signedTotal, 0);
        const total = diceTotal + modifiersTotal;

        setResult({
          expression: normalizedExpression,
          diceBreakdown,
          modifiers,
          total,
          usedFallback: Boolean(response?.usedFallback),
        });
      } catch (rollError) {
        setError('Rolling the dice failed. Please try again.');
      } finally {
        setRolling(false);
      }
    },
    [expression, rolling],
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        handleRoll(event);
      }
    },
    [handleRoll],
  );

  return (
    <Modal centered show={show} onHide={onHide} aria-label="Dice roller">
      <Modal.Header closeButton>
        <Modal.Title>Dice Roller</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleRoll}>
          <Form.Group controlId="custom-dice-expression">
            <Form.Label>Dice Expression</Form.Label>
            <InputGroup>
              <Form.Control
                type="text"
                value={expression}
                onChange={handleExpressionChange}
                onKeyDown={handleKeyDown}
                placeholder="e.g. 2d6 + 1d8 + 3"
                aria-describedby="dice-expression-help"
                disabled={rolling}
                autoFocus
              />
              <Button type="submit" variant="primary" disabled={rolling}>
                {rolling ? 'Rolling…' : 'Roll'}
              </Button>
            </InputGroup>
            <Form.Text id="dice-expression-help" muted>
              Use standard dice notation. You can combine multiple dice and modifiers.
            </Form.Text>
          </Form.Group>
        </Form>
        <div className="dice-roller-modal__quick-buttons" aria-hidden="false">
          {COMMON_DICE.map((sides) => (
            <Button
              key={sides}
              variant="outline-secondary"
              size="sm"
              className="dice-roller-modal__quick-button"
              onClick={() => handleQuickAdd(sides)}
              disabled={rolling}
            >
              +1d{sides}
            </Button>
          ))}
        </div>
        {error ? (
          <div className="text-danger mt-3" role="alert">
            {error}
          </div>
        ) : null}
        {result ? (
          <div className="dice-roller-modal__result mt-3">
            <div className="dice-roller-modal__result-expression text-muted small">
              Expression: {result.expression || expression}
            </div>
            <div className="dice-roller-modal__result-total display-6 fw-bold">
              Total: {result.total}
            </div>
            <ul className="dice-roller-modal__breakdown list-unstyled mb-2">
              {result.diceBreakdown.map((group, index) => {
                const prefix =
                  index === 0 && group.sign > 0 ? '' : group.sign < 0 ? '-' : '+';
                return (
                  <li key={`die-${group.count}d${group.sides}-${index}`}>
                    <strong>
                      {prefix}
                      {group.count}d{group.sides}
                    </strong>{' '}
                    ({formatDiceValues(group.values)} = {group.subtotal})
                  </li>
                );
              })}
              {result.modifiers.map((modifier, index) => (
                <li key={`modifier-${index}`}>
                  <strong>{modifier >= 0 ? '+' : ''}{modifier}</strong>
                </li>
              ))}
            </ul>
            {result.usedFallback ? (
              <div className="text-warning small" role="status">
                3D dice are unavailable, so a basic roll was used.
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={rolling}>
          Close
        </Button>
        <Button variant="primary" onClick={handleRoll} disabled={rolling}>
          {rolling ? 'Rolling…' : 'Roll' }
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

DiceRollerModal.propTypes = {
  show: PropTypes.bool,
  onHide: PropTypes.func,
  diceColor: PropTypes.string,
};

export default DiceRollerModal;
