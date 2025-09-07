import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

  render(<CharacterInfo form={form} show={true} handleClose={() => {}} onShowBackground={() => {}} />);

  expect(screen.getByText('Common, Elvish')).toBeInTheDocument();
});

test('renders background name and calls onShowBackground', () => {
  const onShowBackground = jest.fn();
  const form = {
    occupation: [],
    race: { languages: [] },
    background: { name: 'Soldier' },
    age: 100,
    sex: 'M',
    height: "6'",
    weight: 180,
  };

  render(
    <CharacterInfo
      form={form}
      show={true}
      handleClose={() => {}}
      onShowBackground={onShowBackground}
    />
  );

  expect(screen.getByText('Soldier')).toBeInTheDocument();
  const button = screen.getByLabelText('Show Background');
  fireEvent.click(button);
  expect(onShowBackground).toHaveBeenCalled();
});

