import React from 'react';
import { MDBFooter } from 'mdb-react-ui-kit';

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
      <MDBFooter
        className='fixed-bottom text-center text-lg-start text-white footer-transparent'
      >
        <div className='text-center p-4 footer-transparent'>
          © 2023 Copyright:
          <a className='mx-1 text-white fw-bold' href='https://github.com/rjo6615/DnD'>
            DnD
          </a>
        </div>
      </MDBFooter>
    </>
  );
}
