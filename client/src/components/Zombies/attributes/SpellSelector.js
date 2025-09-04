import React, { useEffect, useState } from 'react';
import apiFetch from '../../../utils/apiFetch';
import { Modal, Card, Button, Form, ListGroup } from 'react-bootstrap';
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

  const spellsForFilter = Object.values(allSpells).filter(
    (spell) =>
      (!selectedClass || spell.classes.includes(selectedClass)) &&
      spell.level === Number(selectedLevel)
  );

  function toggleSpell(name) {
    setSelectedSpells((prev) =>
      prev.includes(name)
        ? prev.filter((s) => s !== name)
        : [...prev, name]
    );
  }

  async function saveSpells() {
    try {
      const res = await apiFetch(`/characters/${params.id}/spells`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spells: selectedSpells }),
      });
      if (!res.ok) {
        throw new Error('Failed to save spells');
      }
      onSpellsChange?.(selectedSpells);
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
          <ListGroup>
            {spellsForFilter.map((spell) => (
              <ListGroup.Item
                key={spell.name}
                action
                active={selectedSpells.includes(spell.name)}
                onClick={() => toggleSpell(spell.name)}
              >
                {spell.name}
              </ListGroup.Item>
            ))}
          </ListGroup>
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
