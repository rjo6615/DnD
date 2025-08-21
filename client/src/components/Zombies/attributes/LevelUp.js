import React, { useState, useEffect, useRef } from "react";
import apiFetch from '../../../utils/apiFetch';
import { Card, Modal, Button, Form } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import wornpaper from "../../../images/wornpaper.jpg"; // Ensure you have this image

export default function LevelUp({ show, handleClose, form }) {
  //--------------------------------------------Level Up--------------------------------------------------------------------------------------------------------------------------------------------
  const [showLvlModal, setShowLvlModal] = useState(show);
  const [chosenOccupation, setChosenOccupation] = useState('');
  const selectedOccupationRef = useRef();
  const [levelForm] = useState({
    selectedOccupation: "",
    level: "",
    health: "",
  });
  const params = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    setShowLvlModal(show);
  }, [show]);

  const handleChosenOccupationChange = (e) => {
    setChosenOccupation(e.target.value);
  };

  const handleCloseLvlModal = () => {
    setChosenOccupation('');
    setShowLvlModal(false);
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
      await apiFetch(`/update-level/${params.id}`, {
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

  const handleAddOccupationClick = () => {
    setShowAddClassModal(true);
    setChosenAddOccupation('');
  };

  const handleOccupationChange = (event) => {
    const selectedIndex = event.target.selectedIndex;
    setSelectedOccupation(getOccupation[selectedIndex - 1]); // Subtract 1 because the first option is empty
    setChosenAddOccupation(event.target.value);
  };

  const handleConfirmClick = () => {
    if (selectedOccupation) {
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

      // Perform the database update here
      apiFetch(`/update-health/${params.id}`, {
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
      })
        .then(() => {
          window.alert("Database update complete");
        })
        .catch((error) => {
          // Handle errors here
          console.error(error);
        });

      // Perform the database update with the entire form.occupation array
      apiFetch(`/update-occupations/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form.occupation), // Send the array directly
      })
        .then(() => {
          window.alert("Database update complete");
          navigate(0);
        })
        .catch((error) => {
          // Handle errors here
          console.error(error);
        });

      setShowAddClassModal(false);
    } else {
      alert('Please select an occupation.');
    }
  };

  useEffect(() => {
    async function fetchData() {
      const response = await apiFetch(`/occupations`);

      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const record = await response.json();
      if (!record) {
        window.alert(`Record not found`);
        navigate("/");
        return;
      }
      setGetOccupation(record);
    }
    fetchData();
    return;

  }, [navigate]);

  return (
    <div>
      <Modal show={showLvlModal} onHide={handleCloseLvlModal} size="md" centered>
        <div className="text-center">
          <Card style={{ width: 'auto', backgroundImage: `url(${wornpaper})`, backgroundSize: "cover" }}>
            <Card.Title>Level Up</Card.Title>
            <Card.Body>
              {/* Display level up information */}
              <div>
                Level: {form.totalLevel} {'\u2192'} Level: {Number(form.totalLevel) + 1}
                <br />
                HP: {form.health + Number(form.conMod * form.totalLevel)} {'\u2192'} HP: {levelForm.health + Number(form.conMod * (form.totalLevel + 1))}
                <br />
                Attack Bonus: {form.atkBonus} {'\u2192'} {form.atkBonusNext}
                <br />
                Fortitude Save: {form.fortSave} {'\u2192'} {form.fortSaveNext}
                <br />
                Will Save: {form.willSave} {'\u2192'} {form.willSaveNext}
                <br />
                Reflex Save: {form.reflexSave} {'\u2192'} {form.reflexSaveNext}
              </div>
              {/* Add occupation */}
              <Form>
                <Button className="rounded-pill bg-warning" variant="outline-dark" onClick={handleAddOccupationClick}>
                  Add Occupation
                </Button>
                <Modal centered show={showAddClassModal} onHide={() => setShowAddClassModal(false)}>
                  <div className="text-center">
                    <Card className="" style={{ width: 'auto', backgroundImage: `url(${wornpaper})`, backgroundSize: "cover" }}>
                      <Card.Body>
                        <Form.Group className="mb-3 mx-5">
                          <Form.Label className="text-dark">Select Occupation</Form.Label>
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
                      </Card.Body>
                      <Modal.Footer>
                        <Button variant="secondary" onClick={() => { setShowAddClassModal(false); setChosenAddOccupation(''); }}>
                          Close
                        </Button>
                        <Button variant="primary" onClick={handleConfirmClick} disabled={!chosenAddOccupation}>
                          Confirm
                        </Button>
                      </Modal.Footer>
                    </Card>
                  </div>
                </Modal>
              </Form>
              {/* Level up known occupation */}
              <Form onSubmit={(e) => { e.preventDefault(); handleCloseLvlModal(); levelUpdate(); }}>
                <br />
                <span>or</span>
                <Form.Group className="mb-3 mx-5">
                  <Form.Label className="text-dark">Select Occupation</Form.Label>
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
                <Modal.Footer>
                  <Button variant="secondary" onClick={handleCloseLvlModal}>
                    Close
                  </Button>
                  <Button variant="primary" type="submit" disabled={!chosenOccupation}>
                    Level Up
                  </Button>
                </Modal.Footer>
              </Form>
            </Card.Body>
          </Card>
        </div>
      </Modal>
    </div>
  );
}
