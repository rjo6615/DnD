import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login page when no token is present', () => {
  render(<App />);
  expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
});
