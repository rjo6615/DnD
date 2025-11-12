import React from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import { FiList } from 'react-icons/fi';
import { sanitizeIdentifierForTestId } from '../utils/sanitizeIdentifierForTestId';

export function ActiveEnemyQuickCard({
  enemy,
  challengeText,
  sizeDisplay,
  armorClassDisplay,
  maxHpValue,
  resolvedCurrentHp,
  healthSummary,
  inCombat,
  onToggleParticipant,
  onOpenMapPlacement,
  onViewDetails,
  enemyHealthAdjustments,
  enemyHealthSaving,
  onEnemyAdjustmentInputChange,
  onApplyEnemyHealthAdjustment,
  onResetEnemyHealth,
}) {
  if (!enemy) {
    return null;
  }

  const normalizedEnemyId =
    typeof enemy.enemyId === 'string' && enemy.enemyId.trim() !== ''
      ? enemy.enemyId.trim()
      : null;
  const adjustmentValue = normalizedEnemyId
    ? enemyHealthAdjustments?.[normalizedEnemyId] ?? ''
    : '';
  const isSavingHealth = normalizedEnemyId
    ? Boolean(enemyHealthSaving?.[normalizedEnemyId])
    : false;

  let healthPercent = null;
  if (
    maxHpValue !== null &&
    maxHpValue > 0 &&
    resolvedCurrentHp !== null &&
    Number.isFinite(resolvedCurrentHp)
  ) {
    healthPercent = Math.max(
      0,
      Math.min(100, Math.round((resolvedCurrentHp / maxHpValue) * 100))
    );
  }

  const healthText = healthSummary;
  const identifier = sanitizeIdentifierForTestId(normalizedEnemyId, 'active-enemy');
  const label = enemy.name || enemy.displayType || normalizedEnemyId || 'enemy';

  return (
    <Card
      className="resource-card enemy-card enemy-quick-card text-start"
      data-testid="active-map-enemy-card"
      data-enemy-id={normalizedEnemyId || undefined}
      id={identifier ? `active-enemy-${identifier}` : undefined}
    >
      <Card.Body className="d-flex flex-column gap-2">
        <div className="enemy-quick-card__header">
          <div className="flex-grow-1">
            <Card.Title className="h6 mb-1">{enemy.name || 'Unnamed Enemy'}</Card.Title>
            <Card.Subtitle className="text-muted small">
              {[enemy.displayType, challengeText].filter(Boolean).join(' • ') || '—'}
            </Card.Subtitle>
          </div>
          <Badge bg="secondary" className="enemy-quick-card__badge">
            AC {armorClassDisplay}
          </Badge>
        </div>
        <div className="enemy-quick-card__meta-line">
          <span className="enemy-card__summary-label">Size:</span>
          <span aria-hidden="true">{sizeDisplay}</span>
        </div>
        <div className="enemy-card__health">
          <div
            className="enemy-card__health-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={maxHpValue ?? undefined}
            aria-valuenow={resolvedCurrentHp ?? undefined}
          >
            <div
              className="enemy-card__health-bar-fill"
              style={{
                width: `${
                  healthPercent !== null
                    ? healthPercent
                    : resolvedCurrentHp !== null
                      ? 100
                      : 0
                }%`,
              }}
            />
          </div>
          <div className="enemy-card__health-text">{healthText}</div>
        </div>
        <div
          className="enemy-card__health-controls enemy-card__health-controls--compact"
          role="group"
          aria-label={`Quick health controls for ${label}`}
        >
          <Button
            variant="outline-danger"
            size="sm"
            className="enemy-card__health-button"
            onClick={() =>
              normalizedEnemyId && onApplyEnemyHealthAdjustment(normalizedEnemyId, -1)
            }
            disabled={isSavingHealth || !normalizedEnemyId}
            aria-label={`Damage ${label}`}
          >
            −
          </Button>
          <FormControlButtonInput
            value={adjustmentValue}
            disabled={isSavingHealth || !normalizedEnemyId}
            onChange={(event) =>
              normalizedEnemyId &&
              onEnemyAdjustmentInputChange(normalizedEnemyId, event.target.value)
            }
          />
          <Button
            variant="outline-success"
            size="sm"
            className="enemy-card__health-button"
            onClick={() =>
              normalizedEnemyId && onApplyEnemyHealthAdjustment(normalizedEnemyId, 1)
            }
            disabled={isSavingHealth || !normalizedEnemyId}
            aria-label={`Heal ${label}`}
          >
            +
          </Button>
          <Button
            variant="outline-light"
            size="sm"
            className="enemy-card__health-button enemy-card__health-button--reset"
            onClick={() => normalizedEnemyId && onResetEnemyHealth(normalizedEnemyId)}
            disabled={isSavingHealth || maxHpValue === null || !normalizedEnemyId}
          >
            Reset
          </Button>
        </div>
        <div className="enemy-quick-card__actions">
          <Button
            variant={inCombat ? 'success' : 'outline-primary'}
            size="sm"
            onClick={() => normalizedEnemyId && onToggleParticipant(normalizedEnemyId)}
            disabled={!normalizedEnemyId}
          >
            {inCombat ? 'Remove from Combat' : 'Add to Combat'}
          </Button>
          <Button
            variant="outline-light"
            size="sm"
            onClick={() =>
              normalizedEnemyId &&
              onOpenMapPlacement(
                normalizedEnemyId,
                enemy.name || enemy.displayType || normalizedEnemyId
              )
            }
            disabled={!normalizedEnemyId}
          >
            Reposition
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => onViewDetails && normalizedEnemyId && onViewDetails(normalizedEnemyId)}
            disabled={!onViewDetails}
          >
            Details
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}

function FormControlButtonInput({ value, disabled, onChange }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9-]*"
      className="form-control form-control-sm enemy-card__health-adjustment"
      value={value}
      disabled={disabled}
      onChange={onChange}
      aria-label="Health adjustment"
    />
  );
}

export function ActiveEnemyQuickList({
  summaries,
  activeMapTitle,
  onManageEnemies,
  onToggleParticipant,
  onOpenMapPlacement,
  onViewDetails,
  enemyHealthAdjustments,
  enemyHealthSaving,
  onEnemyAdjustmentInputChange,
  onApplyEnemyHealthAdjustment,
  onResetEnemyHealth,
}) {
  if (!Array.isArray(summaries) || summaries.length === 0) {
    return null;
  }

  return (
    <div className="zombies-dm-active-enemies" data-testid="active-map-enemies" aria-live="polite">
      <div className="zombies-dm-active-enemies__header">
        <div>
          <div className="zombies-dm-active-enemies__label">Active Map Enemies</div>
          <div className="zombies-dm-active-enemies__count">
            {summaries.length === 1
              ? '1 enemy deployed'
              : `${summaries.length} enemies deployed`}
            {activeMapTitle ? ` • ${activeMapTitle}` : ''}
          </div>
        </div>
        <Button
          variant="outline-light"
          size="sm"
          onClick={onManageEnemies}
          className="d-inline-flex align-items-center gap-2"
        >
          <FiList aria-hidden="true" />
          <span>Manage Enemies</span>
        </Button>
      </div>
      <div className="zombies-dm-active-enemies__list">
        {summaries.map((summary) => (
          <ActiveEnemyQuickCard
            key={summary.enemy.enemyId || summary.enemy._id}
            enemy={summary.enemy}
            challengeText={summary.challengeText}
            sizeDisplay={summary.sizeDisplay}
            armorClassDisplay={summary.armorClassDisplay}
            maxHpValue={summary.maxHpValue}
            resolvedCurrentHp={summary.resolvedCurrentHp}
            healthSummary={summary.healthSummary}
            inCombat={summary.inCombat}
            onToggleParticipant={onToggleParticipant}
            onOpenMapPlacement={onOpenMapPlacement}
            onViewDetails={onViewDetails}
            enemyHealthAdjustments={enemyHealthAdjustments}
            enemyHealthSaving={enemyHealthSaving}
            onEnemyAdjustmentInputChange={onEnemyAdjustmentInputChange}
            onApplyEnemyHealthAdjustment={onApplyEnemyHealthAdjustment}
            onResetEnemyHealth={onResetEnemyHealth}
          />
        ))}
      </div>
    </div>
  );
}

export default ActiveEnemyQuickList;
