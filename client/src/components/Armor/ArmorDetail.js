import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiFetch from '../../utils/apiFetch';

/** @typedef {import('../../../../types/armor').Armor} Armor */

function ArmorDetail() {
  const { name } = useParams();
  const [armor, setArmor] = useState/** @type {Armor | null} */(null);

  useEffect(() => {
    apiFetch(`/armor/${name}`)
      .then((res) => res.json())
      .then(setArmor);
  }, [name]);

  if (!armor) {
    return <div>Loading...</div>;
  }

  const acBonus = Number(armor.acBonus);

  return (
    <div>
      <h2>{armor.name}</h2>
      <p>
        <strong>Category:</strong> {armor.category}
      </p>
      <p>
        <strong>AC Bonus:</strong> {acBonus}
      </p>
      {armor.maxDex !== null && armor.maxDex !== undefined && (
        <p>
          <strong>Max Dex:</strong> {armor.maxDex}
        </p>
      )}
      {armor.strength && (
        <p>
          <strong>Strength:</strong> {armor.strength}
        </p>
      )}
      {armor.stealth && <p><strong>Stealth:</strong> disadvantage</p>}
      <p>
        <strong>Weight:</strong> {armor.weight}
      </p>
      <p>
        <strong>Cost:</strong> {armor.cost}
      </p>
    </div>
  );
}

export default ArmorDetail;
