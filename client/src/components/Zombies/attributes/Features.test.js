import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Features from './Features';

jest.mock('../../../utils/apiFetch');
import apiFetch from '../../../utils/apiFetch';

test('renders features and opens modal with description', async () => {
  apiFetch.mockImplementation((url) => {
    if (url.includes('/2')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          features: [
            {
              name: 'Action Surge',
              description: 'You can take one additional action.'
            }
          ]
        })
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ features: [] })
    });
  });

  const form = { occupation: [{ Name: 'Fighter', Level: 2 }] };
  render(
    <Features
      form={form}
      showFeatures={true}
      handleCloseFeatures={() => {}}
    />
  );

  expect(await screen.findByText('Action Surge')).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /view feature/i })
    );
  });

  expect(
    await screen.findByText('You can take one additional action.')
  ).toBeInTheDocument();
});
