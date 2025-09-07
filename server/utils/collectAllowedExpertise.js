const { skillNames } = require('../routes/fieldConstants');
const collectAllowedSkills = require('./collectAllowedSkills');

/**
 * Collect allowed skills for applying expertise based on class features,
 * feats, race, and background. If a class grants expertise slots (e.g.,
 * Rogue or Bard), all skills become eligible. Otherwise only explicit
 * expertise grants or options from feats/race/background are included.
 *
 * @param {Array} occupation
 * @param {Array} feat
 * @param {Object} race
 * @param {Object} background
 * @returns {string[]}
 */
function collectAllowedExpertise(occupation = [], feat = [], race, background) {
  const allowed = new Set();
  let classGrantsExpertise = false;

  if (Array.isArray(occupation)) {
    occupation.forEach((occ) => {
      const name = (
        typeof occ.Occupation === 'string'
          ? occ.Occupation
          : typeof occ.Name === 'string'
          ? occ.Name
          : ''
      ).toLowerCase();
      const level = occ.Level || occ.level || 0;
      if (name === 'rogue' && level >= 1) classGrantsExpertise = true;
      if (name === 'bard' && level >= 3) classGrantsExpertise = true;
      if (occ?.skills && typeof occ.skills === 'object') {
        Object.keys(occ.skills).forEach((sk) => {
          if (occ.skills[sk]?.expertise) allowed.add(sk);
        });
      }
    });
  }

  if (Array.isArray(feat)) {
    feat.forEach((ft) => {
      if (Array.isArray(ft?.expertiseOptions)) {
        ft.expertiseOptions.forEach((sk) => allowed.add(sk));
      }
      if (ft?.skills && typeof ft.skills === 'object') {
        Object.keys(ft.skills).forEach((sk) => {
          if (ft.skills[sk]?.expertise) allowed.add(sk);
        });
      }
    });
  }

  if (race && typeof race === 'object') {
    if (race.skills && typeof race.skills === 'object') {
      Object.keys(race.skills).forEach((sk) => {
        if (race.skills[sk]?.expertise) allowed.add(sk);
      });
    }
    if (Array.isArray(race.expertiseChoices?.options)) {
      race.expertiseChoices.options.forEach((sk) => allowed.add(sk));
    }
  }

  if (background && typeof background === 'object') {
    if (background.skills && typeof background.skills === 'object') {
      Object.keys(background.skills).forEach((sk) => {
        if (background.skills[sk]?.expertise) allowed.add(sk);
      });
    }
    if (Array.isArray(background.expertiseChoices)) {
      background.expertiseChoices.forEach((sk) => allowed.add(sk));
    }
  }

  if (classGrantsExpertise) {
    skillNames.forEach((sk) => allowed.add(sk));
  }

  // ensure any skill already allowed for proficiency is also considered
  collectAllowedSkills(occupation, feat, race, background).forEach((sk) =>
    allowed.add(sk)
  );

  return Array.from(allowed);
}

module.exports = collectAllowedExpertise;
