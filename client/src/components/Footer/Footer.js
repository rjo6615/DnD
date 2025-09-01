import React from 'react';
import { MDBFooter } from 'mdb-react-ui-kit';

export default function Footer() {
  return (
    <MDBFooter
      className='fixed-bottom text-center text-lg-start text-white'
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className='text-center p-4' style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        © 2023 Copyright:
        <a className='mx-1 text-white fw-bold' href='https://github.com/rjo6615/DnD'>
          DnD
        </a>
      </div>
    </MDBFooter>
  );
}
