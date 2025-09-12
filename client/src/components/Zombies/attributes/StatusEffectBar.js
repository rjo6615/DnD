import React from 'react';

export default function StatusEffectBar({ effects = [] }) {
  if (!effects.length) return null;
  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      {effects.map((e, idx) => (
        <img
          key={e.name || idx}
          src={e.icon}
          alt={e.name}
          style={{ width: '32px', height: '32px' }}
        />
      ))}
    </div>
  );
}
