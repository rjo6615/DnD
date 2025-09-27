import React, { useState } from "react";
import { Card, Modal, Button } from "react-bootstrap";
import levelup from "../../../images/levelup.png";
import LevelUp from "./LevelUp"; // Import LevelUp component

export default function CharacterInfo({
  form,
  show,
  handleClose,
  onShowBackground,
  onLongRest = () => {},
  onShortRest = () => {},
}) {
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
        <Card.Body className="modal-body character-info-body" style={{ maxHeight: "60vh" }}>
          <div className="character-info-grid">
            <div className="character-info-item">
              <div className="character-info-label">Level</div>
              <div className="character-info-value">{totalLevel}</div>
            </div>
            <div className="character-info-item">
              <div className="character-info-label">Classes</div>
              <div className="character-info-value character-info-value--stacked">
                {form.occupation.length
                  ? form.occupation.map((el, i) => (
                      <span key={`${el.Occupation}-${i}`}>
                        {el.Level} {el.Occupation}
                      </span>
                    ))
                  : "—"}
              </div>
            </div>
            <div className="character-info-item">
              <div className="character-info-label">Race</div>
              <div className="character-info-value">{form.race?.name || "—"}</div>
            </div>
            <div className="character-info-item">
              <div className="character-info-label">Background</div>
              <div className="character-info-value">
                <span>{form.background?.name || "—"}</span>
                <Button
                  onClick={onShowBackground}
                  variant="link"
                  aria-label="Show Background"
                  className="stat-card-view"
                  size="sm"
                >
                  <i className="fa-solid fa-eye"></i>
                </Button>
              </div>
            </div>
            <div className="character-info-item">
              <div className="character-info-label">Languages</div>
              <div className="character-info-value">
                {raceLanguages || "—"}
              </div>
            </div>
            <div className="character-info-item">
              <div className="character-info-label">Age</div>
              <div className="character-info-value">{form.age || "—"}</div>
            </div>
            <div className="character-info-item">
              <div className="character-info-label">Sex</div>
              <div className="character-info-value">{form.sex || "—"}</div>
            </div>
            <div className="character-info-item">
              <div className="character-info-label">Height</div>
              <div className="character-info-value">{form.height || "—"}</div>
            </div>
            <div className="character-info-item">
              <div className="character-info-label">Weight</div>
              <div className="character-info-value">
                {form.weight ? `${form.weight} lbs` : "—"}
              </div>
            </div>
          </div>
        </Card.Body>
        <Card.Footer className="modal-footer">
          <Button
            className="action-btn"
            variant="secondary"
            onClick={handleShowLevelUpModal}
          >
            <img src={levelup} alt="Level Up" height="24" />
          </Button>
          <Button
            className="action-btn"
            variant="secondary"
            onClick={onLongRest}
          >
            Long Rest
          </Button>
          <Button
            className="action-btn"
            variant="secondary"
            onClick={onShortRest}
          >
            Short Rest
          </Button>
          <Button
            className="action-btn close-btn"
            variant="primary"
            onClick={handleClose}
          >
            Close
          </Button>
        </Card.Footer>
      </Card>
      <LevelUp show={showLevelUpModal} handleClose={handleCloseLevelUpModal} form={form} />
    </Modal>
  );
}
