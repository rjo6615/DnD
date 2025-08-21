import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (url === '/csrf-token') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ csrfToken: 'test-token' }) });
    }
    return Promise.resolve({ ok: true });
  });
  delete window.location;
  window.location = { assign: jest.fn(), href: 'http://localhost/', origin: 'http://localhost' };
});

test('logout calls endpoint and redirects', async () => {
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );

  const buttons = screen.getAllByRole('button', { name: /logout/i });
  await userEvent.click(buttons[buttons.length - 1]);
  await waitFor(() =>
    expect(global.fetch).toHaveBeenCalledWith(
      '/logout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({ 'CSRF-Token': 'test-token' }),
      })
    )
  );
  expect(window.location.assign).toHaveBeenCalledWith('/');
});

