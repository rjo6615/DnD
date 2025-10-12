import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import CharacterInfo from './CharacterInfo';

jest.mock('./LevelUp', () => () => <div />);

const baseForm = {
  occupation: [],
  race: { languages: [] },
  background: null,
  age: 100,
  sex: 'M',
  size: 'Medium',
  weight: 180,
};

const renderCharacterInfo = (overrides = {}) => {
  const { form: formOverrides = {}, ...rest } = overrides;
  const form = { ...baseForm, ...formOverrides };

  return render(
    <CharacterInfo
      form={form}
      show={true}
      handleClose={() => {}}
      onShowBackground={() => {}}
      onLongRest={() => {}}
      onShortRest={() => {}}
      {...rest}
    />
  );
};

test('renders race languages', () => {
  renderCharacterInfo({
    form: {
      race: { name: 'Elf', languages: ['Common', 'Elvish', 'Choice'] },
    },
  });

  expect(screen.getByText('Common, Elvish')).toBeInTheDocument();
  const sizeItem = screen.getByText('Size').closest('.character-info-item');
  expect(sizeItem).not.toBeNull();
  if (sizeItem) {
    expect(within(sizeItem).getByText('Medium')).toBeInTheDocument();
  }
});

test('renders background name and calls onShowBackground', () => {
  const onShowBackground = jest.fn();

  renderCharacterInfo({
    form: { background: { name: 'Soldier' } },
    onShowBackground,
  });

  expect(screen.getByText('Soldier')).toBeInTheDocument();
  const button = screen.getByLabelText('Show Background');
  fireEvent.click(button);
  expect(onShowBackground).toHaveBeenCalled();
});

test('calls rest handlers when buttons clicked', () => {
  const onLongRest = jest.fn();
  const onShortRest = jest.fn();

  renderCharacterInfo({ onLongRest, onShortRest });

  fireEvent.click(screen.getByText('Long Rest'));
  fireEvent.click(screen.getByText('Short Rest'));
  expect(onLongRest).toHaveBeenCalled();
  expect(onShortRest).toHaveBeenCalled();
});

test('renders goliath subrace within race card when ancestry selected', () => {
  renderCharacterInfo({
    form: {
      race: {
        name: 'Goliath',
        languages: [],
        selectedAncestryKey: 'cloud',
        giantAncestries: {
          cloud: { label: "Cloud's Jaunt", ancestryName: 'Cloud Giant' },
        },
      },
    },
  });

  const raceItem = screen.getByText('Race').closest('.character-info-item');
  expect(raceItem).not.toBeNull();

  const { getByText, queryByText } = within(raceItem);
  expect(getByText('Goliath')).toBeInTheDocument();
  expect(getByText('Cloud Giant')).toBeInTheDocument();
  expect(queryByText('Subrace')).not.toBeInTheDocument();
});

test('renders dragonborn ancestry within race card when ancestry selected', () => {
  renderCharacterInfo({
    form: {
      race: {
        name: 'Dragonborn',
        languages: [],
        selectedAncestryKey: 'bronze',
        dragonAncestries: {
          bronze: { label: 'Bronze Dragon', ancestryName: 'Bronze' },
        },
      },
    },
  });

  const raceItem = screen.getByText('Race').closest('.character-info-item');
  expect(raceItem).not.toBeNull();

  const { getByText, queryByText } = within(raceItem);
  expect(getByText('Dragonborn')).toBeInTheDocument();
  expect(getByText('Bronze Dragon')).toBeInTheDocument();
  expect(queryByText('Subrace')).not.toBeInTheDocument();
});

test('renders elven lineage within race card when lineage selected', () => {
  renderCharacterInfo({
    form: {
      race: {
        name: 'Elf',
        languages: [],
        selectedAncestryKey: 'wood',
        elvenLineages: {
          wood: { label: 'Wood Elf' },
        },
      },
      elvenLineageKey: 'wood',
      elvenLineage: { label: 'Wood Elf' },
    },
  });

  const raceItem = screen.getByText('Race').closest('.character-info-item');
  expect(raceItem).not.toBeNull();
  const { getByText } = within(raceItem);
  expect(getByText('Elf')).toBeInTheDocument();
  expect(getByText('Wood Elf')).toBeInTheDocument();
});

test('shows figurine placeholder and triggers picker when requested', () => {
  const handleOpenTokenPicker = jest.fn();

  renderCharacterInfo({ handleOpenTokenPicker });

  expect(screen.getByText('No figurine selected')).toBeInTheDocument();
  const figurineButton = screen.getByRole('button', { name: 'Choose Figurine' });
  fireEvent.click(figurineButton);
  expect(handleOpenTokenPicker).toHaveBeenCalled();
});

test('disables figurine button while saving and shows current figurine', () => {
  const handleOpenTokenPicker = jest.fn();

  renderCharacterInfo({
    characterFigurine: { figurineImageUrl: 'https://example.com/token.png' },
    handleOpenTokenPicker,
    tokenPickerSaving: true,
  });

  expect(screen.getByAltText('Selected figurine token')).toHaveAttribute(
    'src',
    'https://example.com/token.png'
  );
  const figurineButton = screen.getByRole('button', { name: 'Updating Figurine...' });
  expect(figurineButton).toBeDisabled();
  fireEvent.click(figurineButton);
  expect(handleOpenTokenPicker).not.toHaveBeenCalled();
});