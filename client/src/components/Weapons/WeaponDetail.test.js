import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import WeaponDetail from './WeaponDetail';
import apiFetch from '../../utils/apiFetch';

jest.mock('../../utils/apiFetch');

test('fetches and displays weapon detail', async () => {
  apiFetch.mockResolvedValueOnce({
    json: async () => ({
      name: 'Club',
      category: 'simple melee',
      damage: '1d4 bludgeoning',
      properties: ['light'],
      weight: 2,
      cost: '1 sp',
      proficient: false,
    }),
  });

  render(
    <MemoryRouter initialEntries={['/weapons/club']}>
      <Routes>
        <Route path="/weapons/:name" element={<WeaponDetail />} />
      </Routes>
    </MemoryRouter>
  );

  expect(apiFetch).toHaveBeenCalledWith('/weapons/club');
  await waitFor(() => expect(screen.getByText('Club')).toBeInTheDocument());
  expect(screen.getByText(/simple melee/)).toBeInTheDocument();
  expect(screen.getByText(/1d4 bludgeoning/)).toBeInTheDocument();
});

