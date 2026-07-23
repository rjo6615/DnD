import React from 'react';
import { Button, Card, Modal } from 'react-bootstrap';

/** Shared presentation for every combatant's authoritative conditions. */
export default function CombatConditionsModal({ show, onHide, conditions = [], combatantName }) {
  return (
    <Modal className="dnd-modal modern-modal" show={show} onHide={onHide} centered scrollable fullscreen="sm-down">
      <Card className="modern-card active-conditions-modal">
        <Card.Header className="modal-header">
          <Card.Title className="modal-title">
            {combatantName ? `${combatantName} Conditions` : 'Active Conditions'}
          </Card.Title>
        </Card.Header>
        <Card.Body className="modal-body active-conditions-modal__body">
          {conditions.length === 0 ? <p className="active-conditions-modal__empty">No conditions</p> : (
            <ul className="active-conditions-modal__list">
              {conditions.map((condition, index) => {
                const name = condition?.name || condition?.label || condition?.id || 'Condition';
                return (
                  <li className="active-conditions-modal__item" key={condition?.id || `${name}-${index}`}>
                    <span className="active-conditions-modal__icon" aria-hidden="true">{condition?.icon || '✦'}</span>
                    <span className="active-conditions-modal__content">
                      <strong>{name}</strong>
                      {condition?.description && <small>{condition.description}</small>}
                      {condition?.source && <small>{condition.source}</small>}
                      {condition?.duration && <small>{condition.duration}</small>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card.Body>
        <Card.Footer className="modal-footer"><Button className="action-btn close-btn" onClick={onHide}>Close</Button></Card.Footer>
      </Card>
    </Modal>
  );
}
