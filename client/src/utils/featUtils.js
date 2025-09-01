export function calculateFeatPointsLeft(occupations = [], feats = []) {
  const thresholds = [4, 8, 12, 16, 19];
  const totalSlots = (Array.isArray(occupations) ? occupations : []).reduce(
    (total, occ) => {
      const level = Number(occ.Level) || 0;
      const name = occ.Name || occ.Occupation || '';
      let count = thresholds.filter((t) => level >= t).length;
      if (name === 'Fighter') {
        if (level >= 6) count += 1;
        if (level >= 14) count += 1;
      }
      if (name === 'Rogue' && level >= 10) {
        count += 1;
      }
      return total + count;
    },
    0
  );
  const activeFeats = Array.isArray(feats)
    ? feats.filter((f) => f.featName && f.featName !== '').length
    : 0;
  return totalSlots - activeFeats;
}
