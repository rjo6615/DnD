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
