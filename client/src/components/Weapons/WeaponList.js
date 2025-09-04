import React, { useEffect, useState } from 'react';
import apiFetch from '../../utils/apiFetch';

/** @typedef {import('../../../../types/weapon').Weapon} Weapon */

/**
 * List of weapons with proficiency toggles.
 * @param {{ characterId: string }} props
 */
function WeaponList({ characterId }) {
  const [weapons, setWeapons] = useState/** @type {Record<string, Weapon & {disabled?: boolean}> | null} */(null);

  useEffect(() => {
    apiFetch('/weapons')
      .then((res) => res.json())
      .then((data) => setWeapons(data));
  }, []);

  if (!weapons) {
    return <div>Loading...</div>;
  }

  const handleToggle = (key) => async () => {
    const weapon = weapons[key];
    const newProficient = !weapon.proficient;
    try {
      const res = await apiFetch(`/weapon-proficiency/${characterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weapon: key, proficient: newProficient }),
      });
      if (res.ok) {
        setWeapons((prev) => ({
          ...prev,
          [key]: { ...prev[key], proficient: newProficient, disabled: false },
        }));
      } else {
        setWeapons((prev) => ({ ...prev, [key]: { ...prev[key], disabled: true } }));
      }
    } catch (err) {
      setWeapons((prev) => ({ ...prev, [key]: { ...prev[key], disabled: true } }));
    }
  };

  return (
    <div>
      <h1>Weapons</h1>
      <ul>
        {Object.entries(weapons).map(([key, weapon]) => (
          <li key={key}>
            <label>
              <input
                type="checkbox"
                checked={weapon.proficient}
                disabled={weapon.disabled}
                onChange={handleToggle(key)}
              />{' '}
              {weapon.name} - {weapon.damage} ({weapon.category})
            </label>
            <div>
              <small>
                {weapon.properties.join(', ') || 'No properties'} | Weight: {weapon.weight} | Cost: {weapon.cost}
              </small>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default WeaponList;

