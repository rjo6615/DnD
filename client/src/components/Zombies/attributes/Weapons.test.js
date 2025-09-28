import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import Weapons from './Weapons';
import apiFetch from '../../../utils/apiFetch';

jest.mock('../../../utils/apiFetch');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: 'char1' }),
  useNavigate: () => jest.fn(),
}));

const catalogMock = {
  longsword: { name: 'Longsword', displayName: 'Longsword', properties: ['versatile (1d10)'] },
};

jest.mock('../../../hooks/useWeaponCatalog', () => ({
  __esModule: true,
  default: () => ({ catalog: catalogMock, loading: false, error: null }),
  useWeaponCatalog: () => ({ catalog: catalogMock, loading: false, error: null }),
}));

describe('Weapons modal', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  test('shows parsed properties and base weapon label', async () => {
    apiFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

    render(
      <Weapons
        form={{
          campaign: 'Camp1',
          weapon: [
            ['Storm Blade', 'martial melee', '1d8 slashing', 'versatile (1d10)', '3 lb.', '20 gp', 'longsword'],
          ],
        }}
        showWeapons
        handleCloseWeapons={jest.fn()}
      />
    );

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/equipment/weapons/Camp1'));

    const card = await screen.findByText('Storm Blade');
    const weaponCard = card.closest('.card');
    expect(weaponCard).not.toBeNull();
    expect(within(weaponCard).getByText('Longsword')).toBeInTheDocument();
    expect(within(weaponCard).getByText('Versatile (1d10)')).toBeInTheDocument();
    expect(
      within(weaponCard).getByRole('button', { name: /show description for versatile/i })
    ).toBeInTheDocument();
  });
});
