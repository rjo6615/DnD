import React from 'react';
import { Modal, Card, Button } from 'react-bootstrap';

export default function FeatureModal({ show, onHide, feature }) {
  if (!show || !feature) return null;
  const description = Array.isArray(feature.desc)
    ? feature.desc.join('\n')
    : (feature.description || feature.desc);
  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      className="dnd-modal modern-modal"
      animation={false}
    >
      <div className="text-center">
        <Card className="modern-card">
          <Card.Header className="modal-header">
            <Card.Title className="modal-title">{feature.name}</Card.Title>
          </Card.Header>
          <Card.Body>
            <p>{description || 'Feature details unavailable'}</p>
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
