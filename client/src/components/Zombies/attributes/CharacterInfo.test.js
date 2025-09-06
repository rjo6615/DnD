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

test('renders proficient background skills', () => {
  const form = {
    occupation: [],
    race: { languages: [] },
    background: {
      name: 'Sailor',
      skills: {
        athletics: { proficient: true },
        stealth: { proficient: false },
        perception: { proficient: true },
      },
    },
    age: 100,
    sex: 'M',
    height: "6'",
    weight: 180,
  };

  render(<CharacterInfo form={form} show={true} handleClose={() => {}} />);

  expect(screen.getByText('Athletics, Perception')).toBeInTheDocument();
});

test('shows default background description when missing', () => {
  const form = {
    occupation: [],
    race: { languages: [] },
    background: { name: 'Sailor', description: '' },
    age: 100,
    sex: 'M',
    height: "6'",
    weight: 180,
  };

  render(<CharacterInfo form={form} show={true} handleClose={() => {}} />);

  expect(screen.getByText('No description available')).toBeInTheDocument();
});

