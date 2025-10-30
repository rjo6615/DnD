import React, { useMemo, useState } from 'react';
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
  onHealthChange,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

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

  const baseCurrent = resolvedCurrent ?? 0;
  const canDecrease = !isUpdating && baseCurrent > 0;
  const canIncrease =
    !isUpdating &&
    (resolvedMax === null || resolvedCurrent === null || resolvedCurrent < resolvedMax);

  const displayCurrent = resolvedCurrent ?? '—';
  const displayMax = resolvedMax ?? '—';

  const handleAdjustHealth = async (offset) => {
    if (!Number.isFinite(Number(offset)) || Number(offset) === 0) {
      return;
    }
    if (isUpdating || !characterId) {
      return;
    }

    let nextHealth = baseCurrent + Number(offset);
    if (resolvedMax !== null) {
      nextHealth = Math.min(nextHealth, resolvedMax);
    }
    nextHealth = Math.max(nextHealth, 0);

    if (!Number.isFinite(nextHealth) || nextHealth === baseCurrent) {
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
          tempHealth: nextHealth,
        }),
      });

      if (!response.ok) {
        throw new Error(response.statusText || 'Failed to update health.');
      }

      setError(null);
      if (typeof onHealthChange === 'function') {
        onHealthChange(nextHealth);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setError('Failed to update health.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="footer-character-slot" data-allow-pointer-events="true">
      <div className="footer-character-slot__figurine">
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
      </div>
      <div className="footer-character-slot__health">
        <span className="footer-character-slot__health-label">Health</span>
        <div className="footer-character-slot__health-controls" role="group" aria-label="Character health controls">
          <Button
            type="button"
            variant="outline-light"
            className="footer-character-slot__health-button"
            onClick={() => handleAdjustHealth(-1)}
            disabled={!canDecrease}
            aria-label="Decrease health"
          >
            <i className="fas fa-minus" aria-hidden="true" />
          </Button>
          <div className="footer-character-slot__health-value" aria-live="polite">
            {isUpdating ? (
              <Spinner animation="border" role="status" size="sm">
                <span className="visually-hidden">Updating health…</span>
              </Spinner>
            ) : (
              <>
                <span className="footer-character-slot__health-current">{displayCurrent}</span>
                {resolvedMax !== null && (
                  <span className="footer-character-slot__health-max">/ {displayMax}</span>
                )}
              </>
            )}
          </div>
          <Button
            type="button"
            variant="outline-light"
            className="footer-character-slot__health-button"
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
  onHealthChange: PropTypes.func,
};

FooterCharacterSlot.defaultProps = {
  characterFigurine: null,
  characterId: null,
  characterName: null,
  currentHealth: null,
  maxHealth: null,
  onHealthChange: undefined,
};

export default FooterCharacterSlot;
