import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusEffectBar from './StatusEffectBar';

test('renders nothing when no effects', () => {
  const { container } = render(<StatusEffectBar effects={[]} />);
  expect(container.firstChild).toBeNull();
});

test('renders icons with remaining count', () => {
  render(
    <StatusEffectBar
      effects={[{ name: 'Haste', icon: 'haste.png', remaining: 10 }]}
    />
  );
  expect(screen.getByAltText('Haste')).toBeInTheDocument();
  expect(screen.getByText('x10')).toBeInTheDocument();
});
