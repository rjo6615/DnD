import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HealthDefense from './HealthDefense';

jest.mock('../../../utils/apiFetch', () => jest.fn(() => Promise.resolve()));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: '1' }),
}));

const baseForm = {
  armor: [],
  equipment: {},
  occupation: [{ Level: 3 }, { Level: 2 }],
  health: 10,
  tempHealth: 5,
  speed: 30,
};

test('renders only proficiency bonus when no spellcasting', () => {
  render(
    <HealthDefense
      form={baseForm}
      conMod={0}
      dexMod={0}
      wisMod={0}
      ac={0}
      hpMaxBonus={0}
      hpMaxBonusPerLevel={0}
      initiative={0}
      speed={0}
    />
  );
  expect(screen.queryByText('Spell Save DC:')).toBeNull();
  expect(screen.getByText('Proficiency Bonus:').parentElement).toHaveTextContent('3');
});

test('renders spell save dc and proficiency bonus when spellAbilityMod provided', () => {
  render(
    <HealthDefense
      form={baseForm}
      conMod={0}
      dexMod={0}
      wisMod={0}
      ac={0}
      hpMaxBonus={0}
      hpMaxBonusPerLevel={0}
      initiative={0}
      speed={0}
      spellAbilityMod={2}
    />
  );
  expect(screen.getByText('Spell Save DC:').parentElement).toHaveTextContent('13');
  expect(screen.getByText('Proficiency Bonus:').parentElement).toHaveTextContent('3');
});

test('uses provided proficiency bonus when supplied', () => {
  const formWithProf = { ...baseForm, proficiencyBonus: 4 };
  render(
    <HealthDefense
      form={formWithProf}
      conMod={0}
      dexMod={0}
      wisMod={0}
      ac={0}
      hpMaxBonus={0}
      hpMaxBonusPerLevel={0}
      initiative={0}
      speed={0}
      spellAbilityMod={2}
    />
  );
  expect(screen.getByText('Spell Save DC:').parentElement).toHaveTextContent('14');
  expect(screen.getByText('Proficiency Bonus:').parentElement).toHaveTextContent('4');
});

test('allows health adjustment by dragging the bar', () => {
  render(
    <HealthDefense
      form={baseForm}
      conMod={0}
      dexMod={0}
      wisMod={0}
      ac={0}
      hpMaxBonus={0}
      hpMaxBonusPerLevel={0}
      initiative={0}
      speed={0}
    />
  );
  const slider = screen.getByRole('slider');
  fireEvent.change(slider, { target: { value: '7' } });
  expect(screen.getByText('7/10')).toBeInTheDocument();
});

test('places range input above fill bar and label', () => {
  render(
    <HealthDefense
      form={baseForm}
      conMod={0}
      dexMod={0}
      wisMod={0}
      ac={0}
      hpMaxBonus={0}
      hpMaxBonusPerLevel={0}
      initiative={0}
      speed={0}
    />
  );
  const slider = screen.getByRole('slider');
  const fill = slider.nextSibling;
  const label = fill.nextSibling;
  expect(slider).toHaveStyle('z-index: 1');
  expect(fill).toHaveStyle('pointer-events: none');
  expect(label).toHaveStyle('pointer-events: none');
});

test('updates health when slider is dragged', () => {
  render(
    <HealthDefense
      form={baseForm}
      conMod={0}
      dexMod={0}
      wisMod={0}
      ac={0}
      hpMaxBonus={0}
      hpMaxBonusPerLevel={0}
      initiative={0}
      speed={0}
    />
  );
  const slider = screen.getByRole('slider');
  fireEvent.mouseDown(slider);
  fireEvent.change(slider, { target: { value: '8' } });
  fireEvent.mouseUp(slider);
  expect(screen.getByText('8/10')).toBeInTheDocument();
});

test('includes racial hp bonus when feat overrides are zero', () => {
  const dwarfForm = {
    ...baseForm,
    race: { name: 'Dwarf', hpMaxBonusPerLevel: 1 },
    tempHealth: 10,
    health: 10,
  };

  render(
    <HealthDefense
      form={dwarfForm}
      conMod={2}
      dexMod={0}
      wisMod={0}
      ac={0}
      hpMaxBonus={0}
      hpMaxBonusPerLevel={0}
      initiative={0}
      speed={0}
    />
  );

  expect(screen.getByText('10/25')).toBeInTheDocument();
});

test('adds wisdom modifier to AC when unarmored defense is available and no armor or shield equipped', () => {
  const monkForm = {
    ...baseForm,
    occupation: [{ Name: 'Monk', Level: 2 }],
    equipment: {},
    armor: [],
  };

  render(
    <HealthDefense
      form={monkForm}
      conMod={0}
      dexMod={2}
      wisMod={3}
      ac={0}
      hpMaxBonus={0}
      hpMaxBonusPerLevel={0}
      initiative={0}
      speed={0}
    />
  );

  const acDisplay = screen.getByText('AC:', { selector: 'strong' }).parentElement;
  expect(acDisplay).toHaveTextContent('AC: 15');
});

test('does not add wisdom modifier to AC when a shield is equipped', () => {
  const monkWithShield = {
    ...baseForm,
    occupation: [{ Name: 'Monk', Level: 2 }],
    equipment: {
      offHand: { name: 'Shield', source: 'armor', category: 'shield', ac: 12, acBonus: 2 },
    },
  };

  render(
    <HealthDefense
      form={monkWithShield}
      conMod={0}
      dexMod={2}
      wisMod={3}
      ac={0}
      hpMaxBonus={0}
      hpMaxBonusPerLevel={0}
      initiative={0}
      speed={0}
    />
  );

  const acDisplay = screen.getByText('AC:', { selector: 'strong' }).parentElement;
  expect(acDisplay).toHaveTextContent('AC: 14');
});

test.each([
  { level: 2, expectedSpeed: 40 },
  { level: 5, expectedSpeed: 40 },
  { level: 6, expectedSpeed: 45 },
  { level: 10, expectedSpeed: 50 },
  { level: 14, expectedSpeed: 55 },
  { level: 18, expectedSpeed: 60 },
])('applies monk unarmored movement bonus at level $level', ({ level, expectedSpeed }) => {
  const monkForm = {
    ...baseForm,
    occupation: [{ Name: 'Monk', Level: level }],
    equipment: {},
    armor: [],
  };

  render(
    <HealthDefense
      form={monkForm}
      conMod={0}
      dexMod={2}
      wisMod={0}
      ac={0}
      hpMaxBonus={0}
      hpMaxBonusPerLevel={0}
      initiative={0}
      speed={0}
    />
  );

  const speedDisplay = screen.getByText('Speed:', { selector: 'strong' }).parentElement;
  expect(speedDisplay).toHaveTextContent(`Speed: ${expectedSpeed}`);
});

test('does not apply monk unarmored movement bonus when armor or a shield is equipped', () => {
  const armoredMonk = {
    ...baseForm,
    occupation: [{ Name: 'Monk', Level: 12 }],
    armor: [['Chain Shirt', 13, 2]],
    equipment: null,
  };

  const { rerender } = render(
    <HealthDefense
      form={armoredMonk}
      conMod={0}
      dexMod={2}
      wisMod={0}
      ac={0}
      hpMaxBonus={0}
      hpMaxBonusPerLevel={0}
      initiative={0}
      speed={0}
    />
  );

  let speedDisplay = screen.getByText('Speed:', { selector: 'strong' }).parentElement;
  expect(speedDisplay).toHaveTextContent('Speed: 30');

  rerender(
    <HealthDefense
      form={{
        ...armoredMonk,
        armor: [],
        equipment: {
          offHand: {
            name: 'Shield',
            source: 'armor',
            category: 'shield',
            ac: 12,
            acBonus: 2,
          },
        },
      }}
      conMod={0}
      dexMod={2}
      wisMod={0}
      ac={0}
      hpMaxBonus={0}
      hpMaxBonusPerLevel={0}
      initiative={0}
      speed={0}
    />
  );

  speedDisplay = screen.getByText('Speed:', { selector: 'strong' }).parentElement;
  expect(speedDisplay).toHaveTextContent('Speed: 30');
});
