import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiFetch from '../../utils/apiFetch';

/** @typedef {import('../../../../types/spell').Spell} Spell */

function SpellList() {
  const [spells, setSpells] = useState/** @type {Spell[] | null} */(null);

  useEffect(() => {
    apiFetch('/spells')
      .then(res => res.json())
      .then(data => setSpells(Object.values(data)));
  }, []);

  if (!spells) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Spells</h1>
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
