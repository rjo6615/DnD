import React, { useState, useEffect, useMemo } from 'react';
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Table, Button, Form, Alert } from 'react-bootstrap';
import { useParams } from 'react-router-dom';

import { SKILLS } from '../skillSchema';
import proficiencyBonus from '../../../utils/proficiencyBonus';
import SkillInfoModal from './SkillInfoModal';
import { normalizeEquipmentMap } from './equipmentNormalization';

const EMPTY_OBJECT = Object.freeze({});

export function rollSkill(bonus = 0) {
  const d20 = Math.floor(Math.random() * 20) + 1;
  if (d20 === 20) {
    window.dispatchEvent(new CustomEvent('critical-hit', { detail: 'critical' }));
  } else if (d20 === 1) {
    window.dispatchEvent(new CustomEvent('critical-failure', { detail: 'fumble' }));
  }
  const result = d20 + bonus;
  return { result, d20 };
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
  onSkillsChange,
  onRollResult,
}) {
  const params = useParams();
  const safeForm = form ?? {};
  const formSkills = safeForm.skills ?? EMPTY_OBJECT;
  const formProficiencyPoints = safeForm.proficiencyPoints || 0;
  const formExpertisePoints = safeForm.expertisePoints || 0;
  const [skills, setSkills] = useState(formSkills);
  const [error, setError] = useState('');
  const [showSkillInfo, setShowSkillInfo] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const raceProficiencies = useMemo(() => {
    return new Set(
      Object.entries(form?.race?.skills || {})
        .filter(([, s]) => s?.proficient)
        .map(([key]) => key)
    );
  }, [form?.race?.skills]);
  const backgroundProficiencies = useMemo(() => {
    return new Set(
      Object.entries(form?.background?.skills || {})
        .filter(([, s]) => s?.proficient)
        .map(([key]) => key)
    );
  }, [form?.background?.skills]);
  const raceExpertise = useMemo(() => {
    return new Set(
      Object.entries(form?.race?.skills || {})
        .filter(([, s]) => s?.expertise)
        .map(([key]) => key)
    );
  }, [form?.race?.skills]);
  const backgroundExpertise = useMemo(() => {
    return new Set(
      Object.entries(form?.background?.skills || {})
        .filter(([, s]) => s?.expertise)
        .map(([key]) => key)
    );
  }, [form?.background?.skills]);
  const lockedExpertise = useMemo(() => {
    return new Set([...raceExpertise, ...backgroundExpertise]);
  }, [raceExpertise, backgroundExpertise]);
  const lockedProficiencies = useMemo(() => {
    return new Set([...raceProficiencies, ...backgroundProficiencies]);
  }, [raceProficiencies, backgroundProficiencies]);
  const currentProficiencyCount = Object.values(formSkills).filter(
    (s) => s.proficient
  ).length;
  const [proficiencyPointsLeft, setProficiencyPointsLeft] = useState(
    Math.max(0, formProficiencyPoints - currentProficiencyCount)
  );
  const currentExpertiseCount = Object.values(formSkills).filter(
    (s) => s.expertise
  ).length;
  const [expertisePointsLeft, setExpertisePointsLeft] = useState(
    Math.max(0, formExpertisePoints - currentExpertiseCount)
  );

  useEffect(() => {
    const count = Object.values(formSkills).filter(
      (s) => s.proficient
    ).length;
    setSkills(formSkills);
    setProficiencyPointsLeft(
      Math.max(0, formProficiencyPoints - count)
    );
    const expertiseUsed = Object.values(formSkills).filter(
      (s) => s.expertise
    ).length;
    setExpertisePointsLeft(
      Math.max(0, formExpertisePoints - expertiseUsed)
    );
  }, [
    formSkills,
    formProficiencyPoints,
    formExpertisePoints,
    lockedProficiencies,
    lockedExpertise,
  ]);

  const hasEquipment =
    typeof safeForm.equipment === 'object' && safeForm.equipment !== null;
  const normalizedEquipment = useMemo(
    () => normalizeEquipmentMap(safeForm.equipment),
    [safeForm.equipment]
  );
  const equippedArmor = useMemo(() => {
    if (hasEquipment) {
      return Object.values(normalizedEquipment).filter((item) => {
        if (!item) return false;
        if (item.source === 'armor') return true;
        if (item.acBonus != null || item.armorBonus != null || item.ac != null)
          return true;
        if (item.maxDex != null || item.maxDexterity != null) return true;
        if (item.checkPenalty != null || item.stealth != null) return true;
        return false;
      });
    }
    return Array.isArray(safeForm.armor) ? safeForm.armor.filter(Boolean) : [];
  }, [hasEquipment, normalizedEquipment, safeForm.armor]);
  const armorItems = equippedArmor.map((el) =>
    Array.isArray(el)
      ? el
      : [
          el.name,
          el.acBonus ?? el.armorBonus ?? el.ac,
          el.maxDex ?? el.maxDexterity,
          el.checkPenalty ?? el.stealth,
        ]
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

  const equippedItems = useMemo(() => {
    if (hasEquipment) {
      return Object.values(normalizedEquipment).filter(Boolean);
    }
    return Array.isArray(safeForm.item) ? safeForm.item.filter(Boolean) : [];
  }, [safeForm.item, hasEquipment, normalizedEquipment]);

  const itemTotals = SKILLS.reduce((acc, { key }) => {
    acc[key] = equippedItems.reduce(
      (sum, el) => sum + Number(el.skillBonuses?.[key] || 0),
      0
    );
    return acc;
  }, {});

  const featTotals = SKILLS.reduce((acc, { key }) => {
    acc[key] = (safeForm.feat || []).reduce(
      (sum, el) => sum + Number(el[key] || 0),
      0
    );
    return acc;
  }, {});

  const raceTotals = SKILLS.reduce((acc, { key }) => {
    acc[key] = Number(safeForm.race?.[key] || 0);
    return acc;
  }, {});

  const profBonus = proficiencyBonus(totalLevel);

  const selectableSkills = new Set(safeForm.allowedSkills || []);
  const selectableExpertise = new Set(safeForm.allowedExpertise || []);

  if (!form) {
    return <div>Loading...</div>;
  }

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
        const proficientCount = Object.values(newSkills).filter(
          (s) => s.proficient
        ).length;
        setProficiencyPointsLeft(
          Math.max(0, (safeForm.proficiencyPoints || 0) - proficientCount)
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
    if (lockedProficiencies.has(skill)) return;
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
    if (!(current.proficient || lockedProficiencies.has(skill))) return;
    if (!selectableExpertise.has(skill)) return;
    if (!current.expertise && expertisePointsLeft <= 0) return;
    const updated = {
      proficient: current.proficient,
      expertise: !current.expertise,
    };
    updateSkill(skill, updated);
  };

  const handleRoll = (skillKey, ability, proficient, expertise) => {
    const skill = SKILLS.find((s) => s.key === skillKey);
    const armorPenalty = skill?.armorPenalty || 0;
    const penalty = armorPenalty ? armorPenalty * totalCheckPenalty : 0;
    const bonus =
      modMap[ability] +
      profBonus * (expertise ? 2 : proficient ? 1 : 0) +
      penalty +
      itemTotals[skillKey] +
      featTotals[skillKey] +
      raceTotals[skillKey];
    const { result, d20 } = rollSkill(bonus);
    window.dispatchEvent(
      new CustomEvent('damage-roll', {
        detail: {
          value: result,
          source: skill?.name,
          critical: d20 === 20,
          fumble: d20 === 1,
        },
      })
    );

    handleCloseSkill?.();
  };

  const handleView = (skill) => {
    setSelectedSkill(skill);
    setShowSkillInfo(true);
  };

  const handleCloseSkillInfo = () => {
    setShowSkillInfo(false);
  };

  return (
    <>
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
              <span className="points-label text-light">Proficiencies Left:</span>
              <span className="points-value">{proficiencyPointsLeft}</span>
            </div>
            <div className="points-container" style={{ display: 'flex' }}>
              <span className="points-label text-light">Expertise Left:</span>
              <span className="points-value">{expertisePointsLeft}</span>
            </div>
            <Table striped bordered hover size="sm" className="modern-table">
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>View</th>
                  <th>Total</th>
                  <th>Mod</th>
                  <th>Prof</th>
                  <th>Exp</th>
                  <th>Roll</th>
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
                  const isProficient =
                    proficient || lockedProficiencies.has(key);
                  const multiplier = expertise ? 2 : isProficient ? 1 : 0;
                  const total =
                    modMap[ability] +
                    profBonus * multiplier +
                    penalty +
                    itemTotals[key] +
                    featTotals[key] +
                    raceTotals[key];
                  const isSelectable = selectableSkills.has(key);
                  const isRaceSkill = raceProficiencies.has(key);
                  const isBackgroundSkill = backgroundProficiencies.has(key);
                  return (
                    <tr key={key}>
                      <td>{label}</td>
                      <td>
                        <Button
                          onClick={() => handleView(key)}
                          variant="link"
                          aria-label="view"
                        >
                          <i className="fa-solid fa-eye"></i>
                        </Button>
                      </td>
                      <td>{total}</td>
                      <td>{modMap[ability]}</td>
                      <td>
                        <Form.Check
                          className="skill-checkbox"
                          type="checkbox"
                          checked={proficient}
                          disabled={!isSelectable || isRaceSkill || isBackgroundSkill}
                          onChange={() => toggleProficient(key)}
                        />
                      </td>
                      <td>
                        <Form.Check
                          className="skill-checkbox"
                          type="checkbox"
                          checked={expertise}
                          disabled={
                            !isProficient ||
                            !selectableExpertise.has(key) ||
                            lockedExpertise.has(key) ||
                            (!expertise && expertisePointsLeft <= 0)
                          }
                          onChange={() => toggleExpertise(key)}
                        />
                      </td>
                      <td>
                        <Button
                          onClick={() =>
                            handleRoll(key, ability, isProficient, expertise)
                          }
                          variant="link"
                          aria-label="roll"
                        >
                          <i className="fa-solid fa-dice-d20"></i>
                        </Button>
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
      <SkillInfoModal
        show={showSkillInfo}
        onHide={handleCloseSkillInfo}
        skillKey={selectedSkill}
      />
    </>
  );
}

