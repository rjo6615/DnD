import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
test('renders login page when not authenticated', async () => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: false }));
  render(<App />);
  await waitFor(() => expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument());
});
