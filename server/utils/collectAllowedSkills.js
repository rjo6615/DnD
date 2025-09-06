const classes = require('../data/classes');

/**
 * Collect allowed skill names based on a character's occupations, feats, and race.
 * Includes all skill options provided by class proficiencies, feat skillOptions,
 * and race skillChoices, plus any explicit skills marked proficient.
 * @param {Array} occupation
 * @param {Array} feat
 * @param {Object} race
 * @returns {string[]}
 */
function collectAllowedSkills(occupation = [], feat = [], race) {
  const allowed = new Set();

  // From class proficiencies
  if (Array.isArray(occupation)) {
    occupation.forEach((occ) => {
      const key = typeof occ.Occupation === 'string'
        ? occ.Occupation.toLowerCase()
        : typeof occ.Name === 'string'
        ? occ.Name.toLowerCase()
        : '';
      const classInfo = classes[key];
      if (classInfo?.proficiencies?.skills?.options) {
        classInfo.proficiencies.skills.options.forEach((sk) => allowed.add(sk));
      }
      if (occ?.skills && typeof occ.skills === 'object') {
        Object.keys(occ.skills).forEach((sk) => {
          if (occ.skills[sk]?.proficient) allowed.add(sk);
        });
      }
    });
  }

  // From feats
  if (Array.isArray(feat)) {
    feat.forEach((ft) => {
      if (Array.isArray(ft?.skillOptions)) {
        ft.skillOptions.forEach((sk) => allowed.add(sk));
      }
      if (ft?.skills && typeof ft.skills === 'object') {
        Object.keys(ft.skills).forEach((sk) => {
          if (ft.skills[sk]?.proficient) allowed.add(sk);
        });
      }
    });
  }

  // From race
  if (race && typeof race === 'object') {
    if (race.skills && typeof race.skills === 'object') {
      Object.keys(race.skills).forEach((sk) => {
        if (race.skills[sk]?.proficient) allowed.add(sk);
      });
    }
    if (Array.isArray(race.skillChoices?.options)) {
      race.skillChoices.options.forEach((sk) => allowed.add(sk));
    }
  }

  return Array.from(allowed);
}

module.exports = collectAllowedSkills;
