import React, { useState, useEffect } from 'react';
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Table, Button, Form, Col, Row } from 'react-bootstrap';
import { useNavigate, useParams } from "react-router-dom";
import { SKILLS } from "../skillSchema";

// Feats component now uses feat objects rather than flattened arrays.  Each feat
// object should contain at least a `featName`, optional `notes`, and keys for
// any skill bonuses defined in `SKILLS`.
export default function Feats({ form, showFeats, handleCloseFeats, totalLevel }) {
  const params = useParams();
  const navigate = useNavigate();

  const [feat, setFeat] = useState({ feat: [] });       // Available feats from DB
  const [addFeat, setAddFeat] = useState(null);         // Selected feat to add
  const [modalFeatData, setModalFeatData] = useState({});
  const [showFeatNotes, setShowFeatNotes] = useState(false);
  const handleCloseFeatNotes = () => setShowFeatNotes(false);
  const handleShowFeatNotes = () => setShowFeatNotes(true);
  const [chosenFeat, setChosenFeat] = useState('');

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
        navigate("/");
        return;
      }
      setFeat({ feat: record });
    }
    fetchFeats();
    return;
  }, [navigate]);

  // Sends feat data to database for update
  async function addFeatToDb(e) {
    e.preventDefault();
    if (!addFeat) return;
    const newFeatList = [...form.feat, addFeat];
    await apiFetch(`/feats/update/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feat: newFeatList })
    }).catch(error => {
      window.alert(error);
      return;
    });
    navigate(0);
  }

  // Delete feat and update database
  function deleteFeats(el) {
    const newFeatForm = form.feat.filter(featObj => featObj !== el);
    addDeleteFeatToDb(newFeatForm);
  }

  const showDeleteFeatBtn = form.feat.length === 0 ? "none" : "";

  async function addDeleteFeatToDb(newFeatForm) {
    await apiFetch(`/feats/update/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feat: newFeatForm })
    }).catch(error => {
      window.alert(error);
      return;
    });
    window.alert("Feat Deleted");
    navigate(0);
  }

  // Handle selection from drop down
  const handleSelectFeat = (e) => {
    const featName = e.target.value;
    setChosenFeat(featName);
    const foundFeat = feat.feat.find(f => f.featName === featName);
    setAddFeat(foundFeat || null);
  };

  return (
    <div>
      {/* -----------------------------------------Feats Render---------------------------------------------- */}
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
                            if (el[key] && el[key] !== "0") {
                              skillValues.push(`${label}: ${el[key]} `);
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
                      <Form.Select
                        onChange={handleSelectFeat}
                        defaultValue=""
                        type="text"
                      >
                        <option value="" disabled>Select your feat</option>
                        {feat.feat.map((el) => (
                          <option key={el.featName} value={el.featName}>{el.featName}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    <Button disabled={!chosenFeat} className="action-btn" type="submit">Add</Button>
                  </Form>
                </Col>
              </Row>
            </Card.Body>
            <Card.Footer className="modal-footer">
              <Button className="action-btn close-btn" onClick={handleCloseFeats}>Close</Button>
            </Card.Footer>
          </Card>
          <Modal className="modern-modal" show={showFeatNotes} onHide={handleCloseFeatNotes} size="lg" centered>
            <Card className="modern-card text-center">
              <Card.Header className="modal-header">
                <Card.Title className="modal-title">{modalFeatData.featName}</Card.Title>
              </Card.Header>
              <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>{modalFeatData.notes}</Card.Body>
              <Card.Footer className="modal-footer">
                <Button className="action-btn close-btn" onClick={handleCloseFeatNotes}>Close</Button>
              </Card.Footer>
            </Card>
          </Modal>
        </div>
      </Modal>
    </div>
  );
}

