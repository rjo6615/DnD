import React, { useState, useEffect, useCallback } from 'react'; // Import useState and React
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Table, Button, Alert } from 'react-bootstrap'; // Adjust as per your actual UI library
import { useNavigate, useParams } from "react-router-dom";
import CampaignModals from "../components/CampaignModals";
import useCampaignActions from "../hooks/useCampaignActions";

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const DEFAULT_DICE_COLOR = '#000000';

const normalizeDiceColor = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return HEX_COLOR_PATTERN.test(trimmed) ? trimmed : null;
};

export default function Help({
  form,
  showHelpModal,
  handleCloseHelpModal,
  onDiceColorChange,
}) {
  const params = useParams();
  const navigate = useNavigate();
  const {
    notification: campaignNotification,
    clearNotification,
    playerCampaigns,
    dmCampaigns,
    showJoinCampaignModal,
    showHostCampaignModal,
    showCreateCampaignModal,
    openJoinCampaignModal,
    closeJoinCampaignModal,
    openHostCampaignModal,
    closeHostCampaignModal,
    openCreateCampaignModal,
    closeCreateCampaignModal,
    createCampaignForm,
    updateCreateCampaignForm,
    submitCreateCampaign,
  } = useCampaignActions();
  const [showDeleteCharacter, setShowDeleteCharacter] = useState(false);
  const handleCloseDeleteCharacter = () => setShowDeleteCharacter(false);
  const handleShowDeleteCharacter = () => setShowDeleteCharacter(true);

  // This method will delete a record
  async function deleteRecord() {
    await apiFetch(`/characters/delete-character/${params.id}`, {
      method: 'DELETE',
    });
    navigate(`/zombies-character-select/${form.campaign}`);
  }

  async function handleLogout() {
    await apiFetch('/logout', { method: 'POST' });
    window.location.assign('/');
  }
  //-------------------------------------------Help Module--------------------------------------------------------------------
  const initialColor = normalizeDiceColor(form?.diceColor) || DEFAULT_DICE_COLOR;
  const [newColor, setNewColor] = useState(initialColor);

  const applyDiceFaceColor = useCallback((color) => {
    if (typeof document === 'undefined') {
      return;
    }

    const normalized = normalizeDiceColor(color) || DEFAULT_DICE_COLOR;
    const r = parseInt(normalized.slice(1, 3), 16);
    const g = parseInt(normalized.slice(3, 5), 16);
    const b = parseInt(normalized.slice(5, 7), 16);
    const opacity = 0.85;
    const rgbaColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    document.documentElement.style.setProperty('--dice-face-color', rgbaColor);
  }, []);

  useEffect(() => {
    applyDiceFaceColor(newColor);
  }, [applyDiceFaceColor, newColor]);

  useEffect(() => {
    const normalized = normalizeDiceColor(form?.diceColor);
    if (normalized) {
      setNewColor((prev) => (prev === normalized ? prev : normalized));
    } else if (form?.diceColor === undefined || form?.diceColor === null) {
      setNewColor((prev) => (prev === DEFAULT_DICE_COLOR ? prev : DEFAULT_DICE_COLOR));
    }
  }, [form?.diceColor]);

  const handleColorChange = (event) => {
    const selectedColor = event?.target?.value;
    if (typeof selectedColor === 'string') {
      setNewColor(selectedColor);
    }
  };

  async function diceColorUpdate() {
    const normalizedColor = normalizeDiceColor(newColor);
    if (!normalizedColor) {
      return;
    }

    try {
      const response = await apiFetch(`/characters/update-dice-color/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ diceColor: normalizedColor }),
      });

      if (!response.ok) {
        return;
      }

      let payload = null;
      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }

      const nextColor = normalizeDiceColor(payload?.diceColor) || normalizedColor;
      setNewColor(nextColor);

      if (typeof onDiceColorChange === 'function') {
        onDiceColorChange(nextColor);
      }
    } catch (error) {
      // Swallow fetch errors silently for now.
    }
  }
  return (
    <div>
      <Modal
        className="dnd-modal modern-modal text-center"
        size="lg"
        aria-labelledby="contained-modal-title-vcenter"
        centered
        scrollable
        show={showHelpModal}
        onHide={handleCloseHelpModal}
      >
        <Card className="modern-card text-center">
          <Card.Header className="modal-header">
            <Card.Title className="modal-title">Help</Card.Title>
          </Card.Header>
          <Card.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            {campaignNotification && (
              <Alert
                variant="danger"
                dismissible
                onClose={clearNotification}
                className="mb-3"
              >
                {campaignNotification}
              </Alert>
            )}
            <div className="table-container">
              <Table striped bordered hover size="sm" className="custom-table">
                <thead>
                  <tr>
                    <td className="center-td">
                      <strong className="text-light">Change Dice Color:</strong>
                    </td>
                    <td className="center-td">
                      <input
                        type="color"
                        id="colorPicker"
                        value={newColor}
                        onChange={handleColorChange}
                      />
                    </td>
                    <td className="center-td">
                      <Button
                        onClick={diceColorUpdate}
                        className="action-btn save-btn fa-solid fa-floppy-disk"
                      ></Button>
                    </td>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="center-td" colSpan="3">
                      <Button onClick={handleLogout} className="action-btn close-btn">
                        Logout
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </Table>
            </div>
            <div className="mt-3 d-flex flex-column flex-lg-row gap-2 justify-content-center align-items-center">
              <Button
                className="fantasy-button campaign-button"
                style={{ borderColor: "transparent" }}
                onClick={openJoinCampaignModal}
              >
                Join Campaign
              </Button>
              <Button
                className="hostCampaign campaign-button hostCampaign"
                style={{ borderColor: "transparent" }}
                onClick={openHostCampaignModal}
              >
                Host Campaign
              </Button>
              <Button
                className="fantasy-button campaign-button create-button"
                style={{ borderColor: "transparent" }}
                onClick={openCreateCampaignModal}
              >
                Create Campaign
              </Button>
            </div>
          </Card.Body>
          <Card.Footer className="modal-footer justify-content-between">
            <Button className="action-btn btn-danger" onClick={handleShowDeleteCharacter}>
              Delete Character
            </Button>
            <Button className="action-btn close-btn" onClick={handleCloseHelpModal}>
              Close
            </Button>
          </Card.Footer>
        </Card>
      </Modal>
      <Modal
        className="dnd-modal modern-modal text-center"
        size="lg"
        aria-labelledby="contained-modal-title-vcenter"
        centered
        scrollable
        show={showDeleteCharacter}
        onHide={handleCloseDeleteCharacter}
      >
        <Card className="modern-card text-center">
          <Card.Header className="modal-header">
            <Card.Title className="modal-title">Delete Character</Card.Title>
          </Card.Header>
          <Card.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            Are you sure you want to delete your character?
          </Card.Body>
          <Card.Footer className="modal-footer">
            <Button className="btn-danger action-btn save-btn" onClick={deleteRecord}>
              Im Sure
            </Button>
            <Button className="action-btn close-btn" onClick={handleCloseDeleteCharacter}>
              Close
            </Button>
          </Card.Footer>
        </Card>
      </Modal>
      <CampaignModals
        playerCampaigns={playerCampaigns}
        dmCampaigns={dmCampaigns}
        showJoinCampaignModal={showJoinCampaignModal}
        closeJoinCampaignModal={closeJoinCampaignModal}
        showHostCampaignModal={showHostCampaignModal}
        closeHostCampaignModal={closeHostCampaignModal}
        showCreateCampaignModal={showCreateCampaignModal}
        closeCreateCampaignModal={closeCreateCampaignModal}
        createCampaignForm={createCampaignForm}
        updateCreateCampaignForm={updateCreateCampaignForm}
        submitCreateCampaign={submitCreateCampaign}
      />
    </div>
  );
}
