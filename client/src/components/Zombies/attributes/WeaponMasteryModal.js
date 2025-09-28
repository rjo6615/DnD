import React, { useMemo } from 'react';
import { Modal } from 'react-bootstrap';
import { WEAPON_MASTERY_OPTION_MAP } from './weaponMasteryOptions';

const getMasteryDetails = (masteryId) => {
  if (!masteryId) return null;
  const normalized = masteryId.trim().toLowerCase();
  return WEAPON_MASTERY_OPTION_MAP[normalized] || null;
};

const WeaponMasteryModal = ({ show, onHide, masteryId, weaponName }) => {
  const mastery = useMemo(() => getMasteryDetails(masteryId), [masteryId]);
  const title = mastery?.title || 'Weapon Mastery';

  return (
    <Modal centered show={show} onHide={onHide} aria-label={title}>
      <Modal.Header closeButton>
        <Modal.Title as="h3" className="h5 mb-0">
          {title}
          {weaponName ? (
            <span className="d-block mt-1 text-muted">for {weaponName}</span>
          ) : null}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {mastery ? (
          <p className="mb-0">{mastery.description}</p>
        ) : (
          <p className="mb-0 text-muted">Mastery details are unavailable.</p>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default WeaponMasteryModal;
