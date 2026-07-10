import React from 'react';
import { Modal, Card, Button } from 'react-bootstrap';

function renderInlineFormatting(text) {
  return String(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
}

function renderFeatureDescription(description) {
  if (!description) return <p>Feature details unavailable</p>;

  const blocks = String(description)
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) return <p>Feature details unavailable</p>;

  return (
    <div className="feature-modal-description">
      {blocks.map((block, index) => {
        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
        const isList = lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line));
        if (isList) {
          return (
            <ul key={index}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>{renderInlineFormatting(line.replace(/^[-*]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }

        const isHeading = lines.length === 1 && /^\*\*[^*]+\*\*$/.test(lines[0]);
        if (isHeading) {
          return <p key={index} className="feature-modal-description__heading">{renderInlineFormatting(lines[0])}</p>;
        }

        return <p key={index}>{renderInlineFormatting(lines.join('\n'))}</p>;
      })}
    </div>
  );
}

export default function FeatureModal({ show, onHide, feature }) {
  if (!show || !feature) return null;
  const description = Array.isArray(feature.desc)
    ? feature.desc.join('\n\n')
    : (feature.description || feature.desc);
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
          <Card.Body className="modal-body">
            {typeof feature.renderDetails === 'function' ? (
              feature.renderDetails()
            ) : (
              renderFeatureDescription(description)
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
