import React from 'react';

const barStyle = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center'
};

export default function StatusEffectBar({ effects = [] }) {
  if (!effects.length) return null;
  return (
    <div style={barStyle}>
      {effects.map(({ id, icon }) => (
        <img key={id} src={icon} alt={id} style={{ width: 24, height: 24 }} />
      ))}
    </div>
  );
}
