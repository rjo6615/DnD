import React from "react";
import { Modal, Card, Table, Button } from "react-bootstrap";
import STATS from "../statSchema";

export default function StatBreakdownModal({ show, onHide, statKey, breakdown }) {
  if (!statKey) return null;

  const statInfo = STATS.find((s) => s.key === statKey) || {};

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
            <Card.Title className="modal-title">
              {statInfo.label} Breakdown
            </Card.Title>
          </Card.Header>
          <Card.Body>
            <p>{statInfo.description}</p>
            {breakdown && (
              <Table
                striped
                bordered
                hover
                size="sm"
                responsive
                className="modern-table"
              >
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Base</td>
                    <td>{breakdown.base}</td>
                  </tr>
                  <tr>
                    <td>Class</td>
                    <td>{breakdown.class}</td>
                  </tr>
                  <tr>
                    <td>Race</td>
                    <td>{breakdown.race}</td>
                  </tr>
                  <tr>
                    <td>Feat</td>
                    <td>{breakdown.feat}</td>
                  </tr>
                  <tr>
                    <td>Item</td>
                    <td>{breakdown.item}</td>
                  </tr>
                  {breakdown.override !== undefined && (
                    <tr>
                      <td>Override</td>
                      <td>{breakdown.override}</td>
                    </tr>
                  )}
                  <tr>
                    <td>Total</td>
                    <td>{breakdown.total}</td>
                  </tr>
                </tbody>
              </Table>
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
