import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiFetch from '../../utils/apiFetch';

/** @typedef {import('../../../../types/weapon').Weapon} Weapon */

function WeaponDetail() {
  const { name } = useParams();
  const [weapon, setWeapon] = useState/** @type {Weapon | null} */(null);

  useEffect(() => {
    apiFetch(`/weapons/${name}`)
      .then((res) => res.json())
      .then(setWeapon);
  }, [name]);

  if (!weapon) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>{weapon.name}</h2>
      <p><strong>Category:</strong> {weapon.category}</p>
      <p><strong>Damage:</strong> {weapon.damage}</p>
      <p><strong>Properties:</strong> {weapon.properties.join(', ') || 'None'}</p>
      <p><strong>Weight:</strong> {weapon.weight}</p>
      <p><strong>Cost:</strong> {weapon.cost}</p>
    </div>
  );
}

export default WeaponDetail;

