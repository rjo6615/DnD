import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TokenPickerModal from './TokenPickerModal';
import apiFetch from '../../../utils/apiFetch';
import { buildEnemyTokenFilterScopeValues } from '../utils/enemyTokenFilters';
import { buildPlayerTokenFolderScope } from '../utils/playerTokenFilters';

jest.mock('../../../utils/apiFetch');

const setupUser = () =>
  typeof userEvent.setup === 'function' ? userEvent.setup() : userEvent;

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve,
    reject,
  };
};

describe('TokenPickerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('builds DM folder filters from Cloudinary tree and scopes manifest requests', async () => {
    const user = setupUser();
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
      const lastCall = manifestCalls[manifestCalls.length - 1];
      expect(lastCall).toBe('/campaigns/Camp1/token-manifest?folders=Tokens%2FAdventurers');
    });

    await user.selectOptions(select, options[3]);

    await waitFor(() => {
      const lastCall = manifestCalls[manifestCalls.length - 1];
      expect(lastCall).toBe('/campaigns/Camp1/token-manifest?folders=Tokens%2FDM%2FDragons');
    });
  });

  test('players see Adventurers folders and scope manifest requests to selections', async () => {
    const user = setupUser();
    const folderTree = {
      rootFolder: 'Tokens',
      folders: [
        {
          name: 'Adventurers',
          path: 'Tokens/Adventurers',
          relativePath: 'Adventurers',
          children: [
            {
              name: 'Heroes',
              path: 'Tokens/Adventurers/Heroes',
              relativePath: 'Adventurers/Heroes',
              children: [
                {
                  name: 'Rogues',
                  path: 'Tokens/Adventurers/Heroes/Rogues',
                  relativePath: 'Adventurers/Heroes/Rogues',
                  children: [],
                },
              ],
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
          name: 'Heroes',
          path: 'Tokens/Adventurers/Heroes',
          relativePath: 'Adventurers/Heroes',
          depth: 1,
          displayPath: 'Adventurers/Heroes',
        },
        {
          name: 'Rogues',
          path: 'Tokens/Adventurers/Heroes/Rogues',
          relativePath: 'Adventurers/Heroes/Rogues',
          depth: 2,
          displayPath: 'Adventurers/Heroes/Rogues',
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
        onHide={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/campaigns/Camp1/token-folders');
    });

    const select = await screen.findByLabelText(/Token Library/i);

    await waitFor(() => {
      const options = within(select).getAllByRole('option');

      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('Tokens/Adventurers/Heroes/Rogues');
    });

    await waitFor(() => {
      const lastCall = manifestCalls[manifestCalls.length - 1];
      expect(lastCall).toBe(
        '/campaigns/Camp1/token-manifest?folders=Tokens%2FAdventurers%2FHeroes%2FRogues'
      );
    });

    const options = within(select).getAllByRole('option');

    await user.selectOptions(select, options[0]);

    await waitFor(() => {
      const lastCall = manifestCalls[manifestCalls.length - 1];
      expect(lastCall).toBe(
        '/campaigns/Camp1/token-manifest?folders=Tokens%2FAdventurers%2FHeroes%2FRogues'
      );
    });
  });

  test('player token picker scopes manifest requests when filterScope provided', async () => {
    const user = setupUser();
    const folderTree = {
      rootFolder: 'Tokens',
      folders: [
        {
          name: 'Adventurers',
          path: 'Tokens/Adventurers',
          relativePath: 'Adventurers',
          children: [
            {
              name: 'Dragonborn',
              path: 'Tokens/Adventurers/Dragonborn',
              relativePath: 'Adventurers/Dragonborn',
              children: [
                {
                  name: 'Fighter',
                  path: 'Tokens/Adventurers/Dragonborn/Fighter',
                  relativePath: 'Adventurers/Dragonborn/Fighter',
                  children: [],
                },
              ],
            },
            {
              name: 'Core_Class_Tokens',
              path: 'Tokens/Adventurers/Core_Class_Tokens',
              relativePath: 'Adventurers/Core_Class_Tokens',
              children: [
                {
                  name: 'Fighter',
                  path: 'Tokens/Adventurers/Core_Class_Tokens/Fighter',
                  relativePath: 'Adventurers/Core_Class_Tokens/Fighter',
                  children: [],
                },
              ],
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
          name: 'Dragonborn',
          path: 'Tokens/Adventurers/Dragonborn',
          relativePath: 'Adventurers/Dragonborn',
          depth: 1,
          displayPath: 'Adventurers/Dragonborn',
        },
        {
          name: 'Fighter',
          path: 'Tokens/Adventurers/Dragonborn/Fighter',
          relativePath: 'Adventurers/Dragonborn/Fighter',
          depth: 2,
          displayPath: 'Adventurers/Dragonborn/Fighter',
        },
        {
          name: 'Core_Class_Tokens',
          path: 'Tokens/Adventurers/Core_Class_Tokens',
          relativePath: 'Adventurers/Core_Class_Tokens',
          depth: 1,
          displayPath: 'Adventurers/Core_Class_Tokens',
        },
        {
          name: 'Fighter',
          path: 'Tokens/Adventurers/Core_Class_Tokens/Fighter',
          relativePath: 'Adventurers/Core_Class_Tokens/Fighter',
          depth: 2,
          displayPath: 'Adventurers/Core_Class_Tokens/Fighter',
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
        onHide={jest.fn()}
        onSelect={jest.fn()}
        filterScope={['Dragonborn/Fighter', 'Core_Class_Tokens/Fighter']}
      />
    );

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/campaigns/Camp1/token-folders');
    });

    await waitFor(() => {
      expect(manifestCalls.length).toBeGreaterThan(0);
      expect(manifestCalls[0]).toBe(
        '/campaigns/Camp1/token-manifest?folders=Tokens%2FAdventurers%2FDragonborn%2FFighter'
      );
    });

    const select = await screen.findByLabelText(/Token Library/i);
    const options = within(select).getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0].textContent.replace(/\u00A0/g, '')).toBe(
      'Tokens/Adventurers/Dragonborn/Fighter'
    );
    expect(options[1].textContent.replace(/\u00A0/g, '')).toBe(
      'Tokens/Adventurers/Core_Class_Tokens/Fighter'
    );

    await user.selectOptions(select, options[1]);

    await waitFor(() => {
      const lastCall = manifestCalls[manifestCalls.length - 1];
      expect(lastCall).toBe(
        '/campaigns/Camp1/token-manifest?folders=Tokens%2FAdventurers%2FCore_Class_Tokens%2FFighter'
      );
    });
  });

  test('player token picker surfaces Adventurers/Tokens class folders', async () => {
    const user = setupUser();
    const folderTree = {
      rootFolder: 'Tokens',
      folders: [
        {
          name: 'Adventurers',
          path: 'Tokens/Adventurers',
          relativePath: 'Adventurers',
          children: [
            {
              name: 'Tokens',
              path: 'Tokens/Adventurers/Tokens',
              relativePath: 'Adventurers/Tokens',
              children: [
                {
                  name: 'Dragonborn',
                  path: 'Tokens/Adventurers/Tokens/Dragonborn',
                  relativePath: 'Adventurers/Tokens/Dragonborn',
                  children: [
                    {
                      name: 'Fighter',
                      path: 'Tokens/Adventurers/Tokens/Dragonborn/Fighter',
                      relativePath: 'Adventurers/Tokens/Dragonborn/Fighter',
                      children: [],
                    },
                  ],
                },
              ],
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
          name: 'Tokens',
          path: 'Tokens/Adventurers/Tokens',
          relativePath: 'Adventurers/Tokens',
          depth: 1,
          displayPath: 'Adventurers/Tokens',
        },
        {
          name: 'Dragonborn',
          path: 'Tokens/Adventurers/Tokens/Dragonborn',
          relativePath: 'Adventurers/Tokens/Dragonborn',
          depth: 2,
          displayPath: 'Adventurers/Tokens/Dragonborn',
        },
        {
          name: 'Fighter',
          path: 'Tokens/Adventurers/Tokens/Dragonborn/Fighter',
          relativePath: 'Adventurers/Tokens/Dragonborn/Fighter',
          depth: 3,
          displayPath: 'Adventurers/Tokens/Dragonborn/Fighter',
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
        onHide={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/campaigns/Camp1/token-folders');
    });

    await waitFor(() => {
      expect(manifestCalls).toEqual(
        expect.arrayContaining([
          '/campaigns/Camp1/token-manifest?folders=Tokens%2FAdventurers%2FTokens%2FDragonborn%2FFighter',
        ])
      );
    });

    const select = await screen.findByLabelText(/Token Library/i);
    const options = within(select).getAllByRole('option');

    expect(options).toHaveLength(1);
    expect(options[0].textContent.replace(/\u00A0/g, '')).toBe(
      'Tokens/Adventurers/Tokens/Dragonborn/Fighter'
    );

    await user.selectOptions(select, options[0]);

    await waitFor(() => {
      const lastCall = manifestCalls[manifestCalls.length - 1];
      expect(lastCall).toBe(
        '/campaigns/Camp1/token-manifest?folders=Tokens%2FAdventurers%2FTokens%2FDragonborn%2FFighter'
      );
    });
  });

  test('player token picker prefers most specific matching folder from scope', async () => {
    const folderTree = {
      rootFolder: 'Tokens',
      folders: [
        {
          name: 'Adventurers',
          path: 'Tokens/Adventurers',
          relativePath: 'Adventurers',
          children: [
            {
              name: 'Humans',
              path: 'Tokens/Adventurers/Humans',
              relativePath: 'Adventurers/Humans',
              children: [
                {
                  name: 'Barbarian',
                  path: 'Tokens/Adventurers/Humans/Barbarian',
                  relativePath: 'Adventurers/Humans/Barbarian',
                  children: [],
                },
                {
                  name: 'Paladin',
                  path: 'Tokens/Adventurers/Humans/Paladin',
                  relativePath: 'Adventurers/Humans/Paladin',
                  children: [],
                },
              ],
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
          name: 'Humans',
          path: 'Tokens/Adventurers/Humans',
          relativePath: 'Adventurers/Humans',
          depth: 1,
          displayPath: 'Adventurers/Humans',
        },
        {
          name: 'Barbarian',
          path: 'Tokens/Adventurers/Humans/Barbarian',
          relativePath: 'Adventurers/Humans/Barbarian',
          depth: 2,
          displayPath: 'Adventurers/Humans/Barbarian',
        },
        {
          name: 'Paladin',
          path: 'Tokens/Adventurers/Humans/Paladin',
          relativePath: 'Adventurers/Humans/Paladin',
          depth: 2,
          displayPath: 'Adventurers/Humans/Paladin',
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

    const scope = buildPlayerTokenFolderScope('Human', [{ Occupation: 'Paladin' }]);

    render(
      <TokenPickerModal
        show
        campaignId="Camp1"
        onHide={jest.fn()}
        onSelect={jest.fn()}
        filterScope={scope}
      />
    );

    await waitFor(() => {
      expect(manifestCalls.length).toBeGreaterThan(0);
      const lastCall = manifestCalls[manifestCalls.length - 1];
      expect(lastCall).toBe(
        '/campaigns/Camp1/token-manifest?folders=Tokens%2FAdventurers%2FHumans%2FPaladin'
      );
    });

    expect(
      manifestCalls.some((call) =>
        call.includes('token-manifest?folders=Tokens%2FAdventurers%2FHumans%2FPaladin')
      )
    ).toBe(true);

    const select = await screen.findByLabelText(/Token Library/i);
    const options = within(select).getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0].textContent.replace(/\u00A0/g, '')).toBe(
      'Tokens/Adventurers/Humans/Paladin'
    );
    expect(options[0].selected).toBe(true);
  });

  test('filters manifest assets based on provided scope', async () => {
    const folderTree = { folders: [], flatFolders: [] };

    const manifestPayload = {
      assets: [
        {
          publicId: 'Tokens/Adventurers/Dragonborn/Fighter/token-1',
          filename: 'Dragonborn Fighter',
          relativeFolder: 'Adventurers/Dragonborn/Fighter',
        },
        {
          publicId: 'Tokens/Adventurers/Dragonborn/Wizard/token-2',
          filename: 'Dragonborn Wizard',
          relativeFolder: 'Adventurers/Dragonborn/Wizard',
        },
        {
          publicId: 'Tokens/Adventurers/Elf/Wizard/token-3',
          filename: 'Elf Wizard',
          relativeFolder: 'Adventurers/Elf/Wizard',
        },
      ],
      nextCursor: null,
      appliedFolders: ['Tokens/Adventurers'],
    };

    apiFetch.mockImplementation((url) => {
      if (url === '/campaigns/Camp1/token-folders') {
        return Promise.resolve({ ok: true, json: async () => folderTree });
      }

      if (url.startsWith('/campaigns/Camp1/token-manifest')) {
        return Promise.resolve({ ok: true, json: async () => manifestPayload });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <TokenPickerModal
        show
        campaignId="Camp1"
        onHide={jest.fn()}
        onSelect={jest.fn()}
        filterScope={[
          'Dragonborn/Fighter',
          'Adventurers/Dragonborn/Fighter',
          'folder:Tokens/Adventurers/Dragonborn/Fighter',
        ]}
      />
    );

    await screen.findByText('Dragonborn Fighter');

    await waitFor(() => {
      expect(screen.queryByText('Dragonborn Wizard')).not.toBeInTheDocument();
      expect(screen.queryByText('Elf Wizard')).not.toBeInTheDocument();
    });
  });

  test('falls back to race tokens when class-specific tokens are unavailable', async () => {
    const folderTree = { folders: [], flatFolders: [] };

    const manifestPayload = {
      assets: [
        {
          publicId: 'Tokens/Adventurers/Dragonborn/token-1',
          filename: 'Dragonborn Adventurer',
          relativeFolder: 'Adventurers/Dragonborn',
        },
        {
          publicId: 'Tokens/Adventurers/Human/Fighter/token-2',
          filename: 'Human Fighter',
          relativeFolder: 'Adventurers/Human/Fighter',
        },
      ],
      nextCursor: null,
      appliedFolders: ['Tokens/Adventurers'],
    };

    apiFetch.mockImplementation((url) => {
      if (url === '/campaigns/Camp1/token-folders') {
        return Promise.resolve({ ok: true, json: async () => folderTree });
      }

      if (url.startsWith('/campaigns/Camp1/token-manifest')) {
        return Promise.resolve({ ok: true, json: async () => manifestPayload });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <TokenPickerModal
        show
        campaignId="Camp1"
        onHide={jest.fn()}
        onSelect={jest.fn()}
        filterScope={[
          'Dragonborn/Warlock',
          'Adventurers/Dragonborn/Warlock',
          'folder:Tokens/Adventurers/Dragonborn/Warlock',
          'Dragonborn',
          'Adventurers/Dragonborn',
          'folder:Tokens/Adventurers/Dragonborn',
        ]}
      />
    );

    await screen.findByText('Dragonborn Adventurer');

    await waitFor(() => {
      expect(screen.queryByText('Human Fighter')).not.toBeInTheDocument();
    });
  });

  test('player token picker limits folders to scoped race and class combinations', async () => {
    const folderTree = {
      rootFolder: 'Tokens',
      folders: [
        {
          name: 'Adventurers',
          path: 'Tokens/Adventurers',
          relativePath: 'Adventurers',
          children: [
            {
              name: 'Dragonborn',
              path: 'Tokens/Adventurers/Dragonborn',
              relativePath: 'Adventurers/Dragonborn',
              children: [
                {
                  name: 'Druid',
                  path: 'Tokens/Adventurers/Dragonborn/Druid',
                  relativePath: 'Adventurers/Dragonborn/Druid',
                  children: [],
                },
              ],
            },
            {
              name: 'Dwarves',
              path: 'Tokens/Adventurers/Dwarves',
              relativePath: 'Adventurers/Dwarves',
              children: [
                {
                  name: 'Druid',
                  path: 'Tokens/Adventurers/Dwarves/Druid',
                  relativePath: 'Adventurers/Dwarves/Druid',
                  children: [],
                },
              ],
            },
            {
              name: 'Core_Class_Tokens',
              path: 'Tokens/Adventurers/Core_Class_Tokens',
              relativePath: 'Adventurers/Core_Class_Tokens',
              children: [
                {
                  name: 'Mediumfolk',
                  path: 'Tokens/Adventurers/Core_Class_Tokens/Mediumfolk',
                  relativePath: 'Adventurers/Core_Class_Tokens/Mediumfolk',
                  children: [
                    {
                      name: 'Druid',
                      path: 'Tokens/Adventurers/Core_Class_Tokens/Mediumfolk/Druid',
                      relativePath: 'Adventurers/Core_Class_Tokens/Mediumfolk/Druid',
                      children: [],
                    },
                  ],
                },
              ],
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
          name: 'Dragonborn',
          path: 'Tokens/Adventurers/Dragonborn',
          relativePath: 'Adventurers/Dragonborn',
          depth: 1,
          displayPath: 'Adventurers/Dragonborn',
        },
        {
          name: 'Druid',
          path: 'Tokens/Adventurers/Dragonborn/Druid',
          relativePath: 'Adventurers/Dragonborn/Druid',
          depth: 2,
          displayPath: 'Adventurers/Dragonborn/Druid',
        },
        {
          name: 'Dwarves',
          path: 'Tokens/Adventurers/Dwarves',
          relativePath: 'Adventurers/Dwarves',
          depth: 1,
          displayPath: 'Adventurers/Dwarves',
        },
        {
          name: 'Druid',
          path: 'Tokens/Adventurers/Dwarves/Druid',
          relativePath: 'Adventurers/Dwarves/Druid',
          depth: 2,
          displayPath: 'Adventurers/Dwarves/Druid',
        },
        {
          name: 'Core_Class_Tokens',
          path: 'Tokens/Adventurers/Core_Class_Tokens',
          relativePath: 'Adventurers/Core_Class_Tokens',
          depth: 1,
          displayPath: 'Adventurers/Core_Class_Tokens',
        },
        {
          name: 'Mediumfolk',
          path: 'Tokens/Adventurers/Core_Class_Tokens/Mediumfolk',
          relativePath: 'Adventurers/Core_Class_Tokens/Mediumfolk',
          depth: 2,
          displayPath: 'Adventurers/Core_Class_Tokens/Mediumfolk',
        },
        {
          name: 'Druid',
          path: 'Tokens/Adventurers/Core_Class_Tokens/Mediumfolk/Druid',
          relativePath: 'Adventurers/Core_Class_Tokens/Mediumfolk/Druid',
          depth: 3,
          displayPath: 'Adventurers/Core_Class_Tokens/Mediumfolk/Druid',
        },
      ],
    };

    const manifestPayload = {
      assets: [],
      nextCursor: null,
      appliedFolders: [],
      totalCount: 0,
    };

    apiFetch.mockImplementation((url) => {
      if (url === '/campaigns/Camp1/token-folders') {
        return Promise.resolve({ ok: true, json: async () => folderTree });
      }

      if (url.startsWith('/campaigns/Camp1/token-manifest')) {
        return Promise.resolve({ ok: true, json: async () => manifestPayload });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    const scope = [
      'Core_Class_Tokens/Druid',
      'Adventurers/Core_Class_Tokens/Druid',
      'Tokens/Adventurers/Core_Class_Tokens/Druid',
      'Dwarves/Druid',
      'Adventurers/Dwarves/Druid',
      'Tokens/Adventurers/Dwarves/Druid',
    ];

    render(
      <TokenPickerModal
        show
        campaignId="Camp1"
        onHide={jest.fn()}
        onSelect={jest.fn()}
        filterScope={scope}
      />
    );

    const select = await screen.findByLabelText(/Token Library/i);

    await waitFor(() => {
      const options = within(select).getAllByRole('option');
      const normalizedOptions = options.map((option) => option.textContent.replace(/\u00A0/g, ''));

      expect(normalizedOptions).toEqual([
        'Tokens/Adventurers/Dwarves/Druid',
        'Tokens/Adventurers/Core_Class_Tokens/Mediumfolk/Druid',
      ]);
    });
  });

  test('player library dropdown stays disabled until folders finish loading', async () => {
    const folderTree = {
      rootFolder: 'Tokens',
      folders: [
        {
          name: 'Adventurers',
          path: 'Tokens/Adventurers',
          relativePath: 'Adventurers',
          children: [],
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
          name: 'Allies',
          path: 'Tokens/Adventurers/Allies',
          relativePath: 'Adventurers/Allies',
          depth: 1,
          displayPath: 'Adventurers/Allies',
        },
      ],
    };

    const manifestPayload = {
      assets: [],
      nextCursor: null,
      appliedFolders: [],
      totalCount: 0,
    };

    const folderDeferred = createDeferred();

    apiFetch.mockImplementation((url) => {
      if (url === '/campaigns/Camp1/token-folders') {
        return folderDeferred.promise;
      }

      if (url.startsWith('/campaigns/Camp1/token-manifest')) {
        return Promise.resolve({ ok: true, json: async () => manifestPayload });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <TokenPickerModal
        show
        campaignId="Camp1"
        onHide={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    const select = await screen.findByLabelText(/Token Library/i);

    await waitFor(() => {
      expect(select).toBeDisabled();
    });

    expect(within(select).getByText('Loading token folders…')).toBeInTheDocument();

    folderDeferred.resolve({ ok: true, json: async () => folderTree });

    await waitFor(() => {
      expect(select).not.toBeDisabled();
    });

    expect(within(select).queryByText('Loading token folders…')).not.toBeInTheDocument();
    const options = within(select).getAllByRole('option');
    expect(options.length).toBeGreaterThan(0);
  });

  test('displays an error message when token manifest request fails', async () => {
    const errorMessage = 'Cloudinary rate limit exceeded';

    apiFetch.mockImplementation((url) => {
      if (url.startsWith('/campaigns/Camp1/token-manifest')) {
        return Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: async () => ({ message: errorMessage }),
        });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <TokenPickerModal
        show
        campaignId="Camp1"
        isDm={false}
        onHide={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/campaigns/Camp1/token-manifest')
      );
    });

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });

  test('does not refetch repeatedly after a 503 manifest error', async () => {
    const errorMessage = 'Service temporarily unavailable';
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      apiFetch.mockImplementation((url) => {
        if (url.startsWith('/campaigns/Camp1/token-manifest')) {
          return Promise.resolve({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            json: async () => ({ message: errorMessage }),
          });
        }

        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      render(
        <TokenPickerModal
          show
          campaignId="Camp1"
          isDm={false}
          onHide={jest.fn()}
          onSelect={jest.fn()}
        />
      );

      const manifestCallCount = () =>
        apiFetch.mock.calls.filter(
          ([url]) => typeof url === 'string' && url.includes('/token-manifest')
        ).length;

      await waitFor(() => {
        expect(manifestCallCount()).toBe(1);
      });

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
        expect(manifestCallCount()).toBe(1);
      });

      expect(manifestCallCount()).toBe(1);

      const depthError = consoleErrorSpy.mock.calls.find((callArgs) =>
        callArgs.some(
          (arg) =>
            typeof arg === 'string' && arg.toLowerCase().includes('maximum update depth exceeded')
        )
      );

      expect(depthError).toBeUndefined();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  test('limits available filters when filterScope is provided', async () => {
    const scope = buildEnemyTokenFilterScopeValues('cultist', {
      index: 'cultist',
      name: 'Cultist',
    });

    render(
      <TokenPickerModal
        show
        isDm
        dmFilters={[
          { key: 'all', label: 'All Tokens', folders: null, aliases: ['all'] },
          {
            key: 'folder:Tokens/Adversaries/Cultist',
            label: 'Adversaries/Cultist',
            folders: ['Tokens/Adversaries/Cultist'],
            aliases: ['cultist', 'cultists'],
          },
          {
            key: 'folder:Tokens/Adversaries/Dragons',
            label: 'Adversaries/Dragons',
            folders: ['Tokens/Adversaries/Dragons'],
            aliases: ['dragon'],
          },
        ]}
        filterScope={scope}
        onHide={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    const select = await screen.findByLabelText(/Token Library/i);
    const options = within(select).getAllByRole('option');

    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Adversaries/Cultist');
  });

  test('does not include parent adversary filters when scope targets specific adversary', async () => {
    const scope = buildEnemyTokenFilterScopeValues('cultist', {
      index: 'cultist',
      name: 'Cultist',
    });

    render(
      <TokenPickerModal
        show
        isDm
        dmFilters={[
          { key: 'all', label: 'All Tokens', folders: null, aliases: ['all'] },
          {
            key: 'folder:Tokens/Adversaries',
            label: 'Adversaries',
            folders: ['Tokens/Adversaries'],
            aliases: ['adversaries'],
          },
          {
            key: 'folder:Tokens/Adversaries/Cultists',
            label: 'Adversaries/Cultists',
            folders: ['Tokens/Adversaries/Cultists'],
            aliases: ['cultist', 'cultists'],
          },
        ]}
        filterScope={scope}
        onHide={jest.fn()}
        onSelect={jest.fn()}
      />
    );

    const select = await screen.findByLabelText(/Token Library/i);
    const options = within(select).getAllByRole('option');

    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent('Adversaries/Cultists');
  });
});
