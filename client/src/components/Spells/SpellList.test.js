import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SpellList from './SpellList';
import apiFetch from '../../utils/apiFetch';

jest.mock('../../utils/apiFetch');

test('fetches and displays spells', async () => {
  apiFetch.mockResolvedValueOnce({
    json: async () => ({
      fireball: { name: 'Fireball', level: 3, school: 'Evocation' },
      shield: { name: 'Shield', level: 1, school: 'Abjuration' },
    }),
  });

  render(
    <MemoryRouter>
      <SpellList />
    </MemoryRouter>
  );

  expect(apiFetch).toHaveBeenCalledWith('/spells');
  await waitFor(() => expect(screen.getByText('Fireball')).toBeInTheDocument());
  expect(screen.getByText('Shield')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Fireball/ })).toHaveAttribute('href', '/spells/fireball');
});
