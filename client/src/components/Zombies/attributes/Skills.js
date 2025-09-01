import React, { useState } from 'react';
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Table, Button, Form } from 'react-bootstrap';
import { useParams } from 'react-router-dom';

import { SKILLS } from '../skillSchema';

// Compute 5e proficiency bonus from total character level
function proficiencyBonus(level = 0) {
  if (level >= 17) return 6;
  if (level >= 13) return 5;
  if (level >= 9) return 4;
  if (level >= 5) return 3;
  return 2;
}

export default function Skills({
  form,
  showSkill,
  handleCloseSkill,
  totalLevel,
  strMod,
  dexMod,
  conMod,
  intMod,
  chaMod,
  wisMod,
}) {
  const params = useParams();
  const [skills, setSkills] = useState(form.skills || {});

  if (!form) {
    return <div>Loading...</div>;
  }

  // Armor Check Penalty
  const checkPenalty = form.armor.map((el) => el[3]);
  const totalCheckPenalty = checkPenalty.reduce(
    (sum, a) => Number(sum) + Number(a),
    0
  );

  const modMap = {
    str: strMod,
    dex: dexMod,
    con: conMod,
    int: intMod,
    wis: wisMod,
    cha: chaMod,
  };

  const itemTotals = SKILLS.reduce((acc, { key, itemBonusIndex }) => {
    acc[key] = form.item.reduce(
      (sum, el) => sum + Number(el[itemBonusIndex] || 0),
      0
    );
    return acc;
  }, {});

  const featTotals = SKILLS.reduce((acc, { key }) => {
    acc[key] = (form.feat || []).reduce(
      (sum, el) => sum + Number(el[key] || 0),
      0
    );
    return acc;
  }, {});

  const profBonus = proficiencyBonus(totalLevel);

  const selectableSkills = new Set(form.allowedSkills || []);

  async function updateSkill(skill, updated) {
    try {
      const res = await apiFetch(`/skills/update-skills/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill, ...updated }),
      });
      if (!res.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await res.json();
      setSkills((prev) => ({
        ...prev,
        [skill]: { proficient: data.proficient, expertise: data.expertise },
      }));
    } catch (err) {
      console.error(err);
    }
  }

  const toggleProficient = (skill) => {
    if (!selectableSkills.has(skill)) return;
    const current = skills[skill] || { proficient: false, expertise: false };
    const updated = {
      proficient: !current.proficient,
      expertise: current.proficient ? current.expertise : false,
    };
    if (!updated.proficient) {
      updated.expertise = false;
    }
    updateSkill(skill, updated);
  };

  const toggleExpertise = (skill) => {
    const current = skills[skill] || { proficient: false, expertise: false };
    const updated = {
      proficient: true,
      expertise: !current.expertise,
    };
    updateSkill(skill, updated);
  };

  return (
    <Modal
      className="dnd-modal modern-modal"
      show={showSkill}
      onHide={handleCloseSkill}
      size="lg"
      scrollable
      centered
    >
      <Card className="modern-card text-center">
        <Card.Header className="modal-header">
          <Card.Title className="modal-title">Skills</Card.Title>
        </Card.Header>
        <Card.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Table striped bordered hover size="sm" className="modern-table">
            <thead>
              <tr>
                <th>Skill</th>
                <th>Total</th>
                <th>Mod</th>
                <th>Prof</th>
                <th>Exp</th>
              </tr>
            </thead>
            <tbody>
              {SKILLS.map(({
                key,
                label,
                ability,
                armorPenalty = 0,
              }) => {
                const { proficient = false, expertise = false } =
                  skills[key] || {};
                const penalty = armorPenalty
                  ? armorPenalty * totalCheckPenalty
                  : 0;
                const multiplier = expertise ? 2 : proficient ? 1 : 0;
                const total =
                  modMap[ability] +
                  profBonus * multiplier +
                  penalty +
                  itemTotals[key] +
                  featTotals[key];
                const isSelectable = selectableSkills.has(key);
                return (
                  <tr key={key}>
                    <td>{label}</td>
                    <td>{total}</td>
                    <td>{modMap[ability]}</td>
                    <td>
                      <Form.Check
                        type="checkbox"
                        checked={proficient}
                        disabled={!isSelectable}
                        onChange={() => toggleProficient(key)}
                      />
                    </td>
                    <td>
                      <Form.Check
                        type="checkbox"
                        checked={expertise}
                        disabled={!proficient}
                        onChange={() => toggleExpertise(key)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card.Body>
        <Card.Footer className="modal-footer d-flex">
          <Button
            onClick={() => handleCloseSkill()}
            className="action-btn close-btn fa-solid fa-xmark flex-fill"
          ></Button>
        </Card.Footer>
      </Card>
    </Modal>
  );
}

