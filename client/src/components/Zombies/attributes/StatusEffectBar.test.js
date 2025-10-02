import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

test('renders remove button when handler provided', async () => {
  render(
    <StatusEffectBar
      effects={[{ name: 'Haste', icon: 'haste.png' }]}
      onRemoveEffect={jest.fn()}
    />
  );
  const removeButton = screen.getByRole('button', { name: /remove haste/i });
  expect(removeButton).toBeInTheDocument();
  expect(removeButton).toHaveTextContent('×');
  expect(removeButton).toHaveStyle({ backgroundColor: '#dc3545' });
});

test('invokes removal handler when remove button clicked', async () => {
  const handleRemove = jest.fn();
  render(
    <StatusEffectBar
      effects={[{ name: 'Haste', icon: 'haste.png' }]}
      onRemoveEffect={handleRemove}
    />
  );
  const removeButton = screen.getByRole('button', { name: /remove haste/i });
  await userEvent.click(removeButton);
  expect(handleRemove).toHaveBeenCalledTimes(1);
  expect(handleRemove).toHaveBeenCalledWith(0);
});
