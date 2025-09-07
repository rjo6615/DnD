import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiFetch from '../../utils/apiFetch';

/** @typedef {import('../../../../types/spell').Spell} Spell */

function SpellList() {
  const [spells, setSpells] = useState/** @type {Spell[] | null} */(null);
  const [selectedClass, setSelectedClass] = useState('');

  useEffect(() => {
    const query = selectedClass ? `?class=${selectedClass}` : '';
    apiFetch(`/spells${query}`)
      .then(res => res.json())
      .then(data => setSpells(Object.values(data)));
  }, [selectedClass]);

  if (!spells) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Spells</h1>
      <label>
        Class:
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
          <option value="">All</option>
          <option value="bard">Bard</option>
          <option value="cleric">Cleric</option>
          <option value="druid">Druid</option>
          <option value="paladin">Paladin</option>
          <option value="ranger">Ranger</option>
          <option value="sorcerer">Sorcerer</option>
          <option value="warlock">Warlock</option>
          <option value="wizard">Wizard</option>
        </select>
      </label>
      <ul>
        {spells.map(spell => (
          <li key={spell.name}>
            <Link to={`/spells/${spell.name.toLowerCase()}`}>{spell.name}</Link> - Level {spell.level} {spell.school}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SpellList;
