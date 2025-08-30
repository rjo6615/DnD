import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import useUser from './useUser';

function TestComponent() {
  const user = useUser();
  return <div>{user ? `${user.username}-${user.isDM}` : 'no-user'}</div>;
}

describe('useUser', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('returns user data', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ username: 'test', isDM: true }) })
    );
    render(<TestComponent />);
    expect(await screen.findByText('test-true')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/me'),
      { credentials: 'include' }
    );
  });

  test("returns user data when role is 'dm'", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ username: 'test', role: 'dm' }) })
    );
    render(<TestComponent />);
    expect(await screen.findByText('test-true')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/me'),
      { credentials: 'include' }
    );
  });

  test('handles missing user', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false }));
    render(<TestComponent />);
    await waitFor(() => expect(screen.getByText('no-user')).toBeInTheDocument());
  });
});
