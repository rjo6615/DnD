import React from "react";
import { Modal, Button, Card } from "react-bootstrap";

export default function ShopkeeperModal({ show, onHide }) {
  return (
    <Modal show={show} onHide={onHide} centered className="dnd-modal modern-modal">
      <div className="text-center">
        <Card className="modern-card">
          <Card.Header className="modal-header">
            <Card.Title className="modal-title">Shopkeeper</Card.Title>
          </Card.Header>
          <Card.Body>
            <p>Welcome to the shop!</p>
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
