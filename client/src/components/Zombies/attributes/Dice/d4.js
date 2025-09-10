import React from 'react';

const D4 = ({ onClick, rolling, activeFace }) => (
  <div onClick={onClick} className={`die d4 ${rolling ? 'rolling' : ''}`} data-face={activeFace}>
    {Array.from({ length: 4 }, (_, i) => (
      <figure className={`face face-${i + 1}`} key={i + 1}></figure>
    ))}
  </div>
);

export default D4;
