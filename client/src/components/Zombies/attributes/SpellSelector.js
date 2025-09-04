import React, { useEffect, useState } from 'react';
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Button, Form } from 'react-bootstrap';
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
  const [allSpells, setAllSpells] = useState({});
  const [selectedClass, setSelectedClass] = useState(
    form.occupation?.[0]?.Name || ''
  );
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [selectedSpells, setSelectedSpells] = useState(form.spells || []);
  const [pointsLeft, setPointsLeft] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/spells')
      .then((res) => res.json())
      .then((data) => setAllSpells(data))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    setSelectedSpells(form.spells || []);
  }, [form.spells]);

  const classes = Array.from(new Set(form.occupation.map((o) => o.Name)));
  const levelOptions = Array.from({ length: 10 }, (_, i) => i);

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

  const spellsForFilter = Object.values(allSpells).filter(
    (spell) =>
      (!selectedClass || spell.classes.includes(selectedClass)) &&
      spell.level === Number(selectedLevel)
  );

  useEffect(() => {
    const occ = form.occupation.find(
      (o) => o.Name === selectedClass || o.Occupation === selectedClass
    );
    const classLevel = Number(occ?.Level) || 0;
    const slotRow = SLOT_TABLE[classLevel] || [];
    const totalSlots = slotRow[Number(selectedLevel)] || 0;
    const count = selectedSpells.reduce((sum, name) => {
      const info = Object.values(allSpells).find((s) => s.name === name);
      return info && info.level === Number(selectedLevel) ? sum + 1 : sum;
    }, 0);
    setPointsLeft(Math.max(0, totalSlots - count));
  }, [selectedClass, selectedLevel, selectedSpells, allSpells, form.occupation]);

  function toggleSpell(name) {
    setSelectedSpells((prev) =>
      prev.includes(name)
        ? prev.filter((s) => s !== name)
        : [...prev, name]
    );
  }

  async function saveSpells() {
    try {
      const occ = form.occupation.find(
        (o) => o.Name === selectedClass || o.Occupation === selectedClass
      );
      const classLevel = Number(occ?.Level) || 0;
      const slotRow = SLOT_TABLE[classLevel] || [];
      const totalSlots = slotRow[Number(selectedLevel)] || 0;
      const count = selectedSpells.reduce((sum, name) => {
        const info = Object.values(allSpells).find((s) => s.name === name);
        return info && info.level === Number(selectedLevel) ? sum + 1 : sum;
      }, 0);
      const currentPoints = Math.max(0, totalSlots - count);
      const res = await apiFetch(`/characters/${params.id}/spells`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spells: selectedSpells, spellPoints: currentPoints }),
      });
      if (!res.ok) {
        throw new Error('Failed to save spells');
      }
      onSpellsChange?.(selectedSpells, currentPoints);
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
          <Form className="mb-3">
            <Form.Group className="mb-2">
              <Form.Label htmlFor="spellClass">Class</Form.Label>
              <Form.Select
                id="spellClass"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
              >
                {classes.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label htmlFor="spellLevel">Level</Form.Label>
              <Form.Select
                id="spellLevel"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
              >
                {levelOptions.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
          <div className="points-container" style={{ display: 'flex' }}>
            <span className="points-label text-light">Points Left:</span>
            <span className="points-value">{pointsLeft}</span>
          </div>
          {spellsForFilter.map((spell) => (
            <Form.Check
              key={spell.name}
              id={`spell-${spell.name}`}
              type="checkbox"
              label={spell.name}
              checked={selectedSpells.includes(spell.name)}
              disabled={!selectedSpells.includes(spell.name) && pointsLeft <= 0}
              onChange={() => toggleSpell(spell.name)}
              className="mb-2"
            />
          ))}
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
