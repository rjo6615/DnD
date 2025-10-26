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
import weaponMasteryDefinitions from '../../../data/weaponMasteries';
import weaponTypeMasteries from '../../../data/weaponTypeMasteries';
import { rollSkillWithDiceBox } from './Skills';
import DamageDiceCanvas from './DamageDiceCanvas';
import { rollDiceWithBox, setDiceBoxThemeColor } from '../../../utils/diceBoxManager';
import {
  collectRollValues,
  normalizeRollValue,
  sanitizeRollGroup,
} from '../../../utils/diceResults';
import {
  applyDiceFaceColor,
  DEFAULT_DICE_COLOR,
  normalizeDiceColor,
  resolveDamageTypeColor,
} from '../../../utils/diceColors';

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

function formatDamageRolls(rolls) {
  return rolls
    .map(({ value, type }) => `${value}${type ? ` ${type}` : ''}`)
    .join(' + ');
}


const DEFAULT_DAMAGE_TYPE_KEY = '__default__';

const DAMAGE_TYPE_CLASS_TOKEN_IGNORE = new Set([
  '',
  'and',
  'bonus',
  'damage',
  'damages',
  'extra',
  'plus',
]);

const parseDamageBreakdownSegments = (breakdown, normalizer) => {
  if (typeof breakdown !== 'string' || !breakdown.trim()) {
    return [];
  }

  const safeNormalizer =
    typeof normalizer === 'function'
      ? normalizer
      : (value = '') => value.trim().toLowerCase().replace(/\s+/g, '-');

  return breakdown
    .split(';')
    .map((section) => section.trim())
    .filter(Boolean)
    .flatMap((section) =>
      section
        .split(/\s+\+\s+/)
        .map((segment) => segment.trim())
        .filter(Boolean),
    )
    .map((segment) => {
      const [valueToken, ...typeParts] = segment.split(/\s+/);
      const value = valueToken || segment;
      const type = typeParts.join(' ');
      const normalizedType = safeNormalizer(type);

      return {
        value,
        type,
        normalizedType,
        text: type ? `${value} ${type}` : value,
        className: normalizedType ? `damage-${normalizedType}` : '',
      };
    });
};

const groupDiceRollsByType = (diceRolls, normalizer) => {
  const results = new Map();
  if (!Array.isArray(diceRolls)) {
    return results;
  }

  const safeNormalizer =
    typeof normalizer === 'function'
      ? normalizer
      : (value = '') => value.trim().toLowerCase().replace(/\s+/g, '-');

  diceRolls.forEach((detail) => {
    if (!detail) {
      return;
    }

    const normalizedType = safeNormalizer(detail.type || '');
    const key = normalizedType || DEFAULT_DAMAGE_TYPE_KEY;
    if (!results.has(key)) {
      results.set(key, []);
    }
    results.get(key).push(detail);
  });

  return results;
};

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
const rangedSpellAttackPattern = /ranged\s+(?:spell\s+)?attack(?:\s+roll)?/i;

function detectRangedSpellAttack(text = '') {
  if (typeof text !== 'string') {
    return false;
  }
  return rangedSpellAttackPattern.test(text);
}

const ABILITY_LABELS = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

const waitForNextAnimationFrame = () => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }

  if (typeof setTimeout === 'function') {
    return new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  return Promise.resolve();
};

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
  if (enhanced.rangedSpellAttack === undefined) {
    enhanced.rangedSpellAttack = detectRangedSpellAttack(enhanced.description);
  } else {
    enhanced.rangedSpellAttack = Boolean(enhanced.rangedSpellAttack);
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
      spellAbilityMod = null,
      spellAbilityKey = '',
      onCastSpell,
      onPassTurn = () => {},
      canPassTurn = true,
      isPassTurnInProgress = false,
      availableSlots = { regular: {}, warlock: {} },
      longRestCount = 0,
      shortRestCount = 0,
      characterId = null,
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
  const hasMonkLevels = useMemo(() => {
    if (!Array.isArray(form?.occupation)) {
      return false;
    }
    return form.occupation.some((occupationEntry) => {
      if (!occupationEntry || typeof occupationEntry !== 'object') {
        return false;
      }
      const name = String(
        occupationEntry.Name ??
          occupationEntry.Occupation ??
          occupationEntry.name ??
          occupationEntry.occupation ??
          '',
      ).toLowerCase();
      if (name !== 'monk') {
        return false;
      }
      const levelValue = Number(
        occupationEntry.Level ??
          occupationEntry.level ??
          occupationEntry.Levels ??
          occupationEntry.levels ??
          0,
      );
      return Number.isFinite(levelValue) && levelValue > 0;
    });
  }, [form?.occupation]);
  const bonusUnarmedStrikeFeature = useMemo(() => {
    const target = 'bonus unarmed strike';

    const searchValue = (value, depth = 0) => {
      if (!value || depth > 10) {
        return false;
      }

      if (typeof value === 'string') {
        return value.trim().toLowerCase() === target;
      }

      if (Array.isArray(value)) {
        return value.some((entry) => searchValue(entry, depth + 1));
      }

      if (typeof value === 'object') {
        return Object.entries(value).some(([key, entry]) => {
          if (typeof key === 'string' && key.trim().toLowerCase() === target) {
            return true;
          }
          return searchValue(entry, depth + 1);
        });
      }

      return false;
    };

    const featureSources = [
      form?.features,
      form?.classFeatures,
      form?.featureList,
    ];

    return featureSources.some((source) => searchValue(source));
  }, [form?.classFeatures, form?.featureList, form?.features]);

  const equippedWeapons = useMemo(() => {
    let weapons = [];

    if (equipmentProvided) {
      weapons = WEAPON_SLOT_KEYS.map((slot) => {
        const weapon = normalizedEquipment[slot];
        if (!weapon) return null;
        if (weapon.source && weapon.source !== 'weapon') return null;
        const damage =
          typeof weapon.damage === 'string' ? weapon.damage.trim() : '';
        if (!damage) return null;
        return { slot, weapon };
      }).filter(Boolean);
    } else {
      const legacyWeapons = normalizeWeapons(form.weapon || [], {
        includeUnowned: true,
      });
      weapons = legacyWeapons.map((weapon, index) => ({
        slot: `legacy-${index}`,
        weapon,
      }));
    }

    const ensureUnarmedStrike = (currentWeapons) => {
      const hasUnarmedStrike = currentWeapons.some(({ weapon }) => {
        const name =
          typeof weapon?.name === 'string' ? weapon.name.trim() : '';
        return name.toLowerCase() === 'unarmed strike';
      });

      if (hasUnarmedStrike) {
        return currentWeapons;
      }

      return [
        ...currentWeapons,
        {
          slot: 'unarmed-strike',
          weapon: {
            name: 'Unarmed Strike',
            damage: '1d4 Bludgeoning',
            type: 'Unarmed',
            category: 'Melee Weapon',
            properties: [],
            source: 'weapon',
          },
        },
      ];
    };

    const withUnarmed = ensureUnarmedStrike(weapons);

    if (hasMonkLevels && bonusUnarmedStrikeFeature) {
      const baseUnarmed = withUnarmed.find(({ weapon }) => {
        const name =
          typeof weapon?.name === 'string' ? weapon.name.trim() : '';
        return name.toLowerCase() === 'unarmed strike';
      });

      const baseWeapon = baseUnarmed?.weapon || {
        name: 'Unarmed Strike',
        damage: '1d4 Bludgeoning',
        type: 'Unarmed',
        category: 'Melee Weapon',
        properties: [],
        source: 'weapon',
      };

      return [
        ...withUnarmed,
        {
          slot: 'bonus-unarmed-strike',
          weapon: {
            ...baseWeapon,
            displayName: 'Bonus Unarmed Strike',
          },
        },
      ];
    }

    return withUnarmed;
  }, [
    bonusUnarmedStrikeFeature,
    equipmentProvided,
    form.weapon,
    hasMonkLevels,
    normalizedEquipment,
  ]);

  const [weaponAbilitySelections, setWeaponAbilitySelections] = useState({});
  const [weaponHandSelections, setWeaponHandSelections] = useState({});

  const numericStrMod = Number(strMod) || 0;
  const numericDexMod = Number(dexMod) || 0;
  const numericSpellAbilityMod = (() => {
    const parsed = Number(spellAbilityMod);
    return Number.isFinite(parsed) ? parsed : null;
  })();

  const spellAbilityLabel = useMemo(() => {
    if (!spellAbilityKey) {
      return 'Spellcasting Ability Modifier';
    }
    const normalizedKey = String(spellAbilityKey).toLowerCase();
    const abilityLabel = ABILITY_LABELS[normalizedKey];
    return `${abilityLabel || normalizedKey.toUpperCase()} Modifier`;
  }, [spellAbilityKey]);

  const formatModifier = useCallback(
    (value) => (value >= 0 ? `+${value}` : `${value}`),
    [],
  );

  const isFinesseWeapon = useCallback(
    (weapon) =>
      Array.isArray(weapon?.properties) &&
      weapon.properties.some(
        (prop) => typeof prop === 'string' && prop.toLowerCase().includes('finesse')
      ),
    []
  );

  const getWeaponCategoryString = useCallback((weapon) => {
    if (!weapon || typeof weapon !== 'object') {
      return '';
    }
    const candidates = [
      weapon.category,
      weapon.weaponCategory,
      weapon.weaponType,
      weapon.type,
    ];
    for (const candidate of candidates) {
      if (typeof candidate !== 'string') continue;
      const normalized = candidate.trim().toLowerCase();
      if (normalized) {
        return normalized;
      }
    }
    return '';
  }, []);

  const isRangedWeapon = useCallback(
    (weapon) => getWeaponCategoryString(weapon).includes('ranged'),
    [getWeaponCategoryString],
  );

  const hasWeaponProperty = useCallback((weapon, property) => {
    if (!Array.isArray(weapon?.properties)) {
      return false;
    }
    const normalizedSearch = String(property || '').toLowerCase();
    if (!normalizedSearch) {
      return false;
    }
    return weapon.properties.some((prop) => {
      if (typeof prop !== 'string') {
        return false;
      }
      return prop.toLowerCase().includes(normalizedSearch);
    });
  }, []);

  const isMeleeWeapon = useCallback(
    (weapon) => getWeaponCategoryString(weapon).includes('melee'),
    [getWeaponCategoryString],
  );

  const isSimpleMeleeWeapon = useCallback(
    (weapon) => {
      const category = getWeaponCategoryString(weapon);
      return category.includes('simple') && category.includes('melee');
    },
    [getWeaponCategoryString],
  );

  const isMartialMeleeWeapon = useCallback(
    (weapon) => {
      const category = getWeaponCategoryString(weapon);
      return category.includes('martial') && category.includes('melee');
    },
    [getWeaponCategoryString],
  );

  const isUnarmedAttack = useCallback((weapon) => {
    if (!weapon || typeof weapon !== 'object') {
      return false;
    }
    const nameCandidates = [
      weapon.name,
      weapon.label,
      weapon.title,
      weapon.displayName,
    ];
    for (const candidate of nameCandidates) {
      if (typeof candidate !== 'string') continue;
      if (candidate.trim().toLowerCase() === 'unarmed strike') {
        return true;
      }
    }
    const typeString = getWeaponCategoryString(weapon);
    if (typeString.includes('unarmed')) {
      return true;
    }
    const rawType = String(weapon?.type || '').toLowerCase();
    return rawType.includes('unarmed');
  }, [getWeaponCategoryString]);

  const qualifiesForMonkDexterity = useCallback(
    (weapon) => {
      if (!hasMonkLevels) {
        return false;
      }
      if (isUnarmedAttack(weapon)) {
        return true;
      }
      if (!isMeleeWeapon(weapon)) {
        return false;
      }
      if (isSimpleMeleeWeapon(weapon)) {
        return true;
      }
      return isMartialMeleeWeapon(weapon) && hasWeaponProperty(weapon, 'light');
    },
    [
      hasMonkLevels,
      hasWeaponProperty,
      isMartialMeleeWeapon,
      isMeleeWeapon,
      isSimpleMeleeWeapon,
      isUnarmedAttack,
    ],
  );

  const getAbilityKeyForWeapon = (slot, weapon) => {
    if (qualifiesForMonkDexterity(weapon)) {
      return 'dex';
    }
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

  const getWeaponMasteryDetails = (weapon) => {
    if (!weapon || typeof weapon !== 'object') return null;

    const rawMastery =
      typeof weapon.mastery === 'string' ? weapon.mastery.trim() : '';
    const masteryKey = rawMastery.toLowerCase();

    if (masteryKey) {
      const explicit = weaponMasteryDefinitions[masteryKey];
      if (explicit) {
        return { ...explicit };
      }
    }

    const typeCandidates = [weapon.type, weapon.weaponType, weapon.itemType];
    for (const typeCandidate of typeCandidates) {
      if (typeof typeCandidate !== 'string') continue;
      const normalizedType = typeCandidate.trim().toLowerCase();
      if (!normalizedType) continue;
      const inferredKey = weaponTypeMasteries[normalizedType];
      if (!inferredKey) continue;
      const inferredDetail = weaponMasteryDefinitions[inferredKey];
      if (inferredDetail) {
        return { ...inferredDetail };
      }
      return {
        label: formatWeaponLabel(inferredKey),
        description: 'Definition not available.',
      };
    }

    if (masteryKey) {
      return {
        label: formatWeaponLabel(rawMastery),
        description: 'Definition not available.',
      };
    }

    return null;
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

  const getCatalogSpell = useCallback((spell) => {
    const rawName = typeof spell?.name === 'string' ? spell.name : '';
    const normalized = rawName.trim().toLowerCase();
    if (!normalized) {
      return null;
    }
    return SPELLS_BY_NAME[normalized] || null;
  }, []);

  const isRangedSpellAttack = useCallback(
    (spell) => {
      if (!spell) return false;
      if (spell.rangedSpellAttack !== undefined) {
        return Boolean(spell.rangedSpellAttack);
      }
      const catalogSpell = getCatalogSpell(spell);
      if (catalogSpell?.rangedSpellAttack !== undefined) {
        return Boolean(catalogSpell.rangedSpellAttack);
      }
      const description =
        typeof spell?.description === 'string'
          ? spell.description
          : typeof catalogSpell?.description === 'string'
          ? catalogSpell.description
          : '';
      return detectRangedSpellAttack(description);
    },
    [getCatalogSpell],
  );

  const getSpellAttackDetails = useCallback(
    (spell) => {
      if (numericSpellAbilityMod === null) {
        return null;
      }
      if (!isRangedSpellAttack(spell)) {
        return null;
      }
      const abilityBonus = numericSpellAbilityMod;
      const proficiencyBonusValue = Number.isFinite(profBonus)
        ? profBonus
        : 0;
      const catalogSpell = getCatalogSpell(spell);
      const extraRaw = Number(
        spell?.attackBonus ??
          spell?.bonus ??
          catalogSpell?.attackBonus ??
          catalogSpell?.bonus ??
          0,
      );
      const extraBonus = Number.isFinite(extraRaw) ? extraRaw : 0;
      return {
        total: abilityBonus + proficiencyBonusValue + extraBonus,
        abilityBonus,
        proficiencyBonus: proficiencyBonusValue,
        extraBonus,
      };
    },
    [getCatalogSpell, isRangedSpellAttack, numericSpellAbilityMod, profBonus],
  );

  const getAttackBonus = (slot, weapon) =>
    profBonus +
    abilityForWeapon(weapon, slot) +
    Number(weapon?.attackBonus ?? weapon?.bonus ?? 0);
    
  const normalizeDamageTypeForClass = (type) => {
    const trimmed = (type || '').trim();
    if (!trimmed) {
      return '';
    }

    const tokens = trimmed
      .toLowerCase()
      .split(/[^a-z]+/)
      .map((token) => token.trim())
      .filter((token) => !DAMAGE_TYPE_CLASS_TOKEN_IGNORE.has(token));

    if (tokens.length === 0) {
      return '';
    }

    return tokens.join('-');
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
    if (weapon?.displayName && typeof weapon.displayName === 'string') {
      const trimmed = weapon.displayName.trim();
      if (trimmed) {
        return trimmed;
      }
    }

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

  const diceFaceColor = useMemo(
    () => normalizeDiceColor(form?.diceColor) || DEFAULT_DICE_COLOR,
    [form?.diceColor],
  );

  const diceBoxThemeRef = useRef(null);

  useEffect(() => {
    applyDiceFaceColor(diceFaceColor);
    setDiceBoxThemeColor(diceFaceColor);
    diceBoxThemeRef.current = diceFaceColor;
  }, [diceFaceColor]);

  const rollDamageExpression = useCallback(
    async ({
      damageString,
      ability = 0,
      crit = false,
      extraDice,
      levelsAbove = 0,
    }) => {
      if (typeof damageString !== 'string') return null;
      const trimmed = damageString.trim();
      if (!trimmed) return null;

      const requests = [];
      const validation = calculateDamage(
        trimmed,
        ability,
        crit,
        (count, sides) => {
          requests.push({ count, sides });
          return Array(count).fill(1);
        },
        extraDice,
        levelsAbove,
      );

      if (!validation) {
        return null;
      }

      const diceRolls = Array.isArray(validation?.diceRolls)
        ? validation.diceRolls
        : [];

      const classifyTypeColor = (typeValue) => {
        const normalizedType = normalizeDamageTypeForClass(typeValue || '');
        if (!normalizedType) {
          return { normalizedType: '', color: null, isColorless: true, isMixed: false };
        }

        const tokens = normalizedType.split('-').filter(Boolean);
        const isMixed = tokens.length > 1;
        if (isMixed) {
          return {
            normalizedType,
            color: null,
            isColorless: true,
            isMixed: true,
          };
        }

        const color = resolveDamageTypeColor(normalizedType) || null;
        return {
          normalizedType,
          color,
          isColorless: !color,
          isMixed: false,
        };
      };

      const requestDetails = (() => {
        if (!Array.isArray(requests) || requests.length === 0) {
          return [];
        }

        let placeholderIndex = 0;
        return requests.map((request = {}) => {
          const rawCount = Number(request?.count);
          const rawSides = Number(request?.sides);
          const count = Number.isFinite(rawCount) ? Math.max(0, Math.floor(rawCount)) : 0;
          const sides =
            Number.isFinite(rawSides) && rawSides > 0 ? Math.round(rawSides) : null;

          const sliceEnd = placeholderIndex + count;
          const subset = diceRolls.slice(placeholderIndex, sliceEnd);
          placeholderIndex = sliceEnd;

          if (!Array.isArray(subset) || subset.length === 0) {
            return { count, sides, color: null };
          }

          const analysis = subset.reduce(
            (acc, detail) => {
              const classification = classifyTypeColor(detail?.type);
              if (classification.color && !classification.isMixed) {
                acc.colors.add(classification.color);
              } else {
                acc.hasColorless = true;
              }
              return acc;
            },
            { colors: new Set(), hasColorless: false },
          );

          const uniqueColors = Array.from(analysis.colors);
          const color =
            uniqueColors.length === 1 && !analysis.hasColorless ? uniqueColors[0] : null;

          return { count, sides, color };
        });
      })();

      const resolveRollThemeColor = () => {
        const diceTheme = (() => {
          if (!Array.isArray(diceRolls) || diceRolls.length === 0) {
            return null;
          }

          const uniqueColors = new Set();
          let hasColorless = false;

          diceRolls.forEach((die) => {
            const classification = classifyTypeColor(die?.type);
            if (classification.color && !classification.isMixed) {
              uniqueColors.add(classification.color);
            } else {
              hasColorless = true;
            }
          });

          if (uniqueColors.size === 1 && !hasColorless) {
            return Array.from(uniqueColors)[0];
          }

          return null;
        })();

        if (diceTheme) {
          return diceTheme;
        }

        if (!Array.isArray(requestDetails) || requestDetails.length === 0) {
          return diceFaceColor;
        }

        const uniqueColors = new Set();

        requestDetails.forEach((detail) => {
          if (!detail || detail.count <= 0) {
            return;
          }

          if (detail.color) {
            uniqueColors.add(detail.color);
          }
        });

        if (uniqueColors.size === 1) {
          return Array.from(uniqueColors)[0];
        }

        return diceFaceColor;
      };

      const rollThemeColor = resolveRollThemeColor();

      if (requests.length === 0) {
        const themeHasChanged = rollThemeColor !== diceBoxThemeRef.current;
        if (themeHasChanged) {
          setDiceBoxThemeColor(rollThemeColor);
          diceBoxThemeRef.current = rollThemeColor;
          await waitForNextAnimationFrame();
        }
        const staticResult = calculateDamage(
          trimmed,
          ability,
          crit,
          rollDice,
          extraDice,
          levelsAbove,
        );
        return staticResult ? { ...staticResult, rollValues: undefined } : null;
      }

      const rollPlan = (() => {
        if (!Array.isArray(requests) || requests.length === 0) {
          return [];
        }

        const groups = [];
        let currentGroup = null;

        requests.forEach((request, index) => {
          const rawCount = Number(request?.count);
          const rawSides = Number(request?.sides);
          const count = Number.isFinite(rawCount) ? Math.max(0, Math.floor(rawCount)) : 0;
          const sides =
            Number.isFinite(rawSides) && rawSides > 0 ? Math.round(rawSides) : null;

          if (!count || !sides) {
            currentGroup = null;
            return;
          }

          const detail = Array.isArray(requestDetails) ? requestDetails[index] : null;
          const color = detail?.color || null;

          if (!currentGroup || currentGroup.color !== color) {
            currentGroup = { color, items: [] };
            groups.push(currentGroup);
          }

          currentGroup.items.push({ count, sides, requestIndex: index });
        });

        return groups.filter((group) => group.items.length > 0);
      })();

      const executeRollPlan = async () => {
        const collected = Array.from({ length: requests.length }, () => null);

        if (!Array.isArray(rollPlan) || rollPlan.length === 0) {
          const themeHasChanged = diceFaceColor !== diceBoxThemeRef.current;
          if (themeHasChanged) {
            setDiceBoxThemeColor(diceFaceColor);
            diceBoxThemeRef.current = diceFaceColor;
            await waitForNextAnimationFrame();
          }
          return collected;
        }

        // eslint-disable-next-line no-await-in-loop
        for (const group of rollPlan) {
          if (!group || !Array.isArray(group.items) || group.items.length === 0) {
            continue;
          }

          const targetColor = group.color || diceFaceColor;
          if (targetColor !== diceBoxThemeRef.current) {
            setDiceBoxThemeColor(targetColor);
            diceBoxThemeRef.current = targetColor;
            await waitForNextAnimationFrame();
          }

          const groupRequests = group.items.map(({ count, sides }) => ({
            count: Math.max(1, Math.round(count || 0)),
            sides: Math.max(1, Math.round(sides || 0)),
          }));

          const { rolls } = await rollDiceWithBox(groupRequests);
          group.items.forEach(({ requestIndex }, idx) => {
            if (typeof requestIndex !== 'number' || requestIndex < 0) {
              return;
            }
            const raw = Array.isArray(rolls) ? rolls[idx] : undefined;
            collected[requestIndex] = raw;
          });
        }

        return collected;
      };

      try {
        const themeHasChanged = rollThemeColor !== diceBoxThemeRef.current;
        if (themeHasChanged) {
          setDiceBoxThemeColor(rollThemeColor);
          diceBoxThemeRef.current = rollThemeColor;
          await waitForNextAnimationFrame();
        }

        let collected;
        if (Array.isArray(rollPlan) && rollPlan.length > 0) {
          collected = await executeRollPlan();
        } else {
          const fallbackCollected = Array.from({ length: requests.length }, () => null);
          const rollRequests = [];
          const rollIndexMap = [];

          requests.forEach((request, index) => {
            const rawCount = Number(request?.count);
            const rawSides = Number(request?.sides);
            const count = Number.isFinite(rawCount) ? Math.max(0, Math.floor(rawCount)) : 0;
            const sides =
              Number.isFinite(rawSides) && rawSides > 0 ? Math.round(rawSides) : null;

            if (!count || !sides) {
              fallbackCollected[index] = null;
              return;
            }

            rollRequests.push({ count, sides });
            rollIndexMap.push(index);
          });

          if (rollRequests.length > 0) {
            const { rolls } = await rollDiceWithBox(rollRequests);
            rollIndexMap.forEach((originalIndex, idx) => {
              const raw = Array.isArray(rolls) ? rolls[idx] : undefined;
              fallbackCollected[originalIndex] = raw;
            });
          }

          collected = fallbackCollected;
        }

        if (!Array.isArray(collected)) {
          collected = Array.from({ length: requests.length }, () => null);
        }

        let requestIndex = 0;
        const appliedRollGroups = [];
        const applyRolls = (count, sides) => {
          const current = Array.isArray(collected)
            ? collected[requestIndex]
            : undefined;
          requestIndex += 1;
          const normalizedGroup = sanitizeRollGroup(current, count, sides);
          if (normalizedGroup) {
            appliedRollGroups.push(normalizedGroup);
            return normalizedGroup;
          }
          const fallbackRolls = rollDice(count, sides);
          const resolvedSides =
            Number.isFinite(sides) && sides > 1 ? Math.floor(sides) : 6;
          let numericFallback;
          if (Array.isArray(fallbackRolls)) {
            numericFallback = fallbackRolls
              .map((value) => normalizeRollValue(value))
              .filter((value) => value !== null);
            if (numericFallback.length > count) {
              numericFallback = numericFallback.slice(0, count);
            }
            while (numericFallback.length < count) {
              numericFallback.push(
                Math.max(
                  1,
                  Math.floor(Math.random() * resolvedSides) + 1,
                ),
              );
            }
          } else {
            numericFallback = Array.from({ length: count }, () =>
              Math.max(1, Math.floor(Math.random() * resolvedSides) + 1),
            );
          }
          appliedRollGroups.push(numericFallback);
          return numericFallback;
        };

        const finalResult = calculateDamage(
          trimmed,
          ability,
          crit,
          applyRolls,
          extraDice,
          levelsAbove,
        );

        const appliedValues = collectRollValues(appliedRollGroups);
        const rollValues = appliedValues.length > 0 ? appliedValues : undefined;

        return finalResult ? { ...finalResult, rollValues } : null;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Damage roll failed', error);
        const fallbackResult = calculateDamage(
          trimmed,
          ability,
          crit,
          rollDice,
          extraDice,
          levelsAbove,
        );
        return fallbackResult ? { ...fallbackResult, rollValues: undefined } : null;
      }
    },
    [
      diceFaceColor,
      normalizeDamageTypeForClass,
      resolveDamageTypeColor,
      rollDiceWithBox,
      setDiceBoxThemeColor,
    ],
  );

  const handleWeaponAttack = useCallback(
    async (slot, weapon) => {
      const ability = abilityForWeapon(weapon, slot);
      const damageString = getDamageStringForHandSelection(slot, weapon);
      if (typeof damageString !== 'string' || !damageString.trim()) return;

      const result = await rollDamageExpression({
        damageString,
        ability,
        crit: isCritical,
      });
      if (!result) return;

      const weaponLabel = getWeaponDisplayName(slot, weapon);
      const expression = damageString
        .replace(/([+-])/g, ' $1 ')
        .replace(/\s+/g, ' ')
        .trim();

      let modifierValues;
      if (Number.isFinite(ability) && ability !== 0) {
        const abilityKey = getAbilityKeyForWeapon(slot, weapon);
        const abilityName =
          abilityKey === 'dex'
            ? 'DEX'
            : abilityKey === 'str'
            ? 'STR'
            : abilityKey
            ? abilityKey.toUpperCase()
            : 'Ability';
        const sign = ability >= 0 ? '+' : '-';
        modifierValues = [`${sign}${Math.abs(ability)} ${abilityName} modifier`];
      }

      const extraDetails = {
        diceRolls: result.diceRolls,
        rollValues: result.rollValues,
        sourceLabel: weaponLabel,
        actionLabel: 'Damage',
        expression: expression || undefined,
        modifierValues,
      };

      updateDamageValueWithAnimation(
        result.total,
        result.breakdown,
        weapon.name,
        extraDetails,
      );
    },
    [
      abilityForWeapon,
      getAbilityKeyForWeapon,
      getDamageStringForHandSelection,
      getWeaponDisplayName,
      isCritical,
      rollDamageExpression,
    ],
  );

  const handleWeaponAttackRoll = async (slot, weapon) => {
    const rawBonus = Number(getAttackBonus(slot, weapon));
    const bonus = Number.isFinite(rawBonus) ? rawBonus : 0;
    const { result, d20 } = await rollSkillWithDiceBox(bonus, {
      diceColor: diceFaceColor,
    });
    diceBoxThemeRef.current = diceFaceColor;
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

  const handleSpellAttackRoll = useCallback(
    async (spell) => {
      const attackDetails = getSpellAttackDetails(spell);
      if (!attackDetails) {
        return;
      }

      const { total, abilityBonus, proficiencyBonus, extraBonus } = attackDetails;
      const { result, d20 } = await rollSkillWithDiceBox(total, {
        diceColor: diceFaceColor,
      });
      diceBoxThemeRef.current = diceFaceColor;
      const segments = [`${d20} (d20)`];
      segments.push(`${formatModifier(abilityBonus)} ${spellAbilityLabel}`);
      segments.push(
        `${formatModifier(proficiencyBonus)} Proficiency Bonus`,
      );
      if (extraBonus) {
        segments.push(`${formatModifier(extraBonus)} Spell Attack Bonus`);
      }

      window.dispatchEvent(
        new CustomEvent('damage-roll', {
          detail: {
            value: result,
            breakdown: segments.join(' '),
            source: `${spell?.name || 'Spell'} Spell Attack Roll`,
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
            modifierValues: segments.slice(1),
          },
        }),
      );
    },
    [
      diceFaceColor,
      formatModifier,
      getSpellAttackDetails,
      spellAbilityLabel,
    ],
  );

  const handleBreathWeaponAttack = useCallback(async () => {
    if (!breathWeaponDetails) return;
    const result = await rollDamageExpression({
      damageString: breathWeaponDetails.damageString,
      ability: 0,
      crit: false,
    });
    if (!result) return;
    updateDamageValueWithAnimation(result.total, result.breakdown, 'Breath Weapon', {
      diceRolls: result.diceRolls,
      rollValues: result.rollValues,
    });
  }, [breathWeaponDetails, rollDamageExpression]);

const [showUpcast, setShowUpcast] = useState(false);
const [pendingSpell, setPendingSpell] = useState(null);

  const applyUpcast = useCallback(
    async (spell, level, crit, slotType) => {
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
    const rollParams = {
      damageString: spell.damage,
      ability: 0,
      crit: crit || isCritical,
      extraDice: extra,
      levelsAbove: diff > 0 ? diff : 0,
    };

    const value = await rollDamageExpression(rollParams);

    if (!value) return;

    if (onCastSpell) {
      const payload = {
        level,
        slotType,
        damage: value.total,
        breakdown: value.breakdown,
        castingTime: spell.castingTime,
        name: spell.name,
      };
      if (Array.isArray(value.diceRolls) && value.diceRolls.length > 0) {
        payload.diceRolls = value.diceRolls;
      }
      if (Array.isArray(value.rollValues) && value.rollValues.length > 0) {
        payload.rollValues = value.rollValues;
      }
      onCastSpell(payload);
      return;
    }

    const extraDetails = {};
    if (Array.isArray(value.diceRolls) && value.diceRolls.length > 0) {
      extraDetails.diceRolls = value.diceRolls;
    }
    if (Array.isArray(value.rollValues) && value.rollValues.length > 0) {
      extraDetails.rollValues = value.rollValues;
    }

    if (Object.keys(extraDetails).length > 0) {
      updateDamageValueWithAnimation(
        value.total,
        value.breakdown,
        spell.name,
        extraDetails,
      );
    } else {
      updateDamageValueWithAnimation(value.total, value.breakdown, spell.name);
    }
  }, [isCritical, onCastSpell, rollDamageExpression, totalLevel]);

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

const triggerDiceAnimation = useCallback((diceDetails = []) => {
  if (!Array.isArray(diceDetails) || diceDetails.length === 0) {
    setActiveDice([]);
    return;
  }

  const timestamp = Date.now();
  const nextDice = diceDetails.map((detail, index) => ({
    id: `${timestamp}-${index}`,
    value:
      typeof detail?.value === 'number'
        ? detail.value
        : Number(detail?.value) || 0,
    sides: Number.isFinite(detail?.sides) ? Math.max(2, Math.round(detail.sides)) : 20,
    type: detail?.type || '',
    category: detail?.category || 'base',
  }));

  setActiveDice(nextDice);
}, []);

const preparedDice = useMemo(
  () =>
    activeDice.map((die) => {
      const normalizedType = normalizeDamageTypeForClass(die.type);
      const typeColor = resolveDamageTypeColor(normalizedType);
      return {
        ...die,
        typeClass: normalizedType ? `damage-${normalizedType}` : '',
        typeColor,
      };
    }),
  [activeDice],
);

const showOverlayDice = useMemo(() => {
  if (!Array.isArray(preparedDice) || preparedDice.length === 0) {
    return false;
  }

  const uniqueColors = new Set();

  preparedDice.forEach((die) => {
    const normalizedColor = normalizeDiceColor(die?.typeColor);
    if (normalizedColor) {
      uniqueColors.add(normalizedColor);
    }
  });

  return uniqueColors.size > 1;
}, [preparedDice]);

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
        diceRollDetails: Array.isArray(extra.diceRolls)
          ? extra.diceRolls.map((detail) => ({
              value:
                typeof detail?.value === 'number'
                  ? detail.value
                  : Number(detail?.value) || 0,
              sides: Number.isFinite(detail?.sides)
                ? Math.max(2, Math.round(detail.sides))
                : undefined,
              type: typeof detail?.type === 'string' ? detail.type : '',
              category:
                typeof detail?.category === 'string' && detail.category.trim()
                  ? detail.category
                  : 'base',
            }))
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

useEffect(() => {
  if (!lastRollTimestamp) {
    return undefined;
  }
  const timer = setTimeout(() => {
    setActiveDice([]);
  }, 2600);
  return () => clearTimeout(timer);
}, [lastRollTimestamp]);

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
const passLogRef = useRef(null);
const damageWrapperRef = useRef(null);
const damageAmountRef = useRef(null);
const [damageLayout, setDamageLayout] = useState({
  maxWidth: 360,
  diceSize: 220,
});

const updateDamageLayout = useCallback(() => {
  if (typeof window === 'undefined') {
    return;
  }

  const passLogEl = passLogRef.current;
  const wrapperEl = damageWrapperRef.current;

  if (!passLogEl || !wrapperEl) {
    return;
  }

  const wrapperWidth = wrapperEl.clientWidth || window.innerWidth;
  const spellSlotsEl = document.querySelector('.spell-slot-container');
  const footerButtonsContainer = document.querySelector('.footer-btn')?.parentElement;

  const widthCandidates = [wrapperWidth];

  if (spellSlotsEl) {
    const { width } = spellSlotsEl.getBoundingClientRect();
    if (Number.isFinite(width) && width > 0) {
      widthCandidates.push(width);
    }
  }

  if (footerButtonsContainer) {
    const { width } = footerButtonsContainer.getBoundingClientRect();
    if (Number.isFinite(width) && width > 0) {
      widthCandidates.push(width);
    }
  }

  const positiveWidths = widthCandidates.filter((value) => Number.isFinite(value) && value > 0);
  const maxAllowedWidth = positiveWidths.length > 0 ? Math.min(...positiveWidths) : wrapperWidth;

  const passLogRect = passLogEl.getBoundingClientRect();
  const boundaries = [];

  if (spellSlotsEl) {
    const { top } = spellSlotsEl.getBoundingClientRect();
    if (Number.isFinite(top)) {
      boundaries.push(top);
    }
  }

  const navbarEl = document.querySelector('nav.navbar.fixed-bottom');
  if (navbarEl) {
    const { top } = navbarEl.getBoundingClientRect();
    if (Number.isFinite(top)) {
      boundaries.push(top);
    }
  }

  const viewportHeight = window.innerHeight || document.documentElement?.clientHeight || 0;
  if (viewportHeight) {
    boundaries.push(viewportHeight - 24);
  }

  const bottomBoundary = boundaries.length > 0 ? Math.min(...boundaries) : viewportHeight;
  const verticalGap = bottomBoundary ? bottomBoundary - passLogRect.bottom - 16 : maxAllowedWidth;
  const maxAllowedHeight = Math.max(140, verticalGap);
  const diceSize = Math.max(140, Math.min(maxAllowedWidth, maxAllowedHeight));

  setDamageLayout((prev) => {
    const next = {
      maxWidth: Number.isFinite(maxAllowedWidth) && maxAllowedWidth > 0 ? maxAllowedWidth : prev.maxWidth,
      diceSize: Number.isFinite(diceSize) && diceSize > 0 ? diceSize : prev.diceSize,
    };

    if (
      Math.abs(next.maxWidth - prev.maxWidth) < 0.5 &&
      Math.abs(next.diceSize - prev.diceSize) < 0.5
    ) {
      return prev;
    }

    return next;
  });
}, []);

useEffect(() => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  updateDamageLayout();

  const handleResize = () => {
    updateDamageLayout();
  };

  window.addEventListener('resize', handleResize);

  let mutationObserver;
  if (typeof MutationObserver !== 'undefined') {
    mutationObserver = new MutationObserver(() => updateDamageLayout());

    const registerTargets = () => {
      const targets = [
        document.querySelector('.spell-slot-container'),
        document.querySelector('.footer-btn')?.parentElement,
        document.querySelector('nav.navbar.fixed-bottom'),
      ].filter(Boolean);

      if (targets.length === 0) {
        return false;
      }

      targets.forEach((target) => {
        mutationObserver.observe(target, {
          attributes: true,
          childList: true,
          subtree: true,
        });
      });

      return true;
    };

    if (!registerTargets()) {
      const bodyTarget = document.body;
      if (bodyTarget) {
        mutationObserver.observe(bodyTarget, {
          childList: true,
          subtree: true,
        });
      }
    }
  }

  const timeoutId = window.setTimeout(() => updateDamageLayout(), 150);

  return () => {
    window.removeEventListener('resize', handleResize);
    window.clearTimeout(timeoutId);
    if (mutationObserver) {
      mutationObserver.disconnect();
    }
  };
}, [updateDamageLayout]);

useEffect(() => {
  updateDamageLayout();
}, [updateDamageLayout, passDisabled, showLog, showAttack, activeDice.length]);

const resolvedMaxWidth = Number.isFinite(damageLayout.maxWidth)
  ? damageLayout.maxWidth
  : 360;
const resolvedDiceSize = Number.isFinite(damageLayout.diceSize)
  ? damageLayout.diceSize
  : 220;
const damageContainerMinHeight = Math.max(240, resolvedDiceSize + 160);
const damageAmountStyle = {
  '--damage-roller-max-width': `${resolvedMaxWidth}px`,
  '--damage-roller-min-height': `${damageContainerMinHeight}px`,
  '--damage-dice-area-size': `${resolvedDiceSize}px`,
};
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div
        ref={passLogRef}
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
        ref={damageWrapperRef}
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '4px',
          width: '100%',
        }}
      >
        <div
          id="damageAmount"
          ref={damageAmountRef}
          style={damageAmountStyle}
          className={`${pulseClass} ${isCritical ? 'critical-active' : ''} ${
            isFumble ? 'critical-failure' : ''
          }`}
        >
          <div className="attack-roll-controls damage-roller__controls">
            <div
              className="damage-roller__dice-wrapper"
              style={{
                width: `${resolvedDiceSize}px`,
                height: `${resolvedDiceSize}px`,
              }}
            >
              <div
                className="damage-roller__dice-area"
                aria-hidden="true"
                style={{
                  width: `${resolvedDiceSize}px`,
                  height: `${resolvedDiceSize}px`,
                }}
              >
                <DamageDiceCanvas
                  dice={preparedDice}
                  diceColor={diceFaceColor}
                  instanceKey={characterId}
                  showOverlayDice={showOverlayDice}
                />
              </div>
              <div className="damage-roller__overlay">
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
                <div className="damage-roller__overlay-button">
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
                  {(entry.actionLabel && entry.expression) ||
                  entry.breakdown ||
                  (Array.isArray(entry.rollValues) && entry.rollValues.length > 0) ||
                  (Array.isArray(entry.modifierValues) && entry.modifierValues.length > 0) ? (
                    <div>
                      {entry.actionLabel && entry.expression && (
                        <div>{`${entry.actionLabel} - (${entry.expression})`}</div>
                      )}
                      {(() => {
                        const breakdownSegments = parseDamageBreakdownSegments(
                          entry.breakdown,
                          normalizeDamageTypeForClass,
                        );
                        const modifierValues = Array.isArray(entry.modifierValues)
                          ? entry.modifierValues.filter(
                              (value) => typeof value === 'string' && value.trim(),
                            )
                          : [];
                        const diceRollDetails = Array.isArray(entry.diceRollDetails)
                          ? entry.diceRollDetails
                          : [];

                        const shouldShowGroupedSegments =
                          breakdownSegments.length > 0 &&
                          (diceRollDetails.length > 0 || modifierValues.length > 0);

                        if (shouldShowGroupedSegments) {
                          const diceGroups = groupDiceRollsByType(
                            diceRollDetails,
                            normalizeDamageTypeForClass,
                          );
                          let remainingModifiers = [...modifierValues];

                          return breakdownSegments.map((segment, segmentIdx) => {
                            const key = segment.normalizedType || DEFAULT_DAMAGE_TYPE_KEY;
                            const diceForType = diceGroups.get(key) || [];
                            const assignedDice = diceForType.splice(0, diceForType.length);

                            const detailItems = [];

                            assignedDice.forEach((detail, dieIdx) => {
                              const numericValue = Number(detail?.value);
                              if (!Number.isFinite(numericValue)) {
                                return;
                              }

                              detailItems.push(
                                <div
                                  key={`segment-${segmentIdx}-die-${dieIdx}`}
                                  className="damage-log__segment-detail"
                                >
                                  - {numericValue}
                                </div>
                              );
                            });

                            if (segmentIdx === 0 && remainingModifiers.length > 0) {
                              const appliedModifiers = remainingModifiers.splice(
                                0,
                                remainingModifiers.length,
                              );
                              appliedModifiers.forEach((modifier, modIdx) => {
                                detailItems.push(
                                  <div
                                    key={`segment-${segmentIdx}-modifier-${modIdx}`}
                                    className="damage-log__segment-detail"
                                  >
                                    - {modifier}
                                  </div>
                                );
                              });
                            }

                            return (
                              <div
                                key={`breakdown-${segmentIdx}`}
                                className="damage-log__segment"
                              >
                                <div>
                                  -{' '}
                                  <span className={segment.className}>{segment.text}</span>
                                </div>
                                {detailItems.length > 0 && (
                                  <div className="damage-log__segment-details">
                                    {detailItems}
                                  </div>
                                )}
                              </div>
                            );
                          });
                        }

                        const fallbackSegments = breakdownSegments.length
                          ? breakdownSegments
                          : parseDamageBreakdownSegments(
                              entry.breakdown,
                              normalizeDamageTypeForClass,
                            );

                        return (
                          <>
                            {fallbackSegments.map((segment, i) => (
                              <div key={`breakdown-${i}`}>
                                -{' '}
                                <span className={segment.className}>{segment.text}</span>
                              </div>
                            ))}
                            {Array.isArray(entry.rollValues) &&
                              entry.rollValues.map((value, rollIdx) => (
                                <div key={`roll-${rollIdx}`}>- {value}</div>
                              ))}
                            {Array.isArray(entry.modifierValues) &&
                              entry.modifierValues.map((value, modIdx) => (
                                <div key={`mod-${modIdx}`}>- {value}</div>
                              ))}
                          </>
                        );
                      })()}
                    </div>
                  ) : null}
                </li>
              )
            )}
          </ul>
        </Modal.Body>
      </Modal>
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
                  const popoverId = `weapon-properties-${slot}`;
                  const masteryDetail = getWeaponMasteryDetails(weapon);
                  const masteryPopoverId = `weapon-mastery-${slot}`;
                  const propertiesDisplay =
                    propertyLabels.length > 0
                      ? propertyLabels.join(', ')
                      : 'None';
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

                  const masteryPopover = masteryDetail
                    ? (
                        <Popover id={masteryPopoverId}>
                          <Popover.Header as="h3">Weapon Mastery</Popover.Header>
                          <Popover.Body>
                            <div className="weapon-mastery">
                              <div className="weapon-mastery__name">{masteryDetail.label}</div>
                              <div className="weapon-mastery__description">
                                {masteryDetail.description}
                              </div>
                            </div>
                          </Popover.Body>
                        </Popover>
                      )
                    : null;

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
                        {masteryDetail && masteryPopover && (
                          <OverlayTrigger
                            trigger="click"
                            placement="auto"
                            overlay={masteryPopover}
                            rootClose
                          >
                            <Button
                              type="button"
                              variant="link"
                              className="attack-card__roll attack-card__mastery"
                              aria-label={`View ${masteryDetail.label} mastery description`}
                            >
                              <i className="fa-solid fa-crown" aria-hidden="true"></i>
                            </Button>
                          </OverlayTrigger>
                        )}
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
                    .map((spell, idx) => {
                      const details = getSpellAttackDetails(spell);
                      const showAttack = Boolean(details);
                      return (
                        <div className="attack-card" key={idx}>
                          <div className="attack-card__title">{spell.name}</div>
                          <div className="attack-card__meta">
                            <span>{spell.casterType || spell.caster || 'Unknown'}</span>
                            <span>• Level {spell.level}</span>
                          </div>
                          <div className="attack-card__details">
                            {showAttack && details && (
                              <div className="attack-card__row">
                                <span className="attack-card__label">Attack Bonus</span>
                                <span className="attack-card__value">
                                  {formatModifier(details.total)}
                                </span>
                              </div>
                            )}
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
                            {showAttack && (
                              <Button
                                onClick={() => {
                                  handleSpellAttackRoll(spell);
                                  handleCloseAttack();
                                }}
                                variant="link"
                                aria-label="Roll spell attack"
                                className="attack-card__roll"
                              >
                                <i className="fa-solid fa-bullseye"></i>
                              </Button>
                            )}
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
                      );
                    })}
                </div>
              </>
            )}
            {fiendishLegacySpells.length > 0 && (
              <>
                <Card.Title className="modal-title mt-4">Fiendish Legacy</Card.Title>
                <div className="attack-card-grid">
                  {fiendishLegacySpells.map((spell, idx) => {
                    const details = getSpellAttackDetails(spell);
                    const showAttack = Boolean(details);
                    return (
                      <div className="attack-card" key={`fiendish-${idx}`}>
                        <div className="attack-card__title">{spell.name}</div>
                        <div className="attack-card__meta">
                          <span>{spell.casterType || 'Fiendish Legacy'}</span>
                          <span>• Level {spell.level}</span>
                        </div>
                        <div className="attack-card__details">
                          {showAttack && details && (
                            <div className="attack-card__row">
                              <span className="attack-card__label">Attack Bonus</span>
                              <span className="attack-card__value">
                                {formatModifier(details.total)}
                              </span>
                            </div>
                          )}
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
                          {showAttack && (
                            <Button
                              onClick={() => {
                                handleSpellAttackRoll(spell);
                                handleCloseAttack();
                              }}
                              variant="link"
                              aria-label="Roll spell attack"
                              className="attack-card__roll"
                            >
                              <i className="fa-solid fa-bullseye"></i>
                            </Button>
                          )}
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
                    );
                  })}
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
        onSelect={async (lvl, type) => {
          if (pendingSpell) {
            await applyUpcast(pendingSpell.spell, lvl, pendingSpell.crit, type);
            setPendingSpell(null);
          }
          setShowUpcast(false);
        }}
      />
    </div>
  );
});

export default PlayerTurnActions;
