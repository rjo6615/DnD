import React from 'react';
import { Card, Button, Badge, Modal } from 'react-bootstrap';
import { FiList, FiChevronDown, FiChevronUp } from 'react-icons/fi';
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
  isActiveTurn = false,
  onToggleParticipant,
  onOpenMapPlacement,
  onViewDetails,
  enemyHealthAdjustments,
  enemyHealthSaving,
  onEnemyAdjustmentInputChange,
  onApplyEnemyHealthAdjustment,
  onResetEnemyHealth,
  onEnemyDamageRoll,
  onEnemyAttackRoll,
  formatAttackBonus,
  getEnemyActionDamageString,
  latestEnemyRoll,
}) {
  const [showAttacksModal, setShowAttacksModal] = React.useState(false);

  const rawEnemyId = typeof enemy?.enemyId === 'string' ? enemy.enemyId : '';
  const normalizedEnemyId = rawEnemyId.trim() !== '' ? rawEnemyId.trim() : null;
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

  const quickAttacks = React.useMemo(() => {
    if (!Array.isArray(enemy?.actions) || enemy.actions.length === 0) {
      return [];
    }

    return enemy.actions
      .map((action, index) => {
        const actionLabel = action?.name || 'Action';
        const damageDisplay =
          typeof getEnemyActionDamageString === 'function'
            ? getEnemyActionDamageString(action)
            : null;

        if (!damageDisplay) {
          return null;
        }

        const attackBonusDisplay =
          typeof formatAttackBonus === 'function'
            ? formatAttackBonus(action?.attack_bonus)
            : null;
        const actionKey = `${normalizedEnemyId || 'enemy'}-${actionLabel}-${index}`;
        const isLatestRoll =
          latestEnemyRoll &&
          latestEnemyRoll.enemyId === normalizedEnemyId &&
          latestEnemyRoll.actionName === actionLabel;

        return {
          action,
          actionLabel,
          attackBonusDisplay,
          damageDisplay,
          actionKey,
          isLatestRoll,
        };
      })
      .filter(Boolean);
  }, [
    enemy?.actions,
    formatAttackBonus,
    getEnemyActionDamageString,
    latestEnemyRoll,
    normalizedEnemyId,
  ]);

  const hasQuickAttacks = quickAttacks.length > 0;

  React.useEffect(() => {
    if (!hasQuickAttacks && showAttacksModal) {
      setShowAttacksModal(false);
    }
  }, [hasQuickAttacks, showAttacksModal]);

  if (!enemy) {
    return null;
  }

  const label = enemy.name || enemy.displayType || normalizedEnemyId || 'enemy';
  const cardClassName = [
    'resource-card',
    'enemy-card',
    'enemy-quick-card',
    'text-start',
    isActiveTurn ? 'enemy-quick-card--active-turn' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Card
      className={cardClassName}
      data-testid="active-map-enemy-card"
      data-enemy-id={normalizedEnemyId || undefined}
      id={identifier ? `active-enemy-${identifier}` : undefined}
      aria-current={isActiveTurn ? 'true' : undefined}
    >
      <Card.Body className="d-flex flex-column gap-2">
        <div className="enemy-quick-card__header">
          <div className="flex-grow-1">
            <Card.Title className="h6 mb-1">{enemy.name || 'Unnamed Enemy'}</Card.Title>
            <Card.Subtitle className="text-muted small">
              {[enemy.displayType, challengeText].filter(Boolean).join(' • ') || '—'}
            </Card.Subtitle>
          </div>
          <div className="enemy-quick-card__badges">
            {isActiveTurn && (
              <Badge bg="warning" text="dark" className="enemy-quick-card__active-badge">
                Active Turn
              </Badge>
            )}
            <Badge bg="secondary" className="enemy-quick-card__badge">
              AC {armorClassDisplay}
            </Badge>
          </div>
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
          {hasQuickAttacks && (
            <>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setShowAttacksModal(true)}
              >
                View Attacks
              </Button>
              <EnemyQuickAttacksModal
                show={showAttacksModal}
                onHide={() => setShowAttacksModal(false)}
                enemyLabel={label}
                quickAttacks={quickAttacks}
                enemy={enemy}
                onEnemyDamageRoll={onEnemyDamageRoll}
                onEnemyAttackRoll={onEnemyAttackRoll}
                latestEnemyRoll={latestEnemyRoll}
                normalizedEnemyId={normalizedEnemyId}
                modalAriaLabel={`${label} Attacks`}
              />
            </>
          )}
          <Button
            variant="secondary"
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

function EnemyQuickAttacksModal({
  show,
  onHide,
  enemyLabel,
  quickAttacks,
  enemy,
  onEnemyDamageRoll,
  onEnemyAttackRoll,
  latestEnemyRoll,
  normalizedEnemyId,
  modalAriaLabel,
}) {
  if (!Array.isArray(quickAttacks) || quickAttacks.length === 0) {
    return null;
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="lg"
      className="dnd-modal modern-modal"
      animation={false}
      aria-label={modalAriaLabel}
    >
      <Card className="modern-card">
        <Card.Header className="modal-header">
          <Card.Title className="modal-title">{`${enemyLabel} Attacks`}</Card.Title>
        </Card.Header>
        <Card.Body>
          <Card.Title className="modal-title">Attacks</Card.Title>
          <div className="attack-card-grid enemy-card__attack-grid">
            {quickAttacks.map(
              ({ action, actionLabel, attackBonusDisplay, damageDisplay, actionKey, isLatestRoll }) => (
                <div key={actionKey} className="attack-card enemy-card__attack-card">
                  <div className="attack-card__title">{actionLabel}</div>
                  <div className="attack-card__details">
                    <div className="attack-card__row">
                      <span className="attack-card__label">Attack Bonus</span>
                      <span className="attack-card__value">{attackBonusDisplay ?? '—'}</span>
                    </div>
                    <div className="attack-card__row">
                      <span className="attack-card__label">Damage</span>
                      <span className="attack-card__value">{damageDisplay || '—'}</span>
                    </div>
                  </div>
                  <div className="attack-card__actions">
                    <Button
                      variant="link"
                      className="attack-card__roll"
                      onClick={() => {
                        onHide();
                        if (normalizedEnemyId && onEnemyAttackRoll) {
                          onEnemyAttackRoll(enemy, action);
                        }
                      }}
                      disabled={!onEnemyAttackRoll || !normalizedEnemyId}
                      aria-label={`Roll attack for ${actionLabel}`}
                    >
                      <i className="fa-solid fa-bullseye" aria-hidden="true"></i>
                    </Button>
                    <Button
                      variant="link"
                      className="attack-card__roll"
                      onClick={() => {
                        onHide();
                        if (normalizedEnemyId && onEnemyDamageRoll) {
                          onEnemyDamageRoll(enemy, action);
                        }
                      }}
                      disabled={!onEnemyDamageRoll || !normalizedEnemyId}
                      aria-label={`Roll damage for ${actionLabel}`}
                    >
                      <i className="fa-solid fa-dice-d20" aria-hidden="true"></i>
                    </Button>
                  </div>
                  {isLatestRoll && latestEnemyRoll?.breakdown && (
                    <div className="mt-2 small fw-semibold text-primary">
                      {`${latestEnemyRoll.rollType === 'attack' ? 'Attack' : 'Damage'}: ${latestEnemyRoll.total} (${latestEnemyRoll.breakdown})`}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </Card.Body>
        <Card.Footer className="d-flex justify-content-end">
          <Button className="close-btn" variant="secondary" onClick={onHide}>
            Close
          </Button>
        </Card.Footer>
      </Card>
    </Modal>
  );
}
export function ActiveEnemyQuickList({
  summaries,
  activeMapTitle,
  onManageEnemies,
  onResetInitiative,
  onRollInitiative,
  onAdvanceTurn,
  combatControlsDisabled = false,
  onToggleParticipant,
  onOpenMapPlacement,
  onViewDetails,
  enemyHealthAdjustments,
  enemyHealthSaving,
  onEnemyAdjustmentInputChange,
  onApplyEnemyHealthAdjustment,
  onResetEnemyHealth,
  onEnemyDamageRoll,
  onEnemyAttackRoll,
  formatAttackBonus,
  getEnemyActionDamageString,
  latestEnemyRoll,
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const normalizedSummaries = Array.isArray(summaries) ? summaries : [];
  const orderedSummaries = React.useMemo(() => {
    const activeSummaries = [];
    const inactiveSummaries = [];

    normalizedSummaries.forEach((summary) => {
      if (summary?.isActiveTurn) {
        activeSummaries.push(summary);
        return;
      }

      inactiveSummaries.push(summary);
    });

    return [...activeSummaries, ...inactiveSummaries];
  }, [normalizedSummaries]);

  if (normalizedSummaries.length === 0) {
    return null;
  }

  const collapseButtonLabel = isCollapsed
    ? 'Expand active enemy display'
    : 'Collapse active enemy display';
  const listId = 'active-map-enemies-list';

  return (
    <div
      className="zombies-dm-active-enemies"
      data-testid="active-map-enemies"
      aria-live="polite"
      aria-expanded={!isCollapsed}
    >
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
        <div className="zombies-dm-active-enemies__actions">
          {(onResetInitiative || onRollInitiative || onAdvanceTurn) && (
            <div className="d-inline-flex align-items-center gap-2 me-2">
              {onResetInitiative && (
                <Button
                  variant="outline-light"
                  size="sm"
                  onClick={onResetInitiative}
                  disabled={combatControlsDisabled}
                >
                  Clear Initiative
                </Button>
              )}
              {onRollInitiative && (
                <Button
                  variant="outline-light"
                  size="sm"
                  onClick={onRollInitiative}
                  disabled={combatControlsDisabled}
                >
                  Roll Initiative
                </Button>
              )}
              {onAdvanceTurn && (
                <>
                  <Button
                    variant="outline-light"
                    size="sm"
                    onClick={() => onAdvanceTurn(-1)}
                    disabled={combatControlsDisabled}
                  >
                    Previous Turn
                  </Button>
                  <Button
                    variant="outline-light"
                    size="sm"
                    onClick={() => onAdvanceTurn(1)}
                    disabled={combatControlsDisabled}
                  >
                    Next Turn
                  </Button>
                </>
              )}
            </div>
          )}
          <Button
            variant="outline-light"
            size="sm"
            onClick={onManageEnemies}
            className="d-inline-flex align-items-center gap-2"
          >
            <FiList aria-hidden="true" />
            <span>Manage Enemies</span>
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setIsCollapsed((value) => !value)}
            aria-label={collapseButtonLabel}
            aria-expanded={!isCollapsed}
            aria-controls={listId}
            className="d-inline-flex align-items-center gap-2"
          >
            {isCollapsed ? <FiChevronDown aria-hidden="true" /> : <FiChevronUp aria-hidden="true" />}
            <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
          </Button>
        </div>
      </div>
      <div
        className="zombies-dm-active-enemies__list"
        id={listId}
        data-testid="active-map-enemies-list"
        hidden={isCollapsed}
      >
        {orderedSummaries.map((summary) => (
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
            isActiveTurn={summary.isActiveTurn}
            onEnemyDamageRoll={onEnemyDamageRoll}
            onEnemyAttackRoll={onEnemyAttackRoll}
            formatAttackBonus={formatAttackBonus}
            getEnemyActionDamageString={getEnemyActionDamageString}
            latestEnemyRoll={latestEnemyRoll}
          />
        ))}
      </div>
    </div>
  );
}

export default ActiveEnemyQuickList;
