import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
  delete window.location;
  window.location = { assign: jest.fn() };
});

test('logout calls endpoint and redirects', async () => {
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );

  const buttons = screen.getAllByRole('button', { name: /logout/i });
  await userEvent.click(buttons[buttons.length - 1]);
  expect(global.fetch).toHaveBeenCalledWith('/logout', expect.objectContaining({ method: 'POST' }));
  expect(window.location.assign).toHaveBeenCalledWith('/');
});

