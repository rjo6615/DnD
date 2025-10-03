import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import CharacterInfo from './CharacterInfo';

jest.mock('./LevelUp', () => () => <div />);

test('renders race languages', () => {
  const form = {
    occupation: [],
    race: { name: 'Elf', languages: ['Common', 'Elvish', 'Choice'] },
    age: 100,
    sex: 'M',
    size: 'Medium',
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
  const sizeItem = screen.getByText('Size').closest('.character-info-item');
  expect(sizeItem).not.toBeNull();
  if (sizeItem) {
    expect(within(sizeItem).getByText('Medium')).toBeInTheDocument();
  }
});

test('renders background name and calls onShowBackground', () => {
  const onShowBackground = jest.fn();
  const form = {
    occupation: [],
    race: { languages: [] },
    background: { name: 'Soldier' },
    age: 100,
    sex: 'M',
    size: 'Medium',
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
    size: 'Medium',
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

test('renders goliath subrace within race card when ancestry selected', () => {
  const form = {
    occupation: [],
    race: {
      name: 'Goliath',
      languages: [],
      selectedAncestryKey: 'cloud',
      giantAncestries: {
        cloud: { label: "Cloud's Jaunt", ancestryName: 'Cloud Giant' },
      },
    },
    size: 'Medium',
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

  const raceItem = screen.getByText('Race').closest('.character-info-item');
  expect(raceItem).not.toBeNull();

  const { getByText, queryByText } = within(raceItem);
  expect(getByText('Goliath')).toBeInTheDocument();
  expect(getByText('Cloud Giant')).toBeInTheDocument();
  expect(queryByText('Subrace')).not.toBeInTheDocument();
});

test('renders dragonborn ancestry within race card when ancestry selected', () => {
  const form = {
    occupation: [],
    race: {
      name: 'Dragonborn',
      languages: [],
      selectedAncestryKey: 'bronze',
      dragonAncestries: {
        bronze: { label: 'Bronze Dragon', ancestryName: 'Bronze' },
      },
    },
    size: 'Medium',
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

  const raceItem = screen.getByText('Race').closest('.character-info-item');
  expect(raceItem).not.toBeNull();

  const { getByText, queryByText } = within(raceItem);
  expect(getByText('Dragonborn')).toBeInTheDocument();
  expect(getByText('Bronze Dragon')).toBeInTheDocument();
  expect(queryByText('Subrace')).not.toBeInTheDocument();
});

