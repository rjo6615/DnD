
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import apiFetch from '../../../utils/apiFetch';
import { createCombatState as normalizeTimelineState, advanceTurn, getActiveConditionsForCombatant, getEffectiveSpeed } from '../utils/combatTimeline';
import { useParams } from "react-router-dom";
import { Navbar, Container, Modal, Card, Button as BootstrapButton } from 'react-bootstrap';
import '../../../App.scss';
import CharacterInfo from "../attributes/CharacterInfo";
import Stats from "../attributes/Stats";
import Skills from "../attributes/Skills";
import Feats from "../attributes/Feats";
import { calculateFeatPointsLeft } from '../../../utils/featUtils';
import PlayerTurnActions, {
  calculateDamage,
} from "../attributes/PlayerTurnActions";
import {
  rollDiceWithBox,
  subscribeToDiceBoxAvailability,
  isDiceBoxReady as checkDiceBoxReady,
  hasDiceBoxFailed as checkDiceBoxFailed,
} from '../../../utils/diceBoxManager';
import {
  collectRollValues,
  normalizeRollValue,
  sanitizeRollGroup,
} from '../../../utils/diceResults';
import Help from "../attributes/Help";
import { SKILLS } from "../skillSchema";
import {
  STAT_KEYS,
  aggregateStatEffects,
  collectFeatAbilityBonuses,
  collectFeatNumericBonuses,
  calculateCharacterInitiative,
} from "../utils/derivedStats";
import {
  calculateCharacterArmorClass,
  resolveCombatantArmorClass,
  calculateCharacterHitPoints,
  calculateCharacterMovementSpeed,
} from "../utils/characterMetrics";
import SpellSelector from "../attributes/SpellSelector";
import StatusEffectBar from "../attributes/StatusEffectBar";
import BackgroundModal from "../attributes/BackgroundModal";
import Features from "../attributes/Features";
import SpellSlots from "../attributes/SpellSlots";
import { fullCasterSlots, pactMagic } from '../../../utils/spellSlots';
import { getMonkFocusPoints } from '../../../utils/monk';
import { activateBrutalStrike, activateRage, activateRecklessAttack, applyBrutalStrikeChoice, applyRageRest, canActivateBrutalStrike, canActivateRecklessAttack, consumeBrutalStrikeOnAttackResolution, endRage, endRecklessAttack, getBarbarianLevel, getBrutalStrikeChoice, getBrutalStrikePendingEffect, getRageBenefits, getRageState, getRecklessAttackState, hasHeavyArmorEquipped, resolveBrutalStrikeAttack } from '../utils/barbarian';
import { FaDiceD20 } from "react-icons/fa";
import { Backpack, BookOpen, CircleHelp, Dice5, Dumbbell, Gem, HeartPulse, Package, Settings, Shield, Sparkles, Swords, UserRound } from "lucide-react";
import { Button as HudButton, Dock, IconButton, Panel, Toolbar } from "../common/HudPrimitives";
import hasteIcon from "../../../images/spell-haste-icon.png";
import largeFormIcon from "../../../images/large-form-icon.png";
import dragonWingsIcon from "../../../images/dragon-wings-icon.png";
import adrenalineRushIcon from "../../../images/adrenaline-rush.png";
import speakWithAnimalsIcon from "../../../images/speak-with-animal.png";
import ShopModal from "../attributes/ShopModal";
import InventoryModal from "../attributes/InventoryModal";
import EquipmentModal from "../attributes/EquipmentModal";
import { resolveFigurineImageData } from '../utils/figurineAssets';
import {
  normalizeItems as normalizeInventoryItems,
  normalizeAccessories as normalizeInventoryAccessories,
} from "../attributes/inventoryNormalization";
import { normalizeEquipmentMap } from "../attributes/equipmentNormalization";
import { sanitizeInventoryItemsForUpdate } from "../attributes/inventorySanitization";
import MapModal from "../attributes/MapModal";
import { INACTIVE_COMBAT_TARGETING } from '../utils/attackResolution';
import { declineRetaliation, processRetaliationDamageEvent, startReactionAttack } from '../utils/retaliation';
import { ENEMY_FIGURINE_COLOR } from '../constants/tokenAppearance';
import { mergeTokenPayload } from "./utils/mergeTokenPayload";
import proficiencyBonus from '../../../utils/proficiencyBonus';
import TokenPickerModal from '../components/TokenPickerModal';
import buildPlayerTokenFolderScope from '../utils/playerTokenFilters';
import FooterCharacterSlot from './components/FooterCharacterSlot';
import { notify } from '../../../utils/notification';
import { bindCriticalRollTransport } from '../../../utils/criticalRolls';
import { emitCriticalRollEvent } from '../../../utils/criticalRolls';
import CombatTurnHeader, { HEADER_PADDING } from "../components/CombatTurnHeader";
import CombatConditionsModal from '../components/CombatConditionsModal';
import { notifyIncomingDamage } from '../utils/incomingDamageNotification';

const MIN_DOCKED_MODAL_WIDTH = 320;
const DOCKED_MODAL_VIEWPORT_PADDING = 32;

function useMediaQuery(query) {
  const getMatches = useCallback(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQueryList = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQueryList.matches);

    handleChange();

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', handleChange);
      return () => mediaQueryList.removeEventListener('change', handleChange);
    }

    mediaQueryList.addListener(handleChange);
    return () => mediaQueryList.removeListener(handleChange);
  }, [getMatches, query]);

  return matches;
}

const DOCKABLE_MODAL_DEFINITIONS = {
  characterInfo: { label: 'Character Info', component: CharacterInfo },
  stats: { label: 'Stats', component: Stats },
  skills: { label: 'Skills', component: Skills },
  feats: { label: 'Feats', component: Feats },
  features: { label: 'Features', component: Features },
  spells: { label: 'Spells', component: SpellSelector },
  equipment: { label: 'Equipment', component: EquipmentModal },
  inventory: { label: 'Inventory', component: InventoryModal },
  shop: { label: 'Shop', component: ShopModal },
  help: { label: 'Help', component: Help },
};
const createEmptyCombatState = () => normalizeTimelineState();
export const formatSignedBonus = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return `${numeric >= 0 ? '+' : ''}${numeric}`;
};

export const resolveFooterProficiencyBonus = (character, totalLevel) => {
  const provided = Number(character?.proficiencyBonus);
  return Number.isFinite(provided) ? provided : proficiencyBonus(totalLevel);
};

const CREATURE_SIZE_KEYS = ['gargantuan', 'huge', 'large', 'medium', 'small', 'tiny'];

const normalizeCreatureSize = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  const directMatch = CREATURE_SIZE_KEYS.find((size) => trimmed === size);
  if (directMatch) {
    return directMatch;
  }

  const tokens = trimmed.split(/[^a-z]+/).filter(Boolean);
  const tokenMatch = CREATURE_SIZE_KEYS.find((size) => tokens.includes(size));
  if (tokenMatch) {
    return tokenMatch;
  }

  const prefixMatch = CREATURE_SIZE_KEYS.find((size) => trimmed.startsWith(size));
  if (prefixMatch) {
    return prefixMatch;
  }

  return null;
};

const toFiniteNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const resolveCharacterTokenSize = (form) =>
  normalizeCreatureSize(
    form?.temporarySize ??
      form?.size ??
      form?.characterSize ??
      form?.character?.size ??
      form?.creature?.size ??
      form?.profile?.size ??
      form?.race?.size ??
      form?.attributes?.size ??
      form?.displayType
  );

const normalizeCombatState = (state) => {
  if (!state || typeof state !== "object") {
    return createEmptyCombatState();
  }

  const participants = Array.isArray(state.participants)
    ? state.participants
        .map((participant) => {
          if (
            !participant ||
            typeof participant.characterId !== "string" ||
            participant.characterId.trim() === ""
          ) {
            return null;
          }

          const initiativeValue = Number(participant.initiative);
          const displayName =
            typeof participant.displayName === "string" &&
            participant.displayName.trim() !== ""
              ? participant.displayName.trim()
              : null;

          const currentHpValue = toFiniteNumberOrNull(
            participant.currentHp ?? participant.hpCurrent
          );
          const maxHpValue = toFiniteNumberOrNull(
            participant.maxHp ?? participant.hpMax
          );

          return {
            characterId: participant.characterId.trim(),
            initiative: Number.isFinite(initiativeValue) ? initiativeValue : 0,
            ...(displayName ? { displayName } : {}),
            ...(currentHpValue !== null ? { currentHp: currentHpValue } : {}),
            ...(maxHpValue !== null ? { maxHp: maxHpValue } : {}),
          };
        })
        .filter(Boolean)
    : [];

  const activeTurnCandidate =
    state.activeTurn === null || state.activeTurn === undefined
      ? null
      : Number(state.activeTurn);

  const activeTurn =
    Number.isInteger(activeTurnCandidate) &&
    activeTurnCandidate >= 0 &&
    activeTurnCandidate < participants.length
      ? activeTurnCandidate
      : null;

  return normalizeTimelineState({ ...state, participants, activeTurn });
};

const collectCharacterIdentifiers = (entity) => {
  if (!entity || typeof entity !== 'object') {
    return [];
  }

  const identifiers = [];
  if (typeof entity._id === 'string' && entity._id.trim() !== '') {
    identifiers.push(entity._id.trim());
  }
  if (
    typeof entity.characterId === 'string' &&
    entity.characterId.trim() !== ''
  ) {
    identifiers.push(entity.characterId.trim());
  }

  return Array.from(new Set(identifiers));
};

const mapCharactersById = (characters) => {
  if (!Array.isArray(characters)) {
    return {};
  }

  return characters.reduce((acc, character) => {
    if (!character || typeof character !== 'object') {
      return acc;
    }

    collectCharacterIdentifiers(character).forEach((identifier) => {
      acc[identifier] = character;
    });

    return acc;
  }, {});
};

const clamp01 = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  if (parsed < 0) {
    return 0;
  }
  if (parsed > 1) {
    return 1;
  }
  return parsed;
};

const normalizeRotation = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const normalized = parsed % 360;
  const resolved = normalized < 0 ? normalized + 360 : normalized;
  return Math.round(resolved * 1000) / 1000;
};

const createCircleState = () => ({
  0: 'active',
  1: 'active',
  2: 'active',
  3: 'active',
});

const createDefaultUsedSlots = () => ({
  action: createCircleState(),
  bonus: createCircleState(),
  focus: 0,
});

const mergeUsedSlotsWithDefaults = (stored) => {
  const base = createDefaultUsedSlots();

  if (!stored || typeof stored !== 'object') {
    return base;
  }

  const result = { ...base };

  Object.entries(stored).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') {
      return;
    }

    if (key === 'action' || key === 'bonus') {
      const baseEntry = { ...result[key] };

      Object.entries(value).forEach(([slotKey, slotValue]) => {
        const index = Number(slotKey);
        if (!Number.isInteger(index) || index < 0) {
          return;
        }

        if (slotValue === 'used' || slotValue === true) {
          baseEntry[index] = 'used';
        } else if (slotValue === 'active') {
          baseEntry[index] = 'active';
        }
      });

      result[key] = baseEntry;
      return;
    }

    if (key === 'focus') {
      const parsed =
        typeof value === 'number'
          ? value
          : typeof value === 'string'
          ? Number.parseFloat(value)
          : Number(value?.spent ?? value);

      if (Number.isFinite(parsed) && parsed > 0) {
        result.focus = Math.max(0, Math.floor(parsed));
      }
      return;
    }

    const normalizedEntry = {};

    Object.entries(value).forEach(([slotKey, slotValue]) => {
      const index = Number(slotKey);
      if (!Number.isInteger(index) || index < 0) {
        return;
      }

      if (slotValue === true || slotValue === 'used') {
        normalizedEntry[index] = true;
      } else if (slotValue === false) {
        normalizedEntry[index] = false;
      }
    });

    if (Object.keys(normalizedEntry).length > 0) {
      result[key] = normalizedEntry;
    }
  });

  return result;
};

const serializeUsedSlotsForStorage = (slots) => {
  if (!slots || typeof slots !== 'object') {
    return {};
  }

  const payload = {};

  Object.entries(slots).forEach(([key, value]) => {
    if (!value || typeof value !== 'object') {
      return;
    }

    if (key === 'action' || key === 'bonus') {
      const usedEntries = {};
      Object.entries(value).forEach(([slotKey, slotValue]) => {
        if (slotValue === 'used') {
          usedEntries[slotKey] = 'used';
        }
      });

      if (Object.keys(usedEntries).length > 0) {
        payload[key] = usedEntries;
      }

      return;
    }

    if (key === 'focus') {
      const numericValue = Number(value);
      if (Number.isFinite(numericValue) && numericValue > 0) {
        payload.focus = Math.floor(numericValue);
      }
      return;
    }

    const usedEntries = {};
    Object.entries(value).forEach(([slotKey, slotValue]) => {
      if (slotValue === true || slotValue === 'used') {
        usedEntries[slotKey] = true;
      }
    });

    if (Object.keys(usedEntries).length > 0) {
      payload[key] = usedEntries;
    }
  });

  return payload;
};

const sanitizeToken = (tokenValue, fallbackId) => {
  if (!tokenValue || typeof tokenValue !== 'object') {
    return null;
  }

  const candidate = { ...tokenValue };
  const candidateId =
    (typeof candidate.characterId === 'string' && candidate.characterId.trim()) ||
    (typeof fallbackId === 'string' && fallbackId.trim()) ||
    null;

  if (!candidateId) {
    return null;
  }

  const x = clamp01(candidate.x);
  const y = clamp01(candidate.y);

  if (x === null || y === null) {
    return null;
  }

  const sanitized = { ...candidate, characterId: candidateId, x, y };

  if (Object.prototype.hasOwnProperty.call(candidate, 'rotation')) {
    const normalizedRotation = normalizeRotation(candidate.rotation);
    if (normalizedRotation === null) {
      delete sanitized.rotation;
    } else {
      sanitized.rotation = normalizedRotation;
    }
  }

  const normalizedSize = normalizeCreatureSize(candidate.size);
  if (normalizedSize) {
    sanitized.size = normalizedSize;
  } else if (Object.prototype.hasOwnProperty.call(candidate, 'size')) {
    delete sanitized.size;
  }

  return sanitized;
};

const sanitizeTokenDictionary = (tokens) => {
  if (!tokens || typeof tokens !== 'object') {
    return {};
  }

  if (Array.isArray(tokens)) {
    return tokens.reduce((acc, entry) => {
      const token = sanitizeToken(entry);
      if (token) {
        acc[token.characterId] = token;
      }
      return acc;
    }, {});
  }

  return Object.entries(tokens).reduce((acc, [key, value]) => {
    const token = sanitizeToken(value, key);
    if (token) {
      acc[token.characterId] = token;
    }
    return acc;
  }, {});
};

const sanitizeTokensByMapId = (tokensByMapId) => {
  if (!tokensByMapId || typeof tokensByMapId !== 'object') {
    return {};
  }

  return Object.entries(tokensByMapId).reduce((acc, [mapId, tokens]) => {
    if (typeof mapId !== 'string') {
      return acc;
    }

    const trimmed = mapId.trim();
    if (!trimmed) {
      return acc;
    }

    acc[trimmed] = sanitizeTokenDictionary(tokens);
    return acc;
  }, {});
};

const collectTokensFromMaps = (maps) => {
  if (!Array.isArray(maps)) {
    return {};
  }

  return maps.reduce((acc, entry) => {
    if (!entry || typeof entry !== 'object') {
      return acc;
    }

    const mapId =
      typeof entry.mapId === 'string' && entry.mapId.trim() !== '' ? entry.mapId.trim() : null;

    if (!mapId) {
      return acc;
    }

    const tokens = sanitizeTokenDictionary(entry.tokens);
    if (Object.keys(tokens).length === 0) {
      return acc;
    }

    acc[mapId] = tokens;
    return acc;
  }, {});
};

const parseErrorMessage = async (response, fallbackMessage) => {
  if (!response || typeof response !== 'object') {
    return fallbackMessage;
  }

  try {
    const data = await response.json();
    if (typeof data === 'string' && data.trim() !== '') {
      return data.trim();
    }
    if (data && typeof data.message === 'string' && data.message.trim() !== '') {
      return data.message.trim();
    }
  } catch (error) {
    // Ignore JSON parsing errors
  }

  return fallbackMessage;
};

const SPELLCASTING_CLASSES = {
  bard: 'full',
  cleric: 'full',
  druid: 'full',
  sorcerer: 'full',
  wizard: 'full',
  warlock: 'full',
  paladin: 'half',
  ranger: 'half',
};


export const getFooterConditionLabel = (count) => {
  const numericCount = Number(count) || 0;
  if (numericCount <= 0) return 'No conditions';
  return `${numericCount} ${numericCount === 1 ? 'Condition' : 'Conditions'}`;
};

export const getFooterConditionSummary = (conditions) => {
  const activeConditions = Array.isArray(conditions) ? conditions.filter(Boolean) : [];
  const activeStatusCount = activeConditions.length;

  return {
    empty: activeStatusCount === 0,
    label: getFooterConditionLabel(activeStatusCount),
    conditions: activeConditions,
    activeStatusCount,
  };
};

export const buildFooterConditions = (character, normalizeCollection, combatState, combatantId, resolveCombatantName) => {
  const normalize = typeof normalizeCollection === 'function' ? normalizeCollection : (value) => value || [];
  const conditions = normalize(character?.conditions || character?.statusConditions);
  const recklessActive = getRecklessAttackState(character).active;
  let withReckless = recklessActive && !conditions.some((condition) => String(condition?.name || condition?.label || condition?.id || '').toLowerCase() === 'reckless attack')
    ? [{ id: 'reckless-attack-effect', icon: '⚔️', name: 'Reckless Attack', displayLines: ['Reckless', 'Attack'], color: '#f59e0b' }, ...conditions]
    : conditions;
  if (getBrutalStrikePendingEffect(combatState, combatantId)) {
    withReckless = [{ id: 'brutal-strike-pending', icon: '👊', name: 'Brutal Strike', duration: 'Until end of turn', color: '#dc6047' }, ...withReckless];
  }
  const combatConditions = getActiveConditionsForCombatant(combatantId, combatState, resolveCombatantName);
  withReckless = [...combatConditions, ...withReckless];
  if (!getRageState(character).active) {
    return withReckless;
  }
  const hasRageCondition = conditions.some((condition) =>
    String(condition?.name || condition?.label || condition?.id || '').toLowerCase() === 'rage'
  );
  return hasRageCondition
    ? withReckless
    : [{ id: 'rage-condition', icon: '🔥', name: 'Rage', color: '#f0733f' }, ...withReckless];
};


export default function ZombiesCharacterSheet() {
  const params = useParams();
  const characterId = params.id;
  const isTestEnvironment =
    typeof process !== 'undefined' && process?.env?.NODE_ENV === 'test';
  const [form, setForm] = useState(null);
  const [campaignId, setCampaignId] = useState(null);
  const [combatState, setCombatState] = useState(createEmptyCombatState());
  const [resolvedDamageEvent, setResolvedDamageEvent] = useState(null);
  const processedRetaliationDamageIdsRef = useRef(new Set());
  const retaliationSubmittingRef = useRef(null);
  const [retaliationSubmittingId, setRetaliationSubmittingId] = useState(null);
  const [brutalStrikeSelection, setBrutalStrikeSelection] = useState('');
  const brutalStrikeSubmittingRef = useRef(false);
  const [campaignCharacters, setCampaignCharacters] = useState({});
  const [enemies, setEnemies] = useState([]);
  const campaignCharactersRef = useRef(campaignCharacters);
  const enemiesRef = useRef(enemies);
  campaignCharactersRef.current = campaignCharacters;
  enemiesRef.current = enemies;
  const [campaignMaps, setCampaignMaps] = useState([]);
  const [campaignActiveMapId, setCampaignActiveMapId] = useState(null);
  const [campaignMap, setCampaignMap] = useState(null);
  const [campaignMapTokens, setCampaignMapTokens] = useState({});
  const [activeMapTokens, setActiveMapTokens] = useState({});
  const [combatTargeting, setCombatTargeting] = useState(INACTIVE_COMBAT_TARGETING);
  const targetingLockRef = useRef(false);
  const targetingTokenLookupRef = useRef({});
  const [showCharacterInfo, setShowCharacterInfo] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSkill, setShowSkill] = useState(false); // State for skills modal
  const [showFeats, setShowFeats] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [shopTab, setShopTab] = useState('weapons');
  const [showInventory, setShowInventory] = useState(false);
  const [inventoryTab, setInventoryTab] = useState('weapons');
  const [showEquipment, setShowEquipment] = useState(false);
  const [showSpells, setShowSpells] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showActiveConditionsModal, setShowActiveConditionsModal] = useState(false);
  const [showBackground, setShowBackground] = useState(false);
  const [spellPointsLeft, setSpellPointsLeft] = useState(0);
  const [longRestCount, setLongRestCount] = useState(0);
  const [shortRestCount, setShortRestCount] = useState(0);
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [tokenPickerSaving, setTokenPickerSaving] = useState(false);
  const [tokenPickerError, setTokenPickerError] = useState(null);
  const [diceBoxStatus, setDiceBoxStatus] = useState(() => ({
    ready: isTestEnvironment ? true : checkDiceBoxReady(),
    failed: isTestEnvironment ? false : checkDiceBoxFailed(),
  }));

  useEffect(() => {
    if (isTestEnvironment) {
      return undefined;
    }

    const unsubscribe = subscribeToDiceBoxAvailability((ready) => {
      setDiceBoxStatus({
        ready: Boolean(ready),
        failed: !ready && checkDiceBoxFailed(),
      });
    });

    return () => {
      unsubscribe?.();
    };
  }, [
    setDiceBoxStatus,
    checkDiceBoxFailed,
    subscribeToDiceBoxAvailability,
    isTestEnvironment,
  ]);

  const getStoredActiveEffects = useCallback((id) => {
    if (typeof window === 'undefined' || !id) {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(`zombiesActiveEffects:${id}`);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to parse stored active effects', error);
      return [];
    }
  }, []);

  const getStoredUsedSlots = useCallback((id) => {
    if (typeof window === 'undefined' || !id) {
      return null;
    }

    try {
      const raw = window.localStorage.getItem(`zombiesUsedSlots:${id}`);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      const normalized = {};

      Object.entries(parsed).forEach(([key, value]) => {
        if (!value || typeof value !== 'object') {
          return;
        }

        if (key === 'action' || key === 'bonus') {
          const entry = {};
          Object.entries(value).forEach(([slotKey, slotValue]) => {
            if (slotKey === '__proto__') {
              return;
            }
            const index = Number(slotKey);
            if (!Number.isInteger(index) || index < 0) {
              return;
            }

            if (slotValue === 'used' || slotValue === true) {
              entry[index] = 'used';
            } else if (slotValue === 'active') {
              entry[index] = 'active';
            }
          });

          if (Object.keys(entry).length > 0) {
            normalized[key] = entry;
          }

          return;
        }

        const entry = {};

        Object.entries(value).forEach(([slotKey, slotValue]) => {
          if (slotKey === '__proto__') {
            return;
          }

          const index = Number(slotKey);
          if (!Number.isInteger(index) || index < 0) {
            return;
          }

          if (slotValue === true || slotValue === 'used') {
            entry[index] = true;
          } else if (slotValue === false) {
            entry[index] = false;
          }
        });

        if (Object.keys(entry).length > 0) {
          normalized[key] = entry;
        }
      });

      return normalized;
    } catch (error) {
      console.error('Failed to parse stored used slots', error);
      return null;
    }
  }, []);

  const [activeEffects, setActiveEffects] = useState(() =>
    getStoredActiveEffects(characterId)
  );
  const previousRestCountsRef = useRef({
    long: longRestCount,
    short: shortRestCount,
  });
  const handleRemoveEffect = useCallback((effectKey) => {
    setActiveEffects((prev) =>
      prev.filter((effect, index) => {
        if (typeof effectKey === 'number') {
          return index !== effectKey;
        }
        const name = typeof effect?.name === 'string' ? effect.name : null;
        if (!name) {
          return true;
        }
        return name !== effectKey;
      })
    );
  }, []);
  const occupations = useMemo(() => form?.occupation || [], [form?.occupation]);
  const totalLevel = useMemo(() => {
    return occupations.reduce((total, el) => {
      const level = Number(el?.Level);
      return total + (Number.isFinite(level) ? level : 0);
    }, 0);
  }, [occupations]);
  const monkFocusPoints = useMemo(() => getMonkFocusPoints(form), [form]);
  const baseActionCount = form?.features?.actionCount ?? 1;
  const [actionCount, setActionCount] = useState(baseActionCount);
  const [usedSlots, setUsedSlots] = useState(() =>
    mergeUsedSlotsWithDefaults(getStoredUsedSlots(characterId))
  );
  const usedSlotsHydrationRef = useRef(false);
  const usageResetInitializedRef = useRef({
    long: false,
    short: false,
    pass: false,
  });
  const [isPassingTurn, setIsPassingTurn] = useState(false);

  const campaignMapTokensRef = useRef({});
  const activeMapTokensRef = useRef({});
  const campaignMapRef = useRef(null);
  const campaignMapsRef = useRef([]);
  const campaignActiveMapIdRef = useRef(null);
  const appliedLargeFormMapsRef = useRef(new Set());
  const largeFormActive = useMemo(
    () => activeEffects.some((effect) => effect?.name === 'Large Form'),
    [activeEffects]
  );
  const adrenalineRushActive = useMemo(
    () => activeEffects.some((effect) => effect?.name === 'Adrenaline Rush'),
    [activeEffects]
  );
  const temporarySize = form?.temporarySize;
  const temporarySpeedBonus = form?.temporarySpeedBonus;
  const desiredTokenSize = useMemo(() => resolveCharacterTokenSize(form), [form]);
  const resolvedCharacterId = useMemo(() => {
    const candidates = [];
    if (typeof form?._id === 'string' && form._id.trim() !== '') {
      candidates.push(form._id.trim());
    }
    if (typeof form?.characterId === 'string' && form.characterId.trim() !== '') {
      candidates.push(form.characterId.trim());
    }
    if (typeof characterId === 'string' && characterId.trim() !== '') {
      candidates.push(characterId.trim());
    }
    return candidates.find(Boolean) || null;
  }, [characterId, form]);
  const resolvedCharacterIdRef = useRef(resolvedCharacterId);

  useEffect(() => {
    if (!resolvedCharacterId || !getRecklessAttackState(form).active) return;
    const isParticipant = combatState.participants.some((participant) => participant.characterId === resolvedCharacterId);
    const timelineActive = combatState.activeEffects.some((effect) =>
      effect?.definitionId === 'reckless-attack' && effect?.targetCombatantId === resolvedCharacterId);
    if (isParticipant && !timelineActive) setForm((previous) => endRecklessAttack(previous));
  }, [combatState.activeEffects, combatState.participants, form, resolvedCharacterId]);

  useEffect(() => {
    resolvedCharacterIdRef.current = resolvedCharacterId;
  }, [resolvedCharacterId]);
  const [dockedModals, setDockedModals] = useState({ left: null, right: null });
  const [dockedModalWidths, setDockedModalWidths] = useState({ left: null, right: null });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const restoredWidths = {};
    let hasRestoredWidth = false;

    ['left', 'right'].forEach((side) => {
      try {
        const raw = window.localStorage.getItem(`zombiesDockedModalWidth:${side}`);
        if (!raw) {
          return;
        }

        const parsed = Number.parseFloat(raw);
        if (!Number.isFinite(parsed)) {
          return;
        }

        const normalized = Math.max(MIN_DOCKED_MODAL_WIDTH, Math.round(parsed));
        restoredWidths[side] = normalized;
        hasRestoredWidth = true;
      } catch (storageError) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(storageError);
        }
      }
    });

    if (hasRestoredWidth) {
      setDockedModalWidths((prev) => ({ ...prev, ...restoredWidths }));
    }
  }, [setDockedModalWidths]);

  useEffect(() => {
    setActiveEffects(getStoredActiveEffects(characterId));
  }, [characterId, getStoredActiveEffects]);

  useEffect(() => {
    usageResetInitializedRef.current = { long: false, short: false, pass: false };
    usedSlotsHydrationRef.current = false;

    const stored = getStoredUsedSlots(characterId);
    const nextState = mergeUsedSlotsWithDefaults(stored);

    setUsedSlots(nextState);
    usedSlotsHydrationRef.current = true;
  }, [characterId, getStoredUsedSlots]);

  useEffect(() => {
    const benefits = getRageBenefits(form);
    if (!benefits.blocksConcentration) {
      return;
    }
    setActiveEffects((prev) => {
      const next = prev.filter((effect) => String(effect?.name || '').toLowerCase() !== 'concentration');
      return next.length === prev.length ? prev : next;
    });
  }, [form]);

  useEffect(() => {
    if (!form || !getRageState(form).active) {
      return;
    }
    const incapacitated = (form?.conditions || form?.statusConditions || []).some(
      (condition) => String(condition?.name || condition?.label || condition).toLowerCase() === 'incapacitated'
    );
    if (hasHeavyArmorEquipped(form) || incapacitated) {
      setForm((prev) => endRage(prev));
    }
  }, [form]);

  useEffect(() => {
    if (typeof window === 'undefined' || !characterId) {
      return;
    }

    const storageKey = `zombiesActiveEffects:${characterId}`;

    if (!Array.isArray(activeEffects) || activeEffects.length === 0) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(activeEffects));
    } catch (error) {
      console.error('Failed to store active effects', error);
    }
  }, [activeEffects, characterId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !characterId) {
      return;
    }

    if (!usedSlotsHydrationRef.current) {
      return;
    }

    const storageKey = `zombiesUsedSlots:${characterId}`;
    const payload = serializeUsedSlotsForStorage(usedSlots);

    if (Object.keys(payload).length === 0) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (error) {
      console.error('Failed to store used slots', error);
    }
  }, [characterId, usedSlots]);

  useEffect(() => {
    campaignMapTokensRef.current = campaignMapTokens || {};
  }, [campaignMapTokens]);

  useEffect(() => {
    activeMapTokensRef.current = activeMapTokens || {};
  }, [activeMapTokens]);

  useEffect(() => {
    campaignMapRef.current = campaignMap;
  }, [campaignMap]);

  useEffect(() => {
    campaignMapsRef.current = campaignMaps || [];
  }, [campaignMaps]);

  useEffect(() => {
    campaignActiveMapIdRef.current =
      typeof campaignActiveMapId === 'string' && campaignActiveMapId.trim() !== ''
        ? campaignActiveMapId.trim()
        : null;
  }, [campaignActiveMapId]);

  useEffect(() => {
    const normalizedCampaign =
      typeof campaignId === 'string' && campaignId.trim() !== '' ? campaignId.trim() : null;
    const normalizedCharacterId =
      typeof resolvedCharacterId === 'string' && resolvedCharacterId.trim() !== ''
        ? resolvedCharacterId.trim()
        : null;

    if (!normalizedCampaign || !normalizedCharacterId) {
      return;
    }

    const tokensByMap = campaignMapTokensRef.current || {};
    const updates = Object.entries(tokensByMap).reduce((acc, [mapId, tokens]) => {
      if (typeof mapId !== 'string') {
        return acc;
      }

      const trimmedMapId = mapId.trim();
      if (!trimmedMapId) {
        return acc;
      }

      if (!tokens || typeof tokens !== 'object') {
        return acc;
      }

      const token = tokens[normalizedCharacterId];
      if (!token || typeof token !== 'object') {
        return acc;
      }

      const clampedX = clamp01(token.x);
      const clampedY = clamp01(token.y);
      if (clampedX === null || clampedY === null) {
        return acc;
      }

      const currentSize = normalizeCreatureSize(token.size);
      if (largeFormActive) {
        if (currentSize === 'large') {
          return acc;
        }

        acc.push({ mapId: trimmedMapId, token, x: clampedX, y: clampedY, nextSize: 'large' });
        return acc;
      }

      if (currentSize === 'large' && desiredTokenSize !== 'large') {
        const appliedMaps = appliedLargeFormMapsRef.current;
        if (!(appliedMaps instanceof Set) || !appliedMaps.has(trimmedMapId)) {
          return acc;
        }

        acc.push({ mapId: trimmedMapId, token, x: clampedX, y: clampedY, nextSize: null });
      }

      return acc;
    }, []);

    if (updates.length === 0) {
      return;
    }

    const previousAppliedLargeMaps =
      appliedLargeFormMapsRef.current instanceof Set
        ? new Set(appliedLargeFormMapsRef.current)
        : new Set();
    const nextAppliedLargeMaps = new Set(previousAppliedLargeMaps);
    updates.forEach(({ mapId, nextSize }) => {
      if (nextSize === 'large') {
        nextAppliedLargeMaps.add(mapId);
      } else {
        nextAppliedLargeMaps.delete(mapId);
      }
    });
    appliedLargeFormMapsRef.current = nextAppliedLargeMaps;

    const encodedCampaign = encodeURIComponent(normalizedCampaign);
    const encodedCharacterId = encodeURIComponent(normalizedCharacterId);
    const previousCampaignTokens = campaignMapTokensRef.current || {};
    const previousActiveTokens = activeMapTokensRef.current || {};
    const previousCampaignMap = campaignMapRef.current || null;
    const timestamp = new Date().toISOString();

    const applySizeToToken = (baseToken = {}, nextSize) => {
      const nextToken = {
        ...baseToken,
        characterId: normalizedCharacterId,
        updatedAt: timestamp,
      };

      if (nextSize) {
        nextToken.size = nextSize;
      } else if (Object.prototype.hasOwnProperty.call(nextToken, 'size')) {
        delete nextToken.size;
      }

      return nextToken;
    };

    setCampaignMapTokens((prev) => {
      const next = { ...(prev || {}) };
      updates.forEach(({ mapId, token, nextSize }) => {
        const existing = { ...(next[mapId] || {}) };
        const baseToken = {
          ...(existing[normalizedCharacterId] || {}),
          ...(token || {}),
        };
        existing[normalizedCharacterId] = applySizeToToken(baseToken, nextSize);
        next[mapId] = existing;
      });
      return next;
    });

    const activeMapId = campaignActiveMapIdRef.current;
    const activeUpdate = activeMapId
      ? updates.find((update) => update.mapId === activeMapId) || null
      : null;
    const shouldUpdateActiveTokens =
      !activeMapId ||
      Boolean(activeUpdate) ||
      Boolean(activeMapTokensRef.current?.[normalizedCharacterId]);

    if (shouldUpdateActiveTokens) {
      const fallbackToken =
        (activeUpdate && activeUpdate.token) ||
        activeMapTokensRef.current?.[normalizedCharacterId] ||
        updates[0]?.token ||
        {};
      const fallbackSize =
        (activeUpdate && activeUpdate.nextSize) ||
        (updates[0] && updates[0].nextSize) ||
        null;

      setActiveMapTokens((prev) => ({
        ...(prev || {}),
        [normalizedCharacterId]: applySizeToToken({
          ...(prev?.[normalizedCharacterId] || {}),
          ...fallbackToken,
        }, fallbackSize),
      }));
    }

    setCampaignMap((prev) => {
      if (!prev) {
        return prev;
      }

      const prevMapId =
        typeof prev.mapId === 'string' && prev.mapId.trim() !== '' ? prev.mapId.trim() : null;
      if (!prevMapId) {
        return prev;
      }

      const update = updates.find((entry) => entry.mapId === prevMapId);
      if (!update) {
        return prev;
      }

      return {
        ...prev,
        tokens: {
          ...(prev.tokens || {}),
          [normalizedCharacterId]: applySizeToToken({
            ...(prev.tokens?.[normalizedCharacterId] || {}),
            ...(update.token || {}),
          }, update.nextSize),
        },
      };
    });

    let isCancelled = false;
    let didPersist = false;

    const persist = async () => {
      try {
        for (const update of updates) {
          if (isCancelled) {
            return;
          }

          const encodedMapId = encodeURIComponent(update.mapId);
          const payload = {
            x: update.x,
            y: update.y,
            size: update.nextSize || '',
          };

          if (Object.prototype.hasOwnProperty.call(update.token, 'rotation')) {
            const normalizedRotation = normalizeRotation(update.token.rotation);
            if (normalizedRotation !== null) {
              payload.rotation = normalizedRotation;
            }
          }

          const response = await apiFetch(
            `/campaigns/${encodedCampaign}/maps/${encodedMapId}/tokens/${encodedCharacterId}`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }
          );

          if (!response.ok) {
            const message = await parseErrorMessage(
              response,
              'Failed to update figurine size.'
            );
            throw new Error(message);
          }
        }

        didPersist = true;
      } catch (error) {
        if (isCancelled) {
          return;
        }

        console.error(error);
        setCampaignMapTokens(previousCampaignTokens || {});
        setActiveMapTokens(previousActiveTokens || {});
        setCampaignMap(previousCampaignMap || null);
        appliedLargeFormMapsRef.current = previousAppliedLargeMaps;
      }
    };

    persist();

    return () => {
      isCancelled = true;
      if (!didPersist) {
        appliedLargeFormMapsRef.current = previousAppliedLargeMaps;
      }
    };
  }, [
    campaignId,
    campaignMapTokens,
    desiredTokenSize,
    largeFormActive,
    resolvedCharacterId,
    setActiveMapTokens,
    setCampaignMap,
    setCampaignMapTokens,
  ]);

  const applyMapPayload = useCallback(
    (payload = {}) => {
      const normalizedMaps = Array.isArray(payload?.maps)
        ? payload.maps.filter((entry) => entry && typeof entry === 'object')
        : [];

      const sanitizedMaps = normalizedMaps.map((entry) => {
        const sanitizedTokens = sanitizeTokenDictionary(entry.tokens);
        if (Object.keys(sanitizedTokens).length > 0) {
          return { ...entry, tokens: sanitizedTokens };
        }
        return entry;
      });

      const normalizedActiveId =
        typeof payload?.activeMapId === 'string' && payload.activeMapId.trim() !== ''
          ? payload.activeMapId.trim()
          : null;

      const payloadMap =
        payload && typeof payload.map === 'object' && !Array.isArray(payload.map)
          ? payload.map
          : null;

      const resolvedMap =
        payloadMap ||
        (normalizedActiveId
          ? sanitizedMaps.find((entry) => entry?.mapId === normalizedActiveId)
          : null) ||
        (sanitizedMaps.length === 1 ? sanitizedMaps[0] : null) ||
        null;

      const hasTokensByMapIdProp =
        payload && Object.prototype.hasOwnProperty.call(payload, 'tokensByMapId');
      const hasActiveTokensProp =
        payload && Object.prototype.hasOwnProperty.call(payload, 'activeMapTokens');

      const tokensFromPayload = hasTokensByMapIdProp
        ? sanitizeTokensByMapId(payload.tokensByMapId)
        : null;

      const tokensFromMaps = collectTokensFromMaps(sanitizedMaps);

      let nextTokensByMapId = tokensFromPayload
        ? { ...tokensFromPayload }
        : { ...(campaignMapTokensRef.current || {}) };

      if (!tokensFromPayload) {
        const mapIds = new Set(
          sanitizedMaps
            .map((entry) =>
              typeof entry?.mapId === 'string' && entry.mapId.trim() !== ''
                ? entry.mapId.trim()
                : null
            )
            .filter(Boolean)
        );

        Object.keys(nextTokensByMapId).forEach((mapId) => {
          if (!mapIds.has(mapId)) {
            delete nextTokensByMapId[mapId];
          }
        });
      }

      Object.entries(tokensFromMaps).forEach(([mapId, tokens]) => {
        nextTokensByMapId[mapId] = tokens;
      });

      const resolvedMapId =
        typeof resolvedMap?.mapId === 'string' && resolvedMap.mapId.trim() !== ''
          ? resolvedMap.mapId.trim()
          : null;

      const activeTokensFromPayload = hasActiveTokensProp
        ? sanitizeTokenDictionary(payload.activeMapTokens)
        : null;

      let nextActiveTokens =
        activeTokensFromPayload ||
        (resolvedMapId && nextTokensByMapId[resolvedMapId]
          ? nextTokensByMapId[resolvedMapId]
          : resolvedMap
            ? sanitizeTokenDictionary(resolvedMap.tokens)
            : normalizedActiveId && nextTokensByMapId[normalizedActiveId]
              ? nextTokensByMapId[normalizedActiveId]
              : {});

      if (resolvedMapId && !nextTokensByMapId[resolvedMapId] && Object.keys(nextActiveTokens).length > 0) {
        nextTokensByMapId = { ...nextTokensByMapId, [resolvedMapId]: nextActiveTokens };
      }

      setCampaignMaps(sanitizedMaps);
      setCampaignActiveMapId(normalizedActiveId);
      setCampaignMapTokens(nextTokensByMapId);
      setActiveMapTokens(nextActiveTokens);

      const nextCampaignMap = resolvedMap
        ? { ...resolvedMap, tokens: nextActiveTokens }
        : null;
      setCampaignMap(nextCampaignMap);
    },
    [campaignMapTokensRef]
  );

  const participantsWithDetails = useMemo(() => {
    const sourceParticipants = Array.isArray(combatState?.participants)
      ? combatState.participants
      : [];

    if (sourceParticipants.length === 0) {
      return [];
    }

    const characterMap = { ...campaignCharacters };
    if (form?._id) {
      characterMap[form._id] = form;
    }

    const activeParticipantId =
      combatState?.activeTurn !== null &&
      combatState?.activeTurn !== undefined &&
      sourceParticipants[combatState.activeTurn]
        ? sourceParticipants[combatState.activeTurn].characterId
        : null;

    return sourceParticipants
      .slice()
      .sort((a, b) => b.initiative - a.initiative)
      .map((participant) => {
        const char = characterMap[participant.characterId];
        const participantName =
          (typeof char?.characterName === "string" && char.characterName.trim() !== ""
            ? char.characterName.trim()
            : null) ||
          (typeof char?.name === "string" && char.name.trim() !== ""
            ? char.name.trim()
            : null) ||
          (typeof participant.displayName === "string" &&
          participant.displayName.trim() !== ""
            ? participant.displayName.trim()
            : null);
        const name = participantName || participant.characterId;
        const participantCurrentHp = toFiniteNumberOrNull(
          participant.currentHp ?? participant.hpCurrent
        );
        const participantMaxHp = toFiniteNumberOrNull(
          participant.maxHp ?? participant.hpMax
        );

        const { currentHp, maxHp } = calculateCharacterHitPoints(char);

        let normalizedCurrentHp = null;
        let normalizedMaxHp = null;

        if (char) {
          normalizedCurrentHp = toFiniteNumberOrNull(currentHp);
          normalizedMaxHp = toFiniteNumberOrNull(maxHp);

          if (normalizedMaxHp === null) {
            const fallbackMax = toFiniteNumberOrNull(
              char?.hpMax ?? char?.hitPoints ?? char?.health
            );
            if (fallbackMax !== null) {
              normalizedMaxHp = fallbackMax;
            }
          }

          if (normalizedCurrentHp === null && normalizedMaxHp !== null) {
            normalizedCurrentHp = normalizedMaxHp;
          }

          if (normalizedCurrentHp === null && normalizedMaxHp === null) {
            normalizedCurrentHp = participantCurrentHp;
            normalizedMaxHp = participantMaxHp;
          }
        } else {
          normalizedCurrentHp = participantCurrentHp;
          normalizedMaxHp = participantMaxHp;
        }

        let hpDisplay = '—';
        if (normalizedCurrentHp !== null && normalizedMaxHp !== null) {
          hpDisplay = `${normalizedCurrentHp}/${normalizedMaxHp}`;
        } else if (normalizedCurrentHp !== null) {
          hpDisplay = `${normalizedCurrentHp}`;
        } else if (normalizedMaxHp !== null) {
          hpDisplay = `${normalizedMaxHp}`;
        }

        return {
          characterId: participant.characterId,
          name,
          hpCurrent: normalizedCurrentHp,
          hpMax: normalizedMaxHp,
          hpDisplay,
          initiative: participant.initiative,
          isActive:
            activeParticipantId !== null &&
            participant.characterId === activeParticipantId,
        };
      });
  }, [campaignCharacters, combatState, form]);

  const activeCharacterIds = useMemo(() => {
    const ids = new Set();
    if (typeof characterId === 'string' && characterId.trim() !== '') {
      ids.add(characterId.trim());
    }
    if (form && typeof form._id === 'string' && form._id.trim() !== '') {
      ids.add(form._id.trim());
    }
    if (form && typeof form.characterId === 'string' && form.characterId.trim() !== '') {
      ids.add(form.characterId.trim());
    }
    return Array.from(ids);
  }, [characterId, form]);

  const encodedCampaignId = useMemo(() => {
    if (typeof campaignId !== 'string') {
      return null;
    }
    const trimmed = campaignId.trim();
    return trimmed ? encodeURIComponent(trimmed) : null;
  }, [campaignId, applyMapPayload]);

  const playerCharacterIdSet = useMemo(() => {
    const set = new Set();
    activeCharacterIds.forEach((id) => {
      if (typeof id !== 'string') {
        return;
      }
      const trimmed = id.trim();
      if (trimmed) {
        set.add(trimmed);
      }
    });
    return set;
  }, [activeCharacterIds]);

  const activeTurnParticipantId = useMemo(() => {
    if (!Array.isArray(combatState?.participants)) {
      return null;
    }
    const activeIndex = Number.isInteger(combatState?.activeTurn)
      ? combatState.activeTurn
      : null;
    if (
      activeIndex === null ||
      activeIndex < 0 ||
      activeIndex >= combatState.participants.length
    ) {
      return null;
    }
    const participant = combatState.participants[activeIndex];
    if (!participant || typeof participant.characterId !== 'string') {
      return null;
    }
    const trimmed = participant.characterId.trim();
    return trimmed !== '' ? trimmed : null;
  }, [combatState]);

  const isPlayersTurn = useMemo(() => {
    if (!activeTurnParticipantId) {
      return false;
    }
    return playerCharacterIdSet.has(activeTurnParticipantId);
  }, [activeTurnParticipantId, playerCharacterIdSet]);

  const canPassTurn =
    isPlayersTurn &&
    Boolean(encodedCampaignId) &&
    Array.isArray(combatState.participants) &&
    combatState.participants.length > 0;


  useEffect(() => {
    if (!characterId || activeTurnParticipantId !== characterId) return;
    setForm((prev) => {
      if (!prev?.deathState?.isDying || prev.deathState.isDead || !prev.deathState.rolledThisTurn) {
        return prev;
      }
      return { ...prev, deathState: { ...prev.deathState, rolledThisTurn: false } };
    });
  }, [activeTurnParticipantId, characterId]);

  const handleRollDeathSave = useCallback(async () => {
    if (!characterId) return;
    try {
      let animatedRoll = null;
      try {
        const { rolls } = await rollDiceWithBox([{ count: 1, sides: 20 }]);
        animatedRoll = collectRollValues(rolls)[0] ?? null;
      } catch (diceError) {
        console.error('Failed to animate death save roll', diceError);
      }
      const response = await apiFetch(`/characters/death-state/${characterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'roll', ...(animatedRoll ? { roll: animatedRoll } : {}) }),
      });
      if (!response.ok) throw new Error(response.statusText || 'Failed to roll death save.');
      const payload = await response.json();
      if (animatedRoll) emitCriticalRollEvent({ rawRoll: animatedRoll, total: animatedRoll, rollContext: 'death-save', character: form, source: form?.characterName });
      setForm((prev) => prev ? { ...prev, tempHealth: payload.tempHealth ?? prev.tempHealth, deathState: payload.deathState ?? prev.deathState } : prev);
      if (payload.message) notify(payload.message, payload.event === 'dead' ? 'danger' : 'success');
    } catch (error) {
      notify(error.message || 'Failed to roll death save.', 'danger');
    }
  }, [characterId]);

  const handleHealthChange = useCallback(
    (nextTempHealth) => {
      const numericHealth = Number(nextTempHealth);
      if (!Number.isFinite(numericHealth)) {
        return;
      }

      setForm((prev) => {
        if (!prev) {
          return prev;
        }
        if (Number(prev.tempHealth) === numericHealth) {
          return prev;
        }
        return { ...prev, tempHealth: numericHealth };
      });

      setCampaignCharacters((prev) => {
        if (!prev || typeof prev !== 'object') {
          return prev;
        }

        let didUpdate = false;
        const next = { ...prev };
        activeCharacterIds.forEach((idKey) => {
          if (!idKey || !next[idKey]) {
            return;
          }
          const existing = next[idKey];
          if (Number(existing?.tempHealth) === numericHealth) {
            return;
          }
          next[idKey] = { ...existing, tempHealth: numericHealth };
          didUpdate = true;
        });

        return didUpdate ? next : prev;
      });
    },
    [activeCharacterIds]
  );

  const handleApplyTargetDamage = useCallback(async ({ targetId, hpBefore, damageApplied, result }) => {
    const enemy = enemies.find((candidate) => (candidate?.enemyId || candidate?._id) === targetId);
    if (enemy) {
      if (!encodedCampaignId) throw new Error('Campaign is unavailable; damage was not applied.');
      const previousHp = Number(enemy.currentHp ?? enemy.maxHp ?? enemy.hitPoints);
      const response = await apiFetch(`/campaigns/${encodedCampaignId}/enemies/${encodeURIComponent(targetId)}/health`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta: -Math.max(0, Number(damageApplied) || 0), eventId: result?.resolutionId }),
      });
      if (!response.ok) throw new Error(response.statusText || 'Failed to persist monster damage.');
      const payload = await response.json();
      const updatedEnemy = payload?.enemy;
      if (!updatedEnemy) throw new Error('The monster health update was not confirmed.');
      setEnemies((previous) => previous.map((candidate) =>
        (candidate?.enemyId || candidate?._id) === targetId ? { ...candidate, ...updatedEnemy } : candidate));
      if (payload?.combat) setCombatState(normalizeCombatState(payload.combat));
      const currentHp = Number(updatedEnemy.currentHp);
      return { previousHp, currentHp, appliedDamage: Math.max(0, previousHp - currentHp) };
    }
    const response = await apiFetch(`/characters/update-temphealth/${encodeURIComponent(targetId)}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta: -Math.max(0, Number(damageApplied) || 0), eventId: result?.resolutionId, sourceCombatantId: result?.attackerId, rolledDamage: result?.damage }),
    });
    if (!response.ok) throw new Error('The HP update could not be saved. No combat state was changed.');
    const payload = await response.json();
    const hpAfter = Number(payload.currentHp);
    setCampaignCharacters((previous) => {
      if (!previous?.[targetId]) return previous;
      return { ...previous, [targetId]: { ...previous[targetId], currentHp: hpAfter, tempHealth: hpAfter } };
    });
    if (targetId === resolvedCharacterId) handleHealthChange(hpAfter);
    return { previousHp: Number(payload.previousHp), currentHp: hpAfter, appliedDamage: Number(payload.actualHpLost) || 0 };
  }, [encodedCampaignId, enemies, handleHealthChange, resolvedCharacterId]);

  const handleTargetTokenClick = useCallback(async (targetId) => {
    if (combatTargeting.status !== 'selecting-target' || targetingLockRef.current) return;
    if (!targetId || targetId === combatTargeting.sourceCombatantId) return;
    if (combatTargeting.lockedTargetCombatantId && targetId !== combatTargeting.lockedTargetCombatantId) return;
    const target = targetingTokenLookupRef.current[targetId];
    if (!target || Number(target.currentHp) <= 0) return;
    targetingLockRef.current = true;
    setCombatTargeting({ ...combatTargeting, status: 'resolving', targetCombatantId: targetId });
    try {
      await playerTurnActionsRef.current?.resolveTargetedAttack({ attackId: combatTargeting.attackId, targetId, target });
    } catch (error) {
      notify(error?.message || 'The attack could not be resolved.', 'danger');
    } finally {
      targetingLockRef.current = false;
      setCombatTargeting(INACTIVE_COMBAT_TARGETING);
    }
  }, [combatTargeting]);

  useEffect(() => {
    if (combatTargeting.status === 'inactive') return undefined;
    const cancel = (event) => { if (event.key === 'Escape') setCombatTargeting(INACTIVE_COMBAT_TARGETING); };
    window.addEventListener('keydown', cancel);
    return () => window.removeEventListener('keydown', cancel);
  }, [combatTargeting.status]);

  useEffect(() => {
    const handlePass = () => {
      setActiveEffects((prev) =>
        prev
          .map((e) =>
            e.name === 'Haste'
              ? { ...e, remaining: (e.remaining || 0) - 1 }
              : e
          )
          .filter((e) => e.name !== 'Haste' || e.remaining > 0)
      );
    };
    window.addEventListener('pass-turn', handlePass);
    return () => window.removeEventListener('pass-turn', handlePass);
  }, []);

  useEffect(() => {
    const previousCounts = previousRestCountsRef.current;
    const didLongRestIncrement = longRestCount > previousCounts.long;
    const didShortRestIncrement = shortRestCount > previousCounts.short;

    previousRestCountsRef.current = {
      long: longRestCount,
      short: shortRestCount,
    };

    if (!didLongRestIncrement && !didShortRestIncrement) {
      return;
    }

    // Clear effects on rest
    setActiveEffects([]);
    if (didLongRestIncrement) {
      const { maxHp } = calculateCharacterHitPoints(form);
      const nextHealth = Number.isFinite(maxHp) ? maxHp : 0;
      handleHealthChange(nextHealth);
      return;
    }

    handleHealthChange(0);
  }, [form, handleHealthChange, longRestCount, shortRestCount]);

  useEffect(() => {
    const hasteActive = activeEffects.some((e) => e.name === 'Haste');
    const desired = baseActionCount + (hasteActive ? 1 : 0);
    setActionCount(desired);
    setUsedSlots((used) => {
      const action = { ...used.action };
      for (let i = 0; i < desired; i++) {
        if (!(i in action)) action[i] = 'active';
      }
      Object.keys(action).forEach((key) => {
        if (Number(key) >= desired) delete action[key];
      });
      return { ...used, action };
    });
  }, [baseActionCount, activeEffects]);

  useEffect(() => {
    if (!form) {
      return;
    }

    if (largeFormActive) {
      const desiredSize = 'Large';
      const desiredSpeedBonus = 10;
      const nextSize = form.temporarySize;
      const nextSpeedBonus = Number(form.temporarySpeedBonus ?? 0);

      if (nextSize === desiredSize && nextSpeedBonus === desiredSpeedBonus) {
        return;
      }

      setForm((prev) => {
        if (!prev) {
          return prev;
        }

        const currentSize = prev.temporarySize;
        const currentSpeedBonus = Number(prev.temporarySpeedBonus ?? 0);

        if (
          currentSize === desiredSize &&
          currentSpeedBonus === desiredSpeedBonus
        ) {
          return prev;
        }

        return {
          ...prev,
          temporarySize: desiredSize,
          temporarySpeedBonus: desiredSpeedBonus,
        };
      });

      return;
    }

    const hasTemporaryFields =
      Object.prototype.hasOwnProperty.call(form, 'temporarySize') ||
      Object.prototype.hasOwnProperty.call(form, 'temporarySpeedBonus');

    if (!hasTemporaryFields) {
      return;
    }

    setForm((prev) => {
      if (!prev) {
        return prev;
      }

      const ownsTemporarySize = Object.prototype.hasOwnProperty.call(
        prev,
        'temporarySize'
      );
      const ownsTemporarySpeed = Object.prototype.hasOwnProperty.call(
        prev,
        'temporarySpeedBonus'
      );

      if (!ownsTemporarySize && !ownsTemporarySpeed) {
        return prev;
      }

      const {
        temporarySize: _ignoredSize,
        temporarySpeedBonus: _ignoredSpeed,
        ...rest
      } = prev;
      return rest;
    });
  }, [form, largeFormActive]);

  const consumeCircle = useCallback(
    (type, index) => {
      setUsedSlots((prev) => {
        const currentState = prev[type] || createCircleState();
        const nextState = { ...currentState };
        if (typeof index === 'number') {
          const cur = currentState[index] || 'active';
          nextState[index] = cur === 'active' ? 'used' : 'active';
        } else {
          const first = Object.keys(nextState).find((key) => nextState[key] === 'active');
          if (typeof first !== 'undefined') nextState[first] = 'used';
        }
        return { ...prev, [type]: nextState };
      });
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handler = (event) => {
      if (event?.detail?.type !== 'potion') {
        return;
      }

      const potionLabel = `${
        event?.detail?.item?.displayName || event?.detail?.item?.name || ''
      }`
        .trim()
        .toLowerCase();

      if (potionLabel === 'potion of speed') {
        setActiveEffects((prev = []) => {
          const existingIndex = prev.findIndex((effect) => effect?.name === 'Haste');

          if (existingIndex === -1) {
            return [...prev, { name: 'Haste', icon: hasteIcon, remaining: 10 }];
          }

          const existing = prev[existingIndex] || {};
          const next = [...prev];
          next[existingIndex] = {
            ...existing,
            name: 'Haste',
            icon: hasteIcon,
            remaining: 10,
          };
          return next;
        });
      } else if (potionLabel === 'potion of growth') {
        setActiveEffects((prev = []) => {
          if (prev.some((effect) => effect?.name === 'Large Form')) {
            return prev;
          }

          return [...prev, { name: 'Large Form', icon: largeFormIcon }];
        });
      }

      consumeCircle('bonus');
    };

    window.addEventListener('inventory:consumable-used', handler);
    return () => window.removeEventListener('inventory:consumable-used', handler);
  }, [consumeCircle]);

  const handleActionSurge = useCallback(() => {
    setActionCount((prev) => {
      const next = prev + 1;
      setUsedSlots((used) => ({
        ...used,
        action: { ...used.action, [next - 1]: 'active' },
      }));
      return next;
    });
  }, []);

  const handleLargeForm = useCallback(() => {
    setActiveEffects((prev) => {
      if (prev.some((effect) => effect.name === 'Large Form')) {
        return prev;
      }
      return [...prev, { name: 'Large Form', icon: largeFormIcon }];
    });
  }, [setActiveEffects]);

  const handleDraconicFlight = useCallback(() => {
    setActiveEffects((prev) => {
      if (prev.some((effect) => effect.name === 'Draconic Flight')) {
        return prev;
      }
      return [...prev, { name: 'Draconic Flight', icon: dragonWingsIcon }];
    });
  }, [setActiveEffects]);

  const handleAdrenalineRush = useCallback(() => {
    consumeCircle('bonus');

    setActiveEffects((prev = []) => {
      const effectPayload = { name: 'Adrenaline Rush', icon: adrenalineRushIcon };
      const existingIndex = prev.findIndex(
        (effect) => effect && effect.name === 'Adrenaline Rush'
      );

      if (existingIndex === -1) {
        return [...prev, effectPayload];
      }

      const existing = prev[existingIndex] || {};
      if (existing.icon === adrenalineRushIcon) {
        return prev;
      }

      const next = [...prev];
      next[existingIndex] = { ...existing, ...effectPayload };
      return next;
    });

    const providedProf = Number(form?.proficiencyBonus);
    const profBonus = Number.isFinite(providedProf)
      ? providedProf
      : proficiencyBonus(totalLevel);
    const currentTemp = Number(form?.tempHealth);
    const safeCurrent = Number.isFinite(currentTemp) ? currentTemp : 0;
    const nextTempHealth = safeCurrent + profBonus;
    if (Number.isFinite(nextTempHealth)) {
      handleHealthChange(nextTempHealth);
    }
  }, [consumeCircle, form, handleHealthChange, totalLevel]);

  const handlePassTurn = useCallback(async () => {
    if (isPassingTurn || !encodedCampaignId) {
      return;
    }

    const participants = Array.isArray(combatState.participants)
      ? combatState.participants
      : [];

    if (participants.length === 0) {
      return;
    }

    const activeIndex =
      Number.isInteger(combatState.activeTurn) && combatState.activeTurn >= 0
        ? combatState.activeTurn
        : null;

    if (activeIndex === null || activeIndex >= participants.length) {
      return;
    }

    const activeParticipant = participants[activeIndex];
    const activeId =
      typeof activeParticipant?.characterId === 'string'
        ? activeParticipant.characterId.trim()
        : '';

    if (!activeId || !playerCharacterIdSet.has(activeId)) {
      return;
    }

    const advancedState = advanceTurn(combatState);
    const nextIndex = advancedState.activeTurn;

    const payload = {
      participants: participants.map((participant) => ({
        characterId: participant.characterId,
        initiative: participant.initiative,
      })),
      activeTurn: nextIndex,
      round: advancedState.round,
      turnSequence: advancedState.turnSequence,
      activeEffects: advancedState.activeEffects,
      eventLog: advancedState.eventLog,
    };

    try {
      setIsPassingTurn(true);
      const response = await apiFetch(`/campaigns/${encodedCampaignId}/combat`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(response.statusText || 'Failed to update combat state');
      }

      let nextCombatState = normalizeCombatState({
        participants: payload.participants,
        activeTurn: nextIndex,
      });

      if (response.status !== 204 && response.status !== 205) {
        try {
          nextCombatState = normalizeCombatState(await response.json());
        } catch (parseError) {
          // eslint-disable-next-line no-console
          console.error('Failed to parse combat state response', parseError);
        }
      }

      setCombatState(nextCombatState);
      window.dispatchEvent(new Event('pass-turn'));
    } catch (error) {
      console.error(error);
    } finally {
      setIsPassingTurn(false);
    }
  }, [
    combatState,
    encodedCampaignId,
    isPassingTurn,
    playerCharacterIdSet,
  ]);

  const playerTurnActionsRef = useRef(null);
  const speakWithAnimalsPendingRef = useRef(false);
  const socketRef = useRef(null);

  const rootContainerRef = useRef(null);
  const contentColumnRef = useRef(null);
  const headerRef = useRef(null);
  const combatHeaderRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [navHeight, setNavHeight] = useState(0);

  useEffect(() => {
    if (!usageResetInitializedRef.current.long) {
      usageResetInitializedRef.current.long = true;
      return;
    }

    if (!usedSlotsHydrationRef.current) {
      return;
    }

    setUsedSlots(createDefaultUsedSlots());
    setActionCount(baseActionCount);
  }, [longRestCount, baseActionCount]);

  useEffect(() => {
    if (!usageResetInitializedRef.current.short) {
      usageResetInitializedRef.current.short = true;
      return;
    }

    if (!usedSlotsHydrationRef.current) {
      return;
    }

    setUsedSlots((prev) => {
      const updated = {
        ...prev,
        action: createCircleState(),
        bonus: createCircleState(),
        focus: 0,
      };
      Object.keys(updated).forEach((key) => {
        if (key.startsWith('warlock-')) delete updated[key];
      });
      return updated;
    });
    setActionCount(baseActionCount);
  }, [shortRestCount, baseActionCount]);

  useEffect(() => {
    setUsedSlots((prev) => {
      const maxFocus = Math.max(0, monkFocusPoints);
      const rawCurrent = prev?.focus;
      const numericCurrent = Number(rawCurrent);
      const normalizedCurrent =
        Number.isFinite(numericCurrent) && numericCurrent > 0
          ? Math.floor(numericCurrent)
          : 0;
      const clamped = Math.min(normalizedCurrent, maxFocus);

      if (rawCurrent === clamped) {
        return prev;
      }

      if (rawCurrent === undefined && clamped === 0) {
        return prev;
      }

      if (clamped === normalizedCurrent && normalizedCurrent === 0 && rawCurrent === 0) {
        return prev;
      }

      return { ...prev, focus: clamped };
    });
  }, [monkFocusPoints]);

  useEffect(() => {
    const handler = () => {
      if (!usageResetInitializedRef.current.pass) {
        usageResetInitializedRef.current.pass = true;
        if (!usedSlotsHydrationRef.current) {
          return;
        }
      }

      if (!usedSlotsHydrationRef.current) {
        return;
      }

      setUsedSlots((prev) => ({
        ...prev,
        action: createCircleState(),
        bonus: createCircleState(),
      }));
      const hasteActive = activeEffects.some((e) => e.name === 'Haste');
      setActionCount(baseActionCount + (hasteActive ? 1 : 0));
    };
    window.addEventListener('pass-turn', handler);
    return () => window.removeEventListener('pass-turn', handler);
  }, [baseActionCount, activeEffects]);

  useEffect(() => {
    const nav = document.querySelector('.navbar.fixed-top');
    setNavHeight(nav ? nav.offsetHeight : 0);
  }, []);

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight + navHeight + HEADER_PADDING);
    }
  }, [form, navHeight, participantsWithDetails]);

  const updateDockedModalMetrics = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const dockingScopeElement = document.documentElement || document.body;
    const rootElement = rootContainerRef.current;
    const contentElement = contentColumnRef.current;

    if (
      !dockingScopeElement ||
      !rootElement ||
      !contentElement ||
      typeof contentElement.getBoundingClientRect !== 'function'
    ) {
      return;
    }

    const contentRect = contentElement.getBoundingClientRect();
    const headerElement = headerRef.current;
    const combatHeaderElement = combatHeaderRef.current;
    const headerRect =
      headerElement && typeof headerElement.getBoundingClientRect === 'function'
        ? headerElement.getBoundingClientRect()
        : null;
    const combatHeaderRect =
      combatHeaderElement && typeof combatHeaderElement.getBoundingClientRect === 'function'
        ? combatHeaderElement.getBoundingClientRect()
        : null;
    const rootRect =
      typeof rootElement.getBoundingClientRect === 'function'
        ? rootElement.getBoundingClientRect()
        : { top: 0 };
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;

    const rootTop = rootRect?.top ?? 0;
    const TRACKER_BUFFER = 12;
    const trackerOffset =
      combatHeaderRect?.bottom != null
        ? Math.max(0, combatHeaderRect.bottom - rootTop + TRACKER_BUFFER)
        : null;
    const topOffset = trackerOffset ??
      (headerRect?.bottom != null
        ? Math.max(0, headerRect.bottom - rootTop)
        : Math.max(0, contentRect.top - rootTop));

    const leftGutter = Math.max(0, contentRect.left);
    const rightGutter = Math.max(0, viewportWidth - contentRect.right);
    const largestGutter = Math.max(leftGutter, rightGutter);
    const BUFFER = 24;
    const computeMaxWidth = (gutter) => (gutter > BUFFER ? gutter - BUFFER : null);
    const computedMaxWidths = {
      left: computeMaxWidth(leftGutter),
      right: computeMaxWidth(rightGutter),
    };
    const computedMaxWidth = computeMaxWidth(largestGutter) ?? 0;
    const viewportLimit =
      viewportWidth > 0
        ? Math.max(
            MIN_DOCKED_MODAL_WIDTH,
            viewportWidth - DOCKED_MODAL_VIEWPORT_PADDING * 2
          )
        : null;

    dockingScopeElement.style.setProperty('--docked-modal-top-offset', `${Math.round(topOffset)}px`);

    if (computedMaxWidth > 0) {
      dockingScopeElement.style.setProperty('--docked-modal-max-width', `${Math.round(computedMaxWidth)}px`);
    } else {
      dockingScopeElement.style.removeProperty('--docked-modal-max-width');
    }

    ['left', 'right'].forEach((side) => {
      const value = computedMaxWidths[side];
      const propertyName = `--docked-modal-max-width-${side}`;
      if (typeof value === 'number' && value > 0) {
        dockingScopeElement.style.setProperty(propertyName, `${Math.round(value)}px`);
      } else {
        dockingScopeElement.style.removeProperty(propertyName);
      }
    });

    setDockedModalWidths((prev) => {
      let next = prev;
      ['left', 'right'].forEach((side) => {
        const currentWidth = prev[side];
        if (
          typeof viewportLimit === 'number' &&
          viewportLimit > 0 &&
          typeof currentWidth === 'number' &&
          currentWidth > viewportLimit + 0.5
        ) {
          if (next === prev) {
            next = { ...prev };
          }
          next[side] = viewportLimit;
        }
      });
      return next;
    });
  }, [setDockedModalWidths]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    updateDockedModalMetrics();

    const handleResize = () => {
      updateDockedModalMetrics();
    };

    window.addEventListener('resize', handleResize);

    let resizeObserver;
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(() => {
        updateDockedModalMetrics();
      });

      const contentElement = contentColumnRef.current;
      if (contentElement) {
        resizeObserver.observe(contentElement);
      }

      const headerElement = headerRef.current;
      if (headerElement) {
        resizeObserver.observe(headerElement);
      }
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      const dockingScopeElement = document.documentElement || document.body;
      if (dockingScopeElement) {
        dockingScopeElement.style.removeProperty('--docked-modal-top-offset');
        dockingScopeElement.style.removeProperty('--docked-modal-max-width');
        dockingScopeElement.style.removeProperty('--docked-modal-max-width-left');
        dockingScopeElement.style.removeProperty('--docked-modal-max-width-right');
      }
    };
  }, [updateDockedModalMetrics]);

  useEffect(() => {
    updateDockedModalMetrics();
  }, [updateDockedModalMetrics, headerHeight]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const dockingScopeElement = document.documentElement || document.body;
    if (!dockingScopeElement) {
      return undefined;
    }

    const applyInlineWidthToDialogs = (side, width) => {
      const dialogs = document.querySelectorAll(
        `.docked-modal.modal-dialog.docked-modal--${side}`
      );

      dialogs.forEach((dialog) => {
        if (!(dialog instanceof HTMLElement)) {
          return;
        }

        if (typeof width === 'number' && Number.isFinite(width)) {
          const pixelValue = `${Math.round(width)}px`;
          dialog.style.setProperty('--docked-modal-inline-width', pixelValue);
        } else {
          dialog.style.removeProperty('--docked-modal-inline-width');
        }
      });
    };

    ['left', 'right'].forEach((side) => {
      const width = dockedModalWidths[side];
      const propertyName = `--docked-modal-width-${side}`;
      if (typeof width === 'number' && Number.isFinite(width)) {
        const rounded = Math.round(width);
        dockingScopeElement.style.setProperty(propertyName, `${rounded}px`);
        applyInlineWidthToDialogs(side, rounded);

        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            window.localStorage.setItem(
              `zombiesDockedModalWidth:${side}`,
              String(rounded)
            );
          } catch (storageError) {
            if (process.env.NODE_ENV !== 'production') {
              console.error(storageError);
            }
          }
        }
      } else {
        dockingScopeElement.style.removeProperty(propertyName);
        applyInlineWidthToDialogs(side, null);

        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            window.localStorage.removeItem(`zombiesDockedModalWidth:${side}`);
          } catch (storageError) {
            if (process.env.NODE_ENV !== 'production') {
              console.error(storageError);
            }
          }
        }
      }
    });

    return () => {
      const scope = document.documentElement || document.body;
      if (!scope) {
        return;
      }

      ['left', 'right'].forEach((side) => {
        scope.style.removeProperty(`--docked-modal-width-${side}`);
        const dialogs = document.querySelectorAll(
          `.docked-modal.modal-dialog.docked-modal--${side}`
        );
        dialogs.forEach((dialog) => {
          if (dialog instanceof HTMLElement) {
            dialog.style.removeProperty('--docked-modal-inline-width');
          }
        });
      });
    };
  }, [dockedModalWidths]);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return undefined;
    }

    const parseWidthValue = (value) => {
      if (typeof value !== 'string') {
        return null;
      }

      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }

      const numeric = Number.parseFloat(trimmed);
      return Number.isFinite(numeric) ? numeric : null;
    };

    const EDGE_THRESHOLD_PX = 16;
    const EDGE_HANDLE_BUFFER_PX = 12;

    const handlePointerDown = (event) => {
      if (event.button !== 0) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const dialog = target.closest('.docked-modal.modal-dialog');
      if (!dialog) {
        return;
      }

      const side = dialog.classList.contains('docked-modal--left')
        ? 'left'
        : dialog.classList.contains('docked-modal--right')
        ? 'right'
        : null;

      if (!side) {
        return;
      }

      const rect = dialog.getBoundingClientRect();
      const distanceFromEdge =
        side === 'left' ? rect.right - event.clientX : event.clientX - rect.left;
      const isWithinEdgeZone =
        Math.abs(distanceFromEdge) <= EDGE_THRESHOLD_PX + EDGE_HANDLE_BUFFER_PX;

      if (!isWithinEdgeZone) {
        return;
      }

      const root = document.documentElement || document.body;
      const computedStyles = root ? window.getComputedStyle(root) : null;
      const maxWidthFromSide =
        parseWidthValue(
          computedStyles?.getPropertyValue(`--docked-modal-max-width-${side}`)
        ) ?? null;
      const fallbackMaxWidth =
        parseWidthValue(
          computedStyles?.getPropertyValue('--docked-modal-max-width')
        ) ?? null;
      const viewportWidth =
        window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportLimit =
        viewportWidth > 0
          ? Math.max(
              MIN_DOCKED_MODAL_WIDTH,
              viewportWidth - DOCKED_MODAL_VIEWPORT_PADDING * 2
            )
          : null;
      const startingWidth = rect.width;
      const widthLimitCandidates = [MIN_DOCKED_MODAL_WIDTH];
      const addCandidate = (value) => {
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
          widthLimitCandidates.push(value);
        }
      };

      addCandidate(maxWidthFromSide);
      addCandidate(fallbackMaxWidth);
      addCandidate(startingWidth);
      addCandidate(viewportLimit);

      let maxWidth = Math.max(...widthLimitCandidates);
      if (typeof viewportLimit === 'number' && Number.isFinite(viewportLimit)) {
        maxWidth = Math.min(maxWidth, viewportLimit);
      }
      const anchor = side === 'left' ? rect.left : rect.right;
      const pointerId = event.pointerId;
      let framePending = false;
      let hasMoved = false;

      const updateDialogInlineWidth = (value) => {
        if (!(dialog instanceof HTMLElement)) {
          return;
        }

        if (typeof value === 'number' && Number.isFinite(value)) {
          dialog.style.setProperty('--docked-modal-inline-width', `${Math.round(value)}px`);
        } else {
          dialog.style.removeProperty('--docked-modal-inline-width');
        }
      };

      const applyWidth = (nextWidth) => {
        const rounded = Math.round(nextWidth);
        updateDialogInlineWidth(rounded);
        setDockedModalWidths((prev) => {
          const prevWidth = prev[side];
          if (typeof prevWidth === 'number' && Math.abs(prevWidth - rounded) < 1) {
            return prev;
          }

          return { ...prev, [side]: rounded };
        });
      };

      const handlePointerMove = (moveEvent) => {
        if (moveEvent.pointerId !== pointerId) {
          return;
        }

        let proposedWidth =
          side === 'left' ? moveEvent.clientX - anchor : anchor - moveEvent.clientX;

        if (!Number.isFinite(proposedWidth)) {
          return;
        }

        proposedWidth = Math.max(
          MIN_DOCKED_MODAL_WIDTH,
          Math.min(maxWidth, proposedWidth)
        );

        if (framePending) {
          return;
        }

        framePending = true;
        hasMoved = true;
        window.requestAnimationFrame(() => {
          framePending = false;
          applyWidth(proposedWidth);
        });
      };

      const stopResizing = () => {
        dialog.releasePointerCapture?.(pointerId);
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', stopResizing);
        document.removeEventListener('pointercancel', stopResizing);
        document.body.classList.remove('docked-modal--resizing');
        document.body.style.removeProperty('cursor');

        if (!hasMoved) {
          updateDialogInlineWidth(null);
        }
      };

      updateDialogInlineWidth(startingWidth);

      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', stopResizing);
      document.addEventListener('pointercancel', stopResizing);

      dialog.setPointerCapture?.(pointerId);
      document.body.classList.add('docked-modal--resizing');
      document.body.style.cursor = 'ew-resize';

      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.body.classList.remove('docked-modal--resizing');
      document.body.style.removeProperty('cursor');
    };
  }, [setDockedModalWidths]);

  useEffect(() => {
    let isCancelled = false;

    async function fetchCharacterData(id) {
      try {
        const response = await apiFetch(`/characters/${id}`);
        if (!response.ok) {
          throw new Error(`Error fetching character data: ${response.statusText}`);
        }
        const data = await response.json();
        if (isCancelled) return;

        const feats = (data.feat || []).map((feat) => {
          if (!Array.isArray(feat)) return feat;
          const [featName = "", notes = "", ...rest] = feat;
          const skillVals = rest.slice(0, SKILLS.length);
          const abilityVals = rest.slice(SKILLS.length, SKILLS.length + 6);
          const [initiative = 0, ac = 0, speed = 0, hpMaxBonus = 0, hpMaxBonusPerLevel = 0] =
            rest.slice(SKILLS.length + 6);
          const featObj = { featName, notes };
          SKILLS.forEach(({ key }, idx) => {
            featObj[key] = Number(skillVals[idx] || 0);
          });
          ["str", "dex", "con", "int", "wis", "cha"].forEach((stat, idx) => {
            featObj[stat] = Number(abilityVals[idx] || 0);
          });
          Object.assign(featObj, {
            initiative: Number(initiative || 0),
            ac: Number(ac || 0),
            speed: Number(speed || 0),
            hpMaxBonus: Number(hpMaxBonus || 0),
            hpMaxBonusPerLevel: Number(hpMaxBonusPerLevel || 0),
          });
          return featObj;
        });
        const accessories = Array.isArray(data.accessories)
          ? data.accessories
          : Array.isArray(data.accessory)
            ? data.accessory
            : [];

        const normalizedCampaign =
          typeof data.campaign === "string" && data.campaign.trim() !== ""
            ? data.campaign.trim()
            : null;

        setForm({
          ...data,
          feat: feats,
          weapon: data.weapon || [],
          armor: data.armor || [],
          item: data.item || [],
          accessories,
          accessory: accessories,
          equipment: normalizeEquipmentMap(data.equipment),
        });

        setCampaignId(normalizedCampaign);
        setEnemies([]);

        if (!normalizedCampaign) {
          setCombatState(createEmptyCombatState());
          setCampaignCharacters({});
          setEnemies([]);
          applyMapPayload({ maps: [], activeMapId: null, map: null });
          return;
        }

        try {
          const encodedCampaign = encodeURIComponent(normalizedCampaign);
          const [combatRes, charactersRes, mapsRes, enemiesRes] = await Promise.all([
            apiFetch(`/campaigns/${encodedCampaign}/combat`),
            apiFetch(`/campaigns/${encodedCampaign}/characters`),
            apiFetch(`/campaigns/${encodedCampaign}/maps`),
            apiFetch(`/campaigns/${encodedCampaign}/enemies`),
          ]);

          let combatData = createEmptyCombatState();
          if (combatRes.ok) {
            const combatJson = await combatRes.json();
            combatData = normalizeCombatState(combatJson);
          }

          let characterMap = {};
          if (charactersRes.ok) {
            const charactersJson = await charactersRes.json();
            characterMap = mapCharactersById(charactersJson);
          }

          let enemyList = [];
          if (enemiesRes.ok) {
            try {
              const enemiesJson = await enemiesRes.json();
              if (Array.isArray(enemiesJson)) {
                enemyList = enemiesJson.filter((entry) => entry && typeof entry === 'object');
              }
            } catch (enemyParseError) {
              console.error(enemyParseError);
              enemyList = [];
            }
          }

          let mapsList = [];
          let activeMapIdValue = null;
          let mapData = null;
          let tokensByMapIdPayload = null;
          let activeMapTokensPayload = null;

          if (mapsRes.ok) {
            try {
              const mapsPayload = await mapsRes.json();
              if (mapsPayload && typeof mapsPayload === 'object') {
                const normalizedMaps = Array.isArray(mapsPayload.maps)
                  ? mapsPayload.maps.filter((entry) => entry && typeof entry === 'object')
                  : [];
                mapsList = normalizedMaps;

                const normalizedActiveId =
                  typeof mapsPayload.activeMapId === 'string' &&
                  mapsPayload.activeMapId.trim() !== ''
                    ? mapsPayload.activeMapId.trim()
                    : null;
                activeMapIdValue = normalizedActiveId;

                if (Object.prototype.hasOwnProperty.call(mapsPayload, 'tokensByMapId')) {
                  tokensByMapIdPayload = mapsPayload.tokensByMapId;
                }

                if (Object.prototype.hasOwnProperty.call(mapsPayload, 'activeMapTokens')) {
                  activeMapTokensPayload = mapsPayload.activeMapTokens;
                }

                const payloadMap =
                  mapsPayload.map &&
                  typeof mapsPayload.map === 'object' &&
                  !Array.isArray(mapsPayload.map)
                    ? mapsPayload.map
                    : null;

                if (payloadMap) {
                  mapData = payloadMap;
                } else if (normalizedActiveId) {
                  mapData =
                    normalizedMaps.find((entry) => entry?.mapId === normalizedActiveId) || null;
                } else if (normalizedMaps.length === 1) {
                  mapData = normalizedMaps[0];
                }
              }
            } catch (mapError) {
              console.error(mapError);
            }
          }

          let shouldLoadLegacyMap = false;
          if (!mapsRes || mapsRes.status === 404) {
            shouldLoadLegacyMap = true;
          } else if (!mapsRes.ok) {
            shouldLoadLegacyMap = true;
          }

          if (shouldLoadLegacyMap) {
            try {
              const legacyMapRes = await apiFetch(`/campaigns/${encodedCampaign}/map`);
              if (legacyMapRes.ok) {
                const mapJson = await legacyMapRes.json();
                if (mapJson && typeof mapJson === 'object') {
                  mapData =
                    mapJson.map && typeof mapJson.map === 'object' ? mapJson.map : mapJson;
                } else {
                  mapData = null;
                }
              } else if (legacyMapRes.status === 404) {
                mapData = null;
              }
            } catch (legacyMapError) {
              console.error(legacyMapError);
            }
          }

          if (!mapData && mapsList.length > 0) {
            mapData = mapsList[0];
          }

          if (!activeMapIdValue && mapData && typeof mapData.mapId === 'string') {
            const candidateId = mapData.mapId.trim();
            activeMapIdValue = candidateId !== '' ? candidateId : null;
          }

          if (mapsList.length === 0 && mapData) {
            mapsList = [mapData];
          }

          if (!isCancelled) {
            setCombatState(combatData);
            setCampaignCharacters(characterMap);
            setEnemies(enemyList);
            applyMapPayload({
              maps: mapsList,
              activeMapId: activeMapIdValue,
              map: mapData,
              ...(tokensByMapIdPayload !== null ? { tokensByMapId: tokensByMapIdPayload } : {}),
              ...(activeMapTokensPayload !== null
                ? { activeMapTokens: activeMapTokensPayload }
                : {}),
            });
          }
        } catch (err) {
          console.error(err);
          if (!isCancelled) {
            setCombatState(createEmptyCombatState());
            setCampaignCharacters({});
            setEnemies([]);
            applyMapPayload({ maps: [], activeMapId: null, map: null });
          }
        }
      } catch (error) {
        console.error(error);
        if (!isCancelled) {
          setCampaignId(null);
          setCombatState(createEmptyCombatState());
          setCampaignCharacters({});
          setEnemies([]);
          applyMapPayload({ maps: [], activeMapId: null, map: null });
        }
      }
    }

    fetchCharacterData(characterId);

    return () => {
      isCancelled = true;
    };
  }, [characterId, applyMapPayload]);

  const handleShowCharacterInfo = useCallback(() => setShowCharacterInfo(true), []);
  const handleCloseCharacterInfo = useCallback(
    () => setShowCharacterInfo(false),
    []
  );
  const handleShowStats = useCallback(() => setShowStats(true), []);
  const handleCloseStats = useCallback(() => setShowStats(false), []);
  const handleDockClose = useCallback((modalKey) => {
    setDockedModals((prev) => {
      const leftMatch = prev.left === modalKey;
      const rightMatch = prev.right === modalKey;

      if (!leftMatch && !rightMatch) {
        return prev;
      }

      return {
        ...prev,
        ...(leftMatch ? { left: null } : {}),
        ...(rightMatch ? { right: null } : {}),
      };
    });
  }, []);

  const handleDockChange = useCallback(
    (modalKey, side) => {
      if (!modalKey) {
        return;
      }

      setDockedModals((prev) => {
        let next = prev;
        let detached = false;

        ['left', 'right'].forEach((position) => {
          if (prev[position] === modalKey) {
            if (next === prev) {
              next = { ...prev };
            }
            next[position] = null;
            detached = true;
          }
        });

        if (!side) {
          return next === prev ? prev : next;
        }

        if (side !== 'left' && side !== 'right') {
          return next === prev ? prev : next;
        }

        if (prev[side] === modalKey && detached) {
          return next;
        }

        if (next === prev) {
          next = { ...prev };
        }

        const otherSide = side === 'left' ? 'right' : 'left';
        next[side] = modalKey;

        if (next[otherSide] === modalKey) {
          next[otherSide] = null;
        }

        return next;
      });

      if (side) {
        switch (modalKey) {
          case 'characterInfo':
            setShowCharacterInfo(false);
            break;
          case 'stats':
            setShowStats(false);
            break;
          case 'skills':
            setShowSkill(false);
            break;
          case 'feats':
            setShowFeats(false);
            break;
          case 'features':
            setShowFeatures(false);
            break;
          case 'spells':
            setShowSpells(false);
            break;
          case 'equipment':
            setShowEquipment(false);
            break;
          case 'inventory':
            setShowInventory(false);
            break;
          case 'shop':
            setShowShop(false);
            break;
          case 'help':
            setShowHelpModal(false);
            break;
          default:
            break;
        }
      }
    },
    [
      setShowCharacterInfo,
      setShowStats,
      setShowSkill,
      setShowFeats,
      setShowFeatures,
      setShowSpells,
      setShowEquipment,
      setShowInventory,
      setShowShop,
      setShowHelpModal,
    ]
  );

  const resolvedCampaignMap = useMemo(() => {
    if (campaignMap) {
      return campaignMap;
    }

    if (!Array.isArray(campaignMaps) || campaignMaps.length === 0) {
      return null;
    }

    if (typeof campaignActiveMapId === 'string' && campaignActiveMapId.trim() !== '') {
      const normalizedTarget = campaignActiveMapId.trim();

      const match = campaignMaps.find((entry) => {
        if (!entry || typeof entry !== 'object') {
          return false;
        }

        const entryId =
          typeof entry.mapId === 'string' && entry.mapId.trim() !== ''
            ? entry.mapId.trim()
            : null;

        return entryId === normalizedTarget;
      });

      if (match) {
        return match;
      }
    }

    return campaignMaps[0] || null;
  }, [campaignActiveMapId, campaignMap, campaignMaps]);

  const handleShowSkill = useCallback(() => setShowSkill(true), []);
  const handleCloseSkill = useCallback(() => {
    setShowSkill(false);
  }, []);
  const handleShowFeats = useCallback(() => setShowFeats(true), []);
  const handleCloseFeats = useCallback(() => setShowFeats(false), []);
  const handleShowFeatures = useCallback(() => setShowFeatures(true), []);
  const handleCloseFeatures = useCallback(() => setShowFeatures(false), []);
  const handleShowShop = useCallback((tab) => {
    setShopTab((prevTab) => tab ?? prevTab ?? 'weapons');
    setShowShop(true);
  }, []);
  const handleCloseShop = useCallback(() => setShowShop(false), []);
  const handleShowInventory = useCallback((tab) => {
    setInventoryTab((prevTab) => tab ?? prevTab ?? 'weapons');
    setShowInventory(true);
  }, []);
  const handleCloseInventory = useCallback(() => setShowInventory(false), []);
  const handleShowEquipment = useCallback(() => setShowEquipment(true), []);
  const handleCloseEquipment = useCallback(() => setShowEquipment(false), []);
  const handleShowSpells = useCallback(() => setShowSpells(true), []);
  const handleCloseSpells = useCallback(() => setShowSpells(false), []);
  const handleShowHelpModal = useCallback(() => setShowHelpModal(true), []);
  const handleCloseHelpModal = useCallback(() => setShowHelpModal(false), []);
  const handleShowBackground = useCallback(() => setShowBackground(true), []);
  const handleCloseBackground = useCallback(() => setShowBackground(false), []);
  const getDockedSide = useCallback(
    (modalKey) => {
      if (!modalKey) {
        return null;
      }

      if (dockedModals.left === modalKey) {
        return 'left';
      }

      if (dockedModals.right === modalKey) {
        return 'right';
      }

      return null;
    },
    [dockedModals.left, dockedModals.right]
  );

  const shouldShowSkillsModal = showSkill;
  const handleRollResult = (result, breakdown, source) => {
    playerTurnActionsRef.current?.updateDamageValueWithAnimation(
      result,
      breakdown,
      source
    );
  };

  const handleSkillsChange = useCallback((skills) => {
    setForm((prev) => ({ ...prev, skills }));
  }, []);

  const handleSpellsChange = useCallback((spells, spellPoints) => {
    setForm((prev) => ({ ...prev, spells, spellPoints }));
  }, []);

  const handleLongRest = useCallback(() => {
    setLongRestCount((c) => c + 1);
    setForm((prev) => applyRageRest(prev, 'long'));
  }, []);

  const handleShortRest = useCallback(() => {
    setShortRestCount((c) => c + 1);
    setForm((prev) => applyRageRest(prev, 'short'));
  }, []);

  const handleActivateRage = useCallback(() => {
    setForm((prev) => activateRage(prev));
  }, []);

  const handleEndRage = useCallback(() => {
    setForm((prev) => endRage(prev));
  }, []);

  const handleToggleRecklessAttack = useCallback(async () => {
    try {
      const activated = activateRecklessAttack(form, combatState, resolvedCharacterId || characterId);
      setForm(activated.character);
      setCombatState(activated.combatState);
      if (encodedCampaignId) {
        const response = await apiFetch(`/campaigns/${encodedCampaignId}/combat`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(activated.combatState),
        });
        if (!response.ok) throw new Error(response.statusText || 'Failed to activate Reckless Attack.');
        setCombatState(normalizeCombatState(await response.json()));
      }
    } catch (error) {
      window.alert(error.message);
    }
  }, [characterId, combatState, encodedCampaignId, form, resolvedCharacterId]);

  const handleToggleBrutalStrike = useCallback(() => {
    const combatantId = resolvedCharacterId || characterId;
    const pending = getBrutalStrikePendingEffect(combatState, combatantId);
    if (pending) {
      setCombatState((state) => consumeBrutalStrikeOnAttackResolution(state, combatantId));
      return;
    }
    const currentTurnCombatantId = combatState.participants?.[combatState.activeTurn]?.characterId;
    try {
      setCombatState(activateBrutalStrike({ character: form, combatState, combatantId, currentTurnCombatantId }));
    } catch (error) {
      window.alert(error.message);
    }
  }, [characterId, combatState, form, resolvedCharacterId]);

  const rollSpellDamage = useCallback(
    async (damageString, extraDice, levelsAbove = 0) => {
      if (typeof damageString !== 'string') {
        return null;
      }

      const trimmed = damageString.trim();
      if (!trimmed) {
        return null;
      }

      const requests = [];
      const validation = calculateDamage(
        trimmed,
        0,
        false,
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

      if (requests.length === 0) {
        const staticResult = calculateDamage(
          trimmed,
          0,
          false,
          undefined,
          extraDice,
          levelsAbove,
        );
        return staticResult ? { ...staticResult, rollValues: undefined } : null;
      }

      try {
        const { rolls } = await rollDiceWithBox(requests);
        let requestIndex = 0;
        const appliedRollGroups = [];
        const applyRolls = (count, sides) => {
          const current = Array.isArray(rolls) ? rolls[requestIndex] : undefined;
          requestIndex += 1;
          const normalizedGroup = sanitizeRollGroup(current, count, sides);
          if (normalizedGroup) {
            appliedRollGroups.push(normalizedGroup);
            return normalizedGroup;
          }
          const resolvedSides =
            Number.isFinite(sides) && sides > 1 ? Math.floor(sides) : 6;
          const fallbackRolls = Array.from({ length: count }, () =>
            Math.max(1, Math.floor(Math.random() * resolvedSides) + 1)
          );
          const normalizedFallback = fallbackRolls
            .map((value) => normalizeRollValue(value))
            .filter((value) => value !== null);
          while (normalizedFallback.length < count) {
            normalizedFallback.push(
              Math.max(1, Math.floor(Math.random() * resolvedSides) + 1),
            );
          }
          appliedRollGroups.push(normalizedFallback);
          return normalizedFallback;
        };

        const finalResult = calculateDamage(
          trimmed,
          0,
          false,
          applyRolls,
          extraDice,
          levelsAbove,
        );

        const appliedValues = collectRollValues(appliedRollGroups);
        const rollValues = appliedValues.length > 0 ? appliedValues : undefined;

        return finalResult ? { ...finalResult, rollValues } : null;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Spell damage roll failed', error);
        const fallbackResult = calculateDamage(
          trimmed,
          0,
          false,
          undefined,
          extraDice,
          levelsAbove,
        );
        return fallbackResult ? { ...fallbackResult, rollValues: undefined } : null;
      }
    },
    [rollDiceWithBox],
  );

  const handleCastSpell = useCallback(
    async (arg, lvl, idx) => {
      if (arg === 'action' || arg === 'bonus') {
        consumeCircle(arg, lvl);
        if (arg === 'action' && speakWithAnimalsPendingRef.current) {
          setActiveEffects((prev = []) => {
            if (prev.some((effect) => effect?.name === 'Speak with Animals')) {
              return prev;
            }
            return [
              ...prev,
              { name: 'Speak with Animals', icon: speakWithAnimalsIcon },
            ];
          });
        }
        if (arg === 'action') {
          speakWithAnimalsPendingRef.current = false;
        }
        return;
      }
      if (arg === 'focus') {
        const operation = typeof lvl === 'string' ? lvl : 'spend';
        const providedMax = Number(idx);
        const maxFocus = Number.isFinite(providedMax)
          ? Math.max(0, Math.floor(providedMax))
          : getMonkFocusPoints(form);

        setUsedSlots((prev) => {
          const numericCurrent = Number(prev?.focus);
          const current =
            Number.isFinite(numericCurrent) && numericCurrent > 0
              ? Math.floor(numericCurrent)
              : 0;
          let next = current;

          if (operation === 'restore') {
            next = Math.max(0, current - 1);
          } else if (operation === 'reset') {
            next = 0;
          } else if (operation === 'spend') {
            if (current >= maxFocus) {
              return prev;
            }
            next = Math.min(maxFocus, current + 1);
          }

          if (next === current) {
            return prev;
          }

          return { ...prev, focus: next };
        });
        return;
      }
      const consumeSlot = (level, preferredType) => {
        const occupations = form?.occupation || [];
        let casterLevel = 0;
        let warlockLevel = 0;
        occupations.forEach((occ) => {
          const name = (occ.Name || occ.Occupation || '').toLowerCase();
          const levelNum = Number(occ.Level) || 0;
          if (name === 'warlock') {
            warlockLevel += levelNum;
            return;
          }
          const progression = SPELLCASTING_CLASSES[name];
          if (progression === 'full') {
            casterLevel += levelNum;
          } else if (progression === 'half') {
            casterLevel += levelNum === 1 ? 0 : Math.ceil(levelNum / 2);
          }
        });
        const slotData = fullCasterSlots[casterLevel] || {};
        const warlockData = pactMagic[warlockLevel] || {};
        const tryConsume = (type, data) => {
          const count = data[level];
          if (!count) return false;
          const key = `${type}-${level}`;
          setUsedSlots((prev) => {
            const levelState = { ...(prev[key] || {}) };
            for (let i = 0; i < count; i += 1) {
              if (!levelState[i]) {
                levelState[i] = true;
                return { ...prev, [key]: levelState };
              }
            }
            return prev;
          });
          return true;
        };
        if (preferredType === 'warlock') {
          if (tryConsume('warlock', warlockData)) return;
          tryConsume('regular', slotData);
          return;
        }
        if (preferredType === 'regular') {
          if (tryConsume('regular', slotData)) return;
          tryConsume('warlock', warlockData);
          return;
        }
        if (tryConsume('regular', slotData)) return;
        tryConsume('warlock', warlockData);
      };

      if (typeof arg === 'object') {
        const {
          level,
          damage,
          breakdown,
          extraDice,
          levelsAbove,
          slotLevel,
          slotType,
          castingTime,
          name,
          spellName: altName,
          pendingEffectOnly,
          diceRolls: providedDiceRolls,
          rollValues: providedRollValues,
        } = arg;
        const spellLabel = name || altName;
        if (pendingEffectOnly) {
          if (spellLabel === 'Speak with Animals') {
            speakWithAnimalsPendingRef.current = true;
          }
          return;
        }
        const castLevel = typeof slotLevel === 'number' ? slotLevel : level;
        consumeSlot(castLevel, slotType);
        if (castingTime?.includes('1 action')) consumeCircle('action');
        else if (castingTime?.includes('1 bonus action')) consumeCircle('bonus');
        let result;
        let diceRollDetails = Array.isArray(providedDiceRolls)
          ? providedDiceRolls
          : undefined;
        let rollValueDetails = Array.isArray(providedRollValues)
          ? providedRollValues
          : undefined;
        if (typeof damage === 'number') {
          result = { total: damage, breakdown };
        } else if (damage) {
          if (!diceRollDetails && !rollValueDetails) {
            const rolled = await rollSpellDamage(
              damage,
              extraDice,
              levelsAbove,
            );
            if (rolled) {
              result = rolled;
              diceRollDetails = Array.isArray(rolled.diceRolls)
                ? rolled.diceRolls
                : undefined;
              rollValueDetails = Array.isArray(rolled.rollValues)
                ? rolled.rollValues
                : undefined;
            }
          }

          if (!result) {
            const calc = calculateDamage(
              damage,
              0,
              false,
              undefined,
              extraDice,
              levelsAbove,
            );
            result =
              calc && typeof calc === 'object'
                ? calc
                : { total: calc };
          }
          if (!result?.breakdown && breakdown) {
            result = { ...result, breakdown };
          }
        } else {
          const spellLabel = name || altName;
          result = { total: spellLabel || 'Spell Cast' };
        }
        const hasDiceDetails =
          (Array.isArray(diceRollDetails) && diceRollDetails.length > 0) ||
          (Array.isArray(rollValueDetails) && rollValueDetails.length > 0);
        const extraDetails = hasDiceDetails
          ? {
              ...(Array.isArray(diceRollDetails) && diceRollDetails.length > 0
                ? { diceRolls: diceRollDetails }
                : {}),
              ...(Array.isArray(rollValueDetails) && rollValueDetails.length > 0
                ? { rollValues: rollValueDetails }
                : {}),
            }
          : undefined;
        if (extraDetails) {
          playerTurnActionsRef.current?.updateDamageValueWithAnimation(
            result?.total,
            result?.breakdown,
            typeof result?.total === 'number' ? spellLabel : undefined,
            extraDetails,
          );
        } else {
          playerTurnActionsRef.current?.updateDamageValueWithAnimation(
            result?.total,
            result?.breakdown,
            typeof result?.total === 'number' ? spellLabel : undefined,
          );
        }
        if (name === 'Haste') {
          setActiveEffects((prev) => [
            ...prev,
            { name: 'Haste', icon: hasteIcon, remaining: 10 },
          ]);
        }
        if (spellLabel === 'Speak with Animals') {
          setActiveEffects((prev = []) => {
            if (prev.some((effect) => effect?.name === 'Speak with Animals')) {
              return prev;
            }
            return [
              ...prev,
              { name: 'Speak with Animals', icon: speakWithAnimalsIcon },
            ];
          });
          speakWithAnimalsPendingRef.current = false;
        } else {
          speakWithAnimalsPendingRef.current = false;
        }
        return;
      }
      if (typeof lvl === 'undefined') {
        consumeSlot(arg);
        return;
      }
      if (typeof idx === 'undefined') {
        consumeSlot(lvl, arg);
        return;
      }
      const type = arg;
      const key = `${type}-${lvl}`;
      setUsedSlots((prev) => {
        const levelState = { ...(prev[key] || {}) };
        levelState[idx] = !levelState[idx];
        return { ...prev, [key]: levelState };
      });
    },
    [consumeCircle, form, rollSpellDamage]
  );

  const availableSlots = useMemo(() => {
    if (!form) return {};
    const occupations = form?.occupation || [];
    let casterLevel = 0;
    let warlockLevel = 0;
    occupations.forEach((occ) => {
      const name = (occ.Name || occ.Occupation || '').toLowerCase();
      const level = Number(occ.Level) || 0;
      if (name === 'warlock') {
        warlockLevel += level;
        return;
      }
      const progression = SPELLCASTING_CLASSES[name];
      if (progression === 'full') {
        casterLevel += level;
      } else if (progression === 'half') {
        casterLevel += level === 1 ? 0 : Math.ceil(level / 2);
      }
    });
    const slotData = fullCasterSlots[casterLevel] || {};
    const warlockData = pactMagic[warlockLevel] || {};

    const regular = {};
    Object.entries(slotData).forEach(([lvl, count]) => {
      const used = Object.values(usedSlots[`regular-${lvl}`] || {}).filter(Boolean)
        .length;
      const left = count - used;
      if (left > 0) regular[lvl] = left;
    });

    const warlock = {};
    Object.entries(warlockData).forEach(([lvl, count]) => {
      const used = Object.values(usedSlots[`warlock-${lvl}`] || {}).filter(Boolean)
        .length;
      const left = count - used;
      if (left > 0) warlock[lvl] = left;
    });

    return { regular, warlock };
  }, [form, usedSlots]);

  const handleWeaponsChange = useCallback(
    async (weapons) => {
      setForm((prev) => ({ ...prev, weapon: weapons }));
      try {
        await apiFetch(`/equipment/update-weapon/${characterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weapon: weapons }),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    },
    [characterId]
  );

  const handleArmorChange = useCallback(
    async (armor) => {
      setForm((prev) => ({ ...prev, armor }));
      try {
        await apiFetch(`/equipment/update-armor/${characterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ armor }),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    },
    [characterId]
  );

  const handleItemsChange = useCallback(
    async (items) => {
      const sanitizedItems = sanitizeInventoryItemsForUpdate(items);
      setForm((prev) => ({ ...prev, item: sanitizedItems }));
      try {
        await apiFetch(`/equipment/update-item/${characterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: sanitizedItems }),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    },
    [characterId]
  );

  const handleAccessoriesChange = useCallback(
    async (accessories) => {
      setForm((prev) => ({
        ...prev,
        accessories,
        accessory: accessories,
      }));
      try {
        await apiFetch(`/equipment/update-accessories/${characterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessories }),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    },
    [characterId]
  );

  const handleEquipmentChange = useCallback(
    async (equipment = {}) => {
      const normalized = normalizeEquipmentMap(equipment, {
        fallback: form?.equipment,
      });
      setForm((prev) => {
        const nextForm = prev ? { ...prev } : {};
        nextForm.equipment = normalized;
        return nextForm;
      });
      try {
        await apiFetch(`/equipment/update-equipment/${characterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ equipment: normalized }),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    },
    [characterId, form]
  );

  const handleShopPurchase = useCallback(
    async (cart = [], totalCostCp = 0) => {
      if (!form) return;

      const normalizedCost = Number.isFinite(totalCostCp)
        ? Math.round(totalCostCp)
        : 0;

      let updatedCurrency;
      try {
        const response = await apiFetch(`/characters/${characterId}/currency`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cp: -normalizedCost }),
        });
        if (!response.ok) {
          throw new Error(`Failed to update currency: ${response.statusText}`);
        }
        updatedCurrency = await response.json();
        setForm((prev) => ({
          ...prev,
          cp: updatedCurrency.cp ?? prev?.cp ?? 0,
          sp: updatedCurrency.sp ?? prev?.sp ?? 0,
          gp: updatedCurrency.gp ?? prev?.gp ?? 0,
          pp: updatedCurrency.pp ?? prev?.pp ?? 0,
        }));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        return;
      }

      const purchaseItems = Array.isArray(cart) ? cart : [];

      const newWeapons = [];
      const newArmor = [];
      const newItems = [];
      const newAccessories = [];

      purchaseItems.forEach((entry) => {
        if (!entry || typeof entry !== 'object') return;
        if (entry.type === 'weapon') {
          const { type: _ignored, weaponType, ...rest } = entry;
          const sanitized = {
            ...rest,
            ...(weaponType !== undefined ? { type: weaponType } : {}),
            owned: true,
          };
          newWeapons.push(sanitized);
          return;
        }
        if (entry.type === 'armor') {
          const { type: _ignored, armorType, ...rest } = entry;
          const sanitized = {
            ...rest,
            ...(armorType !== undefined ? { type: armorType } : {}),
            owned: true,
          };
          newArmor.push(sanitized);
          return;
        }
        if (entry.type === 'item') {
          const { type: _ignored, itemType, ...rest } = entry;
          const sanitized = {
            ...rest,
            ...(itemType !== undefined ? { type: itemType } : {}),
            owned: true,
          };
          newItems.push(sanitized);
        }
        if (entry.type === 'accessory') {
          const { type: _ignored, ...rest } = entry;
          const [normalized] = normalizeInventoryAccessories([rest], {
            includeUnowned: true,
          });
          if (normalized) {
            newAccessories.push({ ...normalized, owned: true });
          }
        }
      });

      if (newWeapons.length) {
        const updatedWeapons = [
          ...(Array.isArray(form.weapon) ? form.weapon : []),
          ...newWeapons,
        ];
        await handleWeaponsChange(updatedWeapons);
      }

      if (newArmor.length) {
        const updatedArmor = [
          ...(Array.isArray(form.armor) ? form.armor : []),
          ...newArmor,
        ];
        await handleArmorChange(updatedArmor);
      }

      if (newItems.length) {
        const normalizedExistingItems = normalizeInventoryItems(
          Array.isArray(form.item) ? form.item : [],
          { includeUnowned: true }
        );
        const updatedItems = [...normalizedExistingItems, ...newItems];
        await handleItemsChange(updatedItems);
      }

      if (newAccessories.length) {
        const sourceAccessories = Array.isArray(form.accessories)
          ? form.accessories
          : Array.isArray(form.accessory)
            ? form.accessory
            : [];
        const normalizedExistingAccessories = normalizeInventoryAccessories(
          sourceAccessories,
          { includeUnowned: true }
        );
        const updatedAccessories = [
          ...normalizedExistingAccessories,
          ...newAccessories,
        ];
        await handleAccessoriesChange(updatedAccessories);
      }
    },
    [
      characterId,
      form,
      handleArmorChange,
      handleAccessoriesChange,
      handleItemsChange,
      handleWeaponsChange,
      setForm,
    ]
  );

  const hasEquipmentData =
    typeof form?.equipment === 'object' && form.equipment !== null;

  const normalizedEquipment = useMemo(
    () => normalizeEquipmentMap(form?.equipment),
    [form?.equipment]
  );

  const fallbackItems = useMemo(
    () => (Array.isArray(form?.item) ? form.item.filter(Boolean) : []),
    [form?.item]
  );

  const fallbackAccessories = useMemo(() => {
    if (Array.isArray(form?.accessories)) {
      return form.accessories.filter(Boolean);
    }
    if (Array.isArray(form?.accessory)) {
      return form.accessory.filter(Boolean);
    }
    return [];
  }, [form?.accessories, form?.accessory]);

  const equippedInventory = useMemo(() => {
    if (hasEquipmentData) {
      return Object.values(normalizedEquipment).filter(Boolean);
    }
    return [...fallbackItems, ...fallbackAccessories];
  }, [fallbackAccessories, fallbackItems, hasEquipmentData, normalizedEquipment]);

  const { bonuses: equipmentBonuses, overrides: equipmentOverrides } =
    useMemo(() => aggregateStatEffects(equippedInventory), [equippedInventory]);

  const featAbilityBonuses = collectFeatAbilityBonuses(form?.feat);

  const raceBonus = form?.race?.abilities || {};

  const characterFigurine = useMemo(() => resolveFigurineImageData(form), [form]);

  const footerCharacterName = useMemo(() => {
    if (!form || typeof form !== 'object') {
      return null;
    }

    const candidateValues = [
      form?.characterName,
      form?.name,
      form?.displayName,
      form?.alias,
    ];

    for (const value of candidateValues) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }

    return null;
  }, [form]);

  const isMobileCombatHudLayout = useMediaQuery('(max-width: 900px)');
  const [mobileHudPanel, setMobileHudPanel] = useState(null);
  const [isDamagePopupDismissed, setIsDamagePopupDismissed] = useState(false);
  const [footerDamageSummary, setFooterDamageSummary] = useState({
    value: null,
    label: 'Damage',
    isCritical: false,
    isFumble: false,
    timestamp: null,
  });

  const handleDamageSummaryChange = useCallback((summary) => {
    setFooterDamageSummary((prev) => {
      if (!summary || typeof summary !== 'object') {
        if (
          prev.value === null &&
          (prev.label === 'Damage' || !prev.label) &&
          !prev.isCritical &&
          !prev.isFumble
        ) {
          return prev;
        }
        return { value: null, label: 'Damage', isCritical: false, isFumble: false, timestamp: null };
      }

      const next = {
        value:
          Object.prototype.hasOwnProperty.call(summary, 'value') &&
          summary.value !== undefined
            ? summary.value
            : null,
        label:
          typeof summary.label === 'string' && summary.label.trim()
            ? summary.label.trim()
            : 'Damage',
        isCritical: Boolean(summary.isCritical),
        isFumble: Boolean(summary.isFumble),
        timestamp:
          typeof summary.timestamp === 'number' && Number.isFinite(summary.timestamp)
            ? summary.timestamp
            : null,
      };

      if (
        prev.value === next.value &&
        prev.label === next.label &&
        prev.isCritical === next.isCritical &&
        prev.isFumble === next.isFumble &&
        prev.timestamp === next.timestamp
      ) {
        return prev;
      }

      return next;
    });
  }, []);


  useEffect(() => {
    if (footerDamageSummary.value !== null && footerDamageSummary.value !== undefined) {
      setIsDamagePopupDismissed(false);
    }
  }, [footerDamageSummary.timestamp, footerDamageSummary.value]);

  const shouldShowDamagePopup =
    footerDamageSummary.value !== null &&
    footerDamageSummary.value !== undefined &&
    !isDamagePopupDismissed;

  const footerHealth = useMemo(() => {
    if (!form || typeof form !== 'object') {
      return { current: null, max: null };
    }

    const { currentHp, maxHp } = calculateCharacterHitPoints(form);

    let resolvedMax = toFiniteNumberOrNull(maxHp);
    if (resolvedMax === null) {
      resolvedMax = toFiniteNumberOrNull(
        form?.hpMax ?? form?.hitPoints ?? form?.health
      );
    }

    let resolvedCurrent = toFiniteNumberOrNull(currentHp);
    if (resolvedCurrent === null && resolvedMax !== null) {
      resolvedCurrent = resolvedMax;
    }

    return {
      current: resolvedCurrent,
      max: resolvedMax,
    };
  }, [form]);

  const tokenPickerFilterScope = useMemo(() => {
    const raceValue =
      form?.race !== undefined && form?.race !== null && form?.race !== ''
        ? form.race
        : form?.raceName ?? form?.Race ?? null;

    return buildPlayerTokenFolderScope(raceValue, form?.occupation);
  }, [form?.occupation, form?.race, form?.raceName, form?.Race, form?.race?.name]);

  const updateLocalDiceColor = useCallback(
    (incomingCharacterId, nextColor, nextTheme = null) => {
      const normalizedCharacterId =
        typeof incomingCharacterId === 'string' && incomingCharacterId.trim() !== ''
          ? incomingCharacterId.trim()
          : null;
      const normalizedColor =
        typeof nextColor === 'string' && nextColor.trim() !== '' ? nextColor.trim() : null;
      const normalizedTheme =
        typeof nextTheme === 'string' && nextTheme.trim() !== '' ? nextTheme.trim() : null;

      if (!normalizedCharacterId || (!normalizedColor && !normalizedTheme)) {
        return;
      }

      setCampaignCharacters((prev) => {
        if (!prev || typeof prev !== 'object' || Object.keys(prev).length === 0) {
          return prev;
        }

        let didUpdate = false;
        const next = { ...prev };

        Object.entries(prev).forEach(([key, value]) => {
          if (!value || typeof value !== 'object') {
            return;
          }

          const identifiers = new Set();
          if (typeof key === 'string' && key.trim() !== '') {
            identifiers.add(key.trim());
          }
          if (typeof value._id === 'string' && value._id.trim() !== '') {
            identifiers.add(value._id.trim());
          }
          if (typeof value.characterId === 'string' && value.characterId.trim() !== '') {
            identifiers.add(value.characterId.trim());
          }

          if (!identifiers.has(normalizedCharacterId)) {
            return;
          }

          const existingColor =
            typeof value.diceColor === 'string' && value.diceColor.trim() !== ''
              ? value.diceColor.trim()
              : null;
          const existingTheme =
            typeof value.diceTheme === 'string' && value.diceTheme.trim() !== ''
              ? value.diceTheme.trim()
              : null;

          const colorChanged = Boolean(normalizedColor) && existingColor !== normalizedColor;
          const themeChanged = Boolean(normalizedTheme) && existingTheme !== normalizedTheme;

          if (!colorChanged && !themeChanged) {
            return;
          }

          const nextEntry = { ...value };
          if (colorChanged && normalizedColor) {
            nextEntry.diceColor = normalizedColor;
          }
          if (themeChanged && normalizedTheme) {
            nextEntry.diceTheme = normalizedTheme;
          }

          next[key] = nextEntry;
          didUpdate = true;
        });

        return didUpdate ? next : prev;
      });

      setForm((prev) => {
        if (!prev) {
          return prev;
        }

        const identifiers = [];
        if (typeof prev._id === 'string' && prev._id.trim() !== '') {
          identifiers.push(prev._id.trim());
        }
        if (typeof prev.characterId === 'string' && prev.characterId.trim() !== '') {
          identifiers.push(prev.characterId.trim());
        }
        const resolvedId = resolvedCharacterIdRef.current;
        if (typeof resolvedId === 'string' && resolvedId.trim() !== '') {
          identifiers.push(resolvedId.trim());
        }

        if (!identifiers.includes(normalizedCharacterId)) {
          return prev;
        }

        const colorMatches =
          !normalizedColor ||
          (typeof prev.diceColor === 'string' && prev.diceColor.trim() === normalizedColor);
        const themeMatches =
          !normalizedTheme ||
          (typeof prev.diceTheme === 'string' && prev.diceTheme.trim() === normalizedTheme);

        if (colorMatches && themeMatches) {
          return prev;
        }

        const nextForm = { ...prev };
        if (!colorMatches && normalizedColor) {
          nextForm.diceColor = normalizedColor;
        }
        if (!themeMatches && normalizedTheme) {
          nextForm.diceTheme = normalizedTheme;
        }

        return nextForm;
      });
    },
    [setCampaignCharacters, setForm]
  );

  const updateLocalFigurineImage = useCallback(
    (incomingCharacterId, nextUrl, nextPublicId) => {
      const normalizedCharacterId =
        typeof incomingCharacterId === 'string' && incomingCharacterId.trim() !== ''
          ? incomingCharacterId.trim()
          : null;
      const normalizedUrl =
        typeof nextUrl === 'string' && nextUrl.trim() !== '' ? nextUrl.trim() : null;
      const normalizedPublicId =
        typeof nextPublicId === 'string' && nextPublicId.trim() !== ''
          ? nextPublicId.trim()
          : null;

      if (!normalizedCharacterId) {
        return;
      }

      setCampaignCharacters((prev) => {
        if (!prev || typeof prev !== 'object' || Object.keys(prev).length === 0) {
          return prev;
        }

        let didUpdate = false;
        const next = { ...prev };

        Object.entries(prev).forEach(([key, value]) => {
          if (!value || typeof value !== 'object') {
            return;
          }

          const identifiers = new Set();
          if (typeof key === 'string' && key.trim() !== '') {
            identifiers.add(key.trim());
          }
          if (typeof value._id === 'string' && value._id.trim() !== '') {
            identifiers.add(value._id.trim());
          }
          if (typeof value.characterId === 'string' && value.characterId.trim() !== '') {
            identifiers.add(value.characterId.trim());
          }

          if (!identifiers.has(normalizedCharacterId)) {
            return;
          }

          const nextValue = { ...value };
          let changed = false;

          if (normalizedUrl) {
            if (nextValue.figurineImageUrl !== normalizedUrl) {
              nextValue.figurineImageUrl = normalizedUrl;
              changed = true;
            }
          } else if (nextValue.figurineImageUrl) {
            delete nextValue.figurineImageUrl;
            changed = true;
          }

          if (normalizedPublicId) {
            if (nextValue.figurineImagePublicId !== normalizedPublicId) {
              nextValue.figurineImagePublicId = normalizedPublicId;
              changed = true;
            }
          } else if (nextValue.figurineImagePublicId) {
            delete nextValue.figurineImagePublicId;
            changed = true;
          }

          if (changed) {
            next[key] = nextValue;
            didUpdate = true;
          }
        });

        return didUpdate ? next : prev;
      });

      setForm((prev) => {
        if (!prev) {
          return prev;
        }

        const identifiers = [];
        if (typeof prev._id === 'string' && prev._id.trim() !== '') {
          identifiers.push(prev._id.trim());
        }
        if (typeof prev.characterId === 'string' && prev.characterId.trim() !== '') {
          identifiers.push(prev.characterId.trim());
        }
        const resolvedId = resolvedCharacterIdRef.current;
        if (typeof resolvedId === 'string' && resolvedId.trim() !== '') {
          identifiers.push(resolvedId.trim());
        }

        if (!identifiers.includes(normalizedCharacterId)) {
          return prev;
        }

        const nextForm = { ...prev };
        let changed = false;

        if (normalizedUrl) {
          if (nextForm.figurineImageUrl !== normalizedUrl) {
            nextForm.figurineImageUrl = normalizedUrl;
            changed = true;
          }
        } else if (nextForm.figurineImageUrl) {
          delete nextForm.figurineImageUrl;
          changed = true;
        }

        if (normalizedPublicId) {
          if (nextForm.figurineImagePublicId !== normalizedPublicId) {
            nextForm.figurineImagePublicId = normalizedPublicId;
            changed = true;
          }
        } else if (nextForm.figurineImagePublicId) {
          delete nextForm.figurineImagePublicId;
          changed = true;
        }

        return changed ? nextForm : prev;
      });
    },
    [setCampaignCharacters, setForm]
  );

  useEffect(() => {
    if (!campaignId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      applyMapPayload({ maps: [], activeMapId: null, map: null });
      return undefined;
    }

    const socketUrl = process.env.REACT_APP_API_URL || undefined;
    const socket = io(socketUrl, { withCredentials: true });
    socketRef.current = socket;

    const handleCombatUpdate = (state) => {
      setCombatState(normalizeCombatState(state));
    };

    const handleCharacterHealthUpdate = (update) => {
      if (!update || typeof update !== 'object') {
        return;
      }

      const normalizedCharacterId =
        typeof update.characterId === 'string' && update.characterId.trim() !== ''
          ? update.characterId.trim()
          : null;
      const normalizedRecordId =
        typeof update._id === 'string' && update._id.trim() !== ''
          ? update._id.trim()
          : null;

      const updateIdentifiers = Array.from(
        new Set([
          ...collectCharacterIdentifiers(update),
          ...(normalizedCharacterId ? [normalizedCharacterId] : []),
          ...(normalizedRecordId ? [normalizedRecordId] : []),
        ])
      );

      if (updateIdentifiers.length === 0) {
        return;
      }

      notifyIncomingDamage({
        event: update.resolvedDamage,
        controlledCombatantId: resolvedCharacterIdRef.current || characterId,
        resolveCombatantName: (sourceId) => {
          const source = campaignCharactersRef.current?.[sourceId]
            || enemiesRef.current.find((enemy) => String(enemy?.enemyId || enemy?._id) === String(sourceId));
          return source?.name || source?.characterName || source?.displayType || null;
        },
        notify,
      });
      // Feed the exact authoritative event used by the incoming-damage toast
      // into the shared Retaliation evaluator after this health update renders.
      if (update.resolvedDamage) setResolvedDamageEvent(update.resolvedDamage);

      if (updateIdentifiers.includes(characterId)) {
        setForm((prev) => prev ? {
          ...prev,
          ...(update.tempHealth !== undefined ? { tempHealth: Number.isFinite(Number(update.tempHealth)) ? Number(update.tempHealth) : update.tempHealth } : {}),
          ...(update.health !== undefined ? { health: Number.isFinite(Number(update.health)) ? Number(update.health) : update.health } : {}),
          ...(update.deathState && typeof update.deathState === 'object' ? { deathState: update.deathState } : {}),
        } : prev);
        if (update.deathEvent?.message) notify(update.deathEvent.message, update.deathEvent.event === 'dead' ? 'danger' : 'success');
      }

      const nextTempHealthValue =
        update.tempHealth !== undefined && update.tempHealth !== null
          ? (() => {
              const numeric = Number(update.tempHealth);
              return Number.isFinite(numeric) ? numeric : update.tempHealth;
            })()
          : undefined;

      const nextHealthValue =
        update.health !== undefined && update.health !== null
          ? (() => {
              const numeric = Number(update.health);
              return Number.isFinite(numeric) ? numeric : update.health;
            })()
          : undefined;

      setCampaignCharacters((prev) => {
        if (!prev || typeof prev !== 'object') {
          return prev;
        }

        const identifierSet = new Set(updateIdentifiers);
        let existing = null;

        for (const identifier of identifierSet) {
          if (prev[identifier]) {
            existing = prev[identifier];
            break;
          }
        }

        if (!existing) {
          for (const value of Object.values(prev)) {
            if (!value || typeof value !== 'object') {
              continue;
            }
            const identifiers = collectCharacterIdentifiers(value);
            if (identifiers.some((identifier) => identifierSet.has(identifier))) {
              existing = value;
              break;
            }
          }
        }

        if (!existing) {
          return prev;
        }

        let didUpdate = false;
        const updatedCharacter = { ...existing };

        if (
          normalizedCharacterId &&
          (typeof updatedCharacter.characterId !== 'string' ||
            updatedCharacter.characterId.trim() !== normalizedCharacterId)
        ) {
          updatedCharacter.characterId = normalizedCharacterId;
          didUpdate = true;
        }

        if (
          normalizedRecordId &&
          (typeof updatedCharacter._id !== 'string' ||
            updatedCharacter._id.trim() !== normalizedRecordId)
        ) {
          updatedCharacter._id = normalizedRecordId;
          didUpdate = true;
        }

        if (
          nextTempHealthValue !== undefined &&
          existing.tempHealth !== nextTempHealthValue
        ) {
          updatedCharacter.tempHealth = nextTempHealthValue;
          didUpdate = true;
        }

        if (nextHealthValue !== undefined && existing.health !== nextHealthValue) {
          updatedCharacter.health = nextHealthValue;
          didUpdate = true;
        }

        if (update.deathState && typeof update.deathState === 'object') {
          updatedCharacter.deathState = update.deathState;
          didUpdate = true;
        }

        if (!didUpdate) {
          return prev;
        }

        const nextCharacters = { ...prev };
        const identifiers = new Set([
          ...collectCharacterIdentifiers(updatedCharacter),
          ...identifierSet,
        ]);

        identifiers.forEach((identifier) => {
          nextCharacters[identifier] = updatedCharacter;
        });

        return nextCharacters;
      });

      setForm((prev) => {
        if (!prev || typeof prev !== 'object') {
          return prev;
        }

        const candidateIds = collectCharacterIdentifiers(prev);
        if (!candidateIds.some((identifier) => updateIdentifiers.includes(identifier))) {
          return prev;
        }

        let didUpdate = false;
        const updatedForm = { ...prev };

        if (
          normalizedCharacterId &&
          (typeof updatedForm.characterId !== 'string' ||
            updatedForm.characterId.trim() !== normalizedCharacterId)
        ) {
          updatedForm.characterId = normalizedCharacterId;
          didUpdate = true;
        }

        if (
          normalizedRecordId &&
          (typeof updatedForm._id !== 'string' ||
            updatedForm._id.trim() !== normalizedRecordId)
        ) {
          updatedForm._id = normalizedRecordId;
          didUpdate = true;
        }

        if (nextTempHealthValue !== undefined && prev.tempHealth !== nextTempHealthValue) {
          updatedForm.tempHealth = nextTempHealthValue;
          didUpdate = true;
        }

        if (nextHealthValue !== undefined && prev.health !== nextHealthValue) {
          updatedForm.health = nextHealthValue;
          didUpdate = true;
        }

        return didUpdate ? updatedForm : prev;
      });
    };

    const handleCampaignMapUpdate = (update) => {
      if (update === null) {
        applyMapPayload({ maps: [], activeMapId: null, map: null });
        return;
      }

      if (!update || typeof update !== 'object') {
        return;
      }

      const hasTokensByMapIdProp = Object.prototype.hasOwnProperty.call(update, 'tokensByMapId');
      const hasActiveTokensProp = Object.prototype.hasOwnProperty.call(update, 'activeMapTokens');
      const hasMapsProp = Array.isArray(update.maps);
      const hasMapProp =
        update.map && typeof update.map === 'object' && !Array.isArray(update.map);
      const hasMapExplicitNull = Object.prototype.hasOwnProperty.call(update, 'map') && update.map === null;
      const hasActiveIdProp = Object.prototype.hasOwnProperty.call(update, 'activeMapId');

      const sanitizedTokens = hasTokensByMapIdProp
        ? sanitizeTokensByMapId(update.tokensByMapId)
        : {};
      const sanitizedActiveTokens = hasActiveTokensProp
        ? sanitizeTokenDictionary(update.activeMapTokens)
        : {};

      const normalizedIncomingActiveId =
        hasActiveIdProp && typeof update.activeMapId === 'string' && update.activeMapId.trim() !== ''
          ? update.activeMapId.trim()
          : null;

      const tokenKeys = ['tokensByMapId', 'activeMapTokens', 'activeMapId'];
      const payloadKeys = Object.keys(update);
      const tokenOnlyUpdate =
        payloadKeys.length > 0 &&
        payloadKeys.every((key) => tokenKeys.includes(key)) &&
        (hasTokensByMapIdProp || hasActiveTokensProp || hasActiveIdProp);

      if (tokenOnlyUpdate) {
        const merged = mergeTokenPayload({
          incomingTokensByMapId: sanitizedTokens,
          incomingActiveMapTokens: sanitizedActiveTokens,
          incomingActiveMapId: normalizedIncomingActiveId,
          previousActiveMapId: campaignActiveMapIdRef.current,
          previousCampaignMap: campaignMapRef.current,
          previousMapTokens: campaignMapTokensRef.current || {},
        });

        setCampaignActiveMapId(merged.activeMapId);
        setCampaignMapTokens(merged.mapTokens);
        setActiveMapTokens(merged.activeMapTokens);
        setCampaignMap(merged.campaignMap);
        return;
      }

      if (
        !hasMapsProp &&
        !hasMapProp &&
        !hasMapExplicitNull &&
        !hasActiveIdProp &&
        !hasTokensByMapIdProp &&
        !hasActiveTokensProp
      ) {
        const normalizedMap = hasMapProp ? update.map : update;
        const normalizedMapId =
          typeof normalizedMap?.mapId === 'string' && normalizedMap.mapId.trim() !== ''
            ? normalizedMap.mapId.trim()
            : null;
        applyMapPayload({
          maps: normalizedMap ? [normalizedMap] : campaignMapsRef.current,
          activeMapId: normalizedMapId || campaignActiveMapIdRef.current,
          map: normalizedMap,
        });
        return;
      }

      let mapFromList = null;
      if (hasMapsProp && normalizedIncomingActiveId) {
        mapFromList = (update.maps || []).find((entry) => {
          if (!entry || typeof entry !== 'object') {
            return false;
          }

          const entryId =
            typeof entry.mapId === 'string' && entry.mapId.trim() !== ''
              ? entry.mapId.trim()
              : null;
          return entryId === normalizedIncomingActiveId;
        }) || null;
      }

      const workingPayload = {
        maps: hasMapsProp ? update.maps : campaignMapsRef.current,
        activeMapId: normalizedIncomingActiveId || campaignActiveMapIdRef.current,
        map: hasMapProp
          ? update.map
          : hasMapExplicitNull
            ? null
            : mapFromList || campaignMapRef.current,
        ...(hasTokensByMapIdProp ? { tokensByMapId: sanitizedTokens } : {}),
        ...(hasActiveTokensProp ? { activeMapTokens: sanitizedActiveTokens } : {}),
      };

      applyMapPayload(workingPayload);
    };

    const handleEnemiesUpdate = (roster) => {
      if (!Array.isArray(roster)) {
        setEnemies([]);
        return;
      }

      const sanitized = roster.filter((entry) => entry && typeof entry === 'object');
      setEnemies(sanitized);
    };

    const handleCharacterMetadataUpdate = (update) => {
      if (!update || typeof update !== 'object') {
        return;
      }

      const normalizedCharacterId =
        typeof update.characterId === 'string' && update.characterId.trim() !== ''
          ? update.characterId.trim()
          : null;

      if (!normalizedCharacterId) {
        return;
      }

      const hasDiceColorUpdate = Object.prototype.hasOwnProperty.call(update, 'diceColor');
      const hasDiceThemeUpdate = Object.prototype.hasOwnProperty.call(update, 'diceTheme');
      const hasFigurineUrlUpdate = Object.prototype.hasOwnProperty.call(
        update,
        'figurineImageUrl'
      );
      const hasFigurineIdUpdate = Object.prototype.hasOwnProperty.call(
        update,
        'figurineImagePublicId'
      );

      if (
        !hasDiceColorUpdate &&
        !hasDiceThemeUpdate &&
        !hasFigurineUrlUpdate &&
        !hasFigurineIdUpdate
      ) {
        return;
      }

      let normalizedDiceColor = null;
      if (hasDiceColorUpdate) {
        normalizedDiceColor =
          typeof update.diceColor === 'string' && update.diceColor.trim() !== ''
            ? update.diceColor.trim()
            : null;
      }

      let normalizedDiceTheme = null;
      if (hasDiceThemeUpdate) {
        normalizedDiceTheme =
          typeof update.diceTheme === 'string' && update.diceTheme.trim() !== ''
            ? update.diceTheme.trim()
            : null;
      }

      if (normalizedDiceColor || normalizedDiceTheme) {
        updateLocalDiceColor(normalizedCharacterId, normalizedDiceColor, normalizedDiceTheme);
      }

      if (hasFigurineUrlUpdate || hasFigurineIdUpdate) {
        const normalizedUrl =
          typeof update.figurineImageUrl === 'string' && update.figurineImageUrl.trim() !== ''
            ? update.figurineImageUrl.trim()
            : null;
        const normalizedPublicId =
          typeof update.figurineImagePublicId === 'string' &&
          update.figurineImagePublicId.trim() !== ''
            ? update.figurineImagePublicId.trim()
            : null;
        updateLocalFigurineImage(normalizedCharacterId, normalizedUrl, normalizedPublicId);
      }
    };

    socket.on('combat:update', handleCombatUpdate);
    socket.on('character:health:update', handleCharacterHealthUpdate);
    socket.on('campaign:map:update', handleCampaignMapUpdate);
    socket.on('campaign:enemies:update', handleEnemiesUpdate);
    socket.on('campaign:characters:update', handleCharacterMetadataUpdate);
    socket.emit('campaign:join', campaignId);
    const unbindCriticalRollTransport = bindCriticalRollTransport(socket, campaignId);

    return () => {
      socket.off('combat:update', handleCombatUpdate);
      socket.off('character:health:update', handleCharacterHealthUpdate);
      socket.off('campaign:map:update', handleCampaignMapUpdate);
      socket.off('campaign:enemies:update', handleEnemiesUpdate);
      socket.off('campaign:characters:update', handleCharacterMetadataUpdate);
      unbindCriticalRollTransport();
      socket.emit('campaign:leave', campaignId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [campaignId, characterId, applyMapPayload, updateLocalDiceColor, updateLocalFigurineImage]);

  const handleDiceColorChange = useCallback(
    (nextColor, nextTheme = null) => {
      const currentId = resolvedCharacterIdRef.current;
      if (!currentId) {
        return;
      }
      updateLocalDiceColor(currentId, nextColor, nextTheme);
    },
    [updateLocalDiceColor]
  );

  const handleOpenTokenPicker = useCallback(() => {
    setTokenPickerError(null);
    setShowTokenPicker(true);
  }, []);

  const handleCloseTokenPicker = useCallback(() => {
    if (tokenPickerSaving) {
      return;
    }
    setShowTokenPicker(false);
    setTokenPickerError(null);
  }, [tokenPickerSaving]);

  const handleTokenSelection = useCallback(
    async (asset) => {
      if (!characterId) {
        return;
      }

      const sanitizedUrl = asset
        ? typeof asset.secureUrl === 'string' && asset.secureUrl.trim() !== ''
          ? asset.secureUrl.trim()
          : typeof asset.url === 'string' && asset.url.trim() !== ''
            ? asset.url.trim()
            : null
        : '';

      const sanitizedPublicId = asset
        ? typeof asset.publicId === 'string' && asset.publicId.trim() !== ''
          ? asset.publicId.trim()
          : null
        : '';

      setTokenPickerSaving(true);
      setTokenPickerError(null);

      try {
        const response = await apiFetch(`/characters/${characterId}/figurine`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            figurineImageUrl: sanitizedUrl,
            figurineImagePublicId: sanitizedPublicId,
          }),
        });

        if (!response.ok) {
          let message = response.statusText || 'Failed to update figurine.';
          try {
            const errorData = await response.json();
            if (errorData && typeof errorData.message === 'string' && errorData.message.trim() !== '') {
              message = errorData.message.trim();
            }
          } catch (jsonError) {
            // ignore parsing errors
          }
          throw new Error(message);
        }

        const result = await response.json();
        const nextUrl =
          typeof result?.figurineImageUrl === 'string' && result.figurineImageUrl.trim() !== ''
            ? result.figurineImageUrl.trim()
            : null;
        const nextPublicId =
          typeof result?.figurineImagePublicId === 'string' &&
          result.figurineImagePublicId.trim() !== ''
            ? result.figurineImagePublicId.trim()
            : null;

        const resolvedId =
          (resolvedCharacterIdRef.current && resolvedCharacterIdRef.current.trim()) || characterId;
        updateLocalFigurineImage(resolvedId, nextUrl, nextPublicId);
        setShowTokenPicker(false);
      } catch (error) {
        console.error(error);
        setTokenPickerError(error?.message || 'Failed to update figurine.');
      } finally {
        setTokenPickerSaving(false);
      }
    },
    [characterId, updateLocalFigurineImage]
  );

  const tokenMetaById = useMemo(() => {
    const lookup = {};

    if (campaignCharacters && typeof campaignCharacters === 'object') {
      Object.entries(campaignCharacters).forEach(([key, value]) => {
        if (typeof key !== 'string') {
          return;
        }

        const trimmed = key.trim();
        if (!trimmed) {
          return;
        }

        const label =
          (typeof value?.characterName === 'string' && value.characterName.trim() !== ''
            ? value.characterName.trim()
            : null) ||
          (typeof value?.name === 'string' && value.name.trim() !== ''
            ? value.name.trim()
            : null) ||
          (typeof value?.displayName === 'string' && value.displayName.trim() !== ''
            ? value.displayName.trim()
            : null);

        const color =
          typeof value?.diceColor === 'string' && value.diceColor.trim() !== ''
            ? value.diceColor.trim()
            : null;

        const entityTypeRaw =
          typeof value?.entityType === 'string' && value.entityType.trim() !== ''
            ? value.entityType.trim()
            : 'character';
        const entityType = entityTypeRaw.toLowerCase();

        const { currentHp, maxHp } = calculateCharacterHitPoints(value);

        const recordSize = normalizeCreatureSize(
          value?.temporarySize ??
            value?.size ??
            value?.characterSize ??
            value?.character?.size ??
            value?.creature?.size ??
            value?.profile?.size ??
            value?.race?.size ??
            value?.attributes?.size ??
            value?.displayType
        );

        const { figurineImageUrl, figurineImagePublicId } = resolveFigurineImageData(value);

        lookup[trimmed] = {
          color,
          label,
          entityType,
          currentHp: Number.isFinite(currentHp) ? currentHp : null,
          maxHp: Number.isFinite(maxHp) ? maxHp : null,
          armorClass: resolveCombatantArmorClass({ ...value, entityType }),
          ...(recordSize ? { size: recordSize } : {}),
          ...(figurineImageUrl ? { figurineImageUrl } : {}),
          ...(figurineImagePublicId ? { figurineImagePublicId } : {}),
        };
      });
    }

    if (Array.isArray(enemies)) {
      enemies.forEach((enemy) => {
        if (!enemy || typeof enemy !== 'object') {
          return;
        }

        const enemyId =
          (typeof enemy.enemyId === 'string' && enemy.enemyId.trim() !== ''
            ? enemy.enemyId.trim()
            : null) ||
          (typeof enemy._id === 'string' && enemy._id.trim() !== '' ? enemy._id.trim() : null);

        if (!enemyId) {
          return;
        }

        const label =
          (typeof enemy.name === 'string' && enemy.name.trim() !== ''
            ? enemy.name.trim()
            : null) ||
          (typeof enemy.enemyType === 'string' && enemy.enemyType.trim() !== ''
            ? enemy.enemyType.trim()
            : null) ||
          enemyId;

        const enemyCurrentHp = toFiniteNumberOrNull(
          enemy.currentHp ?? enemy.maxHp ?? enemy.hitPoints
        );
        const enemyMaxHp = toFiniteNumberOrNull(enemy.maxHp ?? enemy.hitPoints);

        const enemySize = normalizeCreatureSize(
          enemy.size ?? enemy.displayType ?? enemy.type ?? enemy.enemyType
        );

        const { figurineImageUrl, figurineImagePublicId } = resolveFigurineImageData(enemy);

        lookup[enemyId] = {
          color: ENEMY_FIGURINE_COLOR,
          label,
          entityType: 'enemy',
          currentHp: enemyCurrentHp !== null ? enemyCurrentHp : null,
          maxHp: enemyMaxHp !== null ? enemyMaxHp : null,
          armorClass: resolveCombatantArmorClass({ ...enemy, entityType: 'enemy' }),
          ...(enemySize ? { size: enemySize } : {}),
          ...(figurineImageUrl ? { figurineImageUrl } : {}),
          ...(figurineImagePublicId ? { figurineImagePublicId } : {}),
        };
      });
    }

    if (resolvedCharacterId) {
      if (!lookup[resolvedCharacterId]) {
        const color =
          typeof form?.diceColor === 'string' && form.diceColor.trim() !== ''
            ? form.diceColor.trim()
            : null;
        const label =
          (typeof form?.characterName === 'string' && form.characterName.trim() !== ''
            ? form.characterName.trim()
            : null) ||
          (typeof form?.name === 'string' && form.name.trim() !== ''
            ? form.name.trim()
            : null);

        const { currentHp, maxHp } = calculateCharacterHitPoints(form);

        const fallbackSize = normalizeCreatureSize(
          form?.temporarySize ??
            form?.size ??
            form?.characterSize ??
            form?.character?.size ??
            form?.creature?.size ??
            form?.profile?.size ??
            form?.race?.size ??
            form?.attributes?.size ??
            form?.displayType
        );

        const { figurineImageUrl, figurineImagePublicId } = resolveFigurineImageData(form);

        lookup[resolvedCharacterId] = {
          color,
          label,
          entityType: 'character',
          currentHp: Number.isFinite(currentHp) ? currentHp : null,
          maxHp: Number.isFinite(maxHp) ? maxHp : null,
          armorClass: resolveCombatantArmorClass({ ...form, entityType: 'character' }),
          ...(fallbackSize ? { size: fallbackSize } : {}),
          ...(figurineImageUrl ? { figurineImageUrl } : {}),
          ...(figurineImagePublicId ? { figurineImagePublicId } : {}),
        };
      } else {
        const fallbackSize = normalizeCreatureSize(
          form?.temporarySize ??
            form?.size ??
            form?.characterSize ??
            form?.character?.size ??
            form?.creature?.size ??
            form?.profile?.size ??
            form?.race?.size ??
            form?.attributes?.size ??
            form?.displayType
        );

        const nextEntry = { ...lookup[resolvedCharacterId] };

        const { figurineImageUrl, figurineImagePublicId } = resolveFigurineImageData(form);

        if (
          typeof nextEntry.entityType !== 'string' ||
          nextEntry.entityType.trim() === ''
        ) {
          nextEntry.entityType = 'character';
        }

        if (fallbackSize) {
          nextEntry.size = fallbackSize;
        }

        if (figurineImageUrl && !nextEntry.figurineImageUrl) {
          nextEntry.figurineImageUrl = figurineImageUrl;
        }

        if (figurineImagePublicId && !nextEntry.figurineImagePublicId) {
          nextEntry.figurineImagePublicId = figurineImagePublicId;
        }

        lookup[resolvedCharacterId] = nextEntry;
      }
    }

    return lookup;
  }, [campaignCharacters, enemies, form, resolvedCharacterId]);
  targetingTokenLookupRef.current = tokenMetaById;

  const collectMapIdentifiers = useCallback((map) => {
    const identifiers = new Set();

    const addIdentifier = (candidate) => {
      if (typeof candidate !== 'string') {
        return;
      }

      const trimmed = candidate.trim();
      if (trimmed) {
        identifiers.add(trimmed);
      }
    };

    if (map && typeof map === 'object') {
      ['mapId', '_id', 'id', 'uuid', 'guid', 'slug', 'identifier'].forEach((key) =>
        addIdentifier(map[key])
      );

      [map.meta, map.metadata, map.details, map.settings].forEach((entry) => {
        if (!entry || typeof entry !== 'object') {
          return;
        }

        ['mapId', '_id', 'id', 'uuid', 'guid', 'slug', 'identifier'].forEach((key) =>
          addIdentifier(entry[key])
        );
      });
    }

    if (typeof campaignActiveMapId === 'string' && campaignActiveMapId.trim() !== '') {
      addIdentifier(campaignActiveMapId);
    }

    return Array.from(identifiers);
  }, [campaignActiveMapId]);

  const modalTokensByMapId = useMemo(() => {
    const base = { ...(campaignMapTokens || {}) };
    const identifiers = collectMapIdentifiers(campaignMap);

    if (identifiers.length > 0) {
      const mergedTokens = identifiers.reduce((acc, identifier) => {
        const entry = base[identifier];
        if (!entry || typeof entry !== 'object') {
          return acc;
        }

        const sanitizedEntry = sanitizeTokenDictionary(entry);
        Object.values(sanitizedEntry).forEach((token) => {
          acc[token.characterId] = {
            ...(acc[token.characterId] || {}),
            ...token,
          };
        });

        return acc;
      }, {});

      if (activeMapTokens && typeof activeMapTokens === 'object') {
        Object.entries(activeMapTokens).forEach(([key, value]) => {
          const sanitized = sanitizeToken(value, key);
          if (!sanitized) {
            return;
          }

          mergedTokens[sanitized.characterId] = {
            ...(mergedTokens[sanitized.characterId] || {}),
            ...sanitized,
          };
        });
      }

      identifiers.forEach((identifier) => {
        base[identifier] = mergedTokens;
      });
    }

    return base;
  }, [activeMapTokens, campaignMap, campaignMapTokens, collectMapIdentifiers]);

  const handleTokenMove = useCallback(
    async ({ mapId, characterId: tokenCharacterId, x, y, rotation }) => {
      const normalizedCampaign =
        typeof campaignId === 'string' && campaignId.trim() !== '' ? campaignId.trim() : null;
      const normalizedMapId =
        typeof mapId === 'string' && mapId.trim() !== ''
          ? mapId.trim()
          : typeof campaignMapRef.current?.mapId === 'string' &&
              campaignMapRef.current.mapId.trim() !== ''
            ? campaignMapRef.current.mapId.trim()
            : null;
      const normalizedCharacterId =
        typeof tokenCharacterId === 'string' && tokenCharacterId.trim() !== ''
          ? tokenCharacterId.trim()
          : null;
      const clampedX = clamp01(x);
      const clampedY = clamp01(y);

      if (
        !normalizedCampaign ||
        !normalizedMapId ||
        !normalizedCharacterId ||
        clampedX === null ||
        clampedY === null
      ) {
        return false;
      }

      const encodedCampaign = encodeURIComponent(normalizedCampaign);
      const encodedMapId = encodeURIComponent(normalizedMapId);
      const encodedCharacterId = encodeURIComponent(normalizedCharacterId);

      const previousCampaignTokens = campaignMapTokensRef.current || {};
      const previousActiveTokens = activeMapTokensRef.current || {};
      const previousCampaignMap = campaignMapRef.current || null;
      const normalizedRotation = normalizeRotation(rotation);

      const nextToken = {
        ...(previousCampaignTokens?.[normalizedMapId]?.[normalizedCharacterId] || {}),
        characterId: normalizedCharacterId,
        x: clampedX,
        y: clampedY,
        updatedAt: new Date().toISOString(),
        ...(normalizedRotation !== null ? { rotation: normalizedRotation } : {}),
      };

      setCampaignMapTokens((prev) => {
        const next = { ...(prev || {}) };
        const existing = { ...(next[normalizedMapId] || {}) };
        existing[normalizedCharacterId] = {
          ...(existing[normalizedCharacterId] || {}),
          ...nextToken,
        };
        next[normalizedMapId] = existing;
        return next;
      });

      const shouldUpdateActiveTokens =
        campaignActiveMapIdRef.current === normalizedMapId ||
        campaignActiveMapIdRef.current === null ||
        Boolean(activeMapTokensRef.current?.[normalizedCharacterId]);

      if (shouldUpdateActiveTokens) {
        setActiveMapTokens((prev) => ({
          ...(prev || {}),
          [normalizedCharacterId]: {
            ...(prev?.[normalizedCharacterId] || {}),
            ...nextToken,
          },
        }));
      }

      setCampaignMap((prev) => {
        if (!prev) {
          return prev;
        }

        const prevMapId =
          typeof prev.mapId === 'string' && prev.mapId.trim() !== ''
            ? prev.mapId.trim()
            : null;

        if (prevMapId !== normalizedMapId) {
          return prev;
        }

        return {
          ...prev,
          tokens: {
            ...(prev.tokens || {}),
            [normalizedCharacterId]: {
              ...(prev.tokens?.[normalizedCharacterId] || {}),
              ...nextToken,
            },
          },
        };
      });

      try {
        const response = await apiFetch(
          `/campaigns/${encodedCampaign}/maps/${encodedMapId}/tokens/${encodedCharacterId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              x: clampedX,
              y: clampedY,
              ...(normalizedRotation !== null ? { rotation: normalizedRotation } : {}),
            }),
          }
        );

        if (!response.ok) {
          const message = await parseErrorMessage(
            response,
            'Failed to update figurine position.'
          );
          throw new Error(message);
        }

        return true;
      } catch (error) {
        setCampaignMapTokens(previousCampaignTokens || {});
        setActiveMapTokens(previousActiveTokens || {});
        setCampaignMap(previousCampaignMap || null);

        if (error instanceof Error && error.message) {
          throw error;
        }

        throw new Error('Failed to update figurine position.');
      }
    },
    [campaignId]
  );

  const handleTokenRemove = useCallback(
    async ({ mapId, characterId: tokenCharacterId }) => {
      const normalizedCampaign =
        typeof campaignId === 'string' && campaignId.trim() !== '' ? campaignId.trim() : null;
      const normalizedMapId =
        typeof mapId === 'string' && mapId.trim() !== ''
          ? mapId.trim()
          : typeof campaignMapRef.current?.mapId === 'string' &&
              campaignMapRef.current.mapId.trim() !== ''
            ? campaignMapRef.current.mapId.trim()
            : null;
      const normalizedCharacterId =
        typeof tokenCharacterId === 'string' && tokenCharacterId.trim() !== ''
          ? tokenCharacterId.trim()
          : null;
      const resolvedId = resolvedCharacterIdRef.current;

      if (
        !normalizedCampaign ||
        !normalizedMapId ||
        !normalizedCharacterId ||
        !resolvedId ||
        normalizedCharacterId !== resolvedId
      ) {
        return false;
      }

      const previousCampaignTokens = campaignMapTokensRef.current || {};
      const previousActiveTokens = activeMapTokensRef.current || {};
      const previousCampaignMap = campaignMapRef.current || null;
      const existingMapTokens = previousCampaignTokens?.[normalizedMapId] || {};

      if (!Object.prototype.hasOwnProperty.call(existingMapTokens, normalizedCharacterId)) {
        return true;
      }

      const encodedCampaign = encodeURIComponent(normalizedCampaign);
      const encodedMapId = encodeURIComponent(normalizedMapId);
      const encodedCharacterId = encodeURIComponent(normalizedCharacterId);

      setCampaignMapTokens((prev) => {
        if (!prev || !prev[normalizedMapId]?.[normalizedCharacterId]) {
          return prev;
        }
        const next = { ...(prev || {}) };
        const mapTokens = { ...(next[normalizedMapId] || {}) };
        delete mapTokens[normalizedCharacterId];
        if (Object.keys(mapTokens).length === 0) {
          delete next[normalizedMapId];
        } else {
          next[normalizedMapId] = mapTokens;
        }
        return next;
      });

      if (campaignActiveMapIdRef.current === normalizedMapId) {
        setActiveMapTokens((prev) => {
          if (!prev || !prev[normalizedCharacterId]) {
            return prev;
          }
          const next = { ...(prev || {}) };
          delete next[normalizedCharacterId];
          return next;
        });
      }

      setCampaignMap((prev) => {
        if (!prev) {
          return prev;
        }

        const prevMapId =
          typeof prev.mapId === 'string' && prev.mapId.trim() !== '' ? prev.mapId.trim() : null;

        if (prevMapId !== normalizedMapId) {
          return prev;
        }

        if (!prev.tokens || !prev.tokens[normalizedCharacterId]) {
          return prev;
        }

        const nextTokens = { ...(prev.tokens || {}) };
        delete nextTokens[normalizedCharacterId];
        return { ...prev, tokens: nextTokens };
      });

      try {
        const response = await apiFetch(
          `/campaigns/${encodedCampaign}/maps/${encodedMapId}/tokens/${encodedCharacterId}`,
          { method: 'DELETE' }
        );

        if (response && response.status === 404) {
          return true;
        }

        if (!response || !response.ok) {
          const message = await parseErrorMessage(
            response,
            'Failed to remove figurine from map.'
          );
          throw new Error(message);
        }

        return true;
      } catch (error) {
        setCampaignMapTokens(previousCampaignTokens || {});
        setActiveMapTokens(previousActiveTokens || {});
        setCampaignMap(previousCampaignMap || null);

        if (error instanceof Error && error.message) {
          throw error;
        }

        throw new Error('Failed to remove figurine from map.');
      }
    },
    [campaignId]
  );

  const computedStats = STAT_KEYS.reduce((acc, key) => {
    const base = Number(form?.[key] || 0);
    const total =
      base +
      equipmentBonuses[key] +
      featAbilityBonuses[key] +
      Number(raceBonus[key] || 0);
    const overrideCandidates = [equipmentOverrides[key]];
    const overrideValue = overrideCandidates.reduce((max, value) => {
      if (value === undefined || value === null) return max;
      return max === null ? value : Math.max(max, value);
    }, null);
    acc[key] = overrideValue !== null && overrideValue > total ? overrideValue : total;
    return acc;
  }, {});

  const statMods = {
    str: Math.floor((computedStats.str - 10) / 2),
    dex: Math.floor((computedStats.dex - 10) / 2),
    con: Math.floor((computedStats.con - 10) / 2),
    int: Math.floor((computedStats.int - 10) / 2),
    wis: Math.floor((computedStats.wis - 10) / 2),
    cha: Math.floor((computedStats.cha - 10) / 2),
  };

  const footerArmorClass = useMemo(
    () =>
      calculateCharacterArmorClass(form, {
        dexMod: statMods.dex,
        wisMod: statMods.wis,
        conMod: statMods.con,
      }),
    [form, statMods.con, statMods.dex, statMods.wis]
  );
  const footerProficiencyBonus = useMemo(
    () => resolveFooterProficiencyBonus(form, totalLevel),
    [form, totalLevel]
  );
  const footerMovementSpeed = useMemo(
    () => getEffectiveSpeed(calculateCharacterMovementSpeed(form), combatState, resolvedCharacterId || characterId),
    [characterId, combatState, form, resolvedCharacterId]
  );
  const footerInitiativeModifier = useMemo(
    () => calculateCharacterInitiative(form),
    [form]
  );

  const SPELLCASTING_ABILITIES = {
    cleric: 'wis',
    druid: 'wis',
    wizard: 'int',
  };
  const spellcastingClass = (form?.occupation || [])
    .map((cls) => (cls.Name || cls.Occupation || '').toLowerCase())
    .find((name) => SPELLCASTING_CLASSES[name]);
  const spellAbilityKey =
    spellcastingClass && (SPELLCASTING_ABILITIES[spellcastingClass] || 'cha');
  const hasSpellcasting = (form?.occupation || []).some((cls) => {
    const name = (cls.Name || cls.Occupation || '').toLowerCase();
    const progression = SPELLCASTING_CLASSES[name];
    const level = Number(cls.Level) || 0;
    if (!progression) return false;
    if (progression === 'full') return level >= 1;
    if (progression === 'half') return level >= 2;
    return false;
  });

  const spellAbilityMod = hasSpellcasting ? statMods[spellAbilityKey] : null;

  useEffect(() => {
    async function calculateSpellPoints() {
      if (!form) {
        setSpellPointsLeft(0);
        return;
      }
      if (typeof form.spellPoints === 'number') {
        setSpellPointsLeft(form.spellPoints);
        return;
      }
      if (!hasSpellcasting) {
        setSpellPointsLeft(0);
        return;
      }
      try {
        const counts = await Promise.all(
          (form.occupation || []).map(async (cls) => {
            const name = (cls.Name || cls.Occupation || '').toLowerCase();
            const level = Number(cls.Level) || 0;
            const progression = SPELLCASTING_CLASSES[name];
            if (!progression) return 0;
            if (progression === 'half' && level < 2) return 0;
            const abilityMod = ['cleric', 'druid'].includes(name)
              ? statMods.wis
              : statMods.cha;
            const res = await apiFetch(
              `/classes/${name}/features/${level}?abilityMod=${abilityMod}`
            );
            if (!res.ok) return 0;
            const data = await res.json();
            return typeof data.spellsKnown === 'number' ? data.spellsKnown : 0;
          })
        );
        const totalAllowed = counts.reduce((sum, n) => sum + n, 0);
        const learnedCount = (form.spells || []).length;
        setSpellPointsLeft(Math.max(0, totalAllowed - learnedCount));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        setSpellPointsLeft(0);
      }
    }
    calculateSpellPoints();
  }, [form, hasSpellcasting, statMods.cha, statMods.wis]);

  const statNames = [...STAT_KEYS];
  const statTotal = statNames.reduce((sum, stat) => {
    const value = Number(form?.[stat]);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
  // Characters no longer receive stat points from leveling
  const startStatTotal = Number(form?.startStatTotal) || 0;
  const statPointsLeft = startStatTotal - statTotal;

  const proficientSkillsCount = Object.values(form?.skills || {}).filter(
    (skill) => skill?.proficient
  ).length;
  const expertiseSkillsCount = Object.values(form?.skills || {}).filter(
    (skill) => skill?.expertise
  ).length;
  const skillPointsLeft = Math.max(
    0,
    (form?.proficiencyPoints || 0) - proficientSkillsCount
  );
  const expertisePointsLeft = Math.max(
    0,
    (form?.expertisePoints || 0) - expertiseSkillsCount
  );
  const skillsGold =
    skillPointsLeft > 0 || expertisePointsLeft > 0 ? 'gold' : '#6C757D';

  // ---------------------------------------Feats and bonuses----------------------------------------------
  const featBonuses = collectFeatNumericBonuses(form?.feat);

  const featPointsLeft = calculateFeatPointsLeft(occupations, form?.feat || []);
  const featsGold = featPointsLeft > 0 ? "gold" : "#6C757D";
  const spellsGold =
    hasSpellcasting && spellPointsLeft > 0 ? 'gold' : '#6C757D';

  const isFormReady = Boolean(form);
  const diceBoxReady = diceBoxStatus.ready;
  const diceBoxFailed = diceBoxStatus.failed;
  const shouldShowDiceLoadingOverlay =
    isFormReady && !isTestEnvironment && !diceBoxReady && !diceBoxFailed;

  const handleFooterQuickAction = useCallback(
    (action) => {
      if (typeof action === 'function') {
        action();
      }
    },
    []
  );

  const openAttackModal = useCallback(() => {
    playerTurnActionsRef.current?.openAttackModal?.();
  }, []);

  const openDiceRoller = useCallback(() => {
    playerTurnActionsRef.current?.openDiceRoller?.();
  }, []);
  const openDamageLog = useCallback(() => {
    playerTurnActionsRef.current?.openDamageLog?.();
  }, []);
  const clearDamageDice = useCallback(() => {
    playerTurnActionsRef.current?.clearDamageDice?.();
  }, [playerTurnActionsRef]);
  const toggleCriticalFromFooter = useCallback(() => {
    playerTurnActionsRef.current?.toggleCritical?.();
  }, []);
  const passDisabled = !canPassTurn || isPassingTurn;
  const footerMenuButtons = [
    {
      key: 'characterInfo',
      className: 'footer-btn',
      variant: 'secondary',
      style: { color: 'black', backgroundColor: '#6C757D' },
      ariaLabel: 'Open character info',
      title: 'Character info',
      content: <i className="fas fa-image-portrait" aria-hidden="true"></i>,
      onClick: handleShowCharacterInfo,
    },
    {
      key: 'stats',
      className: 'footer-btn',
      variant: 'secondary',
      style: {
        color: 'black',
        backgroundColor: statPointsLeft > 0 ? 'gold' : '#6C757D',
      },
      ariaLabel: 'Open stats',
      title: 'Stats',
      content: <i className="fas fa-scroll" aria-hidden="true"></i>,
      onClick: handleShowStats,
    },
    {
      key: 'skills',
      className: `footer-btn ${
        skillPointsLeft > 0 || expertisePointsLeft > 0 ? 'points-glow' : ''
      }`,
      variant: 'secondary',
      style: { color: 'black', backgroundColor: skillsGold },
      ariaLabel: 'Open skills',
      title: 'Skills',
      content: <i className="fas fa-book-open" aria-hidden="true"></i>,
      onClick: handleShowSkill,
    },
    {
      key: 'feats',
      className: `footer-btn ${featPointsLeft > 0 ? 'points-glow' : ''}`,
      variant: 'secondary',
      style: { color: 'black', backgroundColor: featsGold },
      ariaLabel: 'Open feats',
      title: 'Feats',
      content: <i className="fas fa-hand-fist" aria-hidden="true"></i>,
      onClick: handleShowFeats,
    },
    {
      key: 'features',
      className: 'footer-btn',
      variant: 'secondary',
      style: { color: 'black', backgroundColor: '#6C757D' },
      ariaLabel: 'Open features',
      title: 'Features',
      content: <i className="fas fa-star" aria-hidden="true"></i>,
      onClick: handleShowFeatures,
    },
  ];

  if (hasSpellcasting) {
    footerMenuButtons.push({
      key: 'spells',
      className: `footer-btn ${spellPointsLeft > 0 ? 'points-glow' : ''}`,
      variant: 'secondary',
      style: { color: 'black', backgroundColor: spellsGold },
      ariaLabel: 'Open spells',
      title: 'Spells',
      content: <i className="fas fa-hat-wizard" aria-hidden="true"></i>,
      onClick: handleShowSpells,
    });
  }

  footerMenuButtons.push(
    {
      key: 'equipment',
      className: 'footer-btn',
      variant: 'secondary',
      style: { color: 'black', backgroundColor: '#6C757D' },
      ariaLabel: 'Open equipment',
      title: 'Equipment',
      content: <i className="fas fa-toolbox" aria-hidden="true"></i>,
      onClick: handleShowEquipment,
    },
    {
      key: 'inventory',
      className: 'footer-btn',
      variant: 'secondary',
      style: { color: 'black', backgroundColor: '#6C757D' },
      ariaLabel: 'Open inventory',
      title: 'Inventory',
      content: <i className="fas fa-box-open" aria-hidden="true"></i>,
      onClick: () => handleShowInventory(),
    },
    {
      key: 'shop',
      className: 'footer-btn',
      variant: 'secondary',
      style: { color: 'black', backgroundColor: '#6C757D' },
      ariaLabel: 'Open shop',
      title: 'Shop',
      content: <i className="fas fa-store" aria-hidden="true"></i>,
      onClick: () => handleShowShop(),
    },
    {
      key: 'help',
      className: 'footer-btn',
      variant: 'primary',
      style: { color: 'white' },
      ariaLabel: 'Open help',
      title: 'Help',
      content: <i className="fas fa-info" aria-hidden="true"></i>,
      onClick: handleShowHelpModal,
    },
  );


  const normalizeFooterCollection = useCallback((value) => {
    if (!value) return [];
    const source = Array.isArray(value) ? value : Object.values(value);
    return source
      .filter(Boolean)
      .map((entry, index) => {
        if (typeof entry === 'string') {
          return { id: `${entry}-${index}`, name: entry };
        }
        return {
          id: entry.id || entry.key || entry.name || entry.label || index,
          icon: entry.icon || entry.symbol || '✦',
          name: entry.name || entry.label || entry.type || 'Resource',
          current: entry.current ?? entry.remaining ?? entry.value ?? entry.count,
          max: entry.max ?? entry.total,
          duration: entry.duration ?? entry.remainingDuration,
          color: entry.color,
        };
      })
      .filter((entry) => entry.name);
  }, []);

  const footerClassResources = useMemo(() => {
    const existingResources = normalizeFooterCollection(form?.classResources || form?.resources);
    const classLevels = (form?.occupation || []).reduce((acc, occupationEntry) => {
      const name = String(
        occupationEntry?.Name ?? occupationEntry?.Occupation ?? occupationEntry?.name ?? ''
      ).toLowerCase();
      const level = Number(occupationEntry?.Level ?? occupationEntry?.level ?? 0) || 0;
      if (name && level > 0) {
        acc[name] = (acc[name] || 0) + level;
      }
      return acc;
    }, {});
    const abilityModifier = (score) => Math.max(1, Math.floor(((Number(score) || 10) - 10) / 2));
    const derivedResources = [];
    const pushResource = (resource) => {
      if (!resource || (resource.max !== '∞' && (!Number.isFinite(Number(resource.max)) || Number(resource.max) <= 0))) return;
      const duplicate = existingResources.some((entry) =>
        String(entry.name || '').toLowerCase() === String(resource.name || '').toLowerCase()
      );
      if (!duplicate) derivedResources.push(resource);
    };

    const monkFocusMax = getMonkFocusPoints(form);
    pushResource({ id: 'monk-focus', icon: '✋', name: 'Ki / Focus', current: Math.max(monkFocusMax - (Number(usedSlots?.focus) || 0), 0), max: monkFocusMax, color: '#38e8ff' });
    const rageState = getRageState(form);
    pushResource({ id: 'rage', icon: '🔥', name: 'Rage', current: rageState.current, max: rageState.max, color: '#f0733f', active: rageState.active });
    const recklessState = getRecklessAttackState(form);
    if (getBarbarianLevel(form) >= 2) pushResource({ id: 'reckless-attack', icon: '⚔️', name: 'Reckless Attack', displayLines: ['Reckless', 'Attack'], current: recklessState.active ? 'On' : 'Off', max: '∞', color: '#f59e0b', active: recklessState.active });
    if (getBarbarianLevel(form) >= 9) {
      const active = Boolean(getBrutalStrikePendingEffect(combatState, resolvedCharacterId || characterId));
      pushResource({ id: 'brutal-strike', icon: '👊', name: 'Brutal Strike', displayLines: ['Brutal', 'Strike'], current: active ? 'On' : 'Off', max: '∞', color: '#dc6047', active });
    }
    if (classLevels.bard) pushResource({ id: 'bardic-inspiration', icon: '🎵', name: 'Bardic Inspiration', current: abilityModifier(form?.cha), max: abilityModifier(form?.cha), color: '#d7b46a' });
    if (classLevels.sorcerer) pushResource({ id: 'sorcery-points', icon: '✦', name: 'Sorcery Points', current: classLevels.sorcerer >= 2 ? classLevels.sorcerer : 0, max: classLevels.sorcerer >= 2 ? classLevels.sorcerer : 0, color: '#b85cff' });
    if (classLevels.cleric) pushResource({ id: 'channel-divinity', icon: '☀', name: 'Channel Divinity', current: classLevels.cleric >= 18 ? 3 : classLevels.cleric >= 6 ? 2 : classLevels.cleric >= 2 ? 1 : 0, max: classLevels.cleric >= 18 ? 3 : classLevels.cleric >= 6 ? 2 : classLevels.cleric >= 2 ? 1 : 0, color: '#f3d98a' });
    if (classLevels.druid) pushResource({ id: 'wild-shape', icon: '🐾', name: 'Wild Shape', current: classLevels.druid >= 20 ? '∞' : classLevels.druid >= 2 ? 2 : 0, max: classLevels.druid >= 20 ? '∞' : classLevels.druid >= 2 ? 2 : 0, color: '#49d98a' });
    if (classLevels.fighter) pushResource({ id: 'second-wind', icon: '❤', name: 'Second Wind', current: classLevels.fighter >= 1 ? 1 : 0, max: classLevels.fighter >= 1 ? 1 : 0, color: '#ff5c72' });
    if (classLevels.fighter) pushResource({ id: 'action-surge', icon: '⚡', name: 'Action Surge', current: classLevels.fighter >= 17 ? 2 : classLevels.fighter >= 2 ? 1 : 0, max: classLevels.fighter >= 17 ? 2 : classLevels.fighter >= 2 ? 1 : 0, color: '#f3b35f' });
    if (classLevels.paladin) pushResource({ id: 'lay-on-hands', icon: '✚', name: 'Lay on Hands', current: classLevels.paladin ? classLevels.paladin * 5 : 0, max: classLevels.paladin ? classLevels.paladin * 5 : 0, color: '#f5d27b' });

    return [...derivedResources, ...existingResources];
  }, [characterId, combatState, form, normalizeFooterCollection, resolvedCharacterId, usedSlots?.focus]);
  const footerActiveBonuses = useMemo(
    () => normalizeFooterCollection(form?.activeBonuses || form?.bonuses || form?.activeEffects),
    [form?.activeBonuses, form?.bonuses, form?.activeEffects, normalizeFooterCollection]
  );
  const footerConditions = useMemo(
    () => buildFooterConditions(form, normalizeFooterCollection, combatState, resolvedCharacterId || characterId,
      (id) => id === (resolvedCharacterId || characterId) ? (form?.name || form?.characterName) : campaignCharacters?.[id]?.name || campaignCharacters?.[id]?.characterName),
    [campaignCharacters, characterId, combatState, form, normalizeFooterCollection, resolvedCharacterId]
  );
  const footerConditionSummary = useMemo(
    () => getFooterConditionSummary(footerConditions),
    [footerConditions]
  );
  const hasActiveFooterConditions = footerConditions.length > 0;
  const handleOpenActiveConditionsModal = useCallback(() => {
    if (hasActiveFooterConditions) {
      setShowActiveConditionsModal(true);
    }
  }, [hasActiveFooterConditions]);
  const handleCloseActiveConditionsModal = useCallback(() => {
    setShowActiveConditionsModal(false);
  }, []);
  const brutalStrikeChoice = getBrutalStrikeChoice(combatState, resolvedCharacterId || characterId);
  const brutalStrikeTarget = brutalStrikeChoice ? (targetingTokenLookupRef.current[brutalStrikeChoice.targetCombatantId]
    || enemies.find((enemy) => (enemy.enemyId || enemy._id) === brutalStrikeChoice.targetCombatantId)
    || campaignCharacters?.[brutalStrikeChoice.targetCombatantId]) : null;
  const brutalStrikeTargetName = brutalStrikeTarget?.name || brutalStrikeTarget?.characterName || 'the target';
  const barbarianName = form?.name || form?.characterName || 'The Barbarian';

  const persistCombatState = useCallback(async (nextState) => {
    setCombatState(nextState);
    if (!encodedCampaignId) return;
    const response = await apiFetch(`/campaigns/${encodedCampaignId}/combat`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nextState),
    });
    if (!response.ok) throw new Error(response.statusText || 'Failed to save the Brutal Strike choice.');
    setCombatState(normalizeCombatState(await response.json()));
  }, [encodedCampaignId]);

  const handleResolvedCombatDamage = useCallback(async (damageEvent) => {
    const sourceId = String(damageEvent?.sourceCombatantId || '');
    const targetId = String(damageEvent?.targetCombatantId || '');
    if (!sourceId || !targetId) return;
    const defenderCharacter = targetId === String(resolvedCharacterId || characterId)
      ? form
      : campaignCharacters?.[targetId];
    const sourceRecord = campaignCharacters?.[sourceId]
      || enemies.find((enemy) => String(enemy?.enemyId || enemy?._id) === sourceId)
      || {};
    const targetRecord = campaignCharacters?.[targetId]
      || enemies.find((enemy) => String(enemy?.enemyId || enemy?._id) === targetId)
      || {};
    const sourceCombatant = { ...sourceRecord, ...targetingTokenLookupRef.current[sourceId], characterId: sourceId };
    const targetCombatant = { ...targetRecord, ...targetingTokenLookupRef.current[targetId], characterId: targetId };
    const nextState = processRetaliationDamageEvent({
      combatState,
      character: defenderCharacter,
      damageEvent,
      sourceCombatant,
      targetCombatant,
      mapState: { tokens: activeMapTokens },
    });
    if (nextState !== combatState) await persistCombatState(nextState);
  }, [activeMapTokens, campaignCharacters, characterId, combatState, enemies, form, persistCombatState, resolvedCharacterId]);

  useEffect(() => {
    if (!resolvedDamageEvent) return;
    const damageEventId = resolvedDamageEvent.eventId || resolvedDamageEvent.damageEventId || resolvedDamageEvent.resolutionId;
    if (!damageEventId || processedRetaliationDamageIdsRef.current.has(damageEventId)) return;
    // A health notification is a one-shot event, not an enduring source of combat
    // state. Claim it before starting the async write so Strict Mode and unrelated
    // rerenders cannot enqueue the same decision concurrently.
    processedRetaliationDamageIdsRef.current.add(damageEventId);
    setResolvedDamageEvent(null);
    handleResolvedCombatDamage(resolvedDamageEvent).catch((error) => {
      processedRetaliationDamageIdsRef.current.delete(damageEventId);
      notify(error?.message || 'The Retaliation decision could not be saved.', 'danger');
    });
  }, [handleResolvedCombatDamage, resolvedDamageEvent]);

  const retaliationDecision = (combatState.pendingDecisions || []).find((decision) =>
    decision.type === 'retaliation' &&
    decision.status === 'pending' &&
    String(decision.ownerCombatantId || decision.targetCombatantId) === String(resolvedCharacterId || characterId));
  const declinePendingRetaliation = useCallback(async () => {
    if (!retaliationDecision || retaliationSubmittingRef.current === retaliationDecision.id) return;
    retaliationSubmittingRef.current = retaliationDecision.id;
    setRetaliationSubmittingId(retaliationDecision.id);
    try {
      await persistCombatState(declineRetaliation(combatState, retaliationDecision.id));
    } catch (error) {
      notify(error?.message || 'The Retaliation decision could not be saved.', 'danger');
    } finally {
      retaliationSubmittingRef.current = null;
      setRetaliationSubmittingId(null);
    }
  }, [combatState, persistCombatState, retaliationDecision]);
  const acceptPendingRetaliation = useCallback(async () => {
    if (!retaliationDecision || retaliationSubmittingRef.current === retaliationDecision.id) return;
    retaliationSubmittingRef.current = retaliationDecision.id;
    setRetaliationSubmittingId(retaliationDecision.id);
    const combatants = Object.fromEntries((combatState.participants || []).map((participant) => [
      String(participant.characterId || participant.combatantId || participant.enemyId || participant._id || participant.id),
      targetingTokenLookupRef.current[String(participant.characterId || participant.combatantId || participant.enemyId || participant._id || participant.id)] || participant,
    ]));
    const result = startReactionAttack({
      combatState,
      decisionId: retaliationDecision.id,
      combatants,
      mapState: { tokens: targetingTokenLookupRef.current },
      attacks: [{ id: 'unarmed-strike', name: 'Unarmed Strike', kind: 'unarmed', isUnarmedStrike: true }],
    });
    if (result.error) {
      notify(result.error, 'warning');
      try {
        if (result.state !== combatState) await persistCombatState(result.state);
      } catch (error) {
        notify(error?.message || 'The Retaliation decision could not be saved.', 'danger');
      } finally {
        retaliationSubmittingRef.current = null;
        setRetaliationSubmittingId(null);
      }
      return;
    }
    try {
      await persistCombatState(result.state);
      setCombatTargeting({ status: 'selecting-target', attackId: 'unarmed-strike', ...result.attackSelection });
      notify('Retaliation committed. Select the locked attacker with a melee weapon or Unarmed Strike.', 'info');
    } catch (error) {
      notify(error?.message || 'The Retaliation decision could not be saved.', 'danger');
    } finally {
      retaliationSubmittingRef.current = null;
      setRetaliationSubmittingId(null);
    }
  }, [combatState, persistCombatState, retaliationDecision]);

  const confirmBrutalStrikeChoice = useCallback(async () => {
    if (!brutalStrikeChoice || !brutalStrikeSelection || brutalStrikeSubmittingRef.current) return;
    brutalStrikeSubmittingRef.current = true;
    try {
      const next = applyBrutalStrikeChoice(combatState, { resolutionId: brutalStrikeChoice.resolutionId, choice: brutalStrikeSelection });
      if (brutalStrikeSelection === 'forceful') {
        next.eventLog[next.eventLog.length - 1] = {
          ...next.eventLog[next.eventLog.length - 1],
          message: `Brutal Strike — Forceful Blow: ${brutalStrikeTargetName} is pushed 15 feet directly away from ${barbarianName}. ${barbarianName} may then move up to half their Speed directly toward the target without provoking Opportunity Attacks.`,
        };
      }
      await persistCombatState(next);
      if (brutalStrikeSelection === 'forceful') notify(next.eventLog[next.eventLog.length - 1].message, 'info');
      setBrutalStrikeSelection('');
    } catch (error) {
      notify(error?.message || 'The Brutal Strike effect could not be applied.', 'danger');
    } finally {
      brutalStrikeSubmittingRef.current = false;
    }
  }, [barbarianName, brutalStrikeChoice, brutalStrikeSelection, brutalStrikeTargetName, combatState, persistCombatState]);

  const hasFooterSpellSlots = hasSpellcasting || (form?.occupation || []).some((cls) => {
    const name = (cls.Name || cls.Occupation || '').toLowerCase();
    return name === 'warlock' && (Number(cls.Level) || 0) > 0;
  });

  const footerHiddenResourceCount =
    footerClassResources.length + footerActiveBonuses.length + footerConditions.length +
    (hasFooterSpellSlots ? 1 : 0);

  const DOCKABLE_MODAL_CONFIG = useMemo(
    () => ({
      characterInfo: {
        ...DOCKABLE_MODAL_DEFINITIONS.characterInfo,
        showProp: 'show',
        isEnabled: isFormReady,
        getBaseProps: () => ({
          form,
          handleClose: handleCloseCharacterInfo,
          onShowBackground: handleShowBackground,
          onLongRest: handleLongRest,
          onShortRest: handleShortRest,
          onDockChange: (side) => handleDockChange('characterInfo', side),
        }),
      },
      stats: {
        ...DOCKABLE_MODAL_DEFINITIONS.stats,
        showProp: 'showStats',
        isEnabled: isFormReady,
        getBaseProps: () => ({
          form,
          handleCloseStats,
          onDockChange: (side) => handleDockChange('stats', side),
        }),
      },
      skills: {
        ...DOCKABLE_MODAL_DEFINITIONS.skills,
        showProp: 'showSkill',
        isEnabled: isFormReady,
        getBaseProps: () => ({
          form,
          handleCloseSkill,
          totalLevel,
          strMod: statMods.str,
          dexMod: statMods.dex,
          conMod: statMods.con,
          intMod: statMods.int,
          chaMod: statMods.cha,
          wisMod: statMods.wis,
          onSkillsChange: handleSkillsChange,
          onRollResult: handleRollResult,
          onDockChange: (side) => handleDockChange('skills', side),
        }),
      },
      feats: {
        ...DOCKABLE_MODAL_DEFINITIONS.feats,
        showProp: 'showFeats',
        isEnabled: isFormReady,
        getBaseProps: () => ({
          form,
          handleCloseFeats,
          onDockChange: (side) => handleDockChange('feats', side),
        }),
      },
      features: {
        ...DOCKABLE_MODAL_DEFINITIONS.features,
        showProp: 'showFeatures',
        isEnabled: isFormReady,
        getBaseProps: () => ({
          form,
          handleCloseFeatures,
          onActionSurge: handleActionSurge,
          onLargeForm: handleLargeForm,
          onCharacterChange: setForm,
          longRestCount,
          shortRestCount,
          onDockChange: (side) => handleDockChange('features', side),
        }),
      },
      spells: {
        ...DOCKABLE_MODAL_DEFINITIONS.spells,
        showProp: 'show',
        isEnabled: isFormReady && hasSpellcasting,
        getBaseProps: () => ({
          form,
          handleClose: handleCloseSpells,
          onSpellsChange: handleSpellsChange,
          onCastSpell: handleCastSpell,
          availableSlots,
          onDockChange: (side) => handleDockChange('spells', side),
        }),
      },
      equipment: {
        ...DOCKABLE_MODAL_DEFINITIONS.equipment,
        showProp: 'show',
        isEnabled: isFormReady,
        getBaseProps: () => ({
          form,
          onHide: handleCloseEquipment,
          onEquipmentChange: handleEquipmentChange,
          onDockChange: (side) => handleDockChange('equipment', side),
        }),
      },
      inventory: {
        ...DOCKABLE_MODAL_DEFINITIONS.inventory,
        showProp: 'show',
        isEnabled: isFormReady,
        getBaseProps: () => ({
          form,
          activeTab: inventoryTab,
          onHide: handleCloseInventory,
          onTabChange: setInventoryTab,
          characterId,
          onItemsChange: handleItemsChange,
          onWeaponsChange: handleWeaponsChange,
          onArmorChange: handleArmorChange,
          onAccessoriesChange: handleAccessoriesChange,
          onDockChange: (side) => handleDockChange('inventory', side),
        }),
      },
      shop: {
        ...DOCKABLE_MODAL_DEFINITIONS.shop,
        showProp: 'show',
        isEnabled: isFormReady,
        getBaseProps: () => ({
          form,
          activeTab: shopTab,
          onHide: handleCloseShop,
          onTabChange: setShopTab,
          characterId,
          strength: computedStats.str,
          onWeaponsChange: handleWeaponsChange,
          onArmorChange: handleArmorChange,
          onItemsChange: handleItemsChange,
          onAccessoriesChange: handleAccessoriesChange,
          currency: {
            cp: form?.cp ?? 0,
            sp: form?.sp ?? 0,
            gp: form?.gp ?? 0,
            pp: form?.pp ?? 0,
          },
          onPurchase: handleShopPurchase,
          onDockChange: (side) => handleDockChange('shop', side),
        }),
      },
      help: {
        ...DOCKABLE_MODAL_DEFINITIONS.help,
        showProp: 'showHelpModal',
        isEnabled: isFormReady,
        getBaseProps: () => ({
          form,
          handleCloseHelpModal,
          onDiceColorChange: handleDiceColorChange,
          onDockChange: (side) => handleDockChange('help', side),
        }),
      },
    }),
    [
      activeTurnParticipantId,
      availableSlots,
      campaignActiveMapId,
      campaignMap,
      campaignMaps,
      characterId,
      computedStats.str,
      form,
      handleAccessoriesChange,
      handleActionSurge,
      handleArmorChange,
      handleCastSpell,
      handleCloseCharacterInfo,
      handleCloseEquipment,
      handleCloseFeatures,
      handleCloseFeats,
      handleCloseHelpModal,
      handleCloseInventory,
      handleCloseShop,
      handleCloseSkill,
      handleCloseSpells,
      handleCloseStats,
      handleDiceColorChange,
      handleDockChange,
      handleEquipmentChange,
      handleItemsChange,
      handleLongRest,
      handleRollResult,
      handleShortRest,
      handleShopPurchase,
      handleShowBackground,
      handleSkillsChange,
      handleSpellsChange,
      handleTokenMove,
      handleWeaponsChange,
      hasSpellcasting,
      inventoryTab,
      isFormReady,
      longRestCount,
      modalTokensByMapId,
      resolvedCharacterId,
      setInventoryTab,
      setShopTab,
      shopTab,
      shortRestCount,
      statMods.cha,
      statMods.con,
      statMods.dex,
      statMods.int,
      statMods.str,
      statMods.wis,
      totalLevel,
      tokenMetaById,
    ]
  );

  useEffect(() => {
    setDockedModals((prev) => {
      let nextState = prev;
      ['left', 'right'].forEach((side) => {
        const modalKey = prev[side];
        if (modalKey && DOCKABLE_MODAL_CONFIG[modalKey]?.isEnabled === false) {
          if (nextState === prev) {
            nextState = { ...prev };
          }
          nextState[side] = null;
        }
      });
      return nextState;
    });
  }, [DOCKABLE_MODAL_CONFIG]);

  const dockedModalElements = useMemo(() => {
    return Object.entries(DOCKABLE_MODAL_CONFIG)
      .map(([modalKey, config]) => {
        if (config.isEnabled === false) {
          return null;
        }

        const dockedSide = getDockedSide(modalKey);
        if (!dockedSide) {
          return null;
        }

        const Component = config.component;
        const baseProps =
          typeof config.getBaseProps === 'function' ? config.getBaseProps() : {};

        return (
          <Component
            key={`docked-${modalKey}`}
            {...baseProps}
            {...{ [config.showProp]: true }}
            isDocked
            dockedSide={dockedSide}
            onDockClose={() => handleDockClose(modalKey)}
            onDockChange={(side) => handleDockChange(modalKey, side)}
          />
        );
      })
      .filter(Boolean);
  }, [DOCKABLE_MODAL_CONFIG, getDockedSide, handleDockChange, handleDockClose]);

  const mapDockedSide = useMemo(() => getDockedSide('map'), [getDockedSide]);
  const hasResolvedCampaignMap = useMemo(
    () => Boolean(resolvedCampaignMap),
    [resolvedCampaignMap]
  );
  const lastAutoDockedMapIdRef = useRef(null);

  useEffect(() => {
    const activeMapId =
      typeof resolvedCampaignMap?.mapId === 'string' &&
      resolvedCampaignMap.mapId.trim() !== ''
        ? resolvedCampaignMap.mapId.trim()
        : null;

    setDockedModals((prev) => {
      const hasDockedMap = prev.left === 'map' || prev.right === 'map';

      if (!activeMapId) {
        if (!hasDockedMap) {
          lastAutoDockedMapIdRef.current = null;
          return prev;
        }

        const next = { ...prev };
        if (next.left === 'map') {
          next.left = null;
        }
        if (next.right === 'map') {
          next.right = null;
        }
        lastAutoDockedMapIdRef.current = null;
        return next;
      }

      if (hasDockedMap) {
        lastAutoDockedMapIdRef.current = activeMapId;
        return prev;
      }

      if (lastAutoDockedMapIdRef.current === activeMapId) {
        return prev;
      }

      const next = { ...prev };
      if (next.left === null) {
        next.left = 'map';
      } else if (next.right === null) {
        next.right = 'map';
      } else {
        return prev;
      }

      lastAutoDockedMapIdRef.current = activeMapId;
      return next;
    });
  }, [resolvedCampaignMap, setDockedModals]);

  const isMapInteractionActive = hasResolvedCampaignMap;

  const overlaySurfaceClassName = useMemo(
    () =>
      isMapInteractionActive
        ? 'zombies-character-sheet-layout__overlay-surface'
        : '',
    [isMapInteractionActive]
  );

  const layoutClassName = useMemo(() => {
    const classes = ['zombies-character-sheet-layout'];
    if (isMapInteractionActive) {
      classes.push('zombies-character-sheet-layout--map-interaction-active');
    }
    return classes.join(' ');
  }, [isMapInteractionActive]);

  const mapContainerClassName = useMemo(() => {
    const classes = ['zombies-character-sheet-layout__map'];
    if (isMapInteractionActive) {
      classes.push('zombies-character-sheet-layout__map--overlay-visible');
    }
    return classes.join(' ');
  }, [isMapInteractionActive]);

  const renderCombatHudStatusPanel = () => (
    <Panel className="combat-hud-dock__status" aria-label="Character status">
      <FooterCharacterSlot
        characterFigurine={characterFigurine}
        characterId={characterId}
        characterName={footerCharacterName}
        currentHealth={footerHealth.current}
        maxHealth={footerHealth.max}
        armorClass={footerArmorClass}
        onHealthChange={handleHealthChange}
        damageSummary={footerDamageSummary}
        onOpenDamageLog={() => handleFooterQuickAction(openDamageLog)}
        spellSlots={null}
        resourcesDrawer={null}
        hiddenResourceCount={footerHiddenResourceCount}
        actions={null}
        onToggleCritical={toggleCriticalFromFooter}
        deathState={form?.deathState}
        isActiveTurn={isPlayersTurn}
        onRollDeathSave={handleRollDeathSave}
        collapseDeathPanelSignal={mobileHudPanel}
        isCombatHudPanelOpen={isMobileCombatHudLayout && Boolean(mobileHudPanel)}
      />
      <div className="combat-hud-dock__stat-pills" aria-label="Defenses and conditions">
        <span className="combat-hud-pill"><HeartPulse size={16} /> {footerHealth.current}/{footerHealth.max}</span>
        <span className="combat-hud-pill"><Shield size={16} /> AC {footerArmorClass || '—'}</span>
        <span className="combat-hud-pill" aria-label="Proficiency bonus">Proficiency {formatSignedBonus(footerProficiencyBonus)}</span>
        <span className="combat-hud-pill" aria-label="Movement speed">Move: {footerMovementSpeed} ft</span>
        <span className="combat-hud-pill" aria-label="Initiative modifier">Initiative: {formatSignedBonus(footerInitiativeModifier)}</span>
        <span className="combat-hud-pill" aria-label="Active conditions">
          {hasActiveFooterConditions ? (
            <IconButton
              className="combat-hud-conditions-trigger"
              label="View active conditions"
              onClick={handleOpenActiveConditionsModal}
            >
              <Sparkles size={16} />
            </IconButton>
          ) : (
            <Sparkles size={16} aria-hidden="true" />
          )}
          <span className="combat-hud-condition__label">{footerConditionSummary.label}</span>
        </span>
      </div>
    </Panel>
  );

  return (
    <div className={layoutClassName}>
      <div className={mapContainerClassName}>
        <MapModal
          show={isMapInteractionActive}
          map={resolvedCampaignMap}
          maps={campaignMaps}
          activeMapId={campaignActiveMapId}
          tokensByMapId={modalTokensByMapId}
          currentCharacterId={resolvedCharacterId}
          activeCharacterId={activeTurnParticipantId}
          characterLookup={tokenMetaById}
          onTokenMove={handleTokenMove}
          onTokenRemove={handleTokenRemove}
          onTokenClick={handleTargetTokenClick}
          targeting={combatTargeting.status !== 'inactive'}
          displayMode="background"
          isDocked={Boolean(mapDockedSide)}
          dockedSide={mapDockedSide}
          onDockChange={(side) => handleDockChange('map', side)}
          onDockClose={() => handleDockClose('map')}
        />
        {combatTargeting.status !== 'inactive' && (
          <div className="combat-targeting-instruction" role="status" aria-live="polite">
            <strong>{combatTargeting.status === 'resolving' ? 'Rolling attack…' : 'Select a target'}</strong>
            <span>{combatTargeting.status === 'resolving' ? 'Resolving hit and damage.' : 'Click a living combatant to attack. Esc to cancel.'}</span>
          </div>
        )}
      </div>
      <div
        ref={rootContainerRef}
        className="text-center zombies-character-sheet-layout__content"
        style={{
          fontFamily: 'Raleway, sans-serif',
          backgroundColor: 'transparent',
          height: '100vh',
          overflow: 'hidden',
          paddingTop: navHeight + HEADER_PADDING,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
      <div
        ref={contentColumnRef}
        className="zombies-character-sheet__content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: '1 1 auto',
          minHeight: 0,
          position: 'relative',
        }}
      >
        {shouldShowDiceLoadingOverlay && (
          <div
            className="zombies-character-sheet__dice-overlay"
            role="status"
            aria-live="polite"
          >
            <div className="zombies-character-sheet__dice-overlay-content">
              Preparing the dice roller...
            </div>
          </div>
        )}
        {isFormReady ? (
        <>
          {diceBoxFailed && (
            <div className="zombies-character-sheet__dice-warning" role="alert">
              The 3D dice roller failed to load. Rolls will use fallback values until it
              reconnects.
            </div>
          )}
          <div
            ref={headerRef}
            className={overlaySurfaceClassName || undefined}
          >
            <div ref={combatHeaderRef}>
              <CombatTurnHeader
                participants={participantsWithDetails}
                tokenLookup={tokenMetaById}
              />
            </div>
          </div>
          <div
            style={{
              height: `calc(100vh - ${headerHeight}px)`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              className={overlaySurfaceClassName || undefined}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <StatusEffectBar
                effects={activeEffects}
                onRemoveEffect={handleRemoveEffect}
              />
            </div>
            <div
              className={overlaySurfaceClassName || undefined}
              style={{ width: '100%' }}
            >
              <PlayerTurnActions
                form={form}
                dexMod={statMods.dex}
                strMod={statMods.str}
                conMod={statMods.con}
                spellAbilityMod={spellAbilityMod}
                spellAbilityKey={spellAbilityKey}
                characterId={characterId}
                isActiveTurn={isPlayersTurn}
                ref={playerTurnActionsRef}
                onCastSpell={handleCastSpell}
                onDamageSummaryChange={handleDamageSummaryChange}
                onCharacterChange={setForm}
                availableSlots={availableSlots}
                longRestCount={longRestCount}
                shortRestCount={shortRestCount}
                onBeginTargeting={(selection) => setCombatTargeting({ status: 'selecting-target', ...selection })}
                onApplyTargetDamage={handleApplyTargetDamage}
                onDamageResolved={handleResolvedCombatDamage}
                onCancelTargeting={() => {
                  setCombatTargeting(INACTIVE_COMBAT_TARGETING);
                }}
                onAttackResolved={async (result) => {
                  if (result.brutalStrike) {
                    const sourceCombatantId = resolvedCharacterId || characterId;
                    await persistCombatState(resolveBrutalStrikeAttack(combatState, {
                      ...result, sourceCombatantId, targetCombatantId: result.targetId,
                    }));
                  }
                }}
                combatState={combatState}
              />
            </div>
          </div>
          {shouldShowDamagePopup && (
            <div className="combat-hud-damage-popup" role="status" aria-live="polite">
              <button
                type="button"
                className="combat-hud-damage-popup__close"
                onClick={() => setIsDamagePopupDismissed(true)}
                aria-label="Close damage popup"
              >
                ×
              </button>
              <span className="combat-hud-damage-popup__label">{footerDamageSummary.label || 'Damage'}</span>
              <strong className="combat-hud-damage-popup__value">{footerDamageSummary.value}</strong>
              <button
                type="button"
                className="combat-hud-damage-popup__log"
                onClick={() => handleFooterQuickAction(openDamageLog)}
              >
                Log
              </button>
            </div>
          )}
          <Navbar
            fixed="bottom"
            data-bs-theme="dark"
            style={{ backgroundColor: 'transparent' }}
            className={[overlaySurfaceClassName, 'footer-navbar hud-footer-navbar']
              .filter(Boolean)
              .join(' ')}
            aria-label="Combat HUD dock"
          >
            <Container fluid className="footer-container hud-footer-container">
              <Dock className="combat-hud-dock" aria-label="Combat HUD dock">
                <div className="combat-hud-mobile-tabs" aria-label="Mobile HUD sections">
                  <button
                    type="button"
                    className={`combat-hud-mobile-tab ${mobileHudPanel === 'resources' ? 'is-active' : ''}`}
                    onClick={() => setMobileHudPanel((panel) => (panel === 'resources' ? null : 'resources'))}
                  >
                    Resources
                  </button>
                  <button
                    type="button"
                    className={`combat-hud-mobile-tab ${mobileHudPanel === 'menu' ? 'is-active' : ''}`}
                    onClick={() => setMobileHudPanel((panel) => (panel === 'menu' ? null : 'menu'))}
                  >
                    Menu
                  </button>
                </div>
                {!isMobileCombatHudLayout && renderCombatHudStatusPanel()}

                <Panel className={`combat-hud-dock__resources ${mobileHudPanel === 'resources' ? 'is-mobile-open' : ''}`} aria-label="Combat resources">
                  {isMobileCombatHudLayout && renderCombatHudStatusPanel()}
                  {form && (
                    <div className="combat-hud-dock__turn-slots" aria-label="Turn action tracking">
                      <SpellSlots
                        form={form}
                        used={usedSlots}
                        onToggleSlot={handleCastSpell}
                        actionCount={actionCount}
                        longRestCount={longRestCount}
                        shortRestCount={shortRestCount}
                        onActionSurge={handleActionSurge}
                        showTurnSlots
                        showSpellSlots={false}
                        showFocusSlot={false}
                      />
                    </div>
                  )}
                  {footerClassResources.length > 0 && (
                    <div className="combat-hud-dock__resource-rail" aria-label="Class resources">
                      {footerClassResources.map((resource) => {
                        const isFocusResource = resource.id === 'monk-focus';
                        const isRageResource = resource.id === 'rage';
                        const isRecklessAttackResource = resource.id === 'reckless-attack';
                        const isBrutalStrikeResource = resource.id === 'brutal-strike';
                        const brutalEligibility = canActivateBrutalStrike({ character: form, combatState, combatantId: resolvedCharacterId || characterId });
                        const resourceMax = Number(resource.max);
                        const handleResourceActivate = (event, action = 'spend') => {
                          if (isRageResource) {
                            event.preventDefault();
                            if (resource.active) {
                              handleEndRage();
                            } else {
                              handleActivateRage();
                            }
                            return;
                          }
                          if (isRecklessAttackResource) {
                            event.preventDefault();
                            handleToggleRecklessAttack();
                            return;
                          }
                          if (isBrutalStrikeResource) {
                            event.preventDefault();
                            handleToggleBrutalStrike();
                            return;
                          }
                          if (!isFocusResource || !Number.isFinite(resourceMax) || resourceMax <= 0) {
                            return;
                          }
                          event.preventDefault();
                          handleCastSpell('focus', action, resourceMax);
                        };

                        return (
                          <button
                            key={resource.id}
                            type="button"
                            className="combat-hud-resource-tile"
                            style={{ '--hud-resource-accent': resource.color }}
                            title={isBrutalStrikeResource ? (resource.active ? 'Brutal Strike is ready. Your next eligible Strength-based attack this turn forgoes Reckless Attack Advantage. On a hit, it deals an extra 1d10 damage and triggers a Brutal Strike effect.' : brutalEligibility.reason || 'Ready Brutal Strike for your next eligible attack this turn.') : isRecklessAttackResource ? (resource.active ? 'Reckless Attack active. Attack rolls against this character have Advantage until the start of their next turn.' : canActivateRecklessAttack(form).reason || 'Activate Reckless Attack. Attacks against you have Advantage until the start of your next turn.') : isRageResource ? (resource.active ? `End Rage: ${resource.current ?? '—'}/${resource.max ?? '—'} uses remaining` : hasHeavyArmorEquipped(form) ? 'Cannot rage while wearing Heavy Armor' : Number(resource.current) <= 0 ? 'No Rage uses remaining' : `Activate Rage: ${resource.current ?? '—'}/${resource.max ?? '—'} uses remaining`) : isFocusResource ? `${resource.name}: click to spend, right-click to restore, double-click to reset` : `${resource.name}: ${resource.current ?? '—'}/${resource.max ?? '—'}`}
                            aria-label={`${resource.name}: ${resource.current ?? '—'} of ${resource.max ?? '—'}`}
                            onClick={(event) => handleResourceActivate(event, event.shiftKey ? 'restore' : 'spend')}
                            onContextMenu={(event) => handleResourceActivate(event, 'restore')}
                            onDoubleClick={(event) => handleResourceActivate(event, 'reset')}
                            disabled={(!isFocusResource && !isRageResource && !isRecklessAttackResource && !isBrutalStrikeResource) || resource.disabled || (isBrutalStrikeResource && !resource.active && !brutalEligibility.allowed) || (isRecklessAttackResource && (!canActivateRecklessAttack(form).allowed || resource.active)) || (isRageResource && !resource.active && (Number(resource.current) <= 0 || hasHeavyArmorEquipped(form)))}
                          >
                            <span className="combat-hud-resource-tile__icon" aria-hidden="true">{resource.icon}</span>
                            <span className="combat-hud-resource-tile__name">
                              {Array.isArray(resource.displayLines) && resource.displayLines.length > 0
                                ? resource.displayLines.map((line, lineIndex) => (
                                  <span key={`${resource.id || resource.name}-display-line-${lineIndex}`} className="combat-hud-resource-tile__name-line">{line}</span>
                                ))
                                : resource.name}
                            </span>
                            {!(Array.isArray(resource.displayLines) && resource.displayLines.length > 0) && (
                              <span className="combat-hud-resource-tile__value">{resource.current ?? '—'}/{resource.max ?? '—'}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {form && (
                    <SpellSlots
                      form={form}
                      used={usedSlots}
                      onToggleSlot={handleCastSpell}
                      actionCount={actionCount}
                      longRestCount={longRestCount}
                      shortRestCount={shortRestCount}
                      onActionSurge={handleActionSurge}
                      showTurnSlots={false}
                      showFocusSlot={false}
                    />
                  )}
                </Panel>

                <Toolbar className="combat-hud-dock__primary" aria-label="Primary combat actions">
                  <IconButton label="Clear rolled dice" className="hud-action-button hud-action-button--clear-dice" onClick={() => handleFooterQuickAction(clearDamageDice)}><span className="hud-clear-dice-button__icon" aria-hidden="true"><FaDiceD20 /></span></IconButton>
                  <IconButton label="Open dice roller" className="hud-action-button" onClick={() => handleFooterQuickAction(openDiceRoller)}><Dice5 size={24} /></IconButton>
                  <IconButton label="Open attack actions" className="hud-action-button hud-action-button--attack" onClick={() => handleFooterQuickAction(openAttackModal)}><Swords size={28} /></IconButton>
                  <HudButton
                    type="button"
                    variant="primary"
                    className="hud-pass-turn-button"
                    disabled={passDisabled}
                    onClick={() => handleFooterQuickAction(handlePassTurn)}
                    aria-label="Pass turn"
                    title="Pass turn"
                  >
                    Pass<span className="hud-pass-turn-button__optional"> Turn</span>
                  </HudButton>
                </Toolbar>

                <Toolbar className={`combat-hud-dock__secondary ${mobileHudPanel === 'menu' ? 'is-mobile-open' : ''}`} aria-label="Secondary actions">
                  {footerMenuButtons.map((action) => {
                    const icons = { characterInfo: UserRound, stats: Dumbbell, skills: Gem, feats: Sparkles, inventory: Backpack, equipment: Shield, shop: Package, spells: BookOpen, help: CircleHelp, map: Settings };
                    const Icon = icons[action.key] || Settings;
                    return (
                      <IconButton
                        key={action.key}
                        label={action.ariaLabel || action.title}
                        className={action.className}
                        style={action.style}
                        onClick={() => handleFooterQuickAction(action.onClick)}
                      >
                        <Icon size={20} />
                      </IconButton>
                    );
                  })}
                </Toolbar>
              </Dock>
            </Container>
          </Navbar>
          <CombatConditionsModal
            show={showActiveConditionsModal}
            onHide={handleCloseActiveConditionsModal}
            conditions={footerConditions}
          />
        </>
      ) : (
        <div
          style={{
            flex: '1 1 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 600,
            padding: '16px',
          }}
        >
          Loading...
        </div>
      )}
      </div>
    {isFormReady && (
      <>
        <CharacterInfo
          form={form}
          show={showCharacterInfo}
          handleClose={handleCloseCharacterInfo}
          onShowBackground={handleShowBackground}
          onLongRest={handleLongRest}
          onShortRest={handleShortRest}
          characterFigurine={characterFigurine}
          handleOpenTokenPicker={handleOpenTokenPicker}
          tokenPickerSaving={tokenPickerSaving}
          dockedSide={getDockedSide('characterInfo')}
          onDockChange={(side) => handleDockChange('characterInfo', side)}
        />
        <Skills
          form={form}
          showSkill={shouldShowSkillsModal}
          handleCloseSkill={handleCloseSkill}
          totalLevel={totalLevel}
          strMod={statMods.str}
          dexMod={statMods.dex}
          conMod={statMods.con}
          intMod={statMods.int}
          chaMod={statMods.cha}
          wisMod={statMods.wis}
          onSkillsChange={handleSkillsChange}
          onRollResult={handleRollResult}
          dockedSide={getDockedSide('skills')}
          onDockChange={(side) => handleDockChange('skills', side)}
        />
        <Stats
          form={form}
          showStats={showStats}
          handleCloseStats={handleCloseStats}
          dockedSide={getDockedSide('stats')}
          onDockChange={(side) => handleDockChange('stats', side)}
        />
        <BackgroundModal
          show={showBackground}
          onHide={handleCloseBackground}
          background={form?.background}
        />
        <Feats
          form={form}
          showFeats={showFeats}
          handleCloseFeats={handleCloseFeats}
          dockedSide={getDockedSide('feats')}
          onDockChange={(side) => handleDockChange('feats', side)}
        />
        <Features
          form={form}
          showFeatures={showFeatures}
          handleCloseFeatures={handleCloseFeatures}
          onActionSurge={handleActionSurge}
          onAdrenalineRush={handleAdrenalineRush}
          onLargeForm={handleLargeForm}
          onDraconicFlight={handleDraconicFlight}
          onCastSpell={handleCastSpell}
          longRestCount={longRestCount}
          shortRestCount={shortRestCount}
          availableSlots={availableSlots}
          actionCount={actionCount}
          characterId={characterId}
          onCharacterChange={setForm}
          dockedSide={getDockedSide('features')}
          onDockChange={(side) => handleDockChange('features', side)}
        />
        <InventoryModal
          show={showInventory}
          activeTab={inventoryTab}
          onHide={handleCloseInventory}
          onTabChange={setInventoryTab}
          form={form}
          characterId={characterId}
          onCharacterChange={setForm}
          dockedSide={getDockedSide('inventory')}
          onDockChange={(side) => handleDockChange('inventory', side)}
          onItemsChange={handleItemsChange}
          onWeaponsChange={handleWeaponsChange}
          onArmorChange={handleArmorChange}
          onAccessoriesChange={handleAccessoriesChange}
        />
        <EquipmentModal
          show={showEquipment}
          onHide={handleCloseEquipment}
          form={form}
          onEquipmentChange={handleEquipmentChange}
          dockedSide={getDockedSide('equipment')}
          onDockChange={(side) => handleDockChange('equipment', side)}
        />
        <ShopModal
          show={showShop}
          activeTab={shopTab}
          onHide={handleCloseShop}
          onTabChange={setShopTab}
          form={form}
          characterId={characterId}
          strength={computedStats.str}
          onWeaponsChange={handleWeaponsChange}
          onArmorChange={handleArmorChange}
          onItemsChange={handleItemsChange}
          onAccessoriesChange={handleAccessoriesChange}
          currency={{
            cp: form?.cp ?? 0,
            sp: form?.sp ?? 0,
            gp: form?.gp ?? 0,
            pp: form?.pp ?? 0,
          }}
          onPurchase={handleShopPurchase}
          dockedSide={getDockedSide('shop')}
          onDockChange={(side) => handleDockChange('shop', side)}
        />
        {hasSpellcasting && (
          <SpellSelector
            form={form}
            show={showSpells}
            handleClose={handleCloseSpells}
            onSpellsChange={handleSpellsChange}
            onCastSpell={handleCastSpell}
            availableSlots={availableSlots}
            dockedSide={getDockedSide('spells')}
            onDockChange={(side) => handleDockChange('spells', side)}
          />
        )}
        <Help
          form={form}
          showHelpModal={showHelpModal}
          handleCloseHelpModal={handleCloseHelpModal}
          onDiceColorChange={handleDiceColorChange}
          dockedSide={getDockedSide('help')}
          onDockChange={(side) => handleDockChange('help', side)}
        />
      </>
    )}
    <TokenPickerModal
      show={showTokenPicker}
      onHide={handleCloseTokenPicker}
      campaignId={campaignId || undefined}
      onSelect={handleTokenSelection}
      allowClear={Boolean(
        characterFigurine?.figurineImageUrl || characterFigurine?.figurineImagePublicId
      )}
      onClear={() => handleTokenSelection(null)}
      isBusy={tokenPickerSaving}
      errorMessage={tokenPickerError}
      filterScope={tokenPickerFilterScope}
    />
    <Modal className="dnd-modal" centered show={Boolean(brutalStrikeChoice)} onHide={() => {}} backdrop="static" keyboard={false}>
      <Modal.Header>
        <Modal.Title>Choose a Brutal Strike Effect</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Your Brutal Strike hit. Choose one effect to apply to {brutalStrikeTargetName}.</p>
        <div role="radiogroup" aria-label="Brutal Strike effects" className="d-grid gap-3">
          {[
            ['forceful', 'Forceful Blow', 'The target is pushed 15 feet straight away from you. You can then move up to half your Speed straight toward the target without provoking Opportunity Attacks.'],
            ['hamstring', 'Hamstring Blow', 'The target’s Speed is reduced by 15 feet until the start of your next turn. A target can be affected by only one Hamstring Blow at a time; the most recent one replaces the previous effect.'],
          ].map(([value, title, description]) => (
            <Card key={value} as="button" type="button" role="radio" aria-checked={brutalStrikeSelection === value}
              className={`text-start selectable-card${brutalStrikeSelection === value ? ' border-primary' : ''}`}
              onClick={() => setBrutalStrikeSelection(value)}>
              <Card.Body><Card.Title>{title}</Card.Title><Card.Text>{description}</Card.Text></Card.Body>
            </Card>
          ))}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <BootstrapButton disabled={!brutalStrikeSelection || brutalStrikeSubmittingRef.current} onClick={confirmBrutalStrikeChoice}>Confirm</BootstrapButton>
      </Modal.Footer>
    </Modal>
    <Modal className="dnd-modal" centered show={Boolean(retaliationDecision)} onHide={() => {}} backdrop="static" keyboard={false}>
      <Modal.Header><Modal.Title>Use Retaliation?</Modal.Title></Modal.Header>
      <Modal.Body>
        <p>{retaliationDecision?.sourceName || 'The attacking creature'} damaged you while within 5 feet.</p>
        <p>You can use your Reaction to make one melee attack against it.</p>
      </Modal.Body>
      <Modal.Footer>
        <BootstrapButton variant="secondary" disabled={retaliationSubmittingId === retaliationDecision?.id} onClick={declinePendingRetaliation}>No</BootstrapButton>
        <BootstrapButton disabled={retaliationSubmittingId === retaliationDecision?.id} onClick={acceptPendingRetaliation}>Yes</BootstrapButton>
      </Modal.Footer>
    </Modal>
    {dockedModalElements}
      </div>
    </div>
  );
}
