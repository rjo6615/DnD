import React, { useState, useEffect } from 'react';
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Button, Form } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { SKILLS } from '../skillSchema';

export default function Race({ form, showRace, handleCloseRace, onRaceChange }) {
  const params = useParams();
  const [races, setRaces] = useState({});
  const [selectedKey, setSelectedKey] = useState('');
  const [selectedRace, setSelectedRace] = useState(null);
  const [abilitySelections, setAbilitySelections] = useState({});
  const [skillSelections, setSkillSelections] = useState([]);

  useEffect(() => {
    if (!showRace) return;
    async function fetchRaces() {
      const res = await apiFetch('/races');
      const data = await res.json();
      setRaces(data);
    }
    fetchRaces();
  }, [showRace]);

  const handleSelectRace = (e) => {
    const key = e.target.value;
    setSelectedKey(key);
    const race = races[key];
    setSelectedRace(race || null);
    setAbilitySelections({});
    setSkillSelections([]);
  };

  const handleAbilityChoice = (index, ability) => {
    setAbilitySelections((prev) => ({ ...prev, [index]: ability }));
  };

  const handleSkillChoice = (e) => {
    let selected = Array.from(e.target.selectedOptions).map((o) => o.value);
    const limit = selectedRace?.skillChoices?.count || selected.length;
    if (selected.length > limit) selected = selected.slice(0, limit);
    setSkillSelections(selected);
  };

  const saveRace = async () => {
    if (!selectedRace) return;
    const raceObj = JSON.parse(JSON.stringify(selectedRace));
    if (raceObj.abilityChoices) {
      Object.values(abilitySelections).forEach((ab) => {
        if (ab) {
          raceObj.abilities[ab] = (raceObj.abilities[ab] || 0) + 1;
        }
      });
      delete raceObj.abilityChoices;
    }
    if (raceObj.skillChoices) {
      const skills = raceObj.skills || {};
      skillSelections.forEach((sk) => {
        skills[sk] = { proficient: true };
      });
      raceObj.skills = skills;
      delete raceObj.skillChoices;
    }
    const res = await apiFetch(`/characters/${params.id}/race`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ race: raceObj }),
    });
    if (res.ok) {
      const data = await res.json();
      onRaceChange?.(data);
      handleCloseRace();
    }
  };

  const existingProfs = new Set(
    Object.entries(form.skills || {}).filter(([, v]) => v?.proficient).map(([k]) => k)
  );

  const skillOptions = SKILLS.filter(({ key }) => !existingProfs.has(key));

  return (
    <Modal className="dnd-modal modern-modal" show={showRace} onHide={handleCloseRace} centered scrollable>
      <Card className="modern-card text-center">
        <Card.Header className="modal-header">
          <Card.Title className="modal-title">Race</Card.Title>
        </Card.Header>
        <Card.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="text-light">Select Race</Form.Label>
              <Form.Select value={selectedKey} onChange={handleSelectRace}>
                <option value="">Choose...</option>
                {Object.keys(races).map((key) => (
                  <option key={key} value={key}>{races[key].name}</option>
                ))}
              </Form.Select>
            </Form.Group>
            {selectedRace?.abilityChoices && (
              <div>
                {[...Array(selectedRace.abilityChoices.count)].map((_, idx) => (
                  <Form.Group className="mb-2" key={idx}>
                    <Form.Label className="text-light">Ability Choice {idx + 1}</Form.Label>
                    <Form.Select value={abilitySelections[idx] || ''} onChange={(e) => handleAbilityChoice(idx, e.target.value)}>
                      <option value="">Choose...</option>
                      {selectedRace.abilityChoices.options.map((ab) => (
                        <option key={ab} value={ab}>{ab.toUpperCase()}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                ))}
              </div>
            )}
            {selectedRace?.skillChoices && (
              <Form.Group className="mb-3">
                <Form.Label className="text-light">Skill Choices</Form.Label>
                <Form.Select multiple value={skillSelections} onChange={handleSkillChoice}>
                  {skillOptions.map(({ key, label }) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}
          </Form>
        </Card.Body>
        <Card.Footer className="modal-footer">
          <Button className="action-btn" variant="secondary" onClick={saveRace}>Save</Button>
          <Button className="action-btn close-btn" variant="secondary" onClick={handleCloseRace}>Close</Button>
        </Card.Footer>
      </Card>
    </Modal>
  );
}
