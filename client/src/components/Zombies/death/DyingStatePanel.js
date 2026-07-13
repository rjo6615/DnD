import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { normalizeDeathState, getDeathSaveOutcomeText } from './deathState';
import './DyingStatePanel.css';

const Circle = ({ filled, type, index }) => <span className={`death-save-circle death-save-circle--${type} ${filled ? 'is-filled' : ''}`} aria-label={`${type} ${index} ${filled ? 'filled' : 'empty'}`}>{filled ? '●' : '○'}</span>;
Circle.propTypes = { filled: PropTypes.bool.isRequired, type: PropTypes.string.isRequired, index: PropTypes.number.isRequired };

export function DeathSaveTracker({ deathState }) {
  const state = normalizeDeathState(deathState);
  return <div className="death-save-tracker" aria-label={`${state.successes} successes and ${state.failures} failures`}>
    <div><strong>Life</strong><span>{[1,2,3].map(i => <Circle key={`s-${i}`} type="success" index={i} filled={state.successes >= i} />)}</span></div>
    <div><strong>Fate</strong><span>{[1,2,3].map(i => <Circle key={`f-${i}`} type="failure" index={i} filled={state.failures >= i} />)}</span></div>
  </div>;
}
DeathSaveTracker.propTypes = { deathState: PropTypes.object };
DeathSaveTracker.defaultProps = { deathState: null };

export function DeathStateBadge({ deathState }) {
  const state = normalizeDeathState(deathState);
  if (state.isDead) return <span className="death-state-badge death-state-badge--dead"><i className="fas fa-skull" /> Dead</span>;
  if (state.isDying) return <span className="death-state-badge"><i className="fas fa-heart-crack" /> Dying</span>;
  return null;
}
DeathStateBadge.propTypes = { deathState: PropTypes.object };
DeathStateBadge.defaultProps = { deathState: null };

export function DMDeathSaveControls({ onAction, disabled }) {
  const actions = [['roll','Roll'], ['addSuccess','+ Success'], ['removeSuccess','− Success'], ['addFailure','+ Failure'], ['removeFailure','− Failure'], ['revive','Revive 1 HP'], ['markDead','Mark Dead'], ['reset','Reset']];
  return <details className="dm-death-controls"><summary>DM death save controls</summary><div>{actions.map(([action,label]) => <Button key={action} size="sm" variant="outline-light" disabled={disabled} onClick={() => onAction?.(action)}>{label}</Button>)}</div></details>;
}
DMDeathSaveControls.propTypes = { onAction: PropTypes.func, disabled: PropTypes.bool };
DMDeathSaveControls.defaultProps = { onAction: null, disabled: false };

export default function DyingStatePanel({ characterName, portraitUrl, currentHp, deathState, onRollDeathSave, onDmAction, isActiveTurn, compact, disabled }) {
  const state = normalizeDeathState(deathState);
  const dead = state.isDead;
  return <section className={`dying-state-panel ${dead ? 'dying-state-panel--dead' : ''} ${compact ? 'dying-state-panel--compact' : ''}`} aria-label={`${characterName} death save panel`}>
    <div className="dying-state-panel__header">
      <div className="dying-state-panel__portrait">{portraitUrl ? <img src={portraitUrl} alt={`${characterName} portrait`} /> : <i className="fas fa-user-injured" aria-hidden="true" />}</div>
      <div><p className="dying-state-panel__eyebrow">{dead ? 'DEAD' : 'DYING'}</p><h3>{characterName}</h3><p>HP {currentHp ?? 0}</p></div>
      <DeathStateBadge deathState={state} />
    </div>
    {isActiveTurn && state.isDying ? <p className="dying-state-panel__turn"><i className="fas fa-dice-d20" /> It is your turn. Roll a Death Save.</p> : null}
    <DeathSaveTracker deathState={state} />
    <Button className="death-save-roll-button" disabled={disabled || dead || state.rolledThisTurn} onClick={onRollDeathSave} aria-label="Roll Death Save">🎲 Roll Death Save</Button>
    <p className="dying-state-panel__result" aria-live="polite">{state.lastRoll ? `Last roll: ${state.lastRoll}. ` : ''}{getDeathSaveOutcomeText(state)}</p>
    {onDmAction ? <DMDeathSaveControls disabled={disabled} onAction={onDmAction} /> : null}
  </section>;
}
DyingStatePanel.propTypes = { characterName: PropTypes.string, portraitUrl: PropTypes.string, currentHp: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), deathState: PropTypes.object, onRollDeathSave: PropTypes.func, onDmAction: PropTypes.func, isActiveTurn: PropTypes.bool, compact: PropTypes.bool, disabled: PropTypes.bool };
DyingStatePanel.defaultProps = { characterName: 'Character', portraitUrl: null, currentHp: 0, deathState: null, onRollDeathSave: null, onDmAction: null, isActiveTurn: false, compact: false, disabled: false };
