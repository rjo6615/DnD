import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import Login from './Login';
import apiFetch from '../../utils/apiFetch';

jest.mock('../../utils/apiFetch', () => jest.fn());

describe('Login component errors', () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  test('shows login error on failed login', async () => {
    apiFetch.mockResolvedValueOnce({ ok: false });
    render(<Login onLogin={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    await waitFor(() => expect(screen.getByText(/Failed to log in/i)).toBeInTheDocument());
  });

  test('shows signup error when user creation fails', async () => {
    apiFetch.mockImplementation((url) => {
      if (url === '/users/add') {
        return Promise.resolve({
          ok: false,
          json: async () => ({ message: 'Unable to create user' }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<Login onLogin={() => {}} />);
    fireEvent.click(screen.getByText(/sign up/i));
    const modal = await screen.findByRole('dialog');
    fireEvent.change(within(modal).getByLabelText(/Username/i), { target: { value: 'Alice' } });
    fireEvent.change(within(modal).getByLabelText(/^Password$/i), { target: { value: 'Strongpass1!' } });
    fireEvent.change(within(modal).getByLabelText(/Confirm Password/i), { target: { value: 'Strongpass1!' } });
    fireEvent.click(within(modal).getByRole('button', { name: /submit/i }));
    await waitFor(() => expect(within(modal).getByText(/Unable to create user/i)).toBeInTheDocument());
  });
});
