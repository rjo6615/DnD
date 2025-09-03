import React, { useState } from "react";
import { Card, Table, Modal, Button } from "react-bootstrap";
import levelup from "../../../images/levelup.png";
import LevelUp from "./LevelUp"; // Import LevelUp component

export default function CharacterInfo({ form, show, handleClose }) {
  const totalLevel = form.occupation.reduce((total, el) => total + Number(el.Level), 0);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);

  const handleShowLevelUpModal = () => {
    setShowLevelUpModal(true);
  };

  const handleCloseLevelUpModal = () => {
    setShowLevelUpModal(false);
  };

  const raceLanguages = (form.race?.languages || [])
    .filter((language) => language && !language.includes("Choice"))
    .join(", ");

  return (
    <Modal
      className="dnd-modal modern-modal"
      show={show}
      onHide={handleClose}
      size="lg"
      centered
      scrollable
    >
      <Card className="modern-card text-center">
        <Card.Header className="modal-header">
          <Card.Title className="modal-title">Character Info</Card.Title>
        </Card.Header>
        <Card.Body style={{ overflowY: "auto", maxHeight: "60vh" }}>
          <Table striped bordered hover size="sm" className="modern-table">
            <tbody>
              <tr>
                <th>Level</th>
                <td>{totalLevel}</td>
              </tr>
              <tr>
                <th>Class</th>
                <td>
                  {form.occupation.map((el, i) => (
                    <span key={i}>
                      {el.Level} {el.Occupation}
                      <br />
                    </span>
                  ))}
                </td>
              </tr>
              <tr>
                <th>Race</th>
                <td>{form.race?.name || ''}</td>
              </tr>
              <tr>
                <th>Languages</th>
                <td>{raceLanguages}</td>
              </tr>
              <tr>
                <th>Age</th>
                <td>{form.age}</td>
              </tr>
              <tr>
                <th>Sex</th>
                <td>{form.sex}</td>
              </tr>
              <tr>
                <th>Height</th>
                <td>{form.height}</td>
              </tr>
              <tr>
                <th>Weight</th>
                <td>{form.weight} lbs</td>
              </tr>
            </tbody>
          </Table>
        </Card.Body>
        <Card.Footer className="modal-footer">
          <Button className="action-btn" variant="secondary" onClick={handleShowLevelUpModal}>
            <img src={levelup} alt="Level Up" height="24" />
          </Button>
          <Button className="action-btn close-btn" variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Card.Footer>
      </Card>
      <LevelUp show={showLevelUpModal} handleClose={handleCloseLevelUpModal} form={form} />
    </Modal>
  );
}
