import React from 'react';

export default function StatusEffectBar({ effects = [], onRemoveEffect }) {
  if (!effects.length) return null;
  const hasRemoveHandler = typeof onRemoveEffect === 'function';
  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
      {effects.map((e, idx) => (
        <div key={e.name || idx} style={{ position: 'relative' }}>
          {hasRemoveHandler && (
            <button
              type="button"
              aria-label={`Remove ${e.name || 'status effect'}`}
              onClick={() => onRemoveEffect(idx)}
              style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: '#dc3545',
                color: 'white',
                fontSize: '12px',
                lineHeight: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          )}
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
