import React, { useEffect, useState, useMemo, useCallback } from 'react';
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Button, Form, Tabs, Tab, Table } from 'react-bootstrap';
import { useParams } from 'react-router-dom';

/**
 * Modal component allowing users to select spells for their character.
 * Spells are fetched from the server and filtered by class and level.
 */
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

// Number of cantrips known by class level
const CANTRIP_TABLE = {
  0: 0,
  1: 3,
  2: 3,
  3: 3,
  4: 4,
  5: 4,
  6: 4,
  7: 4,
  8: 4,
  9: 4,
  10: 5,
  11: 5,
  12: 5,
  13: 5,
  14: 5,
  15: 5,
  16: 5,
  17: 5,
  18: 5,
  19: 5,
  20: 5,
};

const SPELLCASTING_CLASSES = {
  bard: 'full',
  cleric: 'full',
  druid: 'full',
  sorcerer: 'full',
  warlock: 'full',
  wizard: 'full',
  paladin: 'half',
  ranger: 'half',
};

export default function SpellSelector({
  form,
  show,
  handleClose,
  onSpellsChange,
}) {
  const params = useParams();

  const getAvailableLevels = useCallback((effectiveLevel, casterProgression) => {
    const slotRow = SLOT_TABLE[effectiveLevel] || [];
    const options = [];
    if (
      casterProgression === 'full' &&
      (CANTRIP_TABLE[effectiveLevel] || 0) > 0
    )
      options.push(0);
    slotRow.forEach((slots, lvl) => {
      if (lvl > 0 && slots > 0) options.push(lvl);
    });
    return options;
  }, []);

  const classesInfo = useMemo(() => {
    return (form.occupation || [])
      .map((o) => {
        const name = o.Name || o.Occupation;
        const level = Number(o.Level) || 0;
        const key = (name || '').toLowerCase();
        const casterProgression = SPELLCASTING_CLASSES[key] || 'none';
        let effectiveLevel = 0;
        if (casterProgression === 'full') {
          effectiveLevel = level;
        } else if (casterProgression === 'half') {
          effectiveLevel = level === 1 ? 0 : Math.ceil(level / 2);
        }
        return { name, level, casterProgression, effectiveLevel };
      })
      .filter((o) => o.effectiveLevel >= 1);
  }, [form.occupation]);

  const levelOptions = useMemo(
    () =>
      classesInfo.reduce((acc, { name, effectiveLevel, casterProgression }) => {
        acc[name] = getAvailableLevels(effectiveLevel, casterProgression);
        return acc;
      }, {}),
    [classesInfo, getAvailableLevels]
  );

  const initialLevels = useMemo(
    () =>
      classesInfo.reduce((acc, { name }) => {
        const options = levelOptions[name] || [];
        const first =
          options.find((lvl) => lvl > 0) ?? options[0] ?? 0;
        acc[name] = first;
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
  const [viewSpell, setViewSpell] = useState(null);
  const [spellsKnown, setSpellsKnown] = useState({});

  const chaMod = useMemo(() => {
    const itemBonus = (form.item || []).reduce(
      (sum, el) => sum + Number(el[7] || 0),
      0
    );
    const featBonus = (form.feat || []).reduce(
      (sum, el) => sum + Number(el.cha || 0),
      0
    );
    const raceBonus = form.race?.abilities?.cha || 0;
    const computed = (form.cha || 0) + itemBonus + featBonus + raceBonus;
    return Math.floor((computed - 10) / 2);
  }, [form.cha, form.item, form.feat, form.race]);

  const wisMod = useMemo(() => {
    const itemBonus = (form.item || []).reduce(
      (sum, el) => sum + Number(el[6] || 0),
      0
    );
    const featBonus = (form.feat || []).reduce(
      (sum, el) => sum + Number(el.wis || 0),
      0
    );
    const raceBonus = form.race?.abilities?.wis || 0;
    const computed = (form.wis || 0) + itemBonus + featBonus + raceBonus;
    return Math.floor((computed - 10) / 2);
  }, [form.wis, form.item, form.feat, form.race]);

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

  useEffect(() => {
    const fetchSpellsKnown = async () => {
      const result = {};
      await Promise.all(
        classesInfo.map(async ({ name, level }) => {
          try {
            const abilityMod =
              ['cleric', 'druid'].includes(name.toLowerCase()) ? wisMod : chaMod;
            const res = await apiFetch(
              `/classes/${name.toLowerCase()}/features/${level}?abilityMod=${abilityMod}`
            );
            if (res.ok) {
              const data = await res.json();
              if (typeof data.spellsKnown === 'number') {
                result[name] = data.spellsKnown;
              }
            }
          } catch (err) {
            setError(err.message);
          }
        })
      );
      setSpellsKnown(result);
    };
    fetchSpellsKnown();
  }, [classesInfo, chaMod, wisMod]);

  function spellsForClass(cls) {
    return Object.values(allSpells).filter(
      (spell) =>
        spell.classes.includes(cls) &&
        spell.level === Number(selectedLevels[cls])
    );
  }

  useEffect(() => {
    const newPoints = {};
    classesInfo.forEach(({ name, effectiveLevel }) => {
      const selectedLevel = Number(selectedLevels[name]);
      const total =
        selectedLevel === 0
          ? CANTRIP_TABLE[effectiveLevel] || 0
          : spellsKnown[name] ?? Infinity;
      const count = selectedSpells.reduce((sum, spellName) => {
        const info = Object.values(allSpells).find((s) => s.name === spellName);
        return info &&
          info.classes.includes(name) &&
          (selectedLevel === 0 ? info.level === 0 : info.level > 0)
          ? sum + 1
          : sum;
      }, 0);
      newPoints[name] =
        total === Infinity ? Infinity : Math.max(0, total - count);
    });
    setPointsLeft(newPoints);
  }, [selectedLevels, selectedSpells, allSpells, classesInfo, spellsKnown]);

  function toggleSpell(name) {
    setSelectedSpells((prev) => {
      const updated = prev.includes(name)
        ? prev.filter((s) => s !== name)
        : [...prev, name];
      saveSpells(updated);
      return updated;
    });
  }

  async function saveSpells(spells = selectedSpells) {
    try {
      const currentPoints = classesInfo.reduce((sum, { name, effectiveLevel }) => {
        const selectedLevel = Number(selectedLevels[name]);
        const total =
          selectedLevel === 0
            ? CANTRIP_TABLE[effectiveLevel] || 0
            : spellsKnown[name] ?? Infinity;
        const count = spells.reduce((acc, spellName) => {
          const info = Object.values(allSpells).find((s) => s.name === spellName);
          return info &&
            info.classes.includes(name) &&
            (selectedLevel === 0 ? info.level === 0 : info.level > 0)
            ? acc + 1
            : acc;
        }, 0);
        const remaining =
          total === Infinity ? 0 : Math.max(0, total - count);
        return sum + remaining;
      }, 0);

      const selectedSpellObjects = spells.map((name) => {
        const info = Object.values(allSpells).find((s) => s.name === name) || {};
        return {
          name,
          level: info.level || 0,
          damage: info.damage || '',
          castingTime: info.castingTime || '',
          range: info.range || '',
          duration: info.duration || '',
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
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
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
            {classesInfo.length === 0 ? (
              <div className="text-light">No spellcasting classes available.</div>
            ) : classesInfo.length === 1 ? (
              (() => {
                const cls = classesInfo[0].name;
                return (
                  <>
                    <Form className="mb-3">
                      <Form.Group>
                        <Form.Label htmlFor={`spellLevel-${cls}`}>
                          Level
                        </Form.Label>
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
                      <span className="points-label text-light">
                        Points Left:
                      </span>
                      <span className="points-value">
                        {pointsLeft[cls] === Infinity
                          ? '∞'
                          : pointsLeft[cls] || 0}
                      </span>
                    </div>
                    <Table
                      striped
                      bordered
                      hover
                      size="sm"
                      className="modern-table"
                    >
                      <thead>
                        <tr>
                          <th></th>
                          <th>Name</th>
                          <th>School</th>
                          <th>Casting Time</th>
                          <th>Range</th>
                          <th>Duration</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {spellsForClass(cls).map((spell) => (
                          <tr key={spell.name}>
                            <td>
                              <Form.Check
                                id={`spell-${spell.name}`}
                                type="checkbox"
                                checked={selectedSpells.includes(spell.name)}
                                disabled={
                                  !selectedSpells.includes(spell.name) &&
                                  (pointsLeft[cls] || 0) <= 0
                                }
                                onChange={() => toggleSpell(spell.name)}
                              />
                            </td>
                            <td>{spell.name}</td>
                            <td>{spell.school}</td>
                            <td>{spell.castingTime}</td>
                            <td>{spell.range}</td>
                            <td>{spell.duration}</td>
                            <td>
                              <Button
                                variant="link"
                                onClick={() => setViewSpell(spell)}
                              >
                                <i className="fa-solid fa-eye"></i>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
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
                        {pointsLeft[name] === Infinity
                          ? '∞'
                          : pointsLeft[name] || 0}
                      </span>
                    </div>
                    <Table
                      striped
                      bordered
                      hover
                      size="sm"
                      className="modern-table"
                    >
                      <thead>
                        <tr>
                          <th></th>
                          <th>Name</th>
                          <th>School</th>
                          <th>Casting Time</th>
                          <th>Range</th>
                          <th>Duration</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {spellsForClass(name).map((spell) => (
                          <tr key={spell.name}>
                            <td>
                              <Form.Check
                                id={`spell-${spell.name}`}
                                type="checkbox"
                                checked={selectedSpells.includes(spell.name)}
                                disabled={
                                  !selectedSpells.includes(spell.name) &&
                                  (pointsLeft[name] || 0) <= 0
                                }
                                onChange={() => toggleSpell(spell.name)}
                              />
                            </td>
                            <td>{spell.name}</td>
                            <td>{spell.school}</td>
                            <td>{spell.castingTime}</td>
                            <td>{spell.range}</td>
                            <td>{spell.duration}</td>
                            <td>
                              <Button
                                variant="link"
                                onClick={() => setViewSpell(spell)}
                              >
                                <i className="fa-solid fa-eye"></i>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Tab>
                ))}
              </Tabs>
            )}
          </Card.Body>
          <Card.Footer className="modal-footer">
            <Button 
            className="action-btn close-btn"
            onClick={handleClose}>
              Close
            </Button>
          </Card.Footer>
        </Card>
      </Modal>
      <Modal
        show={!!viewSpell}
        onHide={() => setViewSpell(null)}
        centered
        size="lg"
        className="dnd-modal modern-modal"
      >
        <Card className="modern-card text-center">
          <Card.Header className="modal-header">
            <Card.Title className="modal-title">
              {viewSpell?.name}
            </Card.Title>
          </Card.Header>
          <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
            {viewSpell?.description}
          </Card.Body>
          <Card.Footer className="modal-footer">
            <Button
              className="action-btn close-btn"
              onClick={() => setViewSpell(null)}
            >
              Close
            </Button>
          </Card.Footer>
        </Card>
      </Modal>
    </>
  );
}
