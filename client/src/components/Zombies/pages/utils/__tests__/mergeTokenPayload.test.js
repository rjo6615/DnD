import { mergeTokenPayload } from "../mergeTokenPayload";

describe('mergeTokenPayload', () => {
  it('preserves existing map imagery while updating tokens', () => {
    const previousCampaignMap = {
      mapId: 'map-1',
      imageBase64: 'abc123',
      title: 'Test Map',
      tokens: {
        hero: { characterId: 'hero', x: 0.1, y: 0.2 },
      },
    };

    const result = mergeTokenPayload({
      incomingTokensByMapId: {
        'map-1': {
          hero: { characterId: 'hero', x: 0.3, y: 0.4 },
          rogue: { characterId: 'rogue', x: 0.5, y: 0.6 },
        },
      },
      incomingActiveMapTokens: {
        hero: { characterId: 'hero', x: 0.3, y: 0.4 },
        rogue: { characterId: 'rogue', x: 0.5, y: 0.6 },
      },
      incomingActiveMapId: 'map-1',
      previousActiveMapId: 'map-1',
      previousCampaignMap,
      previousMapTokens: {
        'map-1': previousCampaignMap.tokens,
      },
    });

    expect(result.campaignMap).not.toBeNull();
    expect(result.campaignMap).not.toBe(previousCampaignMap);
    expect(result.campaignMap.imageBase64).toBe('abc123');
    expect(result.campaignMap.tokens).toEqual({
      hero: { characterId: 'hero', x: 0.3, y: 0.4 },
      rogue: { characterId: 'rogue', x: 0.5, y: 0.6 },
    });
  });

  it('falls back to previous active map id when update omits it', () => {
    const result = mergeTokenPayload({
      incomingTokensByMapId: {
        'map-2': {
          cleric: { characterId: 'cleric', x: 0.7, y: 0.8 },
        },
      },
      previousActiveMapId: 'map-2',
      previousCampaignMap: { mapId: 'map-2', imageBase64: 'img', tokens: {} },
      previousMapTokens: {},
    });

    expect(result.activeMapId).toBe('map-2');
    expect(result.activeMapTokens).toEqual({
      cleric: { characterId: 'cleric', x: 0.7, y: 0.8 },
    });
  });
});
