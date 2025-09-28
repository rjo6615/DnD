import React from 'react';
import { Modal, Card, Button } from 'react-bootstrap';
import { resolveWeaponMasteryEntry } from './weaponMasteryCatalog';

export default function FeatureModal({ show, onHide, feature }) {
  if (!show || !feature) return null;
  const description = Array.isArray(feature.desc)
    ? feature.desc.join('\n')
    : (feature.description || feature.desc);
  const masterySelections = Array.isArray(feature.masterySelections)
    ? feature.masterySelections
    : [];
  const masteryDetails = masterySelections
    .map((selection) => resolveWeaponMasteryEntry(selection))
    .filter(Boolean);
  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      className="dnd-modal modern-modal"
    >
      <div className="text-center">
        <Card className="modern-card">
          <Card.Header className="modal-header">
            <Card.Title className="modal-title">{feature.name}</Card.Title>
          </Card.Header>
          <Card.Body>
            <p>{description || 'Feature details unavailable'}</p>
            {masteryDetails.length > 0 && (
              <div className="text-start mt-3">
                <h5 className="fw-semibold">Weapon Mastery Selections</h5>
                <ul className="mb-0">
                  {masteryDetails.map((option) => (
                    <li key={option.key} className="mb-2">
                      <strong>{option.label}</strong> —{' '}
                      <span className="fw-semibold">
                        {option.masteryTitle}
                      </span>
                      <div>{option.masteryDescription}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card.Body>
          <Card.Footer className="modal-footer">
            <Button className="action-btn close-btn" onClick={onHide}>
              Close
            </Button>
          </Card.Footer>
        </Card>
      </div>
    </Modal>
  );
}
