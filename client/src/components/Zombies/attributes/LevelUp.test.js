import React from 'react';
import { render, waitFor } from '@testing-library/react';
import LevelUp from './LevelUp';

jest.mock('../../../utils/apiFetch');
import apiFetch from '../../../utils/apiFetch';

jest.mock('../../../hooks/useUser', () => jest.fn());
import useUser from '../../../hooks/useUser';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: '1' }),
  useNavigate: () => jest.fn(),
}));

test('fetches classes on mount', async () => {
  useUser.mockReturnValue({ username: 'tester' });
  apiFetch.mockResolvedValue({ ok: true, json: async () => ({ wizard: { name: 'Wizard' } }) });

  render(<LevelUp show={true} handleClose={() => {}} form={{ occupation: [] }} />);

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/classes'));
});
