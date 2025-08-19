import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import useDecodedToken from './useDecodedToken';

// Helper component to expose hook value
function TestComponent() {
  const decoded = useDecodedToken();
  return <div>{decoded ? decoded.username : 'no-token'}</div>;
}

describe('useDecodedToken', () => {
  const validToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InRlc3QifQ.signature';

  afterEach(() => {
    // Clear token cookie after each test
    document.cookie = 'tokenFront=; Max-Age=0; path=/';
    jest.restoreAllMocks();
  });

  test('decodes a valid token', async () => {
    document.cookie = `tokenFront=${validToken}`;
    render(<TestComponent />);
    expect(await screen.findByText('test')).toBeInTheDocument();
  });

  test('returns null and logs error on invalid token', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    document.cookie = 'tokenFront=invalid.token';
    render(<TestComponent />);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(screen.getByText('no-token')).toBeInTheDocument();
  });
});
