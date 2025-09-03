import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiFetch from '../../utils/apiFetch';

function SpellDetail() {
  const { name } = useParams();
  const [spell, setSpell] = useState(null);

  useEffect(() => {
    apiFetch(`/spells/${name}`)
      .then(res => res.json())
      .then(setSpell);
  }, [name]);

  if (!spell) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>{spell.name}</h2>
      <p><strong>Level:</strong> {spell.level}</p>
      <p><strong>School:</strong> {spell.school}</p>
      <p><strong>Casting Time:</strong> {spell.castingTime}</p>
      <p><strong>Range:</strong> {spell.range}</p>
      <p><strong>Components:</strong> {spell.components.join(', ')}</p>
      <p><strong>Duration:</strong> {spell.duration}</p>
      <p>{spell.description}</p>
      <p><strong>Classes:</strong> {spell.classes.join(', ')}</p>
    </div>
  );
}

export default SpellDetail;
