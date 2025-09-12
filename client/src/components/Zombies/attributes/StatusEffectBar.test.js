import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusEffectBar from './StatusEffectBar';

test('renders nothing when no effects', () => {
  const { container } = render(<StatusEffectBar effects={[]} />);
  expect(container.firstChild).toBeNull();
});

test('renders icons for provided effects', () => {
  render(<StatusEffectBar effects={[{ name: 'Haste', icon: 'haste.png' }]} />);
  expect(screen.getByAltText('Haste')).toBeInTheDocument();
});
