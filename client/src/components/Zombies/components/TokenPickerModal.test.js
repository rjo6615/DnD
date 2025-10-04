import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TokenPickerModal from './TokenPickerModal';
import apiFetch from '../../../utils/apiFetch';

jest.mock('../../../utils/apiFetch');

describe('TokenPickerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('builds DM folder filters from Cloudinary tree and scopes manifest requests', async () => {
    const user = userEvent.setup();
    const folderTree = {
      rootFolder: 'Tokens',
      folders: [
        {
          name: 'Adventurers',
          path: 'Tokens/Adventurers',
          relativePath: 'Adventurers',
          children: [],
        },
        {
          name: 'DM',
          path: 'Tokens/DM',
          relativePath: 'DM',
          children: [
            {
              name: 'Dragons',
              path: 'Tokens/DM/Dragons',
              relativePath: 'DM/Dragons',
              children: [],
            },
          ],
        },
      ],
      flatFolders: [
        {
          name: 'Adventurers',
          path: 'Tokens/Adventurers',
          relativePath: 'Adventurers',
          depth: 0,
          displayPath: 'Adventurers',
        },
        {
          name: 'DM',
          path: 'Tokens/DM',
          relativePath: 'DM',
          depth: 0,
          displayPath: 'DM',
        },
        {
          name: 'Dragons',
          path: 'Tokens/DM/Dragons',
          relativePath: 'DM/Dragons',
          depth: 1,
          displayPath: 'DM/Dragons',
        },
      ],
    };

    const manifestPayload = {
      assets: [],
      nextCursor: null,
      appliedFolders: [],
      totalCount: 0,
    };

    const manifestCalls = [];

    apiFetch.mockImplementation((url) => {
      if (url === '/campaigns/Camp1/token-folders') {
        return Promise.resolve({ ok: true, json: async () => folderTree });
      }

      if (url.startsWith('/campaigns/Camp1/token-manifest')) {
        manifestCalls.push(url);
        return Promise.resolve({ ok: true, json: async () => manifestPayload });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <TokenPickerModal
        show
        campaignId="Camp1"
        isDm
        onHide={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/campaigns/Camp1/token-folders');
    });

    const select = await screen.findByLabelText(/Token Library/i);
    const options = within(select).getAllByRole('option');

    expect(options).toHaveLength(4);
    expect(options[0]).toHaveTextContent('All Tokens');
    expect(options[1]).toHaveTextContent('Adventurers');
    expect(options[2]).toHaveTextContent('DM');
    expect(options[3].textContent.startsWith('\u00A0\u00A0')).toBe(true);
    expect(options[3]).toHaveTextContent('DM/Dragons');

    await waitFor(() => {
      expect(manifestCalls[0]).toBe(
        '/campaigns/Camp1/token-manifest?folders=Tokens%2FAdventurers'
      );
    });

    await user.selectOptions(select, options[3]);

    await waitFor(() => {
      const lastCall = manifestCalls[manifestCalls.length - 1];
      expect(lastCall).toBe('/campaigns/Camp1/token-manifest?folders=Tokens%2FDM%2FDragons');
    });
  });
});
