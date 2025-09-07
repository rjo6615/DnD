import React from "react";
import { Modal, Card, Button } from "react-bootstrap";

export default function BackgroundModal({ show, onHide, background }) {
  if (!background) return null;

  const skillProficiencies = Object.entries(background.skills || {})
    .filter(([, value]) => value?.proficient)
    .map(([key]) => key);

  const toolProficiencies = background.toolProficiencies || [];

  return (
    <Modal show={show} onHide={onHide} centered className="dnd-modal modern-modal">
      <div className="text-center">
        <Card className="modern-card">
          <Card.Header className="modal-header">
            <Card.Title className="modal-title">
              {background.name || "Background"}
            </Card.Title>
          </Card.Header>
          <Card.Body>
            <p>{background.description}</p>
            <br />
            <p><strong>Skill Proficiencies:</strong></p>
            {skillProficiencies.length ? (
              <ul className="centered-list">
                {skillProficiencies.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            ) : (
              <p>None</p>
            )}
            <p><strong>Tool Proficiencies:</strong></p>
            {toolProficiencies.length ? (
              <ul className="centered-list">
                {toolProficiencies.map((tool) => (
                  <li key={tool}>{tool}</li>
                ))}
              </ul>
            ) : (
              <p>None</p>
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

