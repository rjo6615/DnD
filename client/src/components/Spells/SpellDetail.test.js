import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SpellDetail from './SpellDetail';
import apiFetch from '../../utils/apiFetch';

jest.mock('../../utils/apiFetch');

test('fetches and displays spell detail', async () => {
  apiFetch.mockResolvedValueOnce({
    json: async () => ({
      name: 'Fireball',
      level: 3,
      school: 'Evocation',
      castingTime: '1 action',
      range: '150 feet',
      components: ['V', 'S', 'M'],
      duration: 'Instantaneous',
      description: 'A bright streak flashes',
      classes: ['Wizard'],
    }),
  });

  render(
    <MemoryRouter initialEntries={['/spells/fireball']}>
      <Routes>
        <Route path="/spells/:name" element={<SpellDetail />} />
      </Routes>
    </MemoryRouter>
  );

  expect(apiFetch).toHaveBeenCalledWith('/spells/fireball');
  await waitFor(() => expect(screen.getByText('Fireball')).toBeInTheDocument());
  expect(screen.getByText(/Evocation/)).toBeInTheDocument();
  expect(screen.getByText(/bright streak/)).toBeInTheDocument();
});
