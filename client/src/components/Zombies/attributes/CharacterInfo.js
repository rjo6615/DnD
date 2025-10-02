import React, { useState, useMemo, useCallback } from "react";
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
  isDocked = false,
  dockedSide = null,
  onDockClose,
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

  const dialogClassName = useMemo(() => {
    if (!isDocked) {
      return undefined;
    }

    const classes = ['docked-modal'];
    if (dockedSide) {
      classes.push(`docked-modal--${dockedSide}`);
    }
    classes.push('docked-modal--characterInfo');
    return classes.join(' ');
  }, [isDocked, dockedSide]);

  const modalClassName = useMemo(() => {
    const classes = ['dnd-modal', 'modern-modal'];
    if (isDocked) {
      classes.push('docked-modal-container');
    }
    return classes.join(' ');
  }, [isDocked]);

  const handleModalHide = useCallback(() => {
    if (isDocked) {
      if (typeof onDockClose === 'function') {
        onDockClose();
      }
      return;
    }

    handleClose?.();
  }, [handleClose, isDocked, onDockClose]);

  const raceName = form?.race?.name?.toLowerCase?.();
  const isGoliath = raceName === 'goliath';
  const giantAncestries = isGoliath ? form?.race?.giantAncestries || {} : {};
  const goliathAncestry = isGoliath
    ? form?.race?.selectedAncestry ||
      (form?.race?.selectedAncestryKey && giantAncestries
        ? giantAncestries[form.race.selectedAncestryKey]
        : null) ||
      form?.giantAncestry ||
      (form?.giantAncestryKey && giantAncestries
        ? giantAncestries[form.giantAncestryKey]
        : null)
    : null;
  const goliathAncestryName = goliathAncestry
    ? goliathAncestry.ancestryName ||
      goliathAncestry.name ||
      goliathAncestry.label ||
      "Giant Ancestry"
    : null;
  const displaySize =
    form?.temporarySize || form?.size || form?.height || "—";

  return (
    <Modal
      className={modalClassName}
      show={show}
      onHide={handleModalHide}
      size="lg"
      centered={!isDocked}
      scrollable
      backdrop={isDocked ? false : true}
      enforceFocus={!isDocked}
      restoreFocus={!isDocked}
      dialogClassName={dialogClassName}
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
              <div className="character-info-value character-info-value--stacked">
                <span>{form.race?.name || "—"}</span>
                {isGoliath && goliathAncestryName && (
                  <span className="character-info-subtext">{goliathAncestryName}</span>
                )}
              </div>
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
              <div className="character-info-label">Size</div>
              <div className="character-info-value">{displaySize}</div>
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
            onClick={handleModalHide}
          >
            Close
          </Button>
        </Card.Footer>
      </Card>
      <LevelUp show={showLevelUpModal} handleClose={handleCloseLevelUpModal} form={form} />
    </Modal>
  );
}
