import React from 'react';

export default function StatusEffectBar({ effects = [] }) {
  if (!effects.length) return null;
  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      {effects.map((e, idx) => (
        <div key={e.name || idx} style={{ position: 'relative' }}>
          <img
            src={e.icon}
            alt={e.name}
            style={{ width: '32px', height: '32px' }}
          />
          {typeof e.remaining === 'number' && (
            <span
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                fontSize: '0.7rem',
                backgroundColor: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '0 2px',
                borderRadius: '4px',
              }}
            >
              x{e.remaining}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
