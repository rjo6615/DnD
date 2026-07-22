import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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

test('uses the footer cancel control instead of a duplicate header close button', () => {
  useUser.mockReturnValue(null);

  render(<LevelUp show={true} handleClose={() => {}} form={{ occupation: [] }} />);

  expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  expect(document.querySelector('.modal-dialog-scrollable')).not.toBeInTheDocument();
});
