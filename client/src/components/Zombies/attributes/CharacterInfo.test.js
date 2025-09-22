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

  render(
    <CharacterInfo
      form={form}
      show={true}
      handleClose={() => {}}
      onShowBackground={() => {}}
      onLongRest={() => {}}
      onShortRest={() => {}}
    />
  );

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
      onLongRest={() => {}}
      onShortRest={() => {}}
    />
  );

  expect(screen.getByText('Soldier')).toBeInTheDocument();
  const button = screen.getByLabelText('Show Background');
  fireEvent.click(button);
  expect(onShowBackground).toHaveBeenCalled();
});

test('calls rest handlers when buttons clicked', () => {
  const form = {
    occupation: [],
    race: { languages: [] },
    age: 100,
    sex: 'M',
    height: "6'",
    weight: 180,
  };
  const onLongRest = jest.fn();
  const onShortRest = jest.fn();

  render(
    <CharacterInfo
      form={form}
      show={true}
      handleClose={() => {}}
      onShowBackground={() => {}}
      onLongRest={onLongRest}
      onShortRest={onShortRest}
    />
  );

  fireEvent.click(screen.getByText('Long Rest'));
  fireEvent.click(screen.getByText('Short Rest'));
  expect(onLongRest).toHaveBeenCalled();
  expect(onShortRest).toHaveBeenCalled();
});

