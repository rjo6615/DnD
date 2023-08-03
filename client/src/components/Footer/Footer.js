import React from 'react';
import { MDBFooter } from 'mdb-react-ui-kit';

export default function Footer() {
  return (
    <MDBFooter bgColor='light' className='fixed-bottom bg-image text-center text-lg-start text-muted'>
      <div className='text-center p-4' style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)' }}>
        © 2023 Copyright:
        <a className='mx-1 text-reset fw-bold' href='https://github.com/rjo6615/DnD'>
          DnD
        </a>
      </div>
    </MDBFooter>
  );
}