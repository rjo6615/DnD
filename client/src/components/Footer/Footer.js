import React from 'react';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

export default function Footer({ spellSlots = {} }) {
  return (
    <>
      <div className='footer-slot-tabs'>
        {Object.entries(spellSlots).map(([level, count]) =>
          [...Array(count)].map((_, idx) => (
            <div key={`${level}-${idx}`} className='footer-slot-tab'>
              {ROMAN[Number(level)]}
            </div>
          ))
        )}
      </div>
    </>
  );
}
