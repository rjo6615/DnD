import React, { useState, useEffect, useMemo } from 'react';
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Table, Button, Form, Alert } from 'react-bootstrap';
import { useParams } from 'react-router-dom';

import { SKILLS } from '../skillSchema';
import proficiencyBonus from '../../../utils/proficiencyBonus';

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
  onSkillsChange,
}) {
  const params = useParams();
  const [skills, setSkills] = useState(form.skills || {});
  const [error, setError] = useState('');
  const raceProficiencies = useMemo(() => {
    return new Set(
      Object.entries(form.race?.skills || {})
        .filter(([, s]) => s?.proficient)
        .map(([key]) => key)
    );
  }, [form.race?.skills]);
  const currentProficiencyCount = Object.entries(form.skills || {}).filter(
    ([key, s]) => s.proficient && !raceProficiencies.has(key)
  ).length;
  const [proficiencyPointsLeft, setProficiencyPointsLeft] = useState(
    Math.max(0, (form.proficiencyPoints || 0) - currentProficiencyCount)
  );

  useEffect(() => {
    const count = Object.entries(form.skills || {}).filter(
      ([key, s]) => s.proficient && !raceProficiencies.has(key)
    ).length;
    setSkills(form.skills || {});
    setProficiencyPointsLeft(
      Math.max(0, (form.proficiencyPoints || 0) - count)
    );
  }, [form.skills, form.proficiencyPoints, raceProficiencies]);

  if (!form) {
    return <div>Loading...</div>;
  }

  // Armor Check Penalty
  const armorItems = (form.armor || []).map((el) =>
    Array.isArray(el)
      ? el
      : [el.name, el.acBonus ?? el.armorBonus ?? el.ac, el.maxDex, el.checkPenalty]
  );
  const checkPenalty = armorItems.map((item) => Number(item[3] ?? 0));
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

  const raceTotals = SKILLS.reduce((acc, { key }) => {
    acc[key] = Number(form.race?.[key] || 0);
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
        const message = await res.text();
        throw new Error(message || 'Failed to update skill');
      }
      const data = await res.json();
      setSkills((prev) => {
        const newSkills = {
          ...prev,
          [skill]: { proficient: data.proficient, expertise: data.expertise },
        };
        const proficientCount = Object.entries(newSkills).filter(
          ([key, s]) => s.proficient && !raceProficiencies.has(key)
        ).length;
        setProficiencyPointsLeft(
          Math.max(0, (form.proficiencyPoints || 0) - proficientCount)
        );
        onSkillsChange?.(newSkills);
        return newSkills;
      });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error updating skill');
    }
  }

  const toggleProficient = (skill) => {
    if (raceProficiencies.has(skill)) return;
    if (!selectableSkills.has(skill)) return;
    const current = skills[skill] || { proficient: false, expertise: false };
    if (!current.proficient && proficiencyPointsLeft <= 0) return;
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
          {error && (
            <Alert variant="danger" onClose={() => setError('')} dismissible>
              {error}
            </Alert>
          )}
          <div className="points-container" style={{ display: 'flex' }}>
            <span className="points-label text-light">Points Left:</span>
            <span className="points-value">{proficiencyPointsLeft}</span>
          </div>
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
                  featTotals[key] +
                  raceTotals[key];
                const isSelectable = selectableSkills.has(key);
                const isRaceSkill = raceProficiencies.has(key);
                return (
                  <tr key={key}>
                    <td>{label}</td>
                    <td>{total}</td>
                    <td>{modMap[ability]}</td>
                    <td>
                      <Form.Check
                        className="skill-checkbox"
                        type="checkbox"
                        checked={proficient}
                        disabled={!isSelectable || isRaceSkill}
                        onChange={() => toggleProficient(key)}
                      />
                    </td>
                    <td>
                      <Form.Check
                        className="skill-checkbox"
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
            className="action-btn close-btn flex-fill"
          >Close</Button>
        </Card.Footer>
      </Card>
    </Modal>
  );
}

