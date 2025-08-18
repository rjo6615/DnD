import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Navbar from './Navbar';

jest.mock('../../useToken', () => ({
  __esModule: true,
  default: () => ({
    removeToken: jest.fn()
  })
}));

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true }));
});

test('logout navigates to login route', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Navbar />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );

  const buttons = screen.getAllByRole('button', { name: /logout/i });
  await userEvent.click(buttons[buttons.length - 1]);
  expect(await screen.findByText('Login Page')).toBeInTheDocument();
});

