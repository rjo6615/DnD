import React, {
  useState,
  useEffect,
  useImperativeHandle,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { Button, Modal, Card, OverlayTrigger, Popover, Form } from "react-bootstrap";
import spellsData from '../../../data/spells';
import UpcastModal from './UpcastModal';
import sword from "../../../images/sword.png";
import proficiencyBonus from '../../../utils/proficiencyBonus';
import { normalizeEquipmentMap } from './equipmentNormalization';
import { normalizeWeapons } from './inventoryNormalization';
import weaponPropertyDefinitions from '../../../data/weaponProperties';
import { rollSkill } from './Skills';

// Dice rolling helper used by calculateDamage and component actions
function rollDice(numberOfDiceValue, sidesOfDiceValue) {
  if (numberOfDiceValue <= 0 || sidesOfDiceValue <= 0) {
    return "Both the number of dice and sides must be greater than zero.";
  }

  const results = [];
  for (let i = 0; i < numberOfDiceValue; i++) {
    // Generate a random number between 1 and sidesOfDiceValue (inclusive)
    const result = Math.floor(Math.random() * sidesOfDiceValue) + 1;
    results.push(result);
  }

  return results;
}

const DAMAGE_DIE_WIDTH_PX = 42;
const DAMAGE_DIE_SPREAD_FACTOR = 1.15;
const DAMAGE_AREA_BASE_RATIO = 0.42;
const DAMAGE_AREA_MAX_RATIO = 0.92;

function formatDamageRolls(rolls) {
  return rolls
    .map(({ value, type }) => `${value}${type ? ` ${type}` : ''}`)
    .join(' + ');
}


const WEAPON_SLOT_KEYS = ['mainHand', 'offHand', 'ranged'];
const HAND_SELECTIONS = {
  ONE_HANDED: 'one-handed',
  TWO_HANDED: 'two-handed',
};

const versatileRegex = /versatile\s*\(([^)]+)\)/i;
const firstDamageDiceRegex = /^(\s*)(\d+d\d+(?:[+-]\d+)?)/;
const anyDamageDiceRegex = /\d+d\d+(?:[+-]\d+)?/;

const spellsCatalog = spellsData || {};

const diceExpressionPattern = /\d+d\d+(?:\s*[+-]\s*\d+)?/gi;

function extractDiceExpression(description = '') {
  diceExpressionPattern.lastIndex = 0;
  let match;
  while ((match = diceExpressionPattern.exec(description))) {
    const raw = match[0];
    const sanitized = raw.replace(/\s+/g, '');
    const start = Math.max(0, match.index - 80);
    const end = Math.min(description.length, match.index + raw.length + 80);
    const contextWindow = description.slice(start, end).toLowerCase();

    if (contextWindow.includes('damage')) {
      return sanitized;
    }

    if (/(regains|heals|gains)[\s\S]{0,100}hit points/.test(contextWindow)) {
      return sanitized;
    }
  }
  return '';
}

function extractHigherLevels(description = '') {
  const match = description.match(/At Higher Levels?[:.]\s*([^]*)/i);
  return match ? match[1].trim() : undefined;
}

function extractScaling(description = '') {
  const level5 = description.match(/5th level \(([^)]+)\)/i);
  const level11 = description.match(/11th level \(([^)]+)\)/i);
  const level17 = description.match(/17th level \(([^)]+)\)/i);
  const scaling = {};
  if (level5) scaling[5] = level5[1].replace(/\s+/g, '');
  if (level11) scaling[11] = level11[1].replace(/\s+/g, '');
  if (level17) scaling[17] = level17[1].replace(/\s+/g, '');
  return Object.keys(scaling).length ? scaling : undefined;
}

function augmentSpell(spell = {}) {
  const enhanced = { ...spell };
  if (!enhanced.damage) {
    const dmg = extractDiceExpression(enhanced.description);
    if (dmg) enhanced.damage = dmg;
  }
  if (!enhanced.higherLevels) {
    const upcast = extractHigherLevels(enhanced.description);
    if (upcast) enhanced.higherLevels = upcast;
  }
  if (enhanced.level === 0 && !enhanced.scaling) {
    const scaling = extractScaling(enhanced.description);
    if (scaling) enhanced.scaling = scaling;
  }
  return enhanced;
}

const SPELLS_BY_NAME = Object.values(spellsCatalog).reduce((acc, spell) => {
  if (!spell || typeof spell.name !== 'string') return acc;
  acc[spell.name.toLowerCase()] = augmentSpell(spell);
  return acc;
}, {});

function parseSpellLevel(spellLevel) {
  if (typeof spellLevel !== 'string') return 0;
  const normalized = spellLevel.trim().toLowerCase();
  if (!normalized) return 0;
  if (normalized === 'cantrip') return 0;
  const match = normalized.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

const getVersatileDamageDice = (weapon) => {
  if (!Array.isArray(weapon?.properties)) return null;

  for (const property of weapon.properties) {
    if (typeof property !== 'string') continue;
    const match = property.match(versatileRegex);
    if (match) {
      const dice = match[1]?.trim();
      if (dice) {
        return dice;
      }
    }
  }

  return null;
};

function toTitleCase(str) {
  const small = new Set(['of', 'the']);
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) =>
      i !== 0 && small.has(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ');
}

export function calculateDamage(
  damageString,
  ability = 0,
  crit = false,
  roll = rollDice,
  extraDice,
  levelsAbove = 0
) {
  const parts = damageString.split(/\s+\+\s+/);
  const results = [];
  const diceRolls = [];

  const normalizeRollArray = (value, count) => {
    if (Array.isArray(value)) {
      return value.map((rollValue) =>
        typeof rollValue === 'number' ? rollValue : Number(rollValue) || 0
      );
    }
    if (typeof value === 'number') {
      return Array(count).fill(value);
    }
    return Array(count).fill(0);
  };

  const recordDiceRolls = (rollArray, sides, type, category) => {
    rollArray.forEach((value) => {
      diceRolls.push({ sides, value, type, category });
    });
  };

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    const [token, ...rest] = part.split(' ');
    const match = token.match(/^(\d+)(?:d(\d+)([+-]\d+)?)?$/);
    if (!match) {
      // eslint-disable-next-line no-console
      console.error('Invalid damage string');
      return null;
    }

    const type = rest.join(' ').trim();

    const abilityBonus = i === 0 ? ability : 0;

    if (!match[2]) {
      const baseValue = parseInt(match[1], 10) + abilityBonus;
      results.push({ value: baseValue, type });
      continue;
    }

    const numberOfDiceValue = parseInt(match[1], 10);
    const sidesOfDiceValue = parseInt(match[2], 10);
    const modifier = parseInt(match[3] || 0, 10);

    const baseRolls = normalizeRollArray(
      roll(numberOfDiceValue, sidesOfDiceValue),
      numberOfDiceValue
    );
    let damageSum = baseRolls.reduce((partialSum, a) => partialSum + a, 0);
    recordDiceRolls(baseRolls, sidesOfDiceValue, type, 'base');

    if (extraDice && levelsAbove > 0 && i === 0) {
      const totalExtra = extraDice.count * levelsAbove;
      if (totalExtra > 0) {
        const extraRolls = normalizeRollArray(
          roll(totalExtra, extraDice.sides),
          totalExtra
        );
        damageSum += extraRolls.reduce((partialSum, a) => partialSum + a, 0);
        recordDiceRolls(extraRolls, extraDice.sides, type, 'bonus');
      }
    }

    if (crit) {
      const critRolls = normalizeRollArray(
        roll(numberOfDiceValue, sidesOfDiceValue),
        numberOfDiceValue
      );
      damageSum += critRolls.reduce((partialSum, a) => partialSum + a, 0);
      recordDiceRolls(critRolls, sidesOfDiceValue, type, 'critical');
      if (extraDice && levelsAbove > 0 && i === 0) {
        const totalExtra = extraDice.count * levelsAbove;
        if (totalExtra > 0) {
          const critExtra = normalizeRollArray(
            roll(totalExtra, extraDice.sides),
            totalExtra
          );
          damageSum += critExtra.reduce((partialSum, a) => partialSum + a, 0);
          recordDiceRolls(critExtra, extraDice.sides, type, 'critical-bonus');
        }
      }
    }

    results.push({ value: damageSum + modifier + abilityBonus, type });
  }

  const total = results.reduce((sum, r) => sum + r.value, 0);
  return { total, breakdown: formatDamageRolls(results), diceRolls };
}

const PlayerTurnActions = React.forwardRef(
  (
    {
      form,
      strMod,
      dexMod,
      conMod = 0,
      onCastSpell,
      onPassTurn = () => {},
      canPassTurn = true,
      isPassTurnInProgress = false,
      availableSlots = { regular: {}, warlock: {} },
      longRestCount = 0,
      shortRestCount = 0,
    },
    ref
  ) => {
  // -----------------------------------------------------------Modal for attacks------------------------------------------------------------------------
  const [showAttack, setShowAttack] = useState(false);
  const handleCloseAttack = () => setShowAttack(false);
  const handleShowAttack = () => setShowAttack(true);

  const [footerHeight, setFooterHeight] = useState(0);

  useEffect(() => {
    const observed = new Map();
    let safeAreaProbe = null;

    const parseSize = (value) => {
      const parsed = parseFloat(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    const ensureSafeAreaProbe = () => {
      if (typeof document === 'undefined') {
        return null;
      }
      if (!safeAreaProbe) {
        safeAreaProbe = document.createElement('div');
        safeAreaProbe.setAttribute('data-safe-area-probe', 'true');
        safeAreaProbe.style.cssText =
          'position:fixed;bottom:0;left:0;height:0;pointer-events:none;visibility:hidden;padding-bottom:env(safe-area-inset-bottom, 0);';
        document.body.appendChild(safeAreaProbe);
      }
      return safeAreaProbe;
    };

    const getSafeAreaInsetBottom = () => {
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        return 0;
      }
      const probe = ensureSafeAreaProbe();
      if (!probe) {
        return 0;
      }
      return parseSize(getComputedStyle(probe).paddingBottom || '0');
    };

    const updateFooterHeight = () => {
      const slots = observed.get('slots')?.element;
      const navbar = observed.get('navbar')?.element;
      const slotsHeight = slots ? slots.getBoundingClientRect().height : 0;
      const navbarHeight = navbar ? navbar.getBoundingClientRect().height : 0;
      const slotsBottomOffset =
        slots && typeof window !== 'undefined'
          ? parseSize(getComputedStyle(slots).bottom || '0')
          : 0;
      const safeAreaInset = getSafeAreaInsetBottom();
      setFooterHeight(
        slotsHeight + navbarHeight + slotsBottomOffset + safeAreaInset
      );
    };

    const observeElement = (key, element) => {
      const current = observed.get(key);
      if (current?.element === element) {
        return;
      }

      current?.cleanup?.();

      if (!element) {
        observed.delete(key);
        updateFooterHeight();
        return;
      }

      const onChange = () => updateFooterHeight();
      let cleanup = () => {};

      if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(onChange);
        resizeObserver.observe(element);
        cleanup = () => resizeObserver.disconnect();
      } else if (typeof MutationObserver !== 'undefined') {
        const mutationObserver = new MutationObserver(onChange);
        mutationObserver.observe(element, {
          attributes: true,
          childList: true,
          subtree: true,
        });
        cleanup = () => mutationObserver.disconnect();
      }

      observed.set(key, { element, cleanup });
      updateFooterHeight();
    };

    const refreshElements = () => {
      observeElement('slots', document.querySelector('.spell-slot-container'));
      observeElement('navbar', document.querySelector('.navbar.fixed-bottom'));
    };

    refreshElements();

    let documentObserver;
    if (typeof MutationObserver !== 'undefined') {
      documentObserver = new MutationObserver(refreshElements);
      documentObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    window.addEventListener('resize', updateFooterHeight);

    return () => {
      observed.forEach(({ cleanup }) => cleanup());
      observed.clear();
      window.removeEventListener('resize', updateFooterHeight);
      documentObserver?.disconnect();
      safeAreaProbe?.remove();
      safeAreaProbe = null;
    };
  }, []);

//--------------------------------------------Critical status------------------------------------------------
const [isCritical, setIsCritical] = useState(false);
const [isFumble, setIsFumble] = useState(false);
const manualCriticalRef = useRef(false);
  const equipmentProvided = useMemo(
    () => typeof form?.equipment === 'object' && form.equipment !== null,
    [form.equipment]
  );
  const normalizedEquipment = useMemo(
    () => normalizeEquipmentMap(form.equipment),
    [form.equipment]
  );
  const equippedWeapons = useMemo(() => {
    if (equipmentProvided) {
      return WEAPON_SLOT_KEYS.map((slot) => {
        const weapon = normalizedEquipment[slot];
        if (!weapon) return null;
        if (weapon.source && weapon.source !== 'weapon') return null;
        const damage =
          typeof weapon.damage === 'string' ? weapon.damage.trim() : '';
        if (!damage) return null;
        return { slot, weapon };
      }).filter(Boolean);
    }

    const legacyWeapons = normalizeWeapons(form.weapon || [], {
      includeUnowned: true,
    });
    return legacyWeapons.map((weapon, index) => ({
      slot: `legacy-${index}`,
      weapon,
    }));
  }, [equipmentProvided, normalizedEquipment, form.weapon]);

  const [weaponAbilitySelections, setWeaponAbilitySelections] = useState({});
  const [weaponHandSelections, setWeaponHandSelections] = useState({});

  const numericStrMod = Number(strMod) || 0;
  const numericDexMod = Number(dexMod) || 0;

  const formatModifier = (value) => (value >= 0 ? `+${value}` : `${value}`);

  const isRangedWeapon = (weapon) => {
    const category = weapon?.category;
    return (
      typeof category === 'string' && category.toLowerCase().includes('ranged')
    );
  };

  const isFinesseWeapon = useCallback(
    (weapon) =>
      Array.isArray(weapon?.properties) &&
      weapon.properties.some(
        (prop) => typeof prop === 'string' && prop.toLowerCase().includes('finesse')
      ),
    []
  );

  const getAbilityKeyForWeapon = (slot, weapon) => {
    if (isFinesseWeapon(weapon)) {
      const stored = weaponAbilitySelections[slot];
      if (stored === 'str' || stored === 'dex') {
        return stored;
      }
      return numericDexMod >= numericStrMod ? 'dex' : 'str';
    }
    if (isRangedWeapon(weapon)) {
      return 'dex';
    }
    return 'str';
  };

  useEffect(() => {
    setWeaponAbilitySelections((prev) => {
      const next = {};
      equippedWeapons.forEach(({ slot, weapon }) => {
        if (isFinesseWeapon(weapon)) {
          const existing = prev[slot];
          if (existing === 'dex' || existing === 'str') {
            next[slot] = existing;
          }
        }
      });
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (
        prevKeys.length === nextKeys.length &&
        nextKeys.every((key) => prev[key] === next[key])
      ) {
        return prev;
      }
      return next;
    });
  }, [equippedWeapons, isFinesseWeapon]);

  useEffect(() => {
    setWeaponHandSelections({});
  }, [equippedWeapons]);
  // --------------------------------Breaks down weapon damage into useable numbers--------------------------------
  const abilityForWeapon = (weapon, slot) => {
    const key = getAbilityKeyForWeapon(slot, weapon);
    if (key === 'dex') return numericDexMod;
    if (key === 'str') return numericStrMod;
    return numericStrMod;
  };

  const formatWeaponLabel = (value) => {
    if (typeof value !== 'string') return 'Unknown';
    const normalized = value.replace(/[_-]+/g, ' ').trim();
    if (!normalized) return 'Unknown';
    return toTitleCase(normalized);
  };

  const getWeaponTypeLabel = (weapon) => {
    const raw = weapon?.type || weapon?.category;
    return formatWeaponLabel(raw || 'Unknown');
  };

  const getHandSelectionForWeapon = (slot, weapon) => {
    if (!getVersatileDamageDice(weapon)) {
      return HAND_SELECTIONS.ONE_HANDED;
    }
    const stored = weaponHandSelections[slot];
    if (stored === HAND_SELECTIONS.TWO_HANDED) {
      return HAND_SELECTIONS.TWO_HANDED;
    }
    return HAND_SELECTIONS.ONE_HANDED;
  };

  const getDamageStringForHandSelection = (
    slot,
    weapon,
    overrideHandSelection
  ) => {
    const baseDamage =
      typeof weapon?.damage === 'string' ? weapon.damage.trim() : '';
    if (!baseDamage) return '';

    const versatileDice = getVersatileDamageDice(weapon);
    if (!versatileDice) {
      return baseDamage;
    }

    const handSelection =
      overrideHandSelection ?? getHandSelectionForWeapon(slot, weapon);
    if (handSelection !== HAND_SELECTIONS.TWO_HANDED) {
      return baseDamage;
    }

    const match = baseDamage.match(firstDamageDiceRegex);
    if (!match) {
      const replaced = baseDamage.replace(anyDamageDiceRegex, versatileDice);
      if (replaced !== baseDamage) {
        return replaced;
      }
      return versatileDice;
    }

    const [, leading = ''] = match;
    return `${leading}${versatileDice}${baseDamage.slice(match[0].length)}`;
  };

  const getWeaponPropertyDefinitionKeys = (prop) => {
    if (typeof prop !== 'string') return [];

    const base = prop
      .replace(/\s*[\(\[\{][^\)\]\}]*[\)\]\}]\s*/g, ' ')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!base) return [];

    const titleCase = toTitleCase(base);
    const candidates = new Set([titleCase]);

    if (titleCase.includes(' ')) {
      candidates.add(titleCase.replace(/\s+/g, '-'));
    }

    if (!titleCase.endsWith(':')) {
      candidates.add(`${titleCase}:`);
    }

    return Array.from(candidates);
  };

  const getWeaponPropertyDetails = (weapon) => {
    if (!Array.isArray(weapon?.properties)) return [];
    return weapon.properties
      .filter((prop) => typeof prop === 'string' && prop.trim())
      .map((prop) => {
        const label = formatWeaponLabel(prop);
        const definitionKey = getWeaponPropertyDefinitionKeys(prop).find(
          (key) => weaponPropertyDefinitions[key]
        );
        const description = definitionKey
          ? weaponPropertyDefinitions[definitionKey]
          : 'Definition not available.';
        return { label, description };
      });
  };

  const totalLevel = useMemo(
    () =>
      Array.isArray(form.occupation)
        ? form.occupation.reduce((total, el) => total + Number(el.Level), 0)
        : 0,
    [form.occupation]
  );

  const { tieflingLegacy, tieflingLegacyKey } = useMemo(() => {
    const race = form?.race || {};
    const legacyFromForm =
      typeof form?.tieflingLegacy === 'object' ? form.tieflingLegacy : null;
    const legacyKeyFromForm =
      typeof form?.tieflingLegacyKey === 'string' ? form.tieflingLegacyKey : '';

    let legacy = legacyFromForm;
    let legacyKey = legacyKeyFromForm;

    if (!legacy) {
      if (legacyKey && race?.fiendishLegacies?.[legacyKey]) {
        legacy = race.fiendishLegacies[legacyKey];
      } else if (race?.selectedAncestry && race?.fiendishLegacies) {
        legacy = race.selectedAncestry;
        legacyKey =
          typeof race?.selectedAncestryKey === 'string'
            ? race.selectedAncestryKey
            : '';
      } else if (
        typeof race?.selectedAncestryKey === 'string' &&
        race?.fiendishLegacies?.[race.selectedAncestryKey]
      ) {
        legacy = race.fiendishLegacies[race.selectedAncestryKey];
        legacyKey = race.selectedAncestryKey;
      }
    }

    return { tieflingLegacy: legacy, tieflingLegacyKey: legacyKey };
  }, [form?.race, form?.tieflingLegacy, form?.tieflingLegacyKey]);

  const tieflingLegacyLabel = useMemo(() => {
    if (typeof tieflingLegacy?.label === 'string') {
      return tieflingLegacy.label;
    }
    if (typeof tieflingLegacy?.name === 'string') {
      return tieflingLegacy.name;
    }
    if (tieflingLegacyKey) {
      return toTitleCase(tieflingLegacyKey.replace(/[-_]/g, ' '));
    }
    return 'Fiendish Legacy';
  }, [tieflingLegacy, tieflingLegacyKey]);

  const fiendishLegacySpells = useMemo(() => {
    if (!tieflingLegacy) return [];
    const spells = Array.isArray(tieflingLegacy?.spells)
      ? tieflingLegacy.spells
      : [];

    return spells
      .map((legacySpell) => {
        const requiredLevelRaw = Number(legacySpell?.unlockedAtLevel);
        const requiredLevel = Number.isFinite(requiredLevelRaw)
          ? requiredLevelRaw
          : 1;
        if (totalLevel < Math.max(1, requiredLevel)) {
          return null;
        }

        const name =
          typeof legacySpell?.name === 'string' ? legacySpell.name.trim() : '';
        if (!name) return null;

        const catalogSpell = SPELLS_BY_NAME[name.toLowerCase()] || null;

        let damage = '';
        if (typeof legacySpell?.damage === 'string' && legacySpell.damage.trim()) {
          damage = legacySpell.damage.trim();
        } else if (catalogSpell?.damage) {
          damage = catalogSpell.damage;
        }

        if (!damage) return null;

        const level = Number.isFinite(catalogSpell?.level)
          ? catalogSpell.level
          : parseSpellLevel(legacySpell?.spellLevel);

        return {
          name: catalogSpell?.name || name,
          level: Number.isFinite(level) ? level : 0,
          damage,
          castingTime: catalogSpell?.castingTime || '',
          range: catalogSpell?.range || '',
          duration: catalogSpell?.duration || '',
          higherLevels: catalogSpell?.higherLevels,
          scaling: catalogSpell?.scaling,
          casterType: tieflingLegacyLabel,
        };
      })
      .filter(Boolean);
  }, [tieflingLegacy, tieflingLegacyLabel, totalLevel]);

  const profBonus =
    form.proficiencyBonus ?? proficiencyBonus(totalLevel);

  const dragonbornAncestry = useMemo(() => {
    const race = form?.race;
    if (!race) return null;
    const raceName = typeof race?.name === 'string' ? race.name.toLowerCase() : '';
    if (raceName !== 'dragonborn') return null;

    if (race.selectedAncestry) return race.selectedAncestry;

    if (race.selectedAncestryKey && race.dragonAncestries) {
      const selected = race.dragonAncestries[race.selectedAncestryKey];
      if (selected) return selected;
    }

    if (form?.dragonAncestry) return form.dragonAncestry;

    if (form?.dragonAncestryKey && race.dragonAncestries) {
      return race.dragonAncestries[form.dragonAncestryKey] || null;
    }

    return null;
  }, [form?.race, form?.dragonAncestry, form?.dragonAncestryKey]);

  const breathWeaponDetails = useMemo(() => {
    if (!dragonbornAncestry) return null;

    const diceCount =
      totalLevel >= 17 ? 4 : totalLevel >= 11 ? 3 : totalLevel >= 5 ? 2 : 1;
    const damageType = dragonbornAncestry.damageType || '';
    const damageString = `${diceCount}d10${damageType ? ` ${damageType}` : ''}`;
    const breathWeapon = dragonbornAncestry.breathWeapon || {};
    const numericConMod = Number(conMod) || 0;

    return {
      label: dragonbornAncestry.label || 'Breath Weapon',
      damageString,
      damageType,
      diceCount,
      saveDC: 8 + numericConMod + profBonus,
      shape: breathWeapon.shape,
      save: breathWeapon.save,
    };
  }, [dragonbornAncestry, conMod, profBonus, totalLevel]);

  const getAttackBonus = (slot, weapon) =>
    profBonus +
    abilityForWeapon(weapon, slot) +
    Number(weapon?.attackBonus ?? weapon?.bonus ?? 0);
    
  const normalizeDamageTypeForClass = (type) => {
    const trimmed = (type || '').trim();
    return trimmed ? trimmed.toLowerCase().replace(/\s+/g, '-') : '';
  };

  const formatDamageSegments = (damage, ability) =>
    damage
      .split(/\s+\+\s+/)
      .map((part, i, arr) => {
        const [token, ...rest] = part.trim().split(' ');
        const type = rest.join(' ').trim();
        const normalizedType = normalizeDamageTypeForClass(type);
        const displayType = type ? toTitleCase(type) : '';
        const showAbility = ability !== undefined && ability !== null && i === 0;
        return (
          <React.Fragment key={i}>
            <span className={normalizedType ? `damage-${normalizedType}` : ''}>
              {token}
              {showAbility ? `+${ability}` : ''}
              {displayType ? ` ${displayType}` : ''}
            </span>
            {i < arr.length - 1 ? ' + ' : ''}
          </React.Fragment>
        );
      });

  const getDamageString = (slot, weapon) => {
    const ability = abilityForWeapon(weapon, slot);
    const damageString = getDamageStringForHandSelection(slot, weapon);
    if (!damageString) return 'Unknown';
    return formatDamageSegments(damageString, ability);
  };

  const getWeaponDisplayName = (slot, weapon) => {
    if (weapon?.name && typeof weapon.name === 'string') {
      const trimmed = weapon.name.trim();
      if (trimmed) {
        return trimmed;
      }
    }

    if (typeof slot === 'string') {
      const normalized = slot
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]+/g, ' ')
        .trim();
      if (normalized) {
        return toTitleCase(normalized);
      }
    }

    return 'Attack';
  };

  const handleWeaponAttack = (slot, weapon) => {
    const ability = abilityForWeapon(weapon, slot);
    const damageString = getDamageStringForHandSelection(slot, weapon);
    if (typeof damageString !== 'string' || !damageString.trim()) return;
    const result = calculateDamage(damageString, ability, isCritical);
    if (!result) return;
    updateDamageValueWithAnimation(
      result.total,
      result.breakdown,
      weapon.name,
      { diceRolls: result.diceRolls }
    );
  };

  const handleWeaponAttackRoll = (slot, weapon) => {
    const rawBonus = Number(getAttackBonus(slot, weapon));
    const bonus = Number.isFinite(rawBonus) ? rawBonus : 0;
    const { result, d20 } = rollSkill(bonus);
    const weaponLabel = getWeaponDisplayName(slot, weapon);
    const segments = [`${d20} (d20)`];
    if (bonus) {
      const sign = bonus >= 0 ? '+' : '-';
      segments.push(`${sign} ${Math.abs(bonus)} Attack Bonus`);
    }

    window.dispatchEvent(
      new CustomEvent('damage-roll', {
        detail: {
          value: result,
          breakdown: segments.join(' '),
          source: `${weaponLabel} Attack Roll`,
          critical: d20 === 20,
          fumble: d20 === 1,
          diceRolls: [
            {
              sides: 20,
              value: d20,
              type: 'Attack Roll',
              category: 'base',
            },
          ],
        },
      })
    );
  };

  const handleBreathWeaponAttack = () => {
    if (!breathWeaponDetails) return;
    const result = calculateDamage(breathWeaponDetails.damageString, 0, false);
    if (!result) return;
    updateDamageValueWithAnimation(
      result.total,
      result.breakdown,
      'Breath Weapon',
      { diceRolls: result.diceRolls }
    );
  };

const [showUpcast, setShowUpcast] = useState(false);
const [pendingSpell, setPendingSpell] = useState(null);

  const applyUpcast = (spell, level, crit, slotType) => {
    const diff = level - (spell.level || 0);
    let extra;
    if (diff > 0 && spell.higherLevels) {
      const incMatch = spell.higherLevels.match(/(\d+)d(\d+)/);
      if (incMatch) {
        extra = {
          count: parseInt(incMatch[1], 10),
          sides: parseInt(incMatch[2], 10),
        };
      }
    }
    if (spell.scaling) {
      if (totalLevel >= 17 && spell.scaling[17]) spell.damage = spell.scaling[17];
      else if (totalLevel >= 11 && spell.scaling[11]) spell.damage = spell.scaling[11];
      else if (totalLevel >= 5 && spell.scaling[5]) spell.damage = spell.scaling[5];
    }
    const value = calculateDamage(
      spell.damage,
      0,
      crit || isCritical,
      rollDice,
      extra,
      diff > 0 ? diff : 0
    );
    if (!value) return;
    if (onCastSpell) {
      onCastSpell({
        level,
        slotType,
        damage: value.total,
        breakdown: value.breakdown,
        castingTime: spell.castingTime,
        name: spell.name,
      });
      return;
    }
    updateDamageValueWithAnimation(value.total, value.breakdown, spell.name, {
      diceRolls: value.diceRolls,
    });
  };

  const handleSpellsButtonClick = (spell, crit = false) => {
    if (!spell?.damage) return;
    if (spell.higherLevels) {
      setPendingSpell({ spell, crit: crit || isCritical });
      setShowUpcast(true);
      return;
    }
    applyUpcast(spell, spell.level, crit || isCritical);
  };

const handleDamageClick = useCallback(() => {
  setIsCritical((prev) => {
    const next = !prev;
    manualCriticalRef.current = next;
    return next;
  });
  setIsFumble(false);
}, []);

const handleDamageKeyDown = useCallback(
  (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleDamageClick();
    }
  },
  [handleDamageClick]
);

// Spells may come from different caster types (e.g., Wizard, Cleric). Before
// rendering the spell table, group spells by caster type and sort each group by
// level so they display in a predictable order.
const sortedSpells = useMemo(() => {
  if (!Array.isArray(form.spells)) return [];
  const groups = (form.spells || []).reduce((acc, spell) => {
    if (!spell) return acc;
    const caster = spell.casterType || spell.caster || 'Unknown';
    if (!acc[caster]) acc[caster] = [];
    acc[caster].push(spell);
    return acc;
  }, {});
  return Object.keys(groups)
    .sort()
    .flatMap((caster) =>
      groups[caster].sort((a, b) => (a.level || 0) - (b.level || 0))
    );
}, [form.spells]);

// -----------------------------------------Dice roller for damage-------------------------------------------------------------------
const [damageValue, setDamageValue] = useState(0);
const [damageLog, setDamageLog] = useState([]);
const [showLog, setShowLog] = useState(false);
const [activeDice, setActiveDice] = useState([]);
const [lastRollTimestamp, setLastRollTimestamp] = useState(0);
const diceAreaRef = useRef(null);

const getDieShapeClass = (sides) => {
  if (!Number.isFinite(sides)) {
    return 'damage-die--generic';
  }

  const normalized = Math.max(0, Math.round(sides));

  switch (normalized) {
    case 4:
      return 'damage-die--d4';
    case 6:
      return 'damage-die--d6';
    case 8:
      return 'damage-die--d8';
    case 10:
    case 100:
      return 'damage-die--d10';
    case 12:
      return 'damage-die--d12';
    case 20:
      return 'damage-die--d20';
    default:
      return 'damage-die--generic';
  }
};

const triggerDiceAnimation = useCallback((diceDetails = []) => {
  if (!Array.isArray(diceDetails) || diceDetails.length === 0) {
    setActiveDice([]);
    return;
  }

  const baseTime = Date.now();
  const areaWidth = Math.max(
    1,
    diceAreaRef.current?.offsetWidth ||
      diceAreaRef.current?.parentElement?.offsetWidth ||
      520
  );

  const diceCount = diceDetails.length;
  const usableWidthPx = (() => {
    if (diceCount <= 1) {
      return Math.min(
        areaWidth * DAMAGE_AREA_MAX_RATIO,
        areaWidth * DAMAGE_AREA_BASE_RATIO
      );
    }
    const desiredClusterWidth = Math.max(
      areaWidth * DAMAGE_AREA_BASE_RATIO,
      (diceCount - 1) * DAMAGE_DIE_WIDTH_PX * DAMAGE_DIE_SPREAD_FACTOR
    );
    return Math.min(areaWidth * DAMAGE_AREA_MAX_RATIO, desiredClusterWidth);
  })();

  const slotWidthPx =
    diceCount > 1 ? usableWidthPx / (diceCount - 1) : usableWidthPx || areaWidth;
  const minGapPx =
    diceCount > 1
      ? Math.min(DAMAGE_DIE_WIDTH_PX * DAMAGE_DIE_SPREAD_FACTOR, slotWidthPx)
      : 0;
  const startPx = (areaWidth - usableWidthPx) / 2;
  const maxPx = startPx + usableWidthPx;
  const jitterPx = Math.min(slotWidthPx * 0.25, DAMAGE_DIE_WIDTH_PX * 0.4);
  let previousLeftPx = null;

  const nextDice = diceDetails.map((detail, index) => {
    const fraction = diceCount === 1 ? 0.5 : index / (diceCount - 1 || 1);
    const baseLeftPx = startPx + fraction * usableWidthPx;
    const rawOffsetPx = jitterPx
      ? (Math.random() - 0.5) * 2 * jitterPx
      : 0;
    const remainingDice = diceCount - index - 1;
    const minAllowedPx = startPx + index * minGapPx;
    const maxAllowedPx = maxPx - remainingDice * minGapPx;

    let leftPx = baseLeftPx + rawOffsetPx;
    if (Number.isFinite(minAllowedPx)) {
      leftPx = Math.max(leftPx, minAllowedPx);
    }
    if (Number.isFinite(maxAllowedPx)) {
      leftPx = Math.min(leftPx, maxAllowedPx);
    }
    if (previousLeftPx !== null && leftPx - previousLeftPx < minGapPx) {
      leftPx = Math.min(maxAllowedPx, previousLeftPx + minGapPx);
    }

    previousLeftPx = leftPx;
    const left = (leftPx / areaWidth) * 100;
    const rotation = (Math.random() - 0.5) * 40;
    const dropDistance = 80 + Math.random() * 110;
    const delay = index * 0.05;
    const rollDuration = 0.85 + Math.random() * 0.45;
    const initialTiltX = (Math.random() - 0.5) * 90;
    const initialTiltY = (Math.random() - 0.5) * 90;
    const initialTiltZ = (Math.random() - 0.5) * 75;
    const midTiltX = initialTiltX + 360 + Math.random() * 360;
    const midTiltY = initialTiltY + 360 + Math.random() * 360;
    const midTiltZ = initialTiltZ + (Math.random() - 0.5) * 540;
    const finalTiltX = (Math.random() - 0.5) * 50;
    const finalTiltY = (Math.random() - 0.5) * 50;
    const finalTiltZ = (Math.random() - 0.5) * 50;
    return {
      id: `${baseTime}-${index}`,
      value:
        typeof detail?.value === 'number'
          ? detail.value
          : Number(detail?.value) || 0,
      sides: detail?.sides || 0,
      type: detail?.type || '',
      category: detail?.category || 'base',
      left,
      rotation,
      dropDistance,
      delay,
      rollDuration,
      initialTiltX,
      initialTiltY,
      initialTiltZ,
      midTiltX,
      midTiltY,
      midTiltZ,
      finalTiltX,
      finalTiltY,
      finalTiltZ,
    };
  });

  setActiveDice(nextDice);
}, [diceAreaRef]);

const updateDamageValueWithAnimation = (
  newValue,
  breakdown,
  source,
  extra = {}
) => {
  setPulseClass('');
  setDamageValue(newValue);
  const details = Array.isArray(extra?.diceRolls) ? extra.diceRolls : [];
  triggerDiceAnimation(details);
  setLastRollTimestamp(Date.now());
  manualCriticalRef.current = false;
  if (newValue !== undefined) {
    setDamageLog((prev) => {
      const entry = {
        total: newValue,
        breakdown,
        source: extra.sourceLabel
          ? extra.sourceLabel
          : source
          ? toTitleCase(source)
          : undefined,
        actionLabel: extra.actionLabel,
        expression: extra.expression,
        rollValues: Array.isArray(extra.rollValues)
          ? extra.rollValues
          : undefined,
        modifierValues: Array.isArray(extra.modifierValues)
          ? extra.modifierValues
          : undefined,
      };
      return [entry, { divider: true }, ...prev].slice(0, 10);
    });
  }
};

useImperativeHandle(ref, () => ({ updateDamageValueWithAnimation }));

const [pulseClass, setPulseClass] = useState('');

useEffect(() => {
  if (!lastRollTimestamp) {
    return undefined;
  }
  const cls = isCritical ? 'pulse-gold' : isFumble ? 'pulse-red' : 'pulse';
  setPulseClass(cls);
  const timer = setTimeout(() => {
    setPulseClass('');
    if (!manualCriticalRef.current) {
      setIsCritical(false);
    }
    setIsFumble(false);
  }, 2000);
  return () => clearTimeout(timer);
}, [lastRollTimestamp, isCritical, isFumble]);

// Allow other components to display values in the damage circle
useEffect(() => {
  const handler = (e) => {
    const { value, breakdown, source, critical, fumble, ...extra } =
      e.detail || {};
    updateDamageValueWithAnimation(value, breakdown, source, extra);
    manualCriticalRef.current = false;
    setIsCritical(!!critical && !fumble);
    setIsFumble(!!fumble);
  };
  window.addEventListener('damage-roll', handler);
  return () => window.removeEventListener('damage-roll', handler);
}, []);

const passDisabled = !canPassTurn || isPassTurnInProgress;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Button
          style={{
            padding: '4px 12px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#fff',
            background: 'transparent',
            borderRadius: '8px',
            textShadow: '1px 1px 2px #000',
            cursor: passDisabled ? 'not-allowed' : 'pointer',
            opacity: passDisabled ? 0.5 : 1,
            transition: 'all 0.2s ease',
            border: 'none',
          }}
          disabled={passDisabled}
          onMouseOver={(e) => {
            if (passDisabled) {
              return;
            }
            e.target.style.background = 'none';
            e.target.style.boxShadow =
              '0 0 16px rgba(0, 76, 255, 0.9), inset 0 0 8px rgba(255, 255, 255, 1)';
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.boxShadow = 'none';
            e.target.style.border = 'none';
          }}
          onClick={() => {
            if (passDisabled) {
              return;
            }
            onPassTurn();
          }}
        >
          Pass ➔
        </Button>
        <Button
          style={{
            padding: '4px 12px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            color: '#fff',
            background: 'transparent',
            borderRadius: '8px',
            textShadow: '1px 1px 2px #000',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: 'none',
          }}
          onMouseOver={(e) => {
            e.target.style.background = 'none';
            e.target.style.boxShadow =
              '0 0 16px rgba(0, 76, 255, 0.9), inset 0 0 8px rgba(255, 255, 255, 1)';
          }}
          onMouseOut={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.boxShadow = 'none';
            e.target.style.border = 'none';
          }}
          onClick={() => setShowLog(true)}
        >
          ⚔️ Log
        </Button>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '4px',
          width: '100%',
        }}
      >
        <div
          id="damageAmount"
          className={`${pulseClass} ${isCritical ? 'critical-active' : ''} ${
            isFumble ? 'critical-failure' : ''
          }`}
        >
          <div
            className="damage-roller__dice-area"
            aria-hidden="true"
            ref={diceAreaRef}
          >
            {activeDice.map((die) => {
              const normalizedType = normalizeDamageTypeForClass(die.type);
              const typeClass = normalizedType ? `damage-${normalizedType}` : '';
              const categoryClass = die.category
                ? `damage-die--${die.category}`
                : '';
              const shapeClass = getDieShapeClass(die.sides);
              return (
                <div
                  key={die.id}
                  className={`damage-die ${shapeClass} ${categoryClass}`}
                  style={{
                    left: `${die.left}%`,
                    '--drop-delay': `${die.delay}s`,
                    '--drop-distance': `${die.dropDistance}px`,
                    '--drop-rotation': `${die.rotation}deg`,
                    '--drop-duration': `${die.rollDuration}s`,
                    '--initial-tilt-x': `${die.initialTiltX}deg`,
                    '--initial-tilt-y': `${die.initialTiltY}deg`,
                    '--initial-tilt-z': `${die.initialTiltZ}deg`,
                    '--mid-tilt-x': `${die.midTiltX}deg`,
                    '--mid-tilt-y': `${die.midTiltY}deg`,
                    '--mid-tilt-z': `${die.midTiltZ}deg`,
                    '--final-tilt-x': `${die.finalTiltX}deg`,
                    '--final-tilt-y': `${die.finalTiltY}deg`,
                    '--final-tilt-z': `${die.finalTiltZ}deg`,
                  }}
                >
                  <div className="damage-die__face">
                    <span className={`damage-die__value ${typeClass}`}>
                      {die.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="damage-roller__total">
            <span className="damage-roller__total-label">Total</span>
            <span
              id="damageValue"
              className={`damage-roller__total-value ${
                typeof damageValue === 'string' ? 'spell-cast-label' : ''
              }`}
              role="button"
              tabIndex={0}
              aria-pressed={isCritical}
              aria-label={
                isCritical
                  ? 'Critical damage roll enabled. Click to roll normally.'
                  : 'Click to enable a critical damage roll on your next roll.'
              }
              title={
                isCritical
                  ? 'Critical roll ready. Click to roll normally.'
                  : 'Click to make your next damage roll critical.'
              }
              onClick={handleDamageClick}
              onKeyDown={handleDamageKeyDown}
            >
              {damageValue}
            </span>
          </div>
        </div>
      </div>
      <Modal centered show={showLog} onHide={() => setShowLog(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Damage Log</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ul className="list-unstyled mb-0">
            {damageLog.map((entry, idx) =>
              entry.divider ? (
                <li key={idx} className="roll-separator" />
              ) : (
                <li key={idx}>
                  <div>
                    {entry.source ? (
                      <>
                        {entry.source}
                        {entry.total !== undefined && entry.total !== null
                          ? ` - (${entry.total})`
                          : ''}
                      </>
                    ) : (
                      entry.total
                    )}
                  </div>
                  {entry.actionLabel && entry.expression ? (
                    <div>
                      <div>{`${entry.actionLabel} - (${entry.expression})`}</div>
                      {Array.isArray(entry.rollValues) &&
                        entry.rollValues.map((value, rollIdx) => (
                          <div key={`roll-${rollIdx}`}>- {value}</div>
                        ))}
                      {Array.isArray(entry.modifierValues) &&
                        entry.modifierValues.map((value, modIdx) => (
                          <div key={`mod-${modIdx}`}>- {value}</div>
                        ))}
                    </div>
                  ) : (
                    entry.breakdown && (
                      <div>
                        {entry.breakdown
                          .split(';')
                          .map((section) => section.trim())
                          .filter(Boolean)
                          .flatMap((section) =>
                            section
                              .split(' + ')
                              .map((segment) => segment.trim())
                              .filter(Boolean)
                          )
                          .map((segment, i) => {
                            const [valueToken, ...typeParts] = segment
                              .trim()
                              .split(/\s+/);
                            const value = valueToken || segment;
                            const type = typeParts.join(' ');
                            const normalizedType = normalizeDamageTypeForClass(type);
                            return (
                              <div key={i}>
                                -{' '}
                                <span
                                  className={
                                    normalizedType ? `damage-${normalizedType}` : ''
                                  }
                                >
                                  {value}
                                  {type ? ` ${type}` : ''}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    )
                  )}
                </li>
              )
            )}
          </ul>
        </Modal.Body>
      </Modal>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflowY: 'auto',
          paddingBottom: `${footerHeight}px`,
        }}
      >
        <div className="attack-roll-controls">
          <div className="attack-roll-controls__button">
            {/* Attack Button */}
            <button
              onClick={handleShowAttack}
              style={{
                width: '64px',
                height: '64px',
                backgroundImage: `url(${sword})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: 'none',
                transition: 'transform 0.2s ease',
                cursor: 'pointer',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              title="Attack"
            />
          </div>
        </div>
      </div>
{/* Attack Modal */}

      <Modal size="lg" className="dnd-modal modern-modal" centered show={showAttack} onHide={handleCloseAttack}>
        <Card className="modern-card">
          <Card.Header className="modal-header">
            <Card.Title className="modal-title">Attacks</Card.Title>
          </Card.Header>
          <Card.Body>
            <Card.Title className="modal-title">Weapons</Card.Title>
            <div className="attack-card-grid">
              {equippedWeapons.length === 0 ? (
                <div className="attack-card attack-card--empty">
                  <p className="text-muted mb-0">No weapons equipped.</p>
                </div>
              ) : (
                equippedWeapons.map(({ slot, weapon }) => {
                  const weaponTypeLabel = getWeaponTypeLabel(weapon);
                  const propertyDetails = getWeaponPropertyDetails(weapon);
                  const propertyLabels = propertyDetails.map(({ label }) => label);
                  const propertiesDisplay =
                    propertyLabels.length > 0
                      ? propertyLabels.join(', ')
                      : 'None';
                  const popoverId = `weapon-properties-${slot}`;
                  const versatileDice = getVersatileDamageDice(weapon);
                  const isVersatile = Boolean(versatileDice);
                  const handSelection = getHandSelectionForWeapon(slot, weapon);
                  const oneHandedDamage = getDamageStringForHandSelection(
                    slot,
                    weapon,
                    HAND_SELECTIONS.ONE_HANDED
                  );
                  const twoHandedDamage = isVersatile
                    ? getDamageStringForHandSelection(
                        slot,
                        weapon,
                        HAND_SELECTIONS.TWO_HANDED
                      )
                    : '';

                  const propertiesPopover = (
                    <Popover id={popoverId}>
                      <Popover.Header as="h3">Weapon Properties</Popover.Header>
                      <Popover.Body>
                        {propertyDetails.map(({ label, description }) => (
                          <div className="weapon-property" key={`${popoverId}-${label}`}>
                            <div className="weapon-property__name">{label}</div>
                            <div className="weapon-property__description">{description}</div>
                          </div>
                        ))}
                      </Popover.Body>
                    </Popover>
                  );

                  return (
                    <div
                      className="attack-card"
                      key={`${slot}-${weapon.name || slot}`}
                    >
                      <div className="attack-card__title text-capitalize">
                        {weapon.name || 'Unknown'}
                      </div>
                      <div className="attack-card__meta">
                        <div className="attack-card__meta-item">
                          <span className="attack-card__meta-label">Weapon Type:</span>
                          <span className="attack-card__meta-value">{weaponTypeLabel}</span>
                        </div>
                      </div>
                      <div className="attack-card__details">
                        <div className="attack-card__row">
                          <span className="attack-card__label">Attack Bonus</span>
                          <span className="attack-card__value">
                            {getAttackBonus(slot, weapon)}
                          </span>
                        </div>
                        {isFinesseWeapon(weapon) && (
                          <div className="attack-card__row">
                            <span className="attack-card__label">Ability</span>
                            <span className="attack-card__value">
                              <Form.Select
                                id={`weapon-ability-${slot}`}
                                aria-label={`Select ability for ${weapon.name || slot}`}
                                value={getAbilityKeyForWeapon(slot, weapon)}
                                onChange={(event) => {
                                  const selected = event.target.value === 'dex' ? 'dex' : 'str';
                                  setWeaponAbilitySelections((prev) => ({
                                    ...prev,
                                    [slot]: selected,
                                  }));
                                }}
                                size="sm"
                              >
                                <option value="str">
                                  Strength ({formatModifier(numericStrMod)})
                                </option>
                                <option value="dex">
                                  Dexterity ({formatModifier(numericDexMod)})
                                </option>
                              </Form.Select>
                            </span>
                          </div>
                        )}
                        {isVersatile && (
                          <div className="attack-card__row">
                            <span className="attack-card__label">Grip</span>
                            <span className="attack-card__value">
                              <Form.Select
                                id={`weapon-grip-${slot}`}
                                aria-label={`Select grip for ${weapon.name || slot}`}
                                value={handSelection}
                                onChange={(event) => {
                                  const selectedHand =
                                    event.target.value === HAND_SELECTIONS.TWO_HANDED
                                      ? HAND_SELECTIONS.TWO_HANDED
                                      : HAND_SELECTIONS.ONE_HANDED;
                                  setWeaponHandSelections((prev) => ({
                                    ...prev,
                                    [slot]: selectedHand,
                                  }));
                                }}
                                size="sm"
                              >
                                <option value={HAND_SELECTIONS.ONE_HANDED}>
                                  One-Handed ({oneHandedDamage || 'Unknown'})
                                </option>
                                <option value={HAND_SELECTIONS.TWO_HANDED}>
                                  Two-Handed ({twoHandedDamage || 'Unknown'})
                                </option>
                              </Form.Select>
                            </span>
                          </div>
                        )}
                        <div className="attack-card__row">
                          <span className="attack-card__label">Damage</span>
                          <span className="attack-card__value">
                            {getDamageString(slot, weapon)}
                          </span>
                        </div>
                        <div className="attack-card__row attack-card__row--properties">
                          <span className="attack-card__label">Properties</span>
                          <span className="attack-card__value attack-card__properties">
                            {propertiesDisplay}
                            {propertyDetails.length > 0 && (
                              <OverlayTrigger
                                trigger="click"
                                placement="auto"
                                overlay={propertiesPopover}
                                rootClose
                              >
                                <Button
                                  type="button"
                                  variant="link"
                                  className="attack-card__properties-button"
                                  aria-label="View weapon property descriptions"
                                >
                                  <i className="fa-solid fa-eye" aria-hidden="true"></i>
                                </Button>
                              </OverlayTrigger>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="attack-card__actions">
                        <Button
                          onClick={() => {
                            handleWeaponAttackRoll(slot, weapon);
                            handleCloseAttack();
                          }}
                          variant="link"
                          aria-label="Roll to hit"
                          className="attack-card__roll"
                        >
                          <i className="fa-solid fa-bullseye"></i>
                        </Button>
                        <Button
                          onClick={() => {
                            handleWeaponAttack(slot, weapon);
                            handleCloseAttack();
                          }}
                          variant="link"
                          aria-label="Roll damage"
                          className="attack-card__roll"
                        >
                          <i className="fa-solid fa-dice-d20"></i>
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {breathWeaponDetails && (
              <>
                <Card.Title className="modal-title mt-4">Breath Attack</Card.Title>
                <div className="attack-card-grid">
                  <div className="attack-card">
                    <div className="attack-card__title">
                      {breathWeaponDetails.label}
                    </div>
                    <div className="attack-card__details">
                      <div className="attack-card__row">
                        <span className="attack-card__label">Save DC</span>
                        <span className="attack-card__value">
                          {breathWeaponDetails.saveDC}
                        </span>
                      </div>
                      <div className="attack-card__row">
                        <span className="attack-card__label">Damage</span>
                        <span className="attack-card__value">
                          {formatDamageSegments(breathWeaponDetails.damageString)}
                        </span>
                      </div>
                      {(breathWeaponDetails.shape || breathWeaponDetails.save) && (
                        <div className="attack-card__row">
                          <span className="attack-card__label">Shape</span>
                          <span className="attack-card__value">
                            {breathWeaponDetails.shape}
                            {breathWeaponDetails.shape && breathWeaponDetails.save
                              ? ' • '
                              : ''}
                            {breathWeaponDetails.save
                              ? `${breathWeaponDetails.save} Save`
                              : ''}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="attack-card__actions">
                      <Button
                        onClick={() => {
                          handleBreathWeaponAttack();
                          handleCloseAttack();
                        }}
                        variant="link"
                        aria-label="Roll damage"
                        className="attack-card__roll"
                      >
                        <i className="fa-solid fa-dice-d20"></i>
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
            {Array.isArray(form.spells) && form.spells.some((s) => s?.damage) && (
              <>
                <Card.Title className="modal-title mt-4">Spells</Card.Title>
                <div className="attack-card-grid">
                  {sortedSpells
                    .filter((s) => s && s.damage)
                    .map((spell, idx) => (
                      <div className="attack-card" key={idx}>
                        <div className="attack-card__title">{spell.name}</div>
                        <div className="attack-card__meta">
                          <span>{spell.casterType || spell.caster || 'Unknown'}</span>
                          <span>• Level {spell.level}</span>
                        </div>
                        <div className="attack-card__details">
                          <div className="attack-card__row">
                            <span className="attack-card__label">Damage</span>
                            <span className="attack-card__value">
                              {formatDamageSegments(spell.damage)}
                            </span>
                          </div>
                          <div className="attack-card__row">
                            <span className="attack-card__label">Casting Time</span>
                            <span className="attack-card__value">{spell.castingTime}</span>
                          </div>
                          <div className="attack-card__row">
                            <span className="attack-card__label">Range</span>
                            <span className="attack-card__value">{spell.range}</span>
                          </div>
                          <div className="attack-card__row">
                            <span className="attack-card__label">Duration</span>
                            <span className="attack-card__value">{spell.duration}</span>
                          </div>
                        </div>
                        <div className="attack-card__actions">
                          <Button
                            onClick={() => {
                              handleSpellsButtonClick(spell);
                              handleCloseAttack();
                            }}
                            variant="link"
                            aria-label="Roll damage"
                            className="attack-card__roll"
                          >
                            <i className="fa-solid fa-dice-d20"></i>
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}
            {fiendishLegacySpells.length > 0 && (
              <>
                <Card.Title className="modal-title mt-4">Fiendish Legacy</Card.Title>
                <div className="attack-card-grid">
                  {fiendishLegacySpells.map((spell, idx) => (
                    <div className="attack-card" key={`fiendish-${idx}`}>
                      <div className="attack-card__title">{spell.name}</div>
                      <div className="attack-card__meta">
                        <span>{spell.casterType || 'Fiendish Legacy'}</span>
                        <span>• Level {spell.level}</span>
                      </div>
                      <div className="attack-card__details">
                        <div className="attack-card__row">
                          <span className="attack-card__label">Damage</span>
                          <span className="attack-card__value">
                            {formatDamageSegments(spell.damage)}
                          </span>
                        </div>
                        <div className="attack-card__row">
                          <span className="attack-card__label">Casting Time</span>
                          <span className="attack-card__value">{spell.castingTime}</span>
                        </div>
                        <div className="attack-card__row">
                          <span className="attack-card__label">Range</span>
                          <span className="attack-card__value">{spell.range}</span>
                        </div>
                        <div className="attack-card__row">
                          <span className="attack-card__label">Duration</span>
                          <span className="attack-card__value">{spell.duration}</span>
                        </div>
                      </div>
                      <div className="attack-card__actions">
                        <Button
                          onClick={() => {
                            handleSpellsButtonClick(spell);
                            handleCloseAttack();
                          }}
                          variant="link"
                          aria-label="Roll damage"
                          className="attack-card__roll"
                        >
                          <i className="fa-solid fa-dice-d20"></i>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card.Body>
            <Card.Footer className="modal-footer">
              <Button className="close-btn" variant="secondary" onClick={handleCloseAttack}>
                Close
              </Button>
            </Card.Footer>
        </Card>
      </Modal>
      <UpcastModal
        show={showUpcast}
        onHide={() => setShowUpcast(false)}
        baseLevel={pendingSpell?.spell?.level}
        slots={availableSlots}
        onSelect={(lvl, type) => {
          if (pendingSpell) {
            applyUpcast(pendingSpell.spell, lvl, pendingSpell.crit, type);
            setPendingSpell(null);
          }
          setShowUpcast(false);
        }}
      />
    </div>
  );
});

export default PlayerTurnActions;
