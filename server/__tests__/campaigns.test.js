process.env.JWT_SECRET = 'testsecret';
process.env.ATLAS_URI = 'mongodb://localhost/test';
process.env.CLIENT_ORIGINS = 'http://localhost';

const request = require('supertest');
const express = require('express');

jest.mock('../db/conn');
const dbo = require('../db/conn');
let mockUser = { username: 'DM' };
jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = mockUser;
  next();
});

describe('suggestEnemyFigurine helper', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'key',
      CLOUDINARY_API_SECRET: 'secret',
    };
  });

  afterEach(() => {
    jest.resetModules();
    jest.dontMock('cloudinary');
    process.env = { ...originalEnv };
  });

  test('returns null when adversary folder has no matching assets', async () => {
    const mockResources = jest.fn().mockResolvedValue({ resources: [] });
    const mockExecute = jest.fn();

    const searchInstance = {};
    searchInstance.sort_by = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.max_results = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.with_field = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.next_cursor = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.execute = mockExecute;

    const mockExpression = jest.fn().mockImplementation(() => searchInstance);

    jest.doMock('cloudinary', () => ({
      v2: {
        config: jest.fn(),
        api: {
          resources: mockResources,
        },
        search: {
          expression: mockExpression,
        },
      },
    }));

    const { suggestEnemyFigurine: actualSuggestEnemyFigurine } = jest.requireActual(
      '../utils/cloudinary'
    );

    const result = await actualSuggestEnemyFigurine({ index: 'goblin', name: 'Goblin' });

    expect(mockResources).toHaveBeenCalled();
    expect(mockResources.mock.calls[0][0]).toMatchObject({
      prefix: 'Tokens/Adversaries/Goblin',
    });
    expect(mockExpression).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  test('reuses cached figurine suggestions for the same monster keys', async () => {
    process.env.CLOUDINARY_FIGURINE_SUGGESTION_CACHE_TTL_MS = '1000';

    const mockResources = jest.fn().mockResolvedValue({ resources: [] });
    const mockExecute = jest.fn();

    const searchInstance = {};
    searchInstance.sort_by = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.max_results = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.with_field = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.next_cursor = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.execute = mockExecute;

    const mockExpression = jest.fn().mockImplementation(() => searchInstance);

    jest.doMock('cloudinary', () => ({
      v2: {
        config: jest.fn(),
        api: {
          resources: mockResources,
        },
        search: {
          expression: mockExpression,
        },
      },
    }));

    const { suggestEnemyFigurine: actualSuggestEnemyFigurine } = jest.requireActual(
      '../utils/cloudinary'
    );

    mockResources.mockResolvedValueOnce({
      resources: [
        {
          public_id: 'Tokens/Adversaries/Skeleton/token-1',
          secure_url:
            'https://res.cloudinary.com/demo/image/upload/v1/Tokens/Adversaries/Skeleton/token-1.png',
          folder: 'Tokens/Adversaries/Skeleton',
          filename: 'token-1',
        },
      ],
    });

    const first = await actualSuggestEnemyFigurine({ index: 'skeleton', name: 'Skeleton' });
    const resourceCallsAfterFirst = mockResources.mock.calls.length;
    const second = await actualSuggestEnemyFigurine({ index: 'skeleton', name: 'Skeleton' });

    expect(first).toEqual({
      figurineImagePublicId: 'Tokens/Adversaries/Skeleton/token-1',
      figurineImageUrl:
        'https://res.cloudinary.com/demo/image/upload/v1/Tokens/Adversaries/Skeleton/token-1.png',
    });
    expect(second).toEqual(first);
    expect(mockResources.mock.calls.length).toBe(resourceCallsAfterFirst);
    expect(mockExpression).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('caches null figurine suggestions to avoid repeated searches', async () => {
    process.env.CLOUDINARY_FIGURINE_SUGGESTION_CACHE_TTL_MS = '1000';

    const mockResources = jest.fn().mockResolvedValue({ resources: [] });
    const mockExecute = jest.fn();

    const searchInstance = {};
    searchInstance.sort_by = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.max_results = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.with_field = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.next_cursor = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.execute = mockExecute;

    const mockExpression = jest.fn().mockImplementation(() => searchInstance);

    jest.doMock('cloudinary', () => ({
      v2: {
        config: jest.fn(),
        api: {
          resources: mockResources,
        },
        search: {
          expression: mockExpression,
        },
      },
    }));

    const { suggestEnemyFigurine: actualSuggestEnemyFigurine } = jest.requireActual(
      '../utils/cloudinary'
    );

    const first = await actualSuggestEnemyFigurine({ index: 'wight', name: 'Wight' });
    const resourceCallsAfterFirst = mockResources.mock.calls.length;
    const second = await actualSuggestEnemyFigurine({ index: 'wight', name: 'Wight' });

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(mockResources.mock.calls.length).toBe(resourceCallsAfterFirst);
    expect(mockExpression).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
  });

  test('returns adversary folder assets without using Cloudinary search', async () => {
    const mockResources = jest.fn().mockResolvedValue({
      resources: [
        {
          public_id: 'Tokens/Adversaries/Goblin/token-1',
          secure_url:
            'https://res.cloudinary.com/demo/image/upload/v1/Tokens/Adversaries/Goblin/token-1.png',
          folder: 'Tokens/Adversaries/Goblin',
          filename: 'token-1',
        },
      ],
    });

    const mockExecute = jest.fn();

    const searchInstance = {};
    searchInstance.sort_by = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.max_results = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.with_field = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.next_cursor = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.execute = mockExecute;

    const mockExpression = jest.fn().mockImplementation(() => searchInstance);

    jest.doMock('cloudinary', () => ({
      v2: {
        config: jest.fn(),
        api: {
          resources: mockResources,
        },
        search: {
          expression: mockExpression,
        },
      },
    }));

    const { suggestEnemyFigurine: actualSuggestEnemyFigurine } = jest.requireActual(
      '../utils/cloudinary'
    );

    const result = await actualSuggestEnemyFigurine({ index: 'goblin', name: 'Goblin' });

    expect(mockResources).toHaveBeenCalledTimes(1);
    expect(mockExpression).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
    expect(result).toEqual({
      figurineImagePublicId: 'Tokens/Adversaries/Goblin/token-1',
      figurineImageUrl:
        'https://res.cloudinary.com/demo/image/upload/v1/Tokens/Adversaries/Goblin/token-1.png',
    });
  });

  test('requests adversary folders using underscores for monster names with spaces', async () => {
    const mockResources = jest.fn().mockResolvedValue({
      resources: [
        {
          public_id: 'Tokens/Adversaries/Adult_Blue_Dragon/token-2',
          secure_url:
            'https://res.cloudinary.com/demo/image/upload/v1/Tokens/Adversaries/Adult_Blue_Dragon/token-2.png',
          folder: 'Tokens/Adversaries/Adult_Blue_Dragon',
          filename: 'token-2',
        },
      ],
    });

    const mockExecute = jest.fn();

    const searchInstance = {};
    searchInstance.sort_by = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.max_results = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.with_field = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.next_cursor = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.execute = mockExecute;

    const mockExpression = jest.fn().mockImplementation(() => searchInstance);

    jest.doMock('cloudinary', () => ({
      v2: {
        config: jest.fn(),
        api: {
          resources: mockResources,
        },
        search: {
          expression: mockExpression,
        },
      },
    }));

    const { suggestEnemyFigurine: actualSuggestEnemyFigurine } = jest.requireActual(
      '../utils/cloudinary'
    );

    const result = await actualSuggestEnemyFigurine({
      index: 'adult-blue-dragon',
      name: 'Adult Blue Dragon',
    });

    expect(mockResources).toHaveBeenCalledTimes(1);
    expect(mockResources.mock.calls[0][0]).toMatchObject({
      prefix: 'Tokens/Adversaries/Adult_Blue_Dragon',
    });
    expect(mockExpression).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
    expect(result).toEqual({
      figurineImagePublicId: 'Tokens/Adversaries/Adult_Blue_Dragon/token-2',
      figurineImageUrl:
        'https://res.cloudinary.com/demo/image/upload/v1/Tokens/Adversaries/Adult_Blue_Dragon/token-2.png',
    });
  });

  test('prefers adversary folders before falling back to Cloudinary search', async () => {
    const mockResources = jest.fn().mockResolvedValue({
      resources: [
        {
          public_id: 'Tokens/Adversaries/Goblin/token-1',
          secure_url:
            'https://res.cloudinary.com/demo/image/upload/v1/Tokens/Adversaries/Goblin/token-1.png',
          folder: 'Tokens/Adversaries/Goblin',
          filename: 'token-1',
        },
      ],
    });

    const mockExecute = jest.fn();

    const searchInstance = {};
    searchInstance.sort_by = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.max_results = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.with_field = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.next_cursor = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.execute = mockExecute;

    const mockExpression = jest.fn().mockImplementation(() => searchInstance);

    jest.doMock('cloudinary', () => ({
      v2: {
        config: jest.fn(),
        api: {
          resources: mockResources,
        },
        search: {
          expression: mockExpression,
        },
      },
    }));

    const { suggestEnemyFigurine: actualSuggestEnemyFigurine } = jest.requireActual(
      '../utils/cloudinary'
    );

    const result = await actualSuggestEnemyFigurine({ index: 'goblin', name: 'Goblin' });

    expect(mockResources).toHaveBeenCalledTimes(1);
    expect(mockExpression).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
    expect(result).toEqual({
      figurineImagePublicId: 'Tokens/Adversaries/Goblin/token-1',
      figurineImageUrl:
        'https://res.cloudinary.com/demo/image/upload/v1/Tokens/Adversaries/Goblin/token-1.png',
    });
  });

  test('tracks Cloudinary API call counts across figurine search scenarios', async () => {
    process.env.CLOUDINARY_FIGURINE_SUGGESTION_CACHE_TTL_MS = '1000';

    const mockResources = jest.fn().mockResolvedValue({
      resources: [
        {
          public_id: 'Tokens/Adversaries/Ogre/token-3',
          secure_url:
            'https://res.cloudinary.com/demo/image/upload/v1/Tokens/Adversaries/Ogre/token-3.png',
          folder: 'Tokens/Adversaries/Ogre',
          filename: 'token-3',
        },
      ],
    });
    const mockExecute = jest.fn();

    const searchInstance = {};
    searchInstance.sort_by = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.max_results = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.with_field = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.next_cursor = jest.fn().mockImplementation(() => searchInstance);
    searchInstance.execute = mockExecute;

    const mockExpression = jest.fn().mockImplementation(() => searchInstance);

    jest.doMock('cloudinary', () => ({
      v2: {
        config: jest.fn(),
        api: {
          resources: mockResources,
        },
        search: {
          expression: mockExpression,
        },
      },
    }));

    const {
      suggestEnemyFigurine: actualSuggestEnemyFigurine,
      getCloudinaryApiCallCounts,
      resetCloudinaryApiCallCounts,
    } = jest.requireActual('../utils/cloudinary');

    const result = await actualSuggestEnemyFigurine({ index: 'ogre', name: 'Ogre' });

    expect(result).toEqual({
      figurineImagePublicId: 'Tokens/Adversaries/Ogre/token-3',
      figurineImageUrl:
        'https://res.cloudinary.com/demo/image/upload/v1/Tokens/Adversaries/Ogre/token-3.png',
    });

    expect(mockExpression).not.toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
    expect(mockResources).toHaveBeenCalledTimes(1);

    const counts = getCloudinaryApiCallCounts();
    const resourceCalls = mockResources.mock.calls.length;
    expect(counts.total).toBe(resourceCalls);
    expect(counts.byAction).toEqual({ 'api.resources': resourceCalls });

    resetCloudinaryApiCallCounts();
    expect(getCloudinaryApiCallCounts()).toEqual({ total: 0, byAction: {} });
  });
});

describe('Cloudinary caching helpers', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    jest.resetModules();
    jest.dontMock('cloudinary');
    process.env = { ...originalEnv };
  });

  test('listTokenAssets reuses cached results when inputs repeat', async () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'key',
      CLOUDINARY_API_SECRET: 'secret',
      CLOUDINARY_TOKEN_CACHE_TTL_MS: '1000',
    };

    const mockResources = jest.fn().mockResolvedValue({
      resources: [
        {
          public_id: 'Tokens/DM/goblin_token',
          secure_url: 'https://res.cloudinary.com/demo/image/upload/Tokens/DM/goblin_token.png',
          folder: 'Tokens/DM',
          filename: 'goblin_token',
        },
      ],
      next_cursor: 'NEXT',
      total_count: 1,
    });

    jest.doMock('cloudinary', () => ({
      v2: {
        config: jest.fn(),
        api: {
          resources: mockResources,
        },
      },
    }));

    const { listTokenAssets: actualListTokenAssets } = jest.requireActual('../utils/cloudinary');

    await actualListTokenAssets({ folders: ['DM'], nextCursor: null });
    await actualListTokenAssets({ folders: ['DM'], nextCursor: null });

    expect(mockResources).toHaveBeenCalledTimes(1);
    expect(mockResources.mock.calls[0][0]).toMatchObject({
      prefix: 'Tokens/DM',
      max_results: 200,
    });
  });

  test('listTokenAssets deduplicates concurrent identical requests', async () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'key',
      CLOUDINARY_API_SECRET: 'secret',
      CLOUDINARY_TOKEN_CACHE_TTL_MS: '1000',
    };

    let resolveExecute;
    const executePromise = new Promise((resolve) => {
      resolveExecute = resolve;
    });

    const mockResources = jest.fn().mockReturnValue(executePromise);

    jest.doMock('cloudinary', () => ({
      v2: {
        config: jest.fn(),
        api: {
          resources: mockResources,
        },
      },
    }));

    const { listTokenAssets: actualListTokenAssets } = jest.requireActual('../utils/cloudinary');

    const firstCall = actualListTokenAssets({ folders: ['DM'], nextCursor: null });
    const secondCall = actualListTokenAssets({ folders: ['DM'], nextCursor: null });

    expect(mockResources).toHaveBeenCalledTimes(1);

    resolveExecute({
      resources: [
        {
          public_id: 'Tokens/DM/goblin_token',
          secure_url: 'https://res.cloudinary.com/demo/image/upload/Tokens/DM/goblin_token.png',
          folder: 'Tokens/DM',
          filename: 'goblin_token',
        },
      ],
      next_cursor: null,
      total_count: 1,
    });

    const [firstResult, secondResult] = await Promise.all([firstCall, secondCall]);

    expect(firstResult).toEqual(secondResult);
    expect(mockResources).toHaveBeenCalledTimes(1);
  });

  test('listTokenAssets requests Cloudinary resources with normalized folder prefix', async () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'key',
      CLOUDINARY_API_SECRET: 'secret',
    };

    const mockResources = jest.fn().mockResolvedValue({ resources: [] });

    jest.doMock('cloudinary', () => ({
      v2: {
        config: jest.fn(),
        api: {
          resources: mockResources,
        },
      },
    }));

    const { listTokenAssets: actualListTokenAssets } = jest.requireActual('../utils/cloudinary');

    await actualListTokenAssets({ folders: ['Adversaries/ape'] });

    expect(mockResources).toHaveBeenCalledTimes(1);
    expect(mockResources.mock.calls[0][0]).toMatchObject({
      prefix: 'Tokens/Adversaries/ape',
      max_results: 200,
      context: true,
      metadata: true,
    });
  });

  test('listTokenFolderTree reuses cached results when inputs repeat', async () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'key',
      CLOUDINARY_API_SECRET: 'secret',
      CLOUDINARY_FOLDER_TREE_CACHE_TTL_MS: '1000',
    };

    const mockSubFolders = jest
      .fn()
      .mockImplementation(async (path) => {
        if (path === 'Tokens') {
          return {
            folders: [
              {
                path: 'Tokens/Creatures',
                name: 'Creatures',
              },
            ],
            next_cursor: null,
          };
        }

        if (path === 'Tokens/Creatures') {
          return { folders: [], next_cursor: null };
        }

        throw new Error(`Unexpected folder path: ${path}`);
      });

    jest.doMock('cloudinary', () => ({
      v2: {
        config: jest.fn(),
        api: {
          sub_folders: mockSubFolders,
        },
      },
    }));

    const { listTokenFolderTree: actualListTokenFolderTree } = jest.requireActual(
      '../utils/cloudinary'
    );

    await actualListTokenFolderTree({});
    await actualListTokenFolderTree({});

    expect(mockSubFolders).toHaveBeenCalledTimes(2);
  });

  test('listTokenFolderTree derives descendant results from cached root tree without extra calls', async () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'key',
      CLOUDINARY_API_SECRET: 'secret',
      CLOUDINARY_FOLDER_TREE_CACHE_TTL_MS: '1000',
    };

    const mockSubFolders = jest.fn().mockImplementation(async (path) => {
      if (path === 'Tokens') {
        return {
          folders: [
            { path: 'Tokens/Creatures', name: 'Creatures' },
            { path: 'Tokens/Items', name: 'Items' },
          ],
          next_cursor: null,
        };
      }

      if (path === 'Tokens/Creatures') {
        return {
          folders: [{ path: 'Tokens/Creatures/Cats', name: 'Cats' }],
          next_cursor: null,
        };
      }

      if (path === 'Tokens/Items') {
        return { folders: [], next_cursor: null };
      }

      if (path === 'Tokens/Creatures/Cats') {
        return { folders: [], next_cursor: null };
      }

      throw new Error(`Unexpected folder path: ${path}`);
    });

    jest.doMock('cloudinary', () => ({
      v2: {
        config: jest.fn(),
        api: {
          sub_folders: mockSubFolders,
        },
      },
    }));

    const { listTokenFolderTree: actualListTokenFolderTree } = jest.requireActual(
      '../utils/cloudinary'
    );

    await actualListTokenFolderTree({});
    mockSubFolders.mockClear();

    await actualListTokenFolderTree({ folders: ['Tokens/Creatures'] });

    expect(mockSubFolders).not.toHaveBeenCalled();
  });

  test('listTokenFolderTree only fetches each folder path once with concurrency', async () => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      CLOUDINARY_CLOUD_NAME: 'demo',
      CLOUDINARY_API_KEY: 'key',
      CLOUDINARY_API_SECRET: 'secret',
      CLOUDINARY_FOLDER_TREE_CONCURRENCY: '8',
    };

    const callOrder = [];
    const mockSubFolders = jest.fn().mockImplementation(async (path) => {
      callOrder.push(path);

      if (path === 'Tokens') {
        return {
          folders: [
            { path: 'Tokens/Creatures', name: 'Creatures' },
            { path: 'Tokens/Items', name: 'Items' },
          ],
          next_cursor: null,
        };
      }

      if (path === 'Tokens/Creatures') {
        return {
          folders: [{ path: 'Tokens/Creatures/Undead', name: 'Undead' }],
          next_cursor: null,
        };
      }

      if (path === 'Tokens/Items') {
        return {
          folders: [{ path: 'Tokens/Items/Potions', name: 'Potions' }],
          next_cursor: null,
        };
      }

      if (path === 'Tokens/Creatures/Undead' || path === 'Tokens/Items/Potions') {
        return { folders: [], next_cursor: null };
      }

      throw new Error(`Unexpected folder path: ${path}`);
    });

    jest.doMock('cloudinary', () => ({
      v2: {
        config: jest.fn(),
        api: {
          sub_folders: mockSubFolders,
        },
      },
    }));

    const { listTokenFolderTree: actualListTokenFolderTree } = jest.requireActual(
      '../utils/cloudinary'
    );

    await actualListTokenFolderTree({});

    expect(mockSubFolders).toHaveBeenCalledTimes(5);
    expect(new Set(callOrder).size).toBe(callOrder.length);
  });
});
jest.mock('../utils/socket', () => ({
  emitCombatUpdate: jest.fn(),
  emitEnemiesUpdate: jest.fn(),
  emitMapUpdate: jest.fn(),
}));
jest.mock('../utils/dnd5eApi', () => ({
  getMonsterByIndex: jest.fn(),
}));
jest.mock('../utils/monsters', () => ({
  buildEnemyRecord: jest.fn(),
}));
jest.mock('../utils/cloudinary', () => ({
  uploadMapImage: jest.fn(),
  deleteMapImage: jest.fn(),
  listTokenAssets: jest.fn(),
  listTokenFolderTree: jest.fn(),
  getTokenRootFolder: jest.fn(() => 'Tokens'),
  suggestEnemyFigurine: jest.fn(),
}));
const { emitCombatUpdate, emitEnemiesUpdate, emitMapUpdate } = require('../utils/socket');
const { getMonsterByIndex } = require('../utils/dnd5eApi');
const { buildEnemyRecord } = require('../utils/monsters');
const {
  uploadMapImage,
  deleteMapImage,
  listTokenAssets,
  listTokenFolderTree,
  getTokenRootFolder,
  suggestEnemyFigurine,
} = require('../utils/cloudinary');
const registerCampaignRoutes = require('../routes/campaigns');

const app = express();
app.use(express.json());
const router = express.Router();
router.use(async (req, res, next) => {
  try {
    req.db = await dbo();
    next();
  } catch (err) {
    next(err);
  }
});
registerCampaignRoutes(router);
app.use(router);
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = status === 500 ? 'Internal Server Error' : err.message;
  res.status(status).json({ message });
});

describe('Campaign routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dbo.mockReset();
    getMonsterByIndex.mockReset();
    buildEnemyRecord.mockReset();
    uploadMapImage.mockReset();
    deleteMapImage.mockReset();
    listTokenAssets.mockReset();
    listTokenFolderTree.mockReset();
    getTokenRootFolder.mockReset();
    suggestEnemyFigurine.mockReset();
    uploadMapImage.mockResolvedValue({
      secure_url:
        'https://res.cloudinary.com/demo/image/upload/v1729012354/maps/default.png',
      public_id: 'maps/default/map',
    });
    deleteMapImage.mockResolvedValue({ result: 'ok' });
    getTokenRootFolder.mockReturnValue('Tokens');
    suggestEnemyFigurine.mockResolvedValue(null);
    mockUser = { username: 'DM' };
  });

  test('create campaign success', async () => {
    const insertOne = jest.fn().mockResolvedValue({ acknowledged: true });
    dbo.mockResolvedValue({
      collection: () => ({
        insertOne,
      }),
    });
    const res = await request(app)
      .post('/campaigns/add')
      .send({ campaignName: 'Test', dm: 'DM' });
    expect(res.status).toBe(200);
    expect(res.body.acknowledged).toBe(true);
    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        players: [],
        maps: [],
        activeMapId: null,
        map: null,
        mapTokens: {},
        enemies: [],
        combat: { participants: [], activeTurn: null },
      })
    );
  });

  test('create campaign failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        insertOne: async () => { throw new Error('db error'); }
      })
    });
    const res = await request(app)
      .post('/campaigns/add')
      .send({ campaignName: 'Test', dm: 'DM' });
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Internal Server Error');
  });

  test('get campaign by name success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({ campaignName: 'Test', dm: 'DM', players: [] })
      })
    });
    const res = await request(app).get('/campaigns/Test');
    expect(res.status).toBe(200);
    expect(res.body.dm).toBe('DM');
    expect(res.body.combat).toEqual({ participants: [], activeTurn: null });
  });

  test('get campaign by name failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => { throw new Error('db error'); }
      })
    });
    const res = await request(app).get('/campaigns/Test');
    expect(res.status).toBe(500);
  });

  test('get campaigns by dm success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => [{ campaignName: 'Test', dm: 'DM' }] })
      })
    });
    const res = await request(app).get('/campaigns/dm/DM');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].combat).toEqual({ participants: [], activeTurn: null });
  });

  test('get campaigns by dm failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        find: () => ({ toArray: async () => { throw new Error('db error'); } })
      })
    });
    const res = await request(app).get('/campaigns/dm/DM');
    expect(res.status).toBe(500);
  });

  test('get campaign by dm and name success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({ campaignName: 'Test', dm: 'DM' })
      })
    });
    const res = await request(app).get('/campaigns/dm/DM/Test');
    expect(res.status).toBe(200);
    expect(res.body.campaignName).toBe('Test');
    expect(res.body.combat).toEqual({ participants: [], activeTurn: null });
  });

  test('get campaign by dm and name failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => { throw new Error('db error'); }
      })
    });
    const res = await request(app).get('/campaigns/dm/DM/Test');
    expect(res.status).toBe(500);
  });

  describe('map routes', () => {
    const baseMap = {
      title: 'Dungeon',
      summary: 'An underground lair',
      folder: 'Dungeons',
      imageUrl:
        'https://res.cloudinary.com/demo/image/upload/v1729012354/maps/base/dungeon.png',
      altText: 'Dungeon entrance map',
      cloudinaryPublicId: 'maps/base/dungeon-1111',
    };

    const storedMap = {
      ...baseMap,
      mapId: '11111111-1111-4111-8111-111111111111',
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    };

    const buildCampaignWithMap = (mapOverrides = {}, campaignOverrides = {}) => {
      const mapRecord = { ...storedMap, ...mapOverrides };
      const { mapTokens: overrideTokens, ...restCampaignOverrides } =
        campaignOverrides || {};
      return {
        campaignName: 'Test',
        dm: 'DM',
        maps: [mapRecord],
        activeMapId: mapRecord.mapId,
        map: mapRecord,
        mapTokens: overrideTokens !== undefined ? overrideTokens : {},
        ...restCampaignOverrides,
      };
    };

    test('get map success', async () => {
      const updateOne = jest.fn();
      dbo.mockResolvedValue({
        collection: () => ({
          findOne: async () => buildCampaignWithMap(),
          updateOne,
        }),
      });

    const res = await request(app).get('/campaigns/Test/map');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({ mapId: storedMap.mapId, folder: storedMap.folder })
    );
    expect(res.body.tokens).toEqual({});
  });

    test('get map missing campaign', async () => {
      dbo.mockResolvedValue({
        collection: () => ({
          findOne: async () => null,
        }),
      });

      const res = await request(app).get('/campaigns/Test/map');
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Campaign not found');
    });

    test('get map missing map', async () => {
      dbo.mockResolvedValue({
        collection: () => ({
          findOne: async () => ({
            campaignName: 'Test',
            dm: 'DM',
            maps: [],
            activeMapId: null,
            map: null,
          }),
          updateOne: jest.fn(),
        }),
      });

      const res = await request(app).get('/campaigns/Test/map');
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Map not found');
    });

    test('list maps success', async () => {
      dbo.mockResolvedValue({
        collection: () => ({
          findOne: async () => buildCampaignWithMap(),
          updateOne: jest.fn(),
        }),
      });

    const res = await request(app).get('/campaigns/Test/maps');
    expect(res.status).toBe(200);
    expect(res.body.activeMapId).toBe(storedMap.mapId);
    expect(res.body.map).toEqual(expect.objectContaining({ mapId: storedMap.mapId }));
    expect(res.body.map.tokens).toEqual({});
    expect(res.body.activeMapTokens).toEqual({});
    expect(res.body.tokensByMapId).toEqual({});
    expect(res.body.maps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mapId: storedMap.mapId, folder: storedMap.folder }),
      ])
    );
  });

    test('create map success', async () => {
      const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
      dbo.mockResolvedValue({
        collection: () => ({
          findOne: async () => ({
            campaignName: 'Test',
            dm: 'DM',
            maps: [],
            activeMapId: null,
            map: null,
          }),
          updateOne,
        }),
      });

      uploadMapImage.mockResolvedValueOnce({
        secure_url:
          'https://res.cloudinary.com/demo/image/upload/v1729012354/maps/new-map.png',
        public_id: 'maps/demo/new-map',
      });

      const incomingMap = {
        title: 'Dungeon',
        summary: 'An underground lair',
        imageBase64: 'QUJD',
        imageType: 'image/png',
        folder: 'Boss Lairs',
      };

      const res = await request(app)
        .post('/campaigns/Test/maps')
        .send({ map: incomingMap, prompt: 'Create a dungeon map' });

      expect(res.status).toBe(200);
      expect(res.body.activeMapId).toEqual(expect.any(String));
      expect(res.body.map).toEqual(
        expect.objectContaining({
          title: baseMap.title,
          originalPrompt: 'Create a dungeon map',
          mapId: res.body.activeMapId,
          folder: 'Boss Lairs',
          imageUrl:
            'https://res.cloudinary.com/demo/image/upload/v1729012354/maps/new-map.png',
          cloudinaryPublicId: 'maps/demo/new-map',
        })
      );
      expect(res.body.map.tokens).toEqual({});
      expect(res.body.activeMapTokens).toEqual({});
      expect(res.body.tokensByMapId).toEqual({});
      expect(res.body.maps).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            mapId: res.body.activeMapId,
            title: baseMap.title,
            folder: 'Boss Lairs',
          }),
        ])
      );
      expect(uploadMapImage).toHaveBeenCalledWith('data:image/png;base64,QUJD');
      const lastUpdate = updateOne.mock.calls[updateOne.mock.calls.length - 1]?.[1];
      expect(lastUpdate).toEqual(
        expect.objectContaining({
          $set: expect.objectContaining({
            activeMapId: res.body.activeMapId,
            map: expect.objectContaining({ mapId: res.body.activeMapId }),
            maps: expect.arrayContaining([
              expect.objectContaining({
                mapId: res.body.activeMapId,
                title: baseMap.title,
                folder: 'Boss Lairs',
              }),
            ]),
            mapTokens: {},
          }),
        })
      );
      expect(emitMapUpdate).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          activeMapId: res.body.activeMapId,
          map: expect.objectContaining({ mapId: res.body.activeMapId }),
          maps: expect.arrayContaining([
            expect.objectContaining({
              mapId: res.body.activeMapId,
              title: baseMap.title,
              folder: 'Boss Lairs',
            }),
          ]),
          tokensByMapId: {},
          activeMapTokens: {},
        })
      );
  });

    test('legacy map update success', async () => {
      const updatedAtBefore = '2023-01-02T00:00:00.000Z';
      const campaignDoc = buildCampaignWithMap({ updatedAt: updatedAtBefore });
      const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
      dbo.mockResolvedValue({
        collection: () => ({
          findOne: async () => campaignDoc,
          updateOne,
        }),
      });

      const res = await request(app)
        .put('/campaigns/Test/map')
        .send({ map: baseMap, prompt: 'Create a dungeon map' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          title: baseMap.title,
          originalPrompt: 'Create a dungeon map',
          mapId: storedMap.mapId,
          updatedAt: expect.any(String),
          tokens: {},
          folder: baseMap.folder,
        })
      );
      const lastUpdate = updateOne.mock.calls[updateOne.mock.calls.length - 1]?.[1];
      expect(lastUpdate).toEqual(
        expect.objectContaining({
          $set: expect.objectContaining({
            activeMapId: storedMap.mapId,
            map: expect.objectContaining({
              mapId: storedMap.mapId,
              originalPrompt: 'Create a dungeon map',
              folder: baseMap.folder,
            }),
            maps: expect.arrayContaining([
              expect.objectContaining({
                mapId: storedMap.mapId,
                title: baseMap.title,
                folder: baseMap.folder,
              }),
            ]),
            mapTokens: {},
          }),
        })
      );
      expect(emitMapUpdate).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          activeMapId: storedMap.mapId,
          map: expect.objectContaining({ mapId: storedMap.mapId, folder: baseMap.folder }),
          tokensByMapId: {},
          activeMapTokens: {},
        })
      );
    });

    test('legacy map validation failure', async () => {
      dbo.mockResolvedValue({
        collection: () => ({
          findOne: async () => buildCampaignWithMap(),
          updateOne: jest.fn(),
        }),
      });

      const res = await request(app)
        .put('/campaigns/Test/map')
        .send({
          map: { title: 'Invalid map with no image' },
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBeDefined();
      expect(emitMapUpdate).not.toHaveBeenCalled();
    });

    test('legacy map forbidden for non-DM', async () => {
      mockUser = { username: 'Player' };
      dbo.mockResolvedValue({
        collection: () => ({
          findOne: async () => buildCampaignWithMap(),
          updateOne: jest.fn(),
        }),
      });

      const res = await request(app)
        .put('/campaigns/Test/map')
        .send({ map: baseMap });

      expect(res.status).toBe(403);
      expect(emitMapUpdate).not.toHaveBeenCalled();
    });

    test('legacy map missing campaign', async () => {
      dbo.mockResolvedValue({
        collection: () => ({
          findOne: async () => null,
        }),
      });

      const res = await request(app)
        .put('/campaigns/Test/map')
        .send({ map: baseMap });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Campaign not found');
    });

    test('activate map via patch', async () => {
      const secondaryMap = {
        ...storedMap,
        mapId: '22222222-2222-4222-8222-222222222222',
        title: 'Forest',
      };
      const campaignDoc = {
        campaignName: 'Test',
        dm: 'DM',
        maps: [storedMap, secondaryMap],
        activeMapId: storedMap.mapId,
        map: storedMap,
      };
      const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
      dbo.mockResolvedValue({
        collection: () => ({
          findOne: async () => campaignDoc,
          updateOne,
        }),
      });

      const res = await request(app)
        .patch(`/campaigns/Test/maps/${secondaryMap.mapId}`)
        .send({ active: true });

      expect(res.status).toBe(200);
      expect(res.body.activeMapId).toBe(secondaryMap.mapId);
      expect(res.body.map).toEqual(
        expect.objectContaining({
          mapId: secondaryMap.mapId,
          title: secondaryMap.title,
          folder: secondaryMap.folder,
        })
      );
      expect(res.body.map.tokens).toEqual({});
      expect(res.body.activeMapTokens).toEqual({});
      expect(res.body.tokensByMapId).toEqual({});
      expect(emitMapUpdate).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          activeMapId: secondaryMap.mapId,
          activeMapTokens: {},
          tokensByMapId: {},
        })
      );
    });

    test('update map uploads new assets when provided', async () => {
      const campaignDoc = buildCampaignWithMap();
      const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
      dbo.mockResolvedValue({
        collection: () => ({
          findOne: async () => campaignDoc,
          updateOne,
        }),
      });

      uploadMapImage.mockResolvedValueOnce({
        secure_url:
          'https://res.cloudinary.com/demo/image/upload/v1729012354/maps/updated-map.png',
        public_id: 'maps/demo/updated-map',
      });

      const res = await request(app)
        .patch(`/campaigns/Test/maps/${storedMap.mapId}`)
        .send({
          map: {
            title: 'Updated Dungeon',
            imageBase64: 'Rk9P',
            imageType: 'image/jpeg',
          },
          prompt: 'Updated map prompt',
        });

      expect(res.status).toBe(200);
      expect(uploadMapImage).toHaveBeenCalledWith('data:image/jpeg;base64,Rk9P');
      expect(res.body.maps).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            mapId: storedMap.mapId,
            title: 'Updated Dungeon',
            imageUrl:
              'https://res.cloudinary.com/demo/image/upload/v1729012354/maps/updated-map.png',
            cloudinaryPublicId: 'maps/demo/updated-map',
            folder: storedMap.folder,
          }),
        ])
      );
      expect(res.body.map).toEqual(
        expect.objectContaining({
          mapId: storedMap.mapId,
          title: 'Updated Dungeon',
          originalPrompt: 'Updated map prompt',
          cloudinaryPublicId: 'maps/demo/updated-map',
          folder: storedMap.folder,
        })
      );
    });

    test('delete map success', async () => {
      const secondaryMap = {
        ...storedMap,
        mapId: '22222222-2222-4222-8222-222222222222',
        title: 'Forest',
        cloudinaryPublicId: 'maps/forest/secondary-map',
      };
      const campaignDoc = {
        campaignName: 'Test',
        dm: 'DM',
        maps: [storedMap, secondaryMap],
        activeMapId: secondaryMap.mapId,
        map: secondaryMap,
      };
      const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
      dbo.mockResolvedValue({
        collection: () => ({
          findOne: async () => campaignDoc,
          updateOne,
        }),
      });

      const res = await request(app).delete(`/campaigns/Test/maps/${secondaryMap.mapId}`);

      expect(res.status).toBe(200);
      expect(res.body.activeMapId).toBe(storedMap.mapId);
      expect(res.body.map).toEqual(
        expect.objectContaining({
          mapId: storedMap.mapId,
          title: storedMap.title,
          cloudinaryPublicId: storedMap.cloudinaryPublicId,
          folder: storedMap.folder,
        })
      );
      expect(res.body.map.tokens).toEqual({});
      expect(res.body.activeMapTokens).toEqual({});
      expect(res.body.tokensByMapId).toEqual({});
      expect(res.body.maps).toHaveLength(1);
      expect(res.body.maps[0]).toEqual(
        expect.objectContaining({ folder: storedMap.folder })
      );
      expect(deleteMapImage).toHaveBeenCalledTimes(1);
      expect(deleteMapImage).toHaveBeenCalledWith('maps/forest/secondary-map');
      expect(emitMapUpdate).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          activeMapId: storedMap.mapId,
          activeMapTokens: {},
          tokensByMapId: {},
        })
      );
    });

    test('delete map tolerates Cloudinary deletion failures', async () => {
      deleteMapImage.mockRejectedValueOnce(new Error('Delete failed'));
      const secondaryMap = {
        ...storedMap,
        mapId: '33333333-3333-4333-8333-333333333333',
        title: 'Cavern',
        cloudinaryPublicId: 'maps/cavern/secondary-map',
      };
      const campaignDoc = {
        campaignName: 'Test',
        dm: 'DM',
        maps: [storedMap, secondaryMap],
        activeMapId: secondaryMap.mapId,
        map: secondaryMap,
      };
      const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
      dbo.mockResolvedValue({
        collection: () => ({
          findOne: async () => campaignDoc,
          updateOne,
        }),
      });

      const res = await request(app).delete(`/campaigns/Test/maps/${secondaryMap.mapId}`);

      expect(res.status).toBe(200);
      expect(res.body.activeMapId).toBe(storedMap.mapId);
      expect(res.body.map).toEqual(
        expect.objectContaining({ folder: storedMap.folder })
      );
      expect(deleteMapImage).toHaveBeenCalledWith('maps/cavern/secondary-map');
      expect(emitMapUpdate).toHaveBeenCalled();
    });

    test('delete map derives Cloudinary public id from URL when available', async () => {
      const secondaryMap = {
        ...storedMap,
        mapId: '44444444-4444-4444-8444-444444444444',
        title: 'Citadel',
        imageUrl:
          'https://res.cloudinary.com/demo/image/upload/v1729012354/maps/test-citadel.png',
      };
      delete secondaryMap.cloudinaryPublicId;
      const campaignDoc = {
        campaignName: 'Test',
        dm: 'DM',
        maps: [storedMap, secondaryMap],
        activeMapId: secondaryMap.mapId,
        map: secondaryMap,
      };
      const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
      dbo.mockResolvedValue({
        collection: () => ({
          findOne: async () => campaignDoc,
          updateOne,
        }),
      });

      const res = await request(app).delete(`/campaigns/Test/maps/${secondaryMap.mapId}`);

      expect(res.status).toBe(200);
      expect(res.body.map).toEqual(expect.objectContaining({ folder: storedMap.folder }));
      expect(deleteMapImage).toHaveBeenCalledWith('maps/test-citadel');
      expect(emitMapUpdate).toHaveBeenCalled();
    });

    test('update map token success as DM', async () => {
      const existingToken = {
        characterId: 'hero-1',
        x: 0.25,
        y: 0.75,
        updatedAt: '2023-01-01T00:00:00.000Z',
        imageUrl: ' https://example.com/figurines/hero.png ',
        cloudinaryPublicId: ' figurines/heroes/hero-1 ',
        folder: '   ',
      };
      const campaignDoc = buildCampaignWithMap({}, {
        mapTokens: {
          [storedMap.mapId]: {
            'hero-1': existingToken,
          },
        },
      });
      const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
      dbo.mockResolvedValue({
        collection: (name) => {
          if (name === 'Campaigns') {
            return {
              findOne: async () => campaignDoc,
              updateOne,
            };
          }
          if (name === 'Characters') {
            return { findOne: jest.fn() };
          }
          return {};
        },
      });

      const res = await request(app)
        .put(`/campaigns/Test/maps/${storedMap.mapId}/tokens/hero-1`)
        .send({ x: 1.5, y: -0.25 });

      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('map');
      expect(res.body).not.toHaveProperty('maps');
      expect(res.body).toHaveProperty('activeMapId', storedMap.mapId);
      const updatedToken =
        res.body.tokensByMapId?.[storedMap.mapId]?.['hero-1'];
      expect(updatedToken).toBeDefined();
      expect(updatedToken).toEqual(
        expect.objectContaining({
          characterId: 'hero-1',
          x: 1,
          y: 0,
          imageUrl: 'https://example.com/figurines/hero.png',
          cloudinaryPublicId: 'figurines/heroes/hero-1',
        })
      );
      expect(typeof updatedToken.updatedAt).toBe('string');
      expect(updatedToken).not.toHaveProperty('folder');

      const activeToken = res.body.activeMapTokens?.['hero-1'];
      expect(activeToken).toBeDefined();
      expect(activeToken).toEqual(
        expect.objectContaining({
          x: 1,
          y: 0,
          imageUrl: 'https://example.com/figurines/hero.png',
          cloudinaryPublicId: 'figurines/heroes/hero-1',
        })
      );
      expect(activeToken).not.toHaveProperty('folder');
      const lastUpdateCall =
        updateOne.mock.calls[updateOne.mock.calls.length - 1];
      expect(lastUpdateCall[0]).toEqual({ campaignName: 'Test' });
      const updateDoc = lastUpdateCall[1];
      expect(updateDoc).toEqual(
        expect.objectContaining({
          $set: expect.any(Object),
        })
      );
      expect(updateDoc.$set).toEqual(
        expect.objectContaining({
          mapTokens: {
            [storedMap.mapId]: expect.objectContaining({
              'hero-1': expect.objectContaining({
                x: 1,
                y: 0,
                imageUrl: 'https://example.com/figurines/hero.png',
                cloudinaryPublicId: 'figurines/heroes/hero-1',
              }),
            }),
          },
          'map.tokens': expect.objectContaining({
            'hero-1': expect.objectContaining({
              x: 1,
              y: 0,
              imageUrl: 'https://example.com/figurines/hero.png',
              cloudinaryPublicId: 'figurines/heroes/hero-1',
            }),
          }),
        })
      );
      expect(updateDoc.$set).not.toHaveProperty('map');
      expect(updateDoc.$set).not.toHaveProperty('maps');
      expect(emitMapUpdate).toHaveBeenCalledWith('Test', expect.any(Object));
      const emittedPayload = emitMapUpdate.mock.calls[0][1];
      expect(Object.keys(emittedPayload).sort()).toEqual(
        ['activeMapId', 'activeMapTokens', 'tokensByMapId'].sort()
      );
      expect(emittedPayload.tokensByMapId).toEqual(
        expect.objectContaining({
          [storedMap.mapId]: expect.objectContaining({
            'hero-1': expect.objectContaining({
              x: 1,
              y: 0,
              imageUrl: 'https://example.com/figurines/hero.png',
              cloudinaryPublicId: 'figurines/heroes/hero-1',
            }),
          }),
        })
      );
      expect(emittedPayload.activeMapTokens).toEqual(
        expect.objectContaining({
          'hero-1': expect.objectContaining({
            x: 1,
            y: 0,
            imageUrl: 'https://example.com/figurines/hero.png',
            cloudinaryPublicId: 'figurines/heroes/hero-1',
          }),
        })
      );
    });

    test('update map token persists rotation when provided', async () => {
      const existingToken = {
        characterId: 'hero-1',
        x: 0.2,
        y: 0.4,
        rotation: 45,
      };
      const campaignDoc = buildCampaignWithMap({}, {
        mapTokens: {
          [storedMap.mapId]: {
            'hero-1': existingToken,
          },
        },
      });
      const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
      dbo.mockResolvedValue({
        collection: (name) => {
          if (name === 'Campaigns') {
            return {
              findOne: async () => campaignDoc,
              updateOne,
            };
          }
          if (name === 'Characters') {
            return { findOne: jest.fn() };
          }
          return {};
        },
      });

      const res = await request(app)
        .put(`/campaigns/Test/maps/${storedMap.mapId}/tokens/hero-1`)
        .send({ x: 0.2, y: 0.4, rotation: -30 });

      expect(res.status).toBe(200);
      const updatedToken = res.body.tokensByMapId?.[storedMap.mapId]?.['hero-1'];
      expect(updatedToken).toBeDefined();
      expect(updatedToken).toEqual(
        expect.objectContaining({
          characterId: 'hero-1',
          x: 0.2,
          y: 0.4,
          rotation: 330,
        })
      );
      const emittedPayload = emitMapUpdate.mock.calls[emitMapUpdate.mock.calls.length - 1]?.[1];
      expect(emittedPayload?.tokensByMapId?.[storedMap.mapId]?.['hero-1']).toEqual(
        expect.objectContaining({ rotation: 330 })
      );
      const updateCall = updateOne.mock.calls[updateOne.mock.calls.length - 1];
      expect(updateCall?.[1]?.$set?.mapTokens?.[storedMap.mapId]?.['hero-1']).toEqual(
        expect.objectContaining({ rotation: 330 })
      );
      expect(updateCall?.[1]?.$set?.['map.tokens']?.['hero-1']).toEqual(
        expect.objectContaining({ rotation: 330 })
      );
    });

    test('update map token requires numeric coordinates', async () => {
      const campaignDoc = buildCampaignWithMap();
      dbo.mockResolvedValue({
        collection: (name) => {
          if (name === 'Campaigns') {
            return {
              findOne: async () => campaignDoc,
              updateOne: jest.fn(),
            };
          }
          if (name === 'Characters') {
            return { findOne: jest.fn() };
          }
          return {};
        },
      });

      const res = await request(app)
        .put(`/campaigns/Test/maps/${storedMap.mapId}/tokens/hero-1`)
        .send({ x: 'invalid', y: 0.2 });

      expect(res.status).toBe(400);
    });

    test('update map token success for character owner', async () => {
      mockUser = { username: 'PlayerOwner' };
      const campaignDoc = buildCampaignWithMap({}, { dm: 'DM' });
      const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
      const charactersFindOne = jest
        .fn()
        .mockResolvedValue({ token: 'PlayerOwner' });
      dbo.mockResolvedValue({
        collection: (name) => {
          if (name === 'Campaigns') {
            return {
              findOne: async () => campaignDoc,
              updateOne,
            };
          }
          if (name === 'Characters') {
            return { findOne: charactersFindOne };
          }
          return {};
        },
      });

      const res = await request(app)
        .put(`/campaigns/Test/maps/${storedMap.mapId}/tokens/hero-1`)
        .send({ x: 0.3, y: 0.7 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('activeMapId', storedMap.mapId);
      expect(res.body).not.toHaveProperty('map');
      expect(charactersFindOne).toHaveBeenCalled();
      expect(res.body.tokensByMapId[storedMap.mapId]['hero-1']).toEqual(
        expect.objectContaining({
          characterId: 'hero-1',
          x: 0.3,
          y: 0.7,
        })
      );
      expect(updateOne).toHaveBeenCalled();
    });

    test('update map token forbidden for non-owner', async () => {
      mockUser = { username: 'OtherPlayer' };
      const campaignDoc = buildCampaignWithMap({}, { dm: 'DM' });
      const campaignsUpdate = jest.fn();
      const charactersFindOne = jest.fn().mockResolvedValue({ token: 'PlayerOwner' });
      dbo.mockResolvedValue({
        collection: (name) => {
          if (name === 'Campaigns') {
            return {
              findOne: async () => campaignDoc,
              updateOne: campaignsUpdate,
            };
          }
          if (name === 'Characters') {
            return { findOne: charactersFindOne };
          }
          return {};
        },
      });

      const res = await request(app)
        .put(`/campaigns/Test/maps/${storedMap.mapId}/tokens/hero-1`)
        .send({ x: 0.4, y: 0.4 });

      expect(res.status).toBe(403);
      expect(charactersFindOne).toHaveBeenCalled();
      expect(campaignsUpdate).not.toHaveBeenCalled();
    });

    test('delete map token success', async () => {
      const heroToken = {
        characterId: 'hero-1',
        x: 0.25,
        y: 0.75,
        updatedAt: '2023-01-01T00:00:00.000Z',
        imageUrl: ' https://example.com/figurines/hero.png ',
        cloudinaryPublicId: null,
        folder: '   ',
      };
      const allyToken = {
        characterId: 'ally',
        x: 0.1,
        y: 0.2,
        updatedAt: '2023-01-01T00:00:00.000Z',
        imageUrl: ' https://example.com/figurines/ally.png ',
        cloudinaryPublicId: ' figurines/allies/ally ',
        folder: ' Allies ',
      };
      const campaignDoc = buildCampaignWithMap({}, {
        mapTokens: {
          [storedMap.mapId]: {
            'hero-1': heroToken,
            ally: allyToken,
          },
        },
      });
      const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
      dbo.mockResolvedValue({
        collection: (name) => {
          if (name === 'Campaigns') {
            return {
              findOne: async () => campaignDoc,
              updateOne,
            };
          }
          if (name === 'Characters') {
            return { findOne: jest.fn() };
          }
          return {};
        },
      });

      const res = await request(app).delete(
        `/campaigns/Test/maps/${storedMap.mapId}/tokens/hero-1`
      );

      expect(res.status).toBe(200);
      const expectedAlly = {
        characterId: 'ally',
        x: 0.1,
        y: 0.2,
        imageUrl: 'https://example.com/figurines/ally.png',
        cloudinaryPublicId: 'figurines/allies/ally',
        folder: 'Allies',
      };
      expect(res.body).toEqual({
        activeMapId: storedMap.mapId,
        tokensByMapId: {
          [storedMap.mapId]: {
            ally: expect.objectContaining(expectedAlly),
          },
        },
        activeMapTokens: {
          ally: expect.objectContaining(expectedAlly),
        },
      });
      expect(res.body.tokensByMapId[storedMap.mapId].ally.updatedAt).toEqual(
        expect.any(String)
      );
      const lastUpdateCall =
        updateOne.mock.calls[updateOne.mock.calls.length - 1];
      expect(lastUpdateCall[0]).toEqual({ campaignName: 'Test' });
      const updateDoc = lastUpdateCall[1];
      expect(updateDoc).toEqual(
        expect.objectContaining({
          $set: expect.any(Object),
        })
      );
      expect(updateDoc.$set).toEqual(
        expect.objectContaining({
          mapTokens: {
            [storedMap.mapId]: {
              ally: expect.objectContaining(expectedAlly),
            },
          },
          'map.tokens': {
            ally: expect.objectContaining(expectedAlly),
          },
        })
      );
      expect(updateDoc.$set).not.toHaveProperty('map');
      expect(updateDoc.$set).not.toHaveProperty('maps');
      expect(emitMapUpdate).toHaveBeenCalledWith(
        'Test',
        expect.objectContaining({
          tokensByMapId: {
            [storedMap.mapId]: {
              ally: expect.objectContaining(expectedAlly),
            },
          },
          activeMapTokens: {
            ally: expect.objectContaining(expectedAlly),
          },
        })
      );
    });

    test('delete map token missing entry returns 404', async () => {
      const campaignDoc = buildCampaignWithMap();
      dbo.mockResolvedValue({
        collection: (name) => {
          if (name === 'Campaigns') {
            return {
              findOne: async () => campaignDoc,
              updateOne: jest.fn(),
            };
          }
          if (name === 'Characters') {
            return { findOne: jest.fn() };
          }
          return {};
        },
      });

      const res = await request(app).delete(
        `/campaigns/Test/maps/${storedMap.mapId}/tokens/hero-1`
      );

      expect(res.status).toBe(404);
    });
  });

  test('get combat state success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({
          campaignName: 'Test',
          dm: 'DM',
          combat: {
            participants: [
              { characterId: 'char1', initiative: 15 },
              { characterId: 'char2', initiative: 12 },
            ],
            activeTurn: 1,
          },
        }),
      }),
    });

    const res = await request(app).get('/campaigns/Test/combat');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      participants: [
        { characterId: 'char1', initiative: 15 },
        { characterId: 'char2', initiative: 12 },
      ],
      activeTurn: 1,
    });
  });

  test('get combat state populates enemy display names', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({
          campaignName: 'Test',
          dm: 'DM',
          combat: {
            participants: [{ characterId: 'enemy-1', initiative: 8 }],
            activeTurn: 0,
          },
          enemies: [{ enemyId: 'enemy-1', name: 'Goblin' }],
        }),
      }),
    });

    const res = await request(app).get('/campaigns/Test/combat');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      participants: [
        { characterId: 'enemy-1', initiative: 8, displayName: 'Goblin' },
      ],
      activeTurn: 0,
    });
  });

  test('get combat state not found', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => null,
      }),
    });

    const res = await request(app).get('/campaigns/Unknown/combat');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Campaign not found');
  });

  test('update combat success', async () => {
    const findOne = jest.fn().mockResolvedValue({ campaignName: 'Test', dm: 'DM' });
    const updateOne = jest.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
    dbo.mockResolvedValue({
      collection: () => ({
        findOne,
        updateOne,
      }),
    });

    const res = await request(app)
      .put('/campaigns/Test/combat')
      .send({
        participants: [
          { characterId: 'char1', initiative: 15 },
          { characterId: 'char2', initiative: 12 },
        ],
        activeTurn: 0,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      participants: [
        { characterId: 'char1', initiative: 15 },
        { characterId: 'char2', initiative: 12 },
      ],
      activeTurn: 0,
    });
    expect(updateOne).toHaveBeenCalledWith(
      { campaignName: 'Test' },
      {
        $set: {
          combat: {
            participants: [
              { characterId: 'char1', initiative: 15 },
              { characterId: 'char2', initiative: 12 },
            ],
            activeTurn: 0,
          },
        },
      }
    );
    expect(emitCombatUpdate).toHaveBeenCalledWith('Test', {
      participants: [
        { characterId: 'char1', initiative: 15 },
        { characterId: 'char2', initiative: 12 },
      ],
      activeTurn: 0,
    });
  });

  test('update combat forbidden for non-DM', async () => {
    mockUser = { username: 'NotDM' };
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({ campaignName: 'Test', dm: 'DM' }),
      }),
    });

    const res = await request(app)
      .put('/campaigns/Test/combat')
      .send({ participants: [], activeTurn: null });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Forbidden');
  });

  test('update combat validation failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({ campaignName: 'Test', dm: 'DM' }),
      }),
    });

    const res = await request(app)
      .put('/campaigns/Test/combat')
      .send({ participants: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].param).toBe('participants');
  });

  test('get enemies success', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({ campaignName: 'Test', enemies: [{ enemyId: 'enemy-1', name: 'Goblin' }] }),
      }),
    });

    const res = await request(app).get('/campaigns/Test/enemies');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ enemyId: 'enemy-1', name: 'Goblin' }]);
  });

  test('add enemy success with suggested figurine', async () => {
    getMonsterByIndex.mockResolvedValue({ index: 'goblin', name: 'Goblin' });
    buildEnemyRecord.mockImplementation((monster, enemyId, providedName, extras) => ({
      enemyId,
      name: 'Goblin',
      providedName,
      ...extras,
    }));
    suggestEnemyFigurine.mockResolvedValue({
      figurineImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/Tokens/DM/goblin.png',
      figurineImagePublicId: 'Tokens/DM/goblin',
    });
    const findOneAndUpdate = jest.fn().mockImplementation(async (query, update) => ({
      value: {
        campaignName: 'Test',
        enemies: [update.$push.enemies],
      },
    }));
    dbo.mockResolvedValue({
      collection: () => ({
        findOneAndUpdate,
      }),
    });

    const res = await request(app)
      .post('/campaigns/Test/enemies')
      .send({ index: 'goblin' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Goblin');
    expect(typeof res.body.enemyId).toBe('string');
    expect(getMonsterByIndex).toHaveBeenCalledWith('goblin');
    expect(suggestEnemyFigurine).toHaveBeenCalledWith({ index: 'goblin', name: 'Goblin' });
    expect(buildEnemyRecord).toHaveBeenCalledWith(
      { index: 'goblin', name: 'Goblin' },
      res.body.enemyId,
      undefined,
      expect.objectContaining({
        figurineImagePublicId: 'Tokens/DM/goblin',
        figurineImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/Tokens/DM/goblin.png',
      })
    );
    const persistedEnemy = findOneAndUpdate.mock.calls[0][1].$push.enemies;
    expect(persistedEnemy).toEqual(
      expect.objectContaining({
        figurineImagePublicId: 'Tokens/DM/goblin',
        figurineImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/Tokens/DM/goblin.png',
      })
    );
    expect(res.body.figurineImageUrl).toBe(
      'https://res.cloudinary.com/demo/image/upload/v1/Tokens/DM/goblin.png'
    );
    expect(res.body.figurineImagePublicId).toBe('Tokens/DM/goblin');
    expect(emitEnemiesUpdate).toHaveBeenCalledWith(
      'Test',
      [
        expect.objectContaining({
          enemyId: res.body.enemyId,
          name: 'Goblin',
          figurineImagePublicId: 'Tokens/DM/goblin',
          figurineImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/Tokens/DM/goblin.png',
        }),
      ]
    );
  });

  test('add enemy success without suggested figurine fallback', async () => {
    getMonsterByIndex.mockResolvedValue({ index: 'skeleton', name: 'Skeleton' });
    suggestEnemyFigurine.mockResolvedValue(null);
    buildEnemyRecord.mockImplementation((monster, enemyId, providedName, extras) => ({
      enemyId,
      name: monster.name,
      providedName,
      ...extras,
    }));
    const findOneAndUpdate = jest.fn().mockImplementation(async (query, update) => ({
      value: {
        campaignName: 'Test',
        enemies: [update.$push.enemies],
      },
    }));
    dbo.mockResolvedValue({
      collection: () => ({
        findOneAndUpdate,
      }),
    });

    const res = await request(app)
      .post('/campaigns/Test/enemies')
      .send({ index: 'skeleton' });

    expect(res.status).toBe(200);
    expect(suggestEnemyFigurine).toHaveBeenCalledWith({ index: 'skeleton', name: 'Skeleton' });
    expect(buildEnemyRecord).toHaveBeenCalledWith(
      { index: 'skeleton', name: 'Skeleton' },
      res.body.enemyId,
      undefined,
      expect.objectContaining({ figurineImagePublicId: null, figurineImageUrl: null })
    );
    expect(res.body.figurineImageUrl).toBeNull();
    expect(res.body.figurineImagePublicId).toBeNull();
  });

  test('delete enemy success', async () => {
    const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
    const campaign = {
      campaignName: 'Test',
      enemies: [{ enemyId: 'enemy-1', name: 'Goblin' }],
      combat: {
        participants: [
          { characterId: 'enemy-1', initiative: 14 },
          { characterId: 'char-1', initiative: 12 },
        ],
        activeTurn: 0,
      },
    };
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => campaign,
        updateOne,
      }),
    });

    const res = await request(app).delete('/campaigns/Test/enemies/enemy-1');
    expect(res.status).toBe(200);
    expect(updateOne).toHaveBeenCalledWith(
      { campaignName: 'Test' },
      {
        $set: {
          enemies: [],
          combat: { participants: [{ characterId: 'char-1', initiative: 12 }], activeTurn: 0 },
        },
      }
    );
    expect(emitEnemiesUpdate).toHaveBeenCalledWith('Test', []);
    expect(emitCombatUpdate).toHaveBeenCalledWith('Test', {
      participants: [{ characterId: 'char-1', initiative: 12 }],
      activeTurn: 0,
    });
    expect(res.body.success).toBe(true);
  });

  test('update enemy health success', async () => {
    const updateOne = jest.fn().mockResolvedValue({ acknowledged: true });
    const campaign = {
      campaignName: 'Test',
      enemies: [
        { enemyId: 'enemy-1', name: 'Goblin', hitPoints: 30, currentHp: 30 },
      ],
      combat: {
        participants: [{ characterId: 'enemy-1', initiative: 15 }],
        activeTurn: 0,
      },
    };

    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => campaign,
        updateOne,
      }),
    });

    const res = await request(app)
      .put('/campaigns/Test/enemies/enemy-1/health')
      .send({ currentHp: 12 });

    expect(res.status).toBe(200);
    expect(updateOne).toHaveBeenCalledWith(
      { campaignName: 'Test' },
      {
        $set: {
          enemies: [
            { enemyId: 'enemy-1', name: 'Goblin', hitPoints: 30, currentHp: 12 },
          ],
          combat: {
            participants: [
              {
                characterId: 'enemy-1',
                initiative: 15,
                displayName: 'Goblin',
                currentHp: 12,
                maxHp: 30,
              },
            ],
            activeTurn: 0,
          },
        },
      }
    );
    expect(res.body.enemy.currentHp).toBe(12);
    expect(emitEnemiesUpdate).toHaveBeenCalledWith(
      'Test',
      [expect.objectContaining({ enemyId: 'enemy-1', currentHp: 12 })]
    );
    expect(emitCombatUpdate).toHaveBeenCalledWith('Test', {
      participants: [
        {
          characterId: 'enemy-1',
          initiative: 15,
          displayName: 'Goblin',
          currentHp: 12,
          maxHp: 30,
        },
      ],
      activeTurn: 0,
    });
  });

  test('update enemy health validation failure', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({
          campaignName: 'Test',
          enemies: [{ enemyId: 'enemy-1', name: 'Goblin', hitPoints: 10 }],
          combat: { participants: [], activeTurn: null },
        }),
      }),
    });

    const res = await request(app)
      .put('/campaigns/Test/enemies/enemy-1/health')
      .send({ currentHp: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.message || res.body.errors?.[0]?.msg).toBeDefined();
  });

  test('update enemy health enemy not found', async () => {
    dbo.mockResolvedValue({
      collection: () => ({
        findOne: async () => ({
          campaignName: 'Test',
          enemies: [{ enemyId: 'enemy-2', name: 'Orc', hitPoints: 15 }],
          combat: { participants: [], activeTurn: null },
        }),
      }),
    });

    const res = await request(app)
      .put('/campaigns/Test/enemies/enemy-1/health')
      .send({ currentHp: 5 });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Enemy not found');
  });

  test('player can list Adventurers token folders', async () => {
    mockUser = { username: 'Player1' };

    const folderTree = {
      rootFolder: 'Tokens',
      folders: [],
      flatFolders: [],
    };

    const findOne = jest.fn().mockResolvedValue({ campaignName: 'Test', dm: 'DM' });
    dbo.mockResolvedValue({
      collection: (name) => {
        if (name === 'Campaigns') {
          return { findOne };
        }
        throw new Error(`Unexpected collection ${name}`);
      },
    });

    listTokenFolderTree.mockResolvedValue(folderTree);

    const res = await request(app).get(
      '/campaigns/Test/token-folders?folders=Tokens/Adventurers/Heroes,Tokens/DM'
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual(folderTree);
    expect(listTokenFolderTree).toHaveBeenCalledWith({
      folders: ['Tokens/Adventurers/Heroes'],
    });
  });

  test('player token manifest is limited to Adventurers folders', async () => {
    mockUser = { username: 'Player1' };

    const findOne = jest.fn().mockResolvedValue({ campaignName: 'Test', dm: 'DM' });
    dbo.mockResolvedValue({
      collection: (name) => {
        if (name === 'Campaigns') {
          return { findOne };
        }
        throw new Error(`Unexpected collection ${name}`);
      },
    });

    listTokenAssets.mockResolvedValueOnce({
      assets: [],
      nextCursor: null,
      totalCount: 0,
      appliedFolders: ['Tokens/Adventurers'],
      rootFolder: 'Tokens',
    });

    const res = await request(app).get('/campaigns/Test/token-manifest');

    expect(res.status).toBe(200);
    expect(listTokenAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        folders: ['Tokens/Adventurers'],
        nextCursor: null,
      })
    );
    expect(res.body.isDm).toBe(false);
    expect(res.body.defaultPlayerFolders).toEqual(['Adventurers']);

    listTokenAssets.mockClear();
    listTokenAssets.mockResolvedValueOnce({
      assets: [],
      nextCursor: null,
      totalCount: 0,
      appliedFolders: ['Tokens/Adventurers/Heroes'],
      rootFolder: 'Tokens',
    });

    const resWithFilter = await request(app).get(
      '/campaigns/Test/token-manifest?folders=Tokens/Adventurers/Heroes,Tokens/DM'
    );

    expect(resWithFilter.status).toBe(200);
    expect(listTokenAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        folders: ['Tokens/Adventurers/Heroes'],
        nextCursor: null,
      })
    );
    expect(resWithFilter.body.appliedFolders).toEqual(['Tokens/Adventurers/Heroes']);
  });

  test('returns an error when token manifest retrieval fails', async () => {
    mockUser = { username: 'Player1' };

    const findOne = jest.fn().mockResolvedValue({ campaignName: 'Test', dm: 'DM' });
    dbo.mockResolvedValue({
      collection: (name) => {
        if (name === 'Campaigns') {
          return { findOne };
        }
        throw new Error(`Unexpected collection ${name}`);
      },
    });

    const rateLimitError = new Error('Rate limit exceeded');
    rateLimitError.http_code = 429;

    listTokenAssets.mockRejectedValueOnce(rateLimitError);

    const res = await request(app).get('/campaigns/Test/token-manifest');

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      message: 'Failed to load token manifest.',
      details: 'Rate limit exceeded',
    });
  });
});
