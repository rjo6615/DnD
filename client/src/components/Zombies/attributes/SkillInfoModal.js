import React from "react";
import { Modal, Card, Button } from "react-bootstrap";
import { SKILLS } from "../skillSchema";

export default function SkillInfoModal({ show, onHide, skillKey }) {
  if (!skillKey) return null;

  const skillInfo = SKILLS.find((s) => s.key === skillKey) || {};

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
            <Card.Title className="modal-title">{skillInfo.label}</Card.Title>
          </Card.Header>
          <Card.Body>
            <p>{skillInfo.description}</p>
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
