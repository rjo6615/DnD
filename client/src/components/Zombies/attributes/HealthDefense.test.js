import React from 'react';
import { render, screen } from '@testing-library/react';
import HealthDefense from './HealthDefense';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: '1' }),
}));

const form = {
  armor: [],
  occupation: [],
  health: 10,
  tempHealth: 5,
  speed: 30,
};

test('renders proficiency bonus', () => {
  render(
    <HealthDefense
      form={form}
      totalLevel={5}
      conMod={0}
      dexMod={0}
      ac={0}
      hpMaxBonus={0}
      hpMaxBonusPerLevel={0}
      initiative={0}
      speed={0}
    />
  );
  expect(screen.getByText('Proficiency Bonus:').parentElement).toHaveTextContent('3');
});
