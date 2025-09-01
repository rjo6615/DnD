import React, { useState, useEffect, useRef } from "react";
import apiFetch from '../../../utils/apiFetch';
import { Card, Modal, Button, Form, Alert } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import useUser from '../../../hooks/useUser';

export default function LevelUp({ show, handleClose, form }) {
  //--------------------------------------------Level Up--------------------------------------------------------------------------------------------------------------------------------------------
  const [showLvlModal, setShowLvlModal] = useState(show);
  const [chosenOccupation, setChosenOccupation] = useState('');
  const selectedOccupationRef = useRef();
  const params = useParams();
  const navigate = useNavigate();
  const user = useUser();

  useEffect(() => {
    setShowLvlModal(show);
  }, [show]);

  const handleChosenOccupationChange = (e) => {
    setChosenOccupation(e.target.value);
  };

  const handleCloseLvlModal = () => {
    setChosenOccupation('');
    setShowLvlModal(false);
    setNotification('');
    setError('');
    handleClose();
  };

  const levelUpdate = async () => {
    const selectedOccupation = selectedOccupationRef.current.value;
    const selectedOccupationObject = form.occupation.find(
      (occupation) => occupation.Occupation === selectedOccupation
    );

    if (!selectedOccupationObject) {
      console.error("Selected occupation not found");
      return;
    }

    const newLevel = Number(selectedOccupationObject.Level) + 1;
    const newHealth = Math.floor(Math.random() * Number(selectedOccupationObject.Health)) + 1 + Number(form.health);

    const updatedLevelForm = {
      selectedOccupation,
      level: newLevel,
      health: newHealth,
    };

    try {
      await apiFetch(`/characters/update-level/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedLevelForm),
      });
      navigate(0);
    } catch (error) {
      console.error(error);
    }
  };

  //--------------------------------------------Add Occupation--------------------------------------------------------------------------------------------------------------------------------------------
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [selectedOccupation, setSelectedOccupation] = useState(null);
  const selectedAddOccupationRef = useRef();
  const [getOccupation, setGetOccupation] = useState([]);
  const [chosenAddOccupation, setChosenAddOccupation] = useState('');
  const [notification, setNotification] = useState('');
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleAddOccupationClick = () => {
    setShowAddClassModal(true);
    setChosenAddOccupation('');
    setValidationError('');
    setError('');
    setNotification('');
  };

  const handleOccupationChange = (event) => {
    const selectedIndex = event.target.selectedIndex;
    setSelectedOccupation(getOccupation[selectedIndex - 1]); // Subtract 1 because the first option is empty
    setChosenAddOccupation(event.target.value);
  };

  const handleConfirmClick = async () => {
    if (selectedOccupation) {
      setValidationError('');
      setError('');
      setNotification('');
      const selectedAddOccupation = selectedAddOccupationRef.current.value;
      const selectedAddOccupationObject = getOccupation.find(
        (occupation) => occupation.Occupation === selectedAddOccupation
      );

      const addOccupationHealth = Math.floor(Math.random() * Number(selectedAddOccupationObject.Health)) + 1 + Number(form.health);
      const addOccupationStrTotal = Number(selectedAddOccupationObject.str) + Number(form.str);
      const addOccupationDexTotal = Number(selectedAddOccupationObject.dex) + Number(form.dex);
      const addOccupationConTotal = Number(selectedAddOccupationObject.con) + Number(form.con);
      const addOccupationIntTotal = Number(selectedAddOccupationObject.int) + Number(form.int);
      const addOccupationWisTotal = Number(selectedAddOccupationObject.wis) + Number(form.wis);
      const addOccupationChaTotal = Number(selectedAddOccupationObject.cha) + Number(form.cha);

      const addOccupationStr = Number(selectedAddOccupationObject.str);
      const addOccupationDex = Number(selectedAddOccupationObject.dex);
      const addOccupationCon = Number(selectedAddOccupationObject.con);
      const addOccupationInt = Number(selectedAddOccupationObject.int);
      const addOccupationWis = Number(selectedAddOccupationObject.wis);
      const addOccupationCha = Number(selectedAddOccupationObject.cha);

      const totalNewStats = addOccupationStr + addOccupationDex + addOccupationCon + addOccupationInt
        + addOccupationWis + addOccupationCha;

      const newStartStatTotal = Number(totalNewStats) + Number(form.startStatTotal);

      // Push the selected occupation into form.occupation
      form.occupation.push(selectedOccupation);

      try {
        await apiFetch(`/characters/update-health/${params.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json", // Set content type to JSON
          },
          body: JSON.stringify({
            health: addOccupationHealth,
            str: addOccupationStrTotal,
            dex: addOccupationDexTotal,
            con: addOccupationConTotal,
            int: addOccupationIntTotal,
            wis: addOccupationWisTotal,
            cha: addOccupationChaTotal,
            startStatTotal: newStartStatTotal
          }), // Send as a JSON object
        });

        await apiFetch(`/characters/update-occupations/${params.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(form.occupation), // Send the array directly
        });

        setNotification("Database update complete");
        navigate(0);
      } catch (err) {
        console.error(err);
        setError('Database update failed');
      }

      setShowAddClassModal(false);
    } else {
      setValidationError('Please select an occupation.');
    }
  };

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      const response = await apiFetch('/characters/occupations');

      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        setError(message);
        return;
      }

      const record = await response.json();
      if (!record) {
        setError('Record not found');
        navigate("/");
        return;
      }
      setGetOccupation(record);
    }
    fetchData();
    return;

  }, [navigate, user]);

  return (
    <div>
      <Modal className="dnd-modal modern-modal" show={showLvlModal} onHide={handleCloseLvlModal} size="md" centered>
        <div className="text-center">
          <Card className="modern-card">
            <Card.Header className="modal-header">
              <Card.Title className="modal-title">Level Up</Card.Title>
            </Card.Header>
            <Card.Body>
              {notification && (
                <Alert variant="success" onClose={() => setNotification('')} dismissible>
                  {notification}
                </Alert>
              )}
              {error && (
                <Alert variant="danger" onClose={() => setError('')} dismissible>
                  {error}
                </Alert>
              )}
              {/* Add occupation */}
              <Form>
                <Button className="action-btn" onClick={handleAddOccupationClick}>
                  Add Occupation
                </Button>
                <Modal
                  className="dnd-modal modern-modal"
                  centered
                  show={showAddClassModal}
                  onHide={() => { setShowAddClassModal(false); setChosenAddOccupation(''); setValidationError(''); setError(''); setNotification(''); }}
                >
                  <Card className="modern-card text-center">
                    <Card.Header className="modal-header">
                      <Card.Title className="modal-title">Add Occupation</Card.Title>
                    </Card.Header>
                    <Card.Body>
                      {notification && (
                        <Alert variant="success" onClose={() => setNotification('')} dismissible>
                          {notification}
                        </Alert>
                      )}
                      {error && (
                        <Alert variant="danger" onClose={() => setError('')} dismissible>
                          {error}
                        </Alert>
                      )}
                      <Form.Group className="mb-3 mx-5">
                        <Form.Label className="text-light">Select Occupation</Form.Label>
                        <Form.Select
                          ref={selectedAddOccupationRef}
                          onChange={handleOccupationChange}
                          defaultValue=""
                        >
                          <option value="" disabled>Select your occupation</option>
                          {getOccupation.map((occupation, i) => {
                            const isOccupationSelected = form.occupation.some(
                              (item) => item.Occupation === occupation.Occupation
                            );

                            return (
                              <option key={i} disabled={isOccupationSelected}>
                                {occupation.Occupation}
                              </option>
                            );
                          })}
                        </Form.Select>
                      </Form.Group>
                      {validationError && <div className="text-danger">{validationError}</div>}
                    </Card.Body>
                    <Card.Footer className="modal-footer">
                        <Button
                          className="action-btn close-btn"
                          onClick={() => { setShowAddClassModal(false); setChosenAddOccupation(''); setValidationError(''); setError(''); setNotification(''); }}
                        >
                        Close
                      </Button>
                      <Button
                        className="action-btn save-btn"
                        onClick={handleConfirmClick}
                        disabled={!chosenAddOccupation}
                      >
                        Confirm
                      </Button>
                    </Card.Footer>
                  </Card>
                </Modal>
              </Form>
              {/* Level up known occupation */}
              <Form
                id="level-up-form"
                onSubmit={(e) => { e.preventDefault(); handleCloseLvlModal(); levelUpdate(); }}
              >
                <br />
                <span>or</span>
                <Form.Group className="mb-3 mx-5">
                  <Form.Label className="text-light">Select Occupation</Form.Label>
                  <Form.Select
                    ref={selectedOccupationRef}
                    defaultValue=""
                    onChange={handleChosenOccupationChange}
                  >
                    <option value="" disabled>Select your occupation</option>
                    {form.occupation.map((occupation, i) => (
                      <option key={i}>{occupation.Occupation}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Form>
            </Card.Body>
            <Card.Footer className="modal-footer">
              <Button className="action-btn close-btn" onClick={handleCloseLvlModal}>
                Close
              </Button>
              <Button
                className="action-btn save-btn"
                type="submit"
                form="level-up-form"
                disabled={!chosenOccupation}
              >
                Level Up
              </Button>
            </Card.Footer>
          </Card>
        </div>
      </Modal>
    </div>
  );
}
