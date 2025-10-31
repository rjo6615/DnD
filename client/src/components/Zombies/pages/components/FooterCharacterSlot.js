import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Button, Spinner } from 'react-bootstrap';

import apiFetch from '../../../../utils/apiFetch';

const resolveFigurineImageUrl = (figurine) => {
  if (!figurine || typeof figurine !== 'object') {
    return null;
  }

  const { figurineImageUrl } = figurine;
  if (typeof figurineImageUrl === 'string' && figurineImageUrl.trim() !== '') {
    return figurineImageUrl.trim();
  }

  return null;
};

const FooterCharacterSlot = ({
  characterFigurine,
  characterId,
  characterName,
  currentHealth,
  maxHealth,
  armorClass,
  onHealthChange,
  actions,
  spellSlots,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [pendingHealth, setPendingHealth] = useState(null);
  const pendingCommitRef = useRef(null);

  const { resolvedCurrent, resolvedMax } = useMemo(() => {
    const numericCurrent = Number(currentHealth);
    const numericMax = Number(maxHealth);

    return {
      resolvedCurrent: Number.isFinite(numericCurrent) ? numericCurrent : null,
      resolvedMax: Number.isFinite(numericMax) ? numericMax : null,
    };
  }, [currentHealth, maxHealth]);

  const figurineImageUrl = useMemo(
    () => resolveFigurineImageUrl(characterFigurine),
    [characterFigurine]
  );

  const effectiveCurrent = pendingHealth ?? resolvedCurrent;
  const numericCurrent = Number.isFinite(effectiveCurrent) ? effectiveCurrent : 0;
  const sliderMax =
    resolvedMax !== null && Number.isFinite(resolvedMax) && resolvedMax > 0
      ? resolvedMax
      : Math.max(numericCurrent + 20, 20);
  const healthPercent = sliderMax > 0 ? Math.min((numericCurrent / sliderMax) * 100, 100) : 0;
  const displayCurrent = Number.isFinite(effectiveCurrent) ? Math.round(effectiveCurrent) : '—';
  const displayMax = Number.isFinite(resolvedMax) ? Math.round(resolvedMax) : '—';
  const displayArmorClass = useMemo(() => {
    if (armorClass === null || armorClass === undefined) {
      return '—';
    }

    if (typeof armorClass === 'string') {
      const trimmed = armorClass.trim();
      return trimmed ? trimmed : '—';
    }

    const numeric = Number(armorClass);
    if (Number.isFinite(numeric)) {
      return Math.round(numeric);
    }

    return '—';
  }, [armorClass]);
  const armorClassAriaLabel = useMemo(
    () => (displayArmorClass === '—' ? 'Armor Class unavailable' : `Armor Class ${displayArmorClass}`),
    [displayArmorClass]
  );
  const canDecrease = !isUpdating && numericCurrent > 0;
  const canIncrease =
    !isUpdating &&
    (resolvedMax === null || !Number.isFinite(resolvedMax) || numericCurrent < resolvedMax);

  const clampHealthValue = useCallback(
    (value) => {
      if (!Number.isFinite(value)) {
        return null;
      }

      let next = Math.round(value);
      if (resolvedMax !== null && Number.isFinite(resolvedMax)) {
        next = Math.min(next, resolvedMax);
      }
      next = Math.max(next, 0);
      return next;
    },
    [resolvedMax]
  );

  const updateHealth = useCallback(
    async (nextHealth) => {
      if (!Number.isFinite(nextHealth) || !characterId) {
        return;
      }

      const next = clampHealthValue(nextHealth);
      if (next === null) {
        return;
      }

      if (resolvedCurrent !== null && Number.isFinite(resolvedCurrent) && next === resolvedCurrent) {
        return;
      }

      setError(null);
      setIsUpdating(true);
      try {
        const response = await apiFetch(`/characters/update-temphealth/${characterId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tempHealth: next,
          }),
        });

        if (!response.ok) {
          throw new Error(response.statusText || 'Failed to update health.');
        }

        if (typeof onHealthChange === 'function') {
          onHealthChange(next);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        setError('Failed to update health.');
        setPendingHealth(null);
        pendingCommitRef.current = null;
      } finally {
        setIsUpdating(false);
      }
    },
    [characterId, clampHealthValue, onHealthChange, resolvedCurrent]
  );

  const commitPendingUpdate = useCallback(() => {
    if (pendingCommitRef.current === null) {
      return;
    }
    const valueToCommit = pendingCommitRef.current;
    pendingCommitRef.current = null;
    updateHealth(valueToCommit);
  }, [updateHealth]);

  const handleAdjustHealth = (offset) => {
    if (!Number.isFinite(Number(offset)) || Number(offset) === 0) {
      return;
    }
    if (!characterId) {
      return;
    }

    const base = Number.isFinite(effectiveCurrent) ? effectiveCurrent : 0;
    const next = clampHealthValue(base + Number(offset));
    if (next === null || next === base) {
      return;
    }

    setPendingHealth(next);
    updateHealth(next);
  };

  const handleSliderInput = useCallback(
    (event) => {
      const rawValue = Number(event.target.value);
      if (Number.isNaN(rawValue)) {
        return;
      }

      const next = clampHealthValue(rawValue);
      if (next === null) {
        return;
      }

      setPendingHealth(next);
      pendingCommitRef.current = next;
    },
    [clampHealthValue]
  );

  const handleSliderCommit = useCallback(() => {
    if (isUpdating) {
      return;
    }
    commitPendingUpdate();
  }, [commitPendingUpdate, isUpdating]);

  useEffect(() => {
    if (
      pendingHealth !== null &&
      resolvedCurrent !== null &&
      Number.isFinite(resolvedCurrent) &&
      pendingHealth === resolvedCurrent
    ) {
      setPendingHealth(null);
    }
  }, [pendingHealth, resolvedCurrent]);

  useEffect(() => {
    if (!isUpdating) {
      commitPendingUpdate();
    }
  }, [commitPendingUpdate, isUpdating]);

  return (
    <div className="footer-character-slot" data-allow-pointer-events="true">
      {spellSlots ? (
        <div
          className="footer-character-slot__slots"
          data-allow-pointer-events="true"
        >
          {spellSlots}
        </div>
      ) : null}
      <div className="footer-character-slot__main">
        <div className="footer-character-slot__portrait">
          <div className="footer-character-slot__portrait-ring">
            {figurineImageUrl ? (
              <img
                src={figurineImageUrl}
                alt={
                  characterName
                    ? `${characterName} figurine`
                    : 'Selected character figurine'
                }
                className="footer-character-slot__figurine-image"
              />
            ) : (
              <div className="footer-character-slot__figurine-placeholder" aria-hidden="true">
                <i className="fas fa-chess-king" />
              </div>
            )}
            <span className="footer-character-slot__portrait-gloss" />
          </div>
          <div
            className="footer-character-slot__armor-class"
            aria-live="polite"
            aria-label={armorClassAriaLabel}
          >
            <span className="footer-character-slot__armor-class-label">AC</span>
            <span className="footer-character-slot__armor-class-value">{displayArmorClass}</span>
          </div>
        </div>
        <div className="footer-character-slot__details">
          {characterName && (
            <span className="footer-character-slot__name" title={characterName}>
              {characterName}
            </span>
          )}
          <div className="footer-character-slot__header">
            <span className="footer-character-slot__health-label">Health</span>
            <div className="footer-character-slot__health-readout" aria-live="polite">
              {isUpdating ? (
                <Spinner animation="border" role="status" size="sm">
                  <span className="visually-hidden">Updating health…</span>
                </Spinner>
              ) : (
                <>
                  <span className="footer-character-slot__health-current">{displayCurrent}</span>
                  {displayMax !== '—' && (
                    <span className="footer-character-slot__health-max">/ {displayMax}</span>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="footer-character-slot__health-track" role="presentation">
            <div className="footer-character-slot__health-track-base">
              <div
                className="footer-character-slot__health-track-fill"
                style={{ width: `${healthPercent}%` }}
              />
              <div className="footer-character-slot__health-track-border" />
            </div>
            <input
              type="range"
              min="0"
              max={sliderMax}
              value={numericCurrent}
              onChange={handleSliderInput}
              onMouseUp={handleSliderCommit}
              onTouchEnd={handleSliderCommit}
              onBlur={handleSliderCommit}
              onKeyUp={(event) => {
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End') {
                  handleSliderCommit();
                }
              }}
              className="footer-character-slot__health-slider"
              aria-label="Adjust health"
              aria-valuemin={0}
              aria-valuemax={sliderMax}
              aria-valuenow={numericCurrent}
            />
          </div>
          <div className="footer-character-slot__health-controls" role="group" aria-label="Character health controls">
            <Button
              type="button"
              variant="outline-light"
              className="footer-character-slot__health-button footer-character-slot__health-button--decrease"
              onClick={() => handleAdjustHealth(-1)}
              disabled={!canDecrease}
              aria-label="Decrease health"
            >
              <i className="fas fa-minus" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline-light"
              className="footer-character-slot__health-button footer-character-slot__health-button--increase"
              onClick={() => handleAdjustHealth(1)}
              disabled={!canIncrease}
              aria-label="Increase health"
            >
              <i className="fas fa-plus" aria-hidden="true" />
            </Button>
          </div>
          <div className="footer-character-slot__error" role="status" aria-live="polite">
            {error}
          </div>
        </div>
        {actions ? (
          <div
            className="footer-character-slot__actions"
            data-allow-pointer-events="true"
          >
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
};

FooterCharacterSlot.propTypes = {
  characterFigurine: PropTypes.shape({
    figurineImageUrl: PropTypes.string,
    figurineImagePublicId: PropTypes.string,
  }),
  characterId: PropTypes.string,
  characterName: PropTypes.string,
  currentHealth: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf([null])]),
  maxHealth: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf([null])]),
  armorClass: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
    PropTypes.oneOf([null]),
  ]),
  onHealthChange: PropTypes.func,
  actions: PropTypes.node,
  spellSlots: PropTypes.node,
};

FooterCharacterSlot.defaultProps = {
  characterFigurine: null,
  characterId: null,
  characterName: null,
  currentHealth: null,
  maxHealth: null,
  armorClass: null,
  onHealthChange: undefined,
  actions: null,
  spellSlots: null,
};

export default FooterCharacterSlot;
