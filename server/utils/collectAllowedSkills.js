const classes = require('../data/classes');

/**
 * Collect allowed skill names based on a character's occupations, feats, and race.
 * Includes all skill options provided by class proficiencies, feat skillOptions,
 * and race skillChoices, plus any explicit skills marked proficient or granting
 * expertise. Expertise implies proficiency, so any explicit expertise grants
 * are also considered allowed skills.
 * @param {Array} occupation
 * @param {Array} feat
 * @param {Object} race
 * @returns {string[]}
 */
function collectAllowedSkills(occupation = [], feat = [], race, background) {
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
          const info = occ.skills[sk];
          if (info?.proficient || info?.expertise) allowed.add(sk);
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
      if (Array.isArray(ft?.expertiseOptions)) {
        ft.expertiseOptions.forEach((sk) => allowed.add(sk));
      }
      if (ft?.skills && typeof ft.skills === 'object') {
        Object.keys(ft.skills).forEach((sk) => {
          const info = ft.skills[sk];
          if (info?.proficient) allowed.add(sk);
          if (info?.expertise) allowed.add(sk);
        });
      }
    });
  }

  // From race
  if (race && typeof race === 'object') {
    if (race.skills && typeof race.skills === 'object') {
      Object.keys(race.skills).forEach((sk) => {
        const info = race.skills[sk];
        if (info?.proficient || info?.expertise) allowed.add(sk);
      });
    }
    if (Array.isArray(race.skillChoices?.options)) {
      race.skillChoices.options.forEach((sk) => allowed.add(sk));
    }
    if (Array.isArray(race.expertiseChoices?.options)) {
      race.expertiseChoices.options.forEach((sk) => allowed.add(sk));
    }
  }

  // From background
  if (background && typeof background === 'object') {
    if (background.skills && typeof background.skills === 'object') {
      Object.keys(background.skills).forEach((sk) => {
        const info = background.skills[sk];
        if (info?.proficient || info?.expertise) allowed.add(sk);
      });
    }
    if (Array.isArray(background.toolProficiencies)) {
      background.toolProficiencies.forEach((tool) => allowed.add(tool));
    }
    if (Array.isArray(background.expertiseChoices)) {
      background.expertiseChoices.forEach((sk) => allowed.add(sk));
    }
  }

  return Array.from(allowed);
}

module.exports = collectAllowedSkills;
