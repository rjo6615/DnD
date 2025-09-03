import React from 'react';
import { render, screen } from '@testing-library/react';
import CharacterInfo from './CharacterInfo';

jest.mock('./LevelUp', () => () => <div />);

test('renders race languages', () => {
  const form = {
    occupation: [],
    race: { name: 'Elf', languages: ['Common', 'Elvish', 'Choice'] },
    age: 100,
    sex: 'M',
    height: "6'",
    weight: 180,
  };

  render(<CharacterInfo form={form} show={true} handleClose={() => {}} />);

  expect(screen.getByText('Common, Elvish')).toBeInTheDocument();
});

