export const mergeTokenPayload = ({
  incomingTokensByMapId = {},
  incomingActiveMapTokens = {},
  incomingActiveMapId = null,
  previousActiveMapId = null,
  previousCampaignMap = null,
  previousMapTokens = {},
} = {}) => {
  const normalizedIncomingActiveId =
    typeof incomingActiveMapId === 'string' && incomingActiveMapId.trim() !== ''
      ? incomingActiveMapId.trim()
      : null;

  const normalizedPreviousActiveId =
    typeof previousActiveMapId === 'string' && previousActiveMapId.trim() !== ''
      ? previousActiveMapId.trim()
      : null;

  const nextActiveMapId = normalizedIncomingActiveId || normalizedPreviousActiveId || null;

  const nextTokensByMapId = Object.entries(incomingTokensByMapId || {}).reduce(
    (acc, [mapId, tokens]) => {
      if (typeof mapId !== 'string' || mapId.trim() === '') {
        return acc;
      }

      const trimmedId = mapId.trim();
      if (!tokens || typeof tokens !== 'object') {
        acc[trimmedId] = {};
        return acc;
      }

      acc[trimmedId] = Object.entries(tokens).reduce((tokenAcc, [tokenId, tokenValue]) => {
        if (!tokenValue || typeof tokenValue !== 'object') {
          return tokenAcc;
        }

        const normalizedTokenId =
          typeof tokenValue.characterId === 'string' && tokenValue.characterId.trim() !== ''
            ? tokenValue.characterId.trim()
            : typeof tokenId === 'string' && tokenId.trim() !== ''
              ? tokenId.trim()
              : null;

        if (!normalizedTokenId) {
          return tokenAcc;
        }

        tokenAcc[normalizedTokenId] = { ...tokenValue, characterId: normalizedTokenId };
        return tokenAcc;
      }, {});

      return acc;
    },
    {}
  );

  const resolvedPreviousTokens =
    previousMapTokens && typeof previousMapTokens === 'object' ? previousMapTokens : {};

  const mergedTokensByMapId =
    Object.keys(nextTokensByMapId).length > 0 ? nextTokensByMapId : { ...resolvedPreviousTokens };

  const hasActiveTokensCandidate =
    incomingActiveMapTokens &&
    typeof incomingActiveMapTokens === 'object' &&
    !Array.isArray(incomingActiveMapTokens) &&
    Object.keys(incomingActiveMapTokens).length > 0;

  const activeTokensCandidate = hasActiveTokensCandidate ? incomingActiveMapTokens : null;

  const resolvedActiveTokens = activeTokensCandidate
    ? Object.entries(activeTokensCandidate).reduce((acc, [tokenId, tokenValue]) => {
        if (!tokenValue || typeof tokenValue !== 'object') {
          return acc;
        }

        const normalizedTokenId =
          typeof tokenValue.characterId === 'string' && tokenValue.characterId.trim() !== ''
            ? tokenValue.characterId.trim()
            : typeof tokenId === 'string' && tokenId.trim() !== ''
              ? tokenId.trim()
              : null;

        if (!normalizedTokenId) {
          return acc;
        }

        acc[normalizedTokenId] = { ...tokenValue, characterId: normalizedTokenId };
        return acc;
      }, {})
    : nextActiveMapId && mergedTokensByMapId[nextActiveMapId]
      ? { ...mergedTokensByMapId[nextActiveMapId] }
      : {};

  const nextCampaignMap =
    previousCampaignMap && typeof previousCampaignMap === 'object'
      ? previousCampaignMap.mapId && previousCampaignMap.mapId === nextActiveMapId
        ? { ...previousCampaignMap, tokens: resolvedActiveTokens }
        : previousCampaignMap
      : null;

  return {
    activeMapId: nextActiveMapId,
    mapTokens: mergedTokensByMapId,
    activeMapTokens: resolvedActiveTokens,
    campaignMap: nextCampaignMap,
  };
};

export default mergeTokenPayload;
