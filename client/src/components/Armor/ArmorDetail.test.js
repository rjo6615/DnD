import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ArmorDetail from './ArmorDetail';
import apiFetch from '../../utils/apiFetch';

jest.mock('../../utils/apiFetch');

test('fetches and displays armor detail', async () => {
  apiFetch.mockResolvedValueOnce({
    json: async () => ({
      name: 'Chain Mail',
      category: 'heavy',
      ac: 16,
      maxDex: 0,
      strength: 13,
      stealth: true,
      weight: 55,
      cost: '75 gp',
      owned: false,
    }),
  });

  render(
    <MemoryRouter initialEntries={['/armor/chain-mail']}>
      <Routes>
        <Route path="/armor/:name" element={<ArmorDetail />} />
      </Routes>
    </MemoryRouter>
  );

  expect(apiFetch).toHaveBeenCalledWith('/armor/chain-mail');
  await waitFor(() => expect(screen.getByText('Chain Mail')).toBeInTheDocument());
  expect(screen.getByText(/heavy/)).toBeInTheDocument();
  expect(screen.getByText(/16/)).toBeInTheDocument();
});

