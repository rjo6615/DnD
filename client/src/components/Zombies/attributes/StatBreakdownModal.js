import React from "react";
import { Modal, Card, Table, Button } from "react-bootstrap";
import STATS from "../statSchema";

export default function StatBreakdownModal({ show, onHide, statKey, breakdown, codex, modifier, savingThrow, proficient }) {
  if (!statKey) return null;

  const statInfo = STATS.find((s) => s.key === statKey) || {};

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      className="dnd-modal modern-modal attribute-inspector-modal"
    >
      <div className="text-center">
        <Card className="modern-card attribute-inspector">
          <Card.Header className="modal-header">
            <Card.Title className="modal-title">
              {statInfo.label} Inspector
            </Card.Title>
          </Card.Header>
          <Card.Body>
            <div className="attribute-inspector__lead">
              <span className="attribute-inspector__sigil" aria-hidden="true"><i className={`fa-solid ${codex?.icon || 'fa-sparkles'}`}></i></span>
              <div><span>Ability Codex</span><h2>{statInfo.label}</h2><p>{statInfo.description}</p></div>
            </div>
            <div className="attribute-inspector__totals" aria-label={`${statInfo.label} quick totals`}>
              <div><span>Modifier</span><strong>{modifier >= 0 ? '+' : ''}{modifier}</strong></div>
              <div><span>Saving throw</span><strong>{savingThrow >= 0 ? '+' : ''}{savingThrow}</strong><small>{proficient ? 'Proficient' : 'Not proficient'}</small></div>
            </div>
            <div className="attribute-inspector__knowledge">
              <section><h3>What it governs</h3><p>{statInfo.label} measures {codex?.governs || statInfo.description}</p></section>
              <section><h3>Common checks</h3><p>{codex?.checks || 'Use this ability whenever the situation calls for it.'}</p></section>
              <section><h3>Associated skills</h3><p>{codex?.skills?.length ? codex.skills.join(' · ') : 'This ability has no associated skills.'}</p></section>
              <section><h3>Class synergies</h3><p>{codex?.synergy || 'Many classes benefit from this ability.'}</p></section>
              <section><h3>Saving throws</h3><p>A saving throw uses this modifier to resist dangers that challenge your {statInfo.label.toLowerCase()}.</p></section>
            </div>
            {breakdown && (
              <section className="attribute-inspector__breakdown"><h3>Score calculation</h3>
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
              </section>
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
