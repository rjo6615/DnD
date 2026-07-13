import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { Button, Spinner } from 'react-bootstrap';

import apiFetch from '../../../../utils/apiFetch';
import DyingStatePanel from '../../death/DyingStatePanel';
import { normalizeDeathState } from '../../death/deathState';

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
  resourcesDrawer,
  hiddenResourceCount,
  damageSummary,
  onToggleCritical,
  onOpenDamageLog,
  deathState,
  onRollDeathSave,
  isActiveTurn,
  collapseDeathPanelSignal,
  isCombatHudPanelOpen,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [pendingHealth, setPendingHealth] = useState(null);
  const dragStateRef = useRef(null);
  const [damageHighlightClass, setDamageHighlightClass] = useState('');
  const [isResourcesOpen, setIsResourcesOpen] = useState(false);
  const [isDeathPanelOpen, setIsDeathPanelOpen] = useState(false);
  const [deathDockBottomOffset, setDeathDockBottomOffset] = useState(null);
  const normalizedDeathState = useMemo(() => normalizeDeathState(deathState), [deathState]);
  const isDeathStateVisible = normalizedDeathState.isDying || normalizedDeathState.isDead;

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
  const displayCurrent = Number.isFinite(effectiveCurrent) ? Math.round(effectiveCurrent) : '—';
  const displayMax = Number.isFinite(resolvedMax) ? Math.round(resolvedMax) : '—';
  const healthPercent = useMemo(() => {
    if (!Number.isFinite(numericCurrent) || !Number.isFinite(resolvedMax) || resolvedMax <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round((numericCurrent / resolvedMax) * 100)));
  }, [numericCurrent, resolvedMax]);

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

  const normalizedDamageSummary = useMemo(() => {
    if (!damageSummary || typeof damageSummary !== 'object') {
      return { value: null, label: 'Damage', isCritical: false, isFumble: false, timestamp: null };
    }

    const { value, label, isCritical, isFumble, timestamp } = damageSummary;

    return {
      value: value !== undefined ? value : null,
      label: typeof label === 'string' && label.trim() ? label.trim() : 'Damage',
      isCritical: Boolean(isCritical),
      isFumble: Boolean(isFumble),
      timestamp:
        typeof timestamp === 'number' && Number.isFinite(timestamp) ? timestamp : null,
    };
  }, [damageSummary]);

  const {
    value: damageSummaryValue,
    label: damageLabel,
    isCritical: damageIsCritical,
    isFumble: damageIsFumble,
    timestamp: damageTimestamp,
  } = normalizedDamageSummary;

  const hasDamageValue =
    damageSummaryValue !== null &&
    damageSummaryValue !== undefined &&
    !(typeof damageSummaryValue === 'string' && damageSummaryValue.trim() === '');

  const displayDamageValue = hasDamageValue
    ? `${damageSummaryValue}`
    : '—';

  const hasSpellSlots = Boolean(spellSlots);
  const hasResourcesDrawer = Boolean(resourcesDrawer);
  const availableHiddenResources = Number.isFinite(Number(hiddenResourceCount))
    ? Math.max(0, Number(hiddenResourceCount))
    : 0;
  const hasActions = Boolean(actions);
  const hasDamageDisplay =
    hasDamageValue ||
    typeof onToggleCritical === 'function' ||
    typeof onOpenDamageLog === 'function';
  const hasFooterContent = hasActions || hasDamageDisplay || hasResourcesDrawer;
  const hasHudContent = hasSpellSlots || hasFooterContent;
  const deathPanelLabel = normalizedDeathState.isDead ? 'Dead' : 'Dying';

  const damageClassName = [
    'footer-character-slot__damage',
    damageHighlightClass,
    damageIsCritical ? 'footer-character-slot__damage--critical' : '',
    damageIsFumble ? 'footer-character-slot__damage--fumble' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const handleCritButtonClick = useCallback(() => {
    if (typeof onToggleCritical === 'function') {
      onToggleCritical();
    }
  }, [onToggleCritical]);
  const handleDamageLogClick = useCallback(() => {
    if (typeof onOpenDamageLog === 'function') {
      onOpenDamageLog();
    }
  }, [onOpenDamageLog]);
  const handleResourcesToggle = useCallback(() => {
    setIsResourcesOpen((current) => !current);
  }, []);
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
      } finally {
        setIsUpdating(false);
      }
    },
    [characterId, clampHealthValue, onHealthChange, resolvedCurrent]
  );

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


  const handleHealthDragStart = useCallback(
    (event) => {
      if (!characterId || resolvedCurrent === null || !Number.isFinite(resolvedCurrent)) {
        return;
      }

      dragStateRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startHealth: resolvedCurrent,
        previewHealth: resolvedCurrent,
      };
      setPendingHealth(resolvedCurrent);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      event.currentTarget.dataset.dragging = 'true';
    },
    [characterId, resolvedCurrent]
  );

  const handleHealthDragMove = useCallback(
    (event) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      const delta = Math.round((event.clientX - dragState.startX) / 8);
      const next = clampHealthValue(dragState.startHealth + delta);
      if (next === null || next === dragState.previewHealth) {
        return;
      }

      dragState.previewHealth = next;
      setPendingHealth(next);
    },
    [clampHealthValue]
  );

  const finishHealthDrag = useCallback(
    (event) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      dragStateRef.current = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      delete event.currentTarget.dataset.dragging;

      if (dragState.previewHealth !== resolvedCurrent) {
        updateHealth(dragState.previewHealth);
      } else {
        setPendingHealth(null);
      }
    },
    [resolvedCurrent, updateHealth]
  );

  const cancelHealthDrag = useCallback(
    (event) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      dragStateRef.current = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      delete event.currentTarget.dataset.dragging;
      setPendingHealth(null);
    },
    []
  );

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
    if (!damageTimestamp) {
      setDamageHighlightClass('');
      return undefined;
    }

    setDamageHighlightClass('footer-character-slot__damage--recent');

    if (typeof window === 'undefined') {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setDamageHighlightClass('');
    }, 1600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [damageTimestamp]);

  useEffect(() => {
    if (!isDeathStateVisible) {
      setIsDeathPanelOpen(false);
    }
  }, [isDeathStateVisible]);

  useEffect(() => {
    setIsDeathPanelOpen(false);
  }, [collapseDeathPanelSignal]);

  useEffect(() => {
    if (!isDeathStateVisible || typeof window === 'undefined' || typeof document === 'undefined') {
      setDeathDockBottomOffset(null);
      return undefined;
    }

    let animationFrameId = null;
    let followUpTimeoutId = null;
    let resizeObserver = null;

    const updateDeathDockOffset = () => {
      const combatDock = document.querySelector('.combat-hud-dock');
      if (!combatDock) {
        setDeathDockBottomOffset(null);
        return;
      }

      const dockTop = combatDock.getBoundingClientRect().top;
      setDeathDockBottomOffset(Math.max(0, Math.round(window.innerHeight - dockTop)));
    };

    const scheduleUpdate = () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = window.requestAnimationFrame(updateDeathDockOffset);
    };

    const combatDock = document.querySelector('.combat-hud-dock');
    if (combatDock && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(combatDock);
    }

    scheduleUpdate();
    followUpTimeoutId = window.setTimeout(scheduleUpdate, 220);
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      if (followUpTimeoutId !== null) {
        window.clearTimeout(followUpTimeoutId);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [isCombatHudPanelOpen, isDeathStateVisible]);

  const deathDockStyle = deathDockBottomOffset === null
    ? undefined
    : { '--footer-death-dock-bottom': `${deathDockBottomOffset}px` };

  const deathDock = isDeathStateVisible ? (
    <div
      className="footer-character-slot__death-dock"
      style={deathDockStyle}
      data-allow-pointer-events="true"
    >
      <button
        type="button"
        className={`footer-character-slot__death-toggle ${isDeathPanelOpen ? 'is-open' : ''}`}
        aria-expanded={isDeathPanelOpen}
        aria-controls="footer-character-death-panel"
        onClick={() => setIsDeathPanelOpen((current) => !current)}
      >
        <span className="footer-character-slot__death-toggle-eyebrow">{deathPanelLabel}</span>
        <span className="footer-character-slot__death-toggle-name">{characterName}</span>
        <span className="footer-character-slot__death-toggle-meta">
          HP {displayCurrent}
          <i className={`fas fa-chevron-${isDeathPanelOpen ? 'down' : 'up'}`} aria-hidden="true" />
        </span>
      </button>
      {isDeathPanelOpen ? (
        <div
          id="footer-character-death-panel"
          className="footer-character-slot__death-panel"
        >
          <DyingStatePanel
            compact
            characterName={characterName}
            portraitUrl={figurineImageUrl}
            currentHp={displayCurrent}
            deathState={normalizedDeathState}
            isActiveTurn={isActiveTurn}
            onRollDeathSave={onRollDeathSave}
            disabled={isUpdating}
          />
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <div
      className={`footer-character-slot ${isResourcesOpen ? 'footer-character-slot--resources-open' : ''}`}
      data-allow-pointer-events="true"
    >
      {deathDock && typeof document !== 'undefined' ? createPortal(deathDock, document.body) : null}
      {hasResourcesDrawer ? (
        <div
          id="footer-resources-drawer"
          className="footer-character-slot__resources-drawer"
          aria-hidden={!isResourcesOpen}
          data-allow-pointer-events="true"
        >
          <button
            type="button"
            className="footer-character-slot__resources-close"
            onClick={handleResourcesToggle}
            aria-label="Collapse bonuses drawer"
          >
            <i className="fas fa-times" aria-hidden="true" />
          </button>
          <div className="footer-character-slot__resources-grip" aria-hidden="true" />
          <div className="footer-character-slot__resources-scroll">
            {resourcesDrawer}
          </div>
        </div>
      ) : null}
      <div className="footer-character-slot__profile-card">
        <div className="footer-character-slot__profile">
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
            <div className="footer-character-slot__portrait-health">
              <div
                className="footer-character-slot__health-inline"
                style={{ '--footer-character-health-percent': `${healthPercent}%` }}
                role="group"
                aria-label="Character health controls. Drag left or right to adjust health."
                title="Drag left or right to adjust health"
                onPointerDown={handleHealthDragStart}
                onPointerMove={handleHealthDragMove}
                onPointerUp={finishHealthDrag}
                onPointerCancel={cancelHealthDrag}
              >
                <button
                  type="button"
                  className="footer-character-slot__health-mini-button footer-character-slot__health-mini-button--decrease"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => handleAdjustHealth(-1)}
                  disabled={!canDecrease}
                  aria-label="Decrease health"
                >
                  <i className="fas fa-minus" aria-hidden="true" />
                </button>
                <div className="footer-character-slot__health-readout" aria-live="polite">
                  <span className="visually-hidden">Health</span>
                  {isUpdating ? (
                    <Spinner animation="border" role="status" size="sm">
                      <span className="visually-hidden">Updating health…</span>
                    </Spinner>
                  ) : (
                    <span className="footer-character-slot__health-readout-values">
                      <span className="footer-character-slot__health-current">{displayCurrent}</span>
                      {displayMax !== '—' && (
                        <span className="footer-character-slot__health-max">/ {displayMax}</span>
                      )}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="footer-character-slot__health-mini-button footer-character-slot__health-mini-button--increase"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => handleAdjustHealth(1)}
                  disabled={!canIncrease}
                  aria-label="Increase health"
                >
                  <i className="fas fa-plus" aria-hidden="true" />
                </button>
              </div>
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
          <div className="footer-character-slot__error" role="status" aria-live="polite">
            {error}
          </div>
        </div>
      </div>
      {hasHudContent ? (
        <div className="footer-character-slot__hud" data-allow-pointer-events="true">
          {hasSpellSlots ? (
            <div className="footer-character-slot__slots-wrapper">
              <div className="footer-character-slot__slots">{spellSlots}</div>
            </div>
          ) : null}
          {hasFooterContent ? (
            <div className="footer-character-slot__footer-rail" data-allow-pointer-events="true">
              <div className="footer-character-slot__footer-rail-body">
                {hasDamageDisplay ? (
                  <div className={damageClassName} role="status" aria-live="polite">
                    <div className="footer-character-slot__damage-header">
                      <span className="footer-character-slot__damage-label">{damageLabel}</span>
                      {typeof onToggleCritical === 'function' ? (
                        <Button
                          type="button"
                          variant="outline-light"
                          size="sm"
                          className={`footer-character-slot__crit-button ${
                            damageIsCritical ? 'is-active' : ''
                          }`}
                          onClick={handleCritButtonClick}
                          aria-pressed={damageIsCritical}
                          aria-label={
                            damageIsCritical
                              ? 'Critical damage roll enabled. Click to roll normally.'
                              : 'Click to enable a critical damage roll on your next roll.'
                          }
                          title={
                            damageIsCritical
                              ? 'Critical damage roll enabled. Click to roll normally.'
                              : 'Click to enable a critical damage roll on your next roll.'
                          }
                        >
                          Crit
                        </Button>
                      ) : null}
                    </div>
                    <span className="footer-character-slot__damage-value">{displayDamageValue}</span>
                    {typeof onOpenDamageLog === 'function' ? (
                      <Button
                        type="button"
                        variant="outline-light"
                        className="footer-character-slot__damage-log-button footer-pass-log-button"
                        onClick={handleDamageLogClick}
                        aria-label="Open damage log"
                        title="Damage log"
                      >
                        ⚔️ Log
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {hasActions ? (
                  <div className="footer-character-slot__actions" data-allow-pointer-events="true">
                    {actions}
                  </div>
                ) : null}
                {hasResourcesDrawer ? (
                  <Button
                    type="button"
                    variant="outline-light"
                    className="footer-character-slot__resources-toggle footer-pass-log-button"
                    onClick={handleResourcesToggle}
                    aria-expanded={isResourcesOpen}
                    aria-controls="footer-resources-drawer"
                    title={isResourcesOpen ? 'Hide resources' : 'Show resources'}
                  >
                    <span className="footer-character-slot__resources-toggle-icon" aria-hidden="true">✦</span>
                    <span>Bonuses</span>
                    <span className="footer-character-slot__resources-count">
                      {isResourcesOpen ? '−' : `+${availableHiddenResources}`}
                    </span>
                    <i className="fas fa-chevron-up footer-character-slot__resources-chevron" aria-hidden="true" />
                  </Button>
                ) : null}

              </div>
            </div>
          ) : null}
        </div>
      ) : null}
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
  resourcesDrawer: PropTypes.node,
  hiddenResourceCount: PropTypes.number,
  damageSummary: PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    isCritical: PropTypes.bool,
    isFumble: PropTypes.bool,
    timestamp: PropTypes.number,
  }),
  onToggleCritical: PropTypes.func,
  onOpenDamageLog: PropTypes.func,
  deathState: PropTypes.object,
  onRollDeathSave: PropTypes.func,
  isActiveTurn: PropTypes.bool,
  collapseDeathPanelSignal: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
  isCombatHudPanelOpen: PropTypes.bool,
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
  resourcesDrawer: null,
  hiddenResourceCount: 0,
  damageSummary: null,
  onToggleCritical: undefined,
  onOpenDamageLog: undefined,
  deathState: null,
  onRollDeathSave: null,
  isActiveTurn: false,
  collapseDeathPanelSignal: null,
  isCombatHudPanelOpen: false,
};

export default FooterCharacterSlot;
