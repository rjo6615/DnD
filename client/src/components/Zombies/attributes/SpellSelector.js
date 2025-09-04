import React, { useEffect, useState, useMemo } from 'react';
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Button, Form, Tabs, Tab } from 'react-bootstrap';
import { useParams } from 'react-router-dom';

/**
 * Modal component allowing users to select spells for their character.
 * Spells are fetched from the server and filtered by class and level.
 */
export default function SpellSelector({
  form,
  show,
  handleClose,
  onSpellsChange,
}) {
  const params = useParams();

  // Full-caster spell slot table indexed by class level then spell level
  const SLOT_TABLE = {
    0: Array(10).fill(0),
    1: [0, 2, 0, 0, 0, 0, 0, 0, 0, 0],
    2: [0, 3, 0, 0, 0, 0, 0, 0, 0, 0],
    3: [0, 4, 2, 0, 0, 0, 0, 0, 0, 0],
    4: [0, 4, 3, 0, 0, 0, 0, 0, 0, 0],
    5: [0, 4, 3, 2, 0, 0, 0, 0, 0, 0],
    6: [0, 4, 3, 3, 0, 0, 0, 0, 0, 0],
    7: [0, 4, 3, 3, 1, 0, 0, 0, 0, 0],
    8: [0, 4, 3, 3, 2, 0, 0, 0, 0, 0],
    9: [0, 4, 3, 3, 3, 1, 0, 0, 0, 0],
    10: [0, 4, 3, 3, 3, 2, 0, 0, 0, 0],
    11: [0, 4, 3, 3, 3, 2, 1, 0, 0, 0],
    12: [0, 4, 3, 3, 3, 2, 1, 0, 0, 0],
    13: [0, 4, 3, 3, 3, 2, 1, 1, 0, 0],
    14: [0, 4, 3, 3, 3, 2, 1, 1, 0, 0],
    15: [0, 4, 3, 3, 3, 2, 1, 1, 1, 0],
    16: [0, 4, 3, 3, 3, 2, 1, 1, 1, 0],
    17: [0, 4, 3, 3, 3, 2, 1, 1, 1, 1],
    18: [0, 4, 3, 3, 3, 3, 1, 1, 1, 1],
    19: [0, 4, 3, 3, 3, 3, 2, 1, 1, 1],
    20: [0, 4, 3, 3, 3, 3, 2, 2, 1, 1],
  };

  const getAvailableLevels = (classLevel) => {
    const slotRow = SLOT_TABLE[classLevel] || [];
    const options = [0];
    slotRow.forEach((slots, lvl) => {
      if (lvl > 0 && slots > 0) options.push(lvl);
    });
    return options;
  };

  const classesInfo = useMemo(
    () =>
      (form.occupation || []).map((o) => ({
        name: o.Name || o.Occupation,
        level: Number(o.Level) || 0,
      })),
    [form.occupation]
  );

  const levelOptions = useMemo(
    () =>
      classesInfo.reduce((acc, { name, level }) => {
        acc[name] = getAvailableLevels(level);
        return acc;
      }, {}),
    [classesInfo]
  );

  const initialLevels = useMemo(
    () =>
      classesInfo.reduce((acc, { name }) => {
        const options = levelOptions[name] || [];
        acc[name] = options.find((lvl) => lvl > 0) || 0;
        return acc;
      }, {}),
    [classesInfo, levelOptions]
  );

  const [selectedLevels, setSelectedLevels] = useState(initialLevels);
  const [allSpells, setAllSpells] = useState({});
  const [selectedSpells, setSelectedSpells] = useState(
    (form.spells || []).map((s) => (typeof s === 'string' ? s : s.name))
  );
  const [pointsLeft, setPointsLeft] = useState({});
  const [activeClass, setActiveClass] = useState(classesInfo[0]?.name || '');
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/spells')
      .then((res) => res.json())
      .then((data) => setAllSpells(data))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    setSelectedSpells(
      (form.spells || []).map((s) => (typeof s === 'string' ? s : s.name))
    );
  }, [form.spells]);

  useEffect(() => {
    setSelectedLevels(initialLevels);
    setActiveClass(classesInfo[0]?.name || '');
  }, [initialLevels, classesInfo]);

  function spellsForClass(cls) {
    return Object.values(allSpells).filter(
      (spell) =>
        spell.classes.includes(cls) &&
        spell.level === Number(selectedLevels[cls])
    );
  }

  useEffect(() => {
    const newPoints = {};
    classesInfo.forEach(({ name, level }) => {
      const slotRow = SLOT_TABLE[level] || [];
      const totalSlots = slotRow[Number(selectedLevels[name])] || 0;
      const count = selectedSpells.reduce((sum, spellName) => {
        const info = Object.values(allSpells).find((s) => s.name === spellName);
        return info &&
          info.level === Number(selectedLevels[name]) &&
          info.classes.includes(name)
          ? sum + 1
          : sum;
      }, 0);
      newPoints[name] = Math.max(0, totalSlots - count);
    });
    setPointsLeft(newPoints);
  }, [selectedLevels, selectedSpells, allSpells, classesInfo]);

  function toggleSpell(name) {
    setSelectedSpells((prev) =>
      prev.includes(name)
        ? prev.filter((s) => s !== name)
        : [...prev, name]
    );
  }

  async function saveSpells() {
    try {
      const currentPoints = classesInfo.reduce((sum, { name, level }) => {
        const slotRow = SLOT_TABLE[level] || [];
        const totalSlots = slotRow[Number(selectedLevels[name])] || 0;
        const count = selectedSpells.reduce((acc, spellName) => {
          const info = Object.values(allSpells).find((s) => s.name === spellName);
          return info &&
            info.level === Number(selectedLevels[name]) &&
            info.classes.includes(name)
            ? acc + 1
            : acc;
        }, 0);
        return sum + Math.max(0, totalSlots - count);
      }, 0);

      const selectedSpellObjects = selectedSpells.map((name) => {
        const info = Object.values(allSpells).find((s) => s.name === name) || {};
        return {
          name,
          level: info.level || 0,
          damage: info.damage || '',
        };
      });
      const res = await apiFetch(`/characters/${params.id}/spells`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spells: selectedSpellObjects,
          spellPoints: currentPoints,
        }),
      });
      if (!res.ok) {
        throw new Error('Failed to save spells');
      }
      onSpellsChange?.(selectedSpellObjects, currentPoints);
      handleClose();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Modal
      className="dnd-modal modern-modal"
      show={show}
      onHide={handleClose}
      size="lg"
      centered
    >
      <Card className="modern-card">
        <Card.Header className="modal-header">
          <Card.Title className="modal-title">Spells</Card.Title>
        </Card.Header>
        <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
          {error && <div className="text-danger mb-2">{error}</div>}
          {classesInfo.length === 1 ? (
            (() => {
              const cls = classesInfo[0].name;
              return (
                <>
                  <Form className="mb-3">
                    <Form.Group>
                      <Form.Label htmlFor={`spellLevel-${cls}`}>Level</Form.Label>
                      <Form.Select
                        id={`spellLevel-${cls}`}
                        value={selectedLevels[cls]}
                        onChange={(e) =>
                          setSelectedLevels((prev) => ({
                            ...prev,
                            [cls]: Number(e.target.value),
                          }))
                        }
                      >
                        {levelOptions[cls].map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Form>
                  <div className="points-container" style={{ display: 'flex' }}>
                    <span className="points-label text-light">Points Left:</span>
                    <span className="points-value">{pointsLeft[cls] || 0}</span>
                  </div>
                  {spellsForClass(cls).map((spell) => (
                    <Form.Check
                      key={spell.name}
                      id={`spell-${spell.name}`}
                      type="checkbox"
                      label={spell.name}
                      checked={selectedSpells.includes(spell.name)}
                      disabled={
                        !selectedSpells.includes(spell.name) &&
                        (pointsLeft[cls] || 0) <= 0
                      }
                      onChange={() => toggleSpell(spell.name)}
                      className="mb-2"
                    />
                  ))}
                </>
              );
            })()
          ) : (
            <Tabs
              activeKey={activeClass}
              onSelect={(k) => setActiveClass(k || '')}
              className="mb-3"
            >
              {classesInfo.map(({ name }) => (
                <Tab eventKey={name} title={name} key={name}>
                  <Form className="mb-3">
                    <Form.Group>
                      <Form.Label htmlFor={`spellLevel-${name}`}>
                        Level
                      </Form.Label>
                      <Form.Select
                        id={`spellLevel-${name}`}
                        value={selectedLevels[name]}
                        onChange={(e) =>
                          setSelectedLevels((prev) => ({
                            ...prev,
                            [name]: Number(e.target.value),
                          }))
                        }
                      >
                        {levelOptions[name].map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {lvl}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Form>
                  <div className="points-container" style={{ display: 'flex' }}>
                    <span className="points-label text-light">
                      Points Left:
                    </span>
                    <span className="points-value">
                      {pointsLeft[name] || 0}
                    </span>
                  </div>
                  {spellsForClass(name).map((spell) => (
                    <Form.Check
                      key={spell.name}
                      id={`spell-${spell.name}`}
                      type="checkbox"
                      label={spell.name}
                      checked={selectedSpells.includes(spell.name)}
                      disabled={
                        !selectedSpells.includes(spell.name) &&
                        (pointsLeft[name] || 0) <= 0
                      }
                      onChange={() => toggleSpell(spell.name)}
                      className="mb-2"
                    />
                  ))}
                </Tab>
              ))}
            </Tabs>
          )}
        </Card.Body>
        <Card.Footer className="text-end">
          <Button variant="secondary" className="me-2" onClick={handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={saveSpells}>
            Save
          </Button>
        </Card.Footer>
      </Card>
    </Modal>
  );
}
