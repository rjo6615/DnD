import React from 'react';
import { MDBFooter } from 'mdb-react-ui-kit';

export default function Footer() {
  return (
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
  );
}
