import React, { useState, useEffect } from 'react';
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Table, Button, Form, Col, Row } from 'react-bootstrap';
import { useNavigate, useParams } from "react-router-dom";
import { SKILLS } from "../skillSchema";

export default function Feats({ form, showFeats, handleCloseFeats, totalLevel }) {
  const params = useParams();
  const navigate = useNavigate();
  //----------------------------------------------Feats Section-----------------------------------------------------------------
  //-------------------------------------------------------------------
  const [feat, setFeat] = useState({ feat: [] });
  const [addFeat, setAddFeat] = useState(null);
  const [modalFeatData, setModalFeatData] = useState({ featName: "", notes: "" });
  const [showFeatNotes, setShowFeatNotes] = useState(false);
  const handleCloseFeatNotes = () => setShowFeatNotes(false);
  const handleShowFeatNotes = () => setShowFeatNotes(true);
  const [chosenFeat, setChosenFeat] = useState('');
  const [selectedFeatData, setSelectedFeatData] = useState(null);
  const [abilitySelections, setAbilitySelections] = useState({});

  const handleSelectFeat = (e) => {
    const featName = e.target.value;
    setChosenFeat(featName);
    const featObj = feat.feat.find((f) => f.featName === featName);
    setSelectedFeatData(featObj || null);
    setAbilitySelections({});
    if (featObj) {
      const baseFeat = {
        featName: featObj.featName,
        notes: featObj.notes,
        initiative: featObj.initiative ?? 0,
        ac: featObj.ac ?? 0,
        speed: featObj.speed ?? 0,
        hpMaxBonus: featObj.hpMaxBonus ?? 0,
        hpMaxBonusPerLevel: featObj.hpMaxBonusPerLevel ?? 0,
      };
      SKILLS.forEach(({ key }) => {
        baseFeat[key] = featObj[key];
      });
      baseFeat.str = featObj.str ?? 0;
      baseFeat.dex = featObj.dex ?? 0;
      baseFeat.con = featObj.con ?? 0;
      baseFeat.int = featObj.int ?? 0;
      baseFeat.wis = featObj.wis ?? 0;
      baseFeat.cha = featObj.cha ?? 0;
      setAddFeat(baseFeat);
    } else {
      setAddFeat(null);
    }
  };

  const handleAbilityChoice = (index, ability) => {
    setAbilitySelections((prev) => {
      const newSelections = { ...prev, [index]: ability };
      const abilityBonus = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
      Object.values(newSelections).forEach((a) => {
        if (a) abilityBonus[a] += 1;
      });
      setAddFeat((prevFeat) => ({ ...prevFeat, ...abilityBonus }));
      return newSelections;
    });
  };

  // ---------------------------------------Feats left-----------------------------------------------------
  const activeFeats = form.feat.filter(f => f.featName && f.featName !== "").length;
  const featPointsLeft = Math.floor(totalLevel / 3) + 1 - activeFeats;
  const showFeatBtn = featPointsLeft > 0 ? "" : "none";

  // ----------------------------------------Fetch Feats-----------------------------------
  useEffect(() => {
    async function fetchFeats() {
      const response = await apiFetch(`/feats`);

      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        window.alert(message);
        return;
      }

      const record = await response.json();
      if (!record) {
        window.alert(`Record not found`);
        navigate(`/`);
        return;
      }
      setFeat({ feat: record });
    }
    fetchFeats();
    return;
  }, [navigate]);

  async function addFeatToDb(e) {
    e.preventDefault();
    if (!addFeat) return;
    const existingIndex = form.feat.findIndex(f => f.featName === addFeat.featName);
    let updatedFeats;
    if (existingIndex >= 0) {
      updatedFeats = [...form.feat];
      updatedFeats[existingIndex] = addFeat;
    } else {
      updatedFeats = [...form.feat, addFeat];
    }
    await apiFetch(`/feats/update/${params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        feat: updatedFeats,
      }),
    }).catch((error) => {
      window.alert(error);
      return;
    });
    navigate(0);
  }
  // This method will delete a feat
  function deleteFeats(el) {
    const updatedFeats = form.feat.filter(f => f.featName !== el.featName);
    addDeleteFeatToDb(updatedFeats);
  }
  let showDeleteFeatBtn = "";
  if (form.feat.length === 0) {
    showDeleteFeatBtn = "none";
  }
  async function addDeleteFeatToDb(newFeatForm) {
    await apiFetch(`/feats/update/${params.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        feat: newFeatForm,
      }),
    })
      .catch((error) => {
        window.alert(error);
        return;
      });
    window.alert("Feat Deleted");
    navigate(0);
  }

  const abilityLabels = ['STR','DEX','CON','INT','WIS','CHA'];
  const extraAbilityLabels = [
    { label: 'Initiative', key: 'initiative' },
    { label: 'AC', key: 'ac' },
    { label: 'Speed', key: 'speed' },
    { label: 'HP Max Bonus', key: 'hpMaxBonus' },
    { label: 'HP Max Bonus/Level', key: 'hpMaxBonusPerLevel' },
  ];

  return (
    <div>
      {/* -----------------------------------------Feats Render------------------------------------------------------------------------------------------------------------------------------------ */}
      <Modal className="modern-modal" show={showFeats} onHide={handleCloseFeats} size="lg" centered>
        <div className="text-center">
          <Card className="modern-card">
            <Card.Header className="modal-header">
              <Card.Title className="modal-title">Feats</Card.Title>
            </Card.Header>
            <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
              <div className="points-container" style={{ display: showFeatBtn }}>
                <span className="points-label">Points Left:</span>
                <span className="points-value" id="featPointLeft">{featPointsLeft}</span>
              </div>
              <Table striped bordered hover size="sm" className="modern-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Notes</th>
                    <th>Skills</th>
                    <th>Abilities</th>

                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {form.feat.map((el) => (
                    <tr key={el.featName}>
                      <td>{el.featName}</td>
                      <td style={{ display: showDeleteFeatBtn }}>
                        <Button
                          size="sm"
                          className="action-btn fa-regular fa-eye"
                          onClick={() => {
                            handleShowFeatNotes();
                            setModalFeatData(el);
                          }}
                        ></Button>
                      </td>
                      <td style={{ display: showDeleteFeatBtn }}>
                        {(() => {
                          const skillValues = [];
                          SKILLS.forEach(({ label, key }) => {
                            const val = el[key];
                            if (val && val !== "0" && val !== "") {
                              skillValues.push(`${label}: ${val} `);
                            }
                          });
                          return (
                            <div>
                              {skillValues.map((skill, index) => (
                                <div key={index}>{skill}</div>
                              ))}
                            </div>
                          );
                        })()}
                      </td>
                      <td
                        style={{
                          display: showDeleteFeatBtn,
                          textAlign: "left",
                          verticalAlign: "top",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {(() => {
                          const abilityValues = [];
                          abilityLabels.forEach((label) => {
                            const prop = label.toLowerCase();
                            const val = el[prop];
                            if (val && val !== "0" && val !== "") {
                              abilityValues.push(`${label}: ${val}`);
                            }
                          });
                          extraAbilityLabels.forEach(({ label, key }) => {
                            const val = el[key];
                            if (val && val !== "0" && val !== "") {
                              abilityValues.push(`${label}: ${val}`);
                            }
                          });
                          return (
                            <div>
                              {abilityValues.map((ab, index) => (
                                <div key={index}>{ab}</div>
                              ))}
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <Button
                          size="sm"
                          style={{ display: showDeleteFeatBtn }}
                          className="btn-danger action-btn fa-solid fa-trash"
                          onClick={() => {
                            deleteFeats(el);
                          }}
                        ></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Row>
                <Col style={{ display: showFeatBtn }}>
                  <Form onSubmit={addFeatToDb}>
                    <Form.Group className="mb-3 mx-5">
                      <Form.Label className="text-dark">Select Feat</Form.Label>
                      <Form.Select onChange={handleSelectFeat} defaultValue="" type="text">
                        <option value="" disabled>
                          Select your feat
                        </option>
                        {feat.feat.map((el) => (
                          <option key={el.featName} value={el.featName}>
                            {el.featName}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    {selectedFeatData?.abilityIncreaseOptions &&
                      selectedFeatData.abilityIncreaseOptions.map((options, idx) => (
                        <Form.Group className="mb-3 mx-5" key={idx}>
                          <Form.Label className="text-dark">Ability Increase</Form.Label>
                          <Form.Select
                            value={abilitySelections[idx] || ""}
                            onChange={(e) => handleAbilityChoice(idx, e.target.value)}
                            defaultValue=""
                          >
                            <option value="" disabled>
                              Select ability
                            </option>
                            {options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt.toUpperCase()}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      ))}

                    <Button
                      disabled={
                        !chosenFeat ||
                        (selectedFeatData?.abilityIncreaseOptions &&
                          Object.keys(abilitySelections).length !==
                            selectedFeatData.abilityIncreaseOptions.length)
                      }
                      className="action-btn" type="submit"
                    >
                      Add
                    </Button>
                  </Form>
                </Col>
              </Row>
            </Card.Body>
            <Card.Footer className="modal-footer">
              <Button className="action-btn close-btn" onClick={handleCloseFeats}>
                Close
              </Button>
            </Card.Footer>
          </Card>
          <Modal className="modern-modal" show={showFeatNotes} onHide={handleCloseFeatNotes} size="lg" centered>
              <Card className="modern-card text-center">
                <Card.Header className="modal-header">
                  <Card.Title className="modal-title">{modalFeatData.featName}</Card.Title>
                </Card.Header>
                <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>{modalFeatData.notes}</Card.Body>
                <Card.Footer className="modal-footer">
                  <Button className="action-btn close-btn" onClick={handleCloseFeatNotes}>
                    Close
                  </Button>
                </Card.Footer>
              </Card>
          </Modal>
        </div>
      </Modal>
    </div>
  );
}
