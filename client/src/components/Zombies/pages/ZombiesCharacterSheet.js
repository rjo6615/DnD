
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import apiFetch from '../../../utils/apiFetch';
import { useParams } from "react-router-dom";
import { Nav, Navbar, Container, Button, Form } from 'react-bootstrap';
import '../../../App.scss';
import loginbg from "../../../images/loginbg.png";
import CharacterInfo from "../attributes/CharacterInfo";
import Stats from "../attributes/Stats";
import Skills from "../attributes/Skills";
import Feats from "../attributes/Feats";
import { calculateFeatPointsLeft } from '../../../utils/featUtils';
import PlayerTurnActions, {
  calculateDamage,
} from "../attributes/PlayerTurnActions";
import Help from "../attributes/Help";
import { SKILLS } from "../skillSchema";
import {
  STAT_KEYS,
  aggregateStatEffects,
  collectFeatAbilityBonuses,
  collectFeatNumericBonuses,
} from "../utils/derivedStats";
import { calculateCharacterHitPoints } from "../utils/characterMetrics";
import HealthDefense from "../attributes/HealthDefense";
import SpellSelector from "../attributes/SpellSelector";
import StatusEffectBar from "../attributes/StatusEffectBar";
import BackgroundModal from "../attributes/BackgroundModal";
import Features from "../attributes/Features";
import SpellSlots from "../attributes/SpellSlots";
import { fullCasterSlots, pactMagic } from '../../../utils/spellSlots';
import hasteIcon from "../../../images/spell-haste-icon.png";
import largeFormIcon from "../../../images/large-form-icon.png";
import dragonWingsIcon from "../../../images/dragon-wings-icon.png";
import adrenalineRushIcon from "../../../images/adrenaline-rush.png";
import speakWithAnimalsIcon from "../../../images/speak-with-animal.png";
import ShopModal from "../attributes/ShopModal";
import InventoryModal from "../attributes/InventoryModal";
import EquipmentModal from "../attributes/EquipmentModal";
import {
  normalizeItems as normalizeInventoryItems,
  normalizeAccessories as normalizeInventoryAccessories,
} from "../attributes/inventoryNormalization";
import { normalizeEquipmentMap } from "../attributes/equipmentNormalization";
import MapModal from "../attributes/MapModal";
import { ENEMY_FIGURINE_COLOR } from '../constants/tokenAppearance';
import { mergeTokenPayload } from "./utils/mergeTokenPayload";
import proficiencyBonus from '../../../utils/proficiencyBonus';

const HEADER_PADDING = 16;
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
  map: { label: 'Campaign Map', component: MapModal },
  help: { label: 'Help', component: Help },
};
const DOCKABLE_MODAL_OPTIONS = [
  { key: null, label: 'None' },
  ...Object.entries(DOCKABLE_MODAL_DEFINITIONS).map(([key, { label }]) => ({
    key,
    label,
  })),
];
const WIDE_SCREEN_QUERY = '(min-width: 1200px)';
const createEmptyCombatState = () => ({ participants: [], activeTurn: null });

const toFiniteNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

  return { participants, activeTurn };
};

const mapCharactersById = (characters) => {
  if (!Array.isArray(characters)) {
    return {};
  }

  return characters.reduce((acc, character) => {
    if (!character) {
      return acc;
    }

    const id =
      typeof character._id === "string"
        ? character._id
        : typeof character.characterId === "string"
          ? character.characterId
          : null;

    if (id) {
      acc[id] = character;
    }

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

const createCircleState = () => ({
  0: 'active',
  1: 'active',
  2: 'active',
  3: 'active',
});

const createDefaultUsedSlots = () => ({
  action: createCircleState(),
  bonus: createCircleState(),
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

  return { ...candidate, characterId: candidateId, x, y };
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

function CombatTurnHeader({ participants }) {
  const headerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const lastAutoScrollTargetRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const participantsCount = Array.isArray(participants) ? participants.length : 0;
  const activeIndex = useMemo(() => {
    if (!Array.isArray(participants)) {
      return -1;
    }

    return participants.findIndex((participant) => participant?.isActive);
  }, [participants]);

  const updateOverflowHints = useCallback(() => {
    const container = headerRef.current;

    if (!container) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);
    const nextCanScrollLeft = scrollLeft > 1;
    const nextCanScrollRight = maxScrollLeft - scrollLeft > 1;

    setCanScrollLeft((prev) => (prev !== nextCanScrollLeft ? nextCanScrollLeft : prev));
    setCanScrollRight((prev) => (prev !== nextCanScrollRight ? nextCanScrollRight : prev));
  }, []);

  useEffect(() => {
    updateOverflowHints();

    const handleResize = () => {
      updateOverflowHints();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [updateOverflowHints, participantsCount]);

  const headerClassName = useMemo(() => {
    const classes = ['combat-turn-header'];

    if (isDragging) {
      classes.push('combat-turn-header--dragging');
    }
    if (canScrollLeft) {
      classes.push('combat-turn-header--fade-left');
    }
    if (canScrollRight) {
      classes.push('combat-turn-header--fade-right');
    }
    if (!participantsCount) {
      classes.push('combat-turn-header--empty');
    }

    return classes.join(' ');
  }, [isDragging, canScrollLeft, canScrollRight, participantsCount]);

  const finishDrag = useCallback((event) => {
    if (!isDraggingRef.current) {
      const container = headerRef.current;
      if (container && typeof event?.pointerId === 'number' && container.hasPointerCapture?.(event.pointerId)) {
        container.releasePointerCapture(event.pointerId);
      }
      return;
    }

    isDraggingRef.current = false;
    setIsDragging(false);

    const container = headerRef.current;
    if (container && typeof event?.pointerId === 'number' && container.hasPointerCapture?.(event.pointerId)) {
      container.releasePointerCapture(event.pointerId);
    }

    updateOverflowHints();
  }, [updateOverflowHints]);

  const handlePointerDown = useCallback((event) => {
    const container = headerRef.current;
    if (!container) {
      return;
    }

    isDraggingRef.current = true;
    startXRef.current = event.clientX ?? 0;
    startScrollLeftRef.current = container.scrollLeft;
    setIsDragging(true);

    if (typeof event.pointerId === 'number' && container.setPointerCapture) {
      try {
        container.setPointerCapture(event.pointerId);
      } catch (error) {
        // Ignore capture errors (e.g., unsupported browsers).
      }
    }
  }, []);

  const handlePointerMove = useCallback((event) => {
    if (!isDraggingRef.current) {
      return;
    }

    const container = headerRef.current;
    if (!container) {
      return;
    }

    event.preventDefault();

    const pointerX = event.clientX ?? 0;
    const deltaX = pointerX - startXRef.current;
    container.scrollLeft = startScrollLeftRef.current - deltaX;

    updateOverflowHints();
  }, [updateOverflowHints]);

  const handlePointerUp = useCallback((event) => {
    finishDrag(event);
  }, [finishDrag]);

  const handlePointerLeave = useCallback((event) => {
    finishDrag(event);
  }, [finishDrag]);

  const handlePointerCancel = useCallback((event) => {
    finishDrag(event);
  }, [finishDrag]);

  const handleScroll = useCallback(() => {
    updateOverflowHints();
  }, [updateOverflowHints]);

  useEffect(() => {
    if (isDragging) {
      return;
    }

    const container = headerRef.current;
    const participantsList = Array.isArray(participants) ? participants : null;
    const activeParticipant =
      activeIndex >= 0 && participantsList ? participantsList[activeIndex] : null;

    if (activeIndex < 0 || !activeParticipant) {
      if (lastAutoScrollTargetRef.current !== null) {
        lastAutoScrollTargetRef.current = null;
      }
      return;
    }

    if (!container) {
      return;
    }

    const identifier = activeParticipant.characterId ?? activeIndex;

    if (lastAutoScrollTargetRef.current === identifier) {
      return;
    }

    const card = container.children?.[activeIndex];
    if (!card) {
      return;
    }

    const adjustScrollManually = () => {
      const containerRect = container.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();

      const leftOverflow = cardRect.left - containerRect.left - HEADER_PADDING;
      const rightOverflow = cardRect.right - containerRect.right + HEADER_PADDING;

      if (leftOverflow < 0) {
        container.scrollLeft += leftOverflow;
      } else if (rightOverflow > 0) {
        container.scrollLeft += rightOverflow;
      }
    };

    if (typeof card.scrollIntoView === 'function') {
      try {
        card.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest',
        });
      } catch (error) {
        // Ignore scrollIntoView errors and fall back to manual scrolling.
      }
    }

    const schedule = typeof requestAnimationFrame === 'function'
      ? (callback) => requestAnimationFrame(callback)
      : (callback) => callback();

    schedule(() => {
      adjustScrollManually();
      updateOverflowHints();
    });

    lastAutoScrollTargetRef.current = identifier;
  }, [activeIndex, participants, isDragging, updateOverflowHints]);

  return (
    <div
      ref={headerRef}
      className={headerClassName}
      role="group"
      aria-label="Combat turn order"
      touchAction={participantsCount ? 'pan-x' : 'auto'}
      onPointerDown={participantsCount ? handlePointerDown : undefined}
      onPointerMove={participantsCount ? handlePointerMove : undefined}
      onPointerUp={participantsCount ? handlePointerUp : undefined}
      onPointerLeave={participantsCount ? handlePointerLeave : undefined}
      onPointerCancel={participantsCount ? handlePointerCancel : undefined}
      onScroll={participantsCount ? handleScroll : undefined}
    >
      {participantsCount ? (
        participants.map((participant, index) => {
          const { characterId, name, hpDisplay, hpCurrent, hpMax, isActive } = participant;

          const hasHpData = hpCurrent !== null || hpMax !== null;
          const computedPercentage =
            hpCurrent !== null && hpMax !== null && hpMax > 0
              ? Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100))
              : null;
          const hpPercentage = computedPercentage !== null ? computedPercentage : 0;
          const hpColorHue = computedPercentage !== null ? (hpPercentage / 100) * 120 : 0;
          const hpFillColor =
            computedPercentage !== null
              ? `hsl(${Math.round(hpColorHue)}, 70%, 45%)`
              : "rgba(220, 220, 220, 0.35)";

          return (
            <div
              key={characterId}
              className="combat-turn-header__card"
              data-participant-id={characterId}
              data-participant-index={index}
              style={{
                background: isActive
                  ? "linear-gradient(135deg, rgba(37, 31, 26, 0.96), rgba(18, 15, 12, 0.94))"
                  : "rgba(28, 25, 22, 0.82)",
                color: "#FFFFFF",
                borderRadius: "12px",
                padding: "10px 16px",
                boxShadow: isActive
                  ? "0 0 18px rgba(214, 178, 86, 0.7), 0 0 8px rgba(214, 178, 86, 0.4) inset"
                  : "0 0 8px rgba(0, 0, 0, 0.45)",
                border: isActive
                  ? "1px solid rgba(214, 178, 86, 0.85)"
                  : "1px solid rgba(255, 255, 255, 0.18)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                transform: isActive ? "scale(1.03)" : "scale(1)",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "14px",
                  letterSpacing: "0.5px",
                }}
              >
                {name}
              </div>
              <div style={{ marginTop: "6px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "12px",
                    opacity: 0.9,
                    marginBottom: "4px",
                  }}
                >
                  <span>HP</span>
                  <span>{hasHpData ? hpDisplay : "—"}</span>
                </div>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "8px",
                    borderRadius: "6px",
                    background: "rgba(0, 0, 0, 0.45)",
                    overflow: "hidden",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      height: "100%",
                      width: `${hpPercentage}%`,
                      background: computedPercentage !== null
                        ? `linear-gradient(90deg, ${hpFillColor} 0%, ${hpFillColor} 100%)`
                        : "transparent",
                      transition: "width 0.3s ease, background-color 0.3s ease",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="combat-turn-header__placeholder" aria-hidden="true" />
      )}
    </div>
  );
}

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

export default function ZombiesCharacterSheet() {
  const params = useParams();
  const characterId = params.id;
  const [form, setForm] = useState(null);
  const [campaignId, setCampaignId] = useState(null);
  const [combatState, setCombatState] = useState(createEmptyCombatState());
  const [campaignCharacters, setCampaignCharacters] = useState({});
  const [enemies, setEnemies] = useState([]);
  const [campaignMaps, setCampaignMaps] = useState([]);
  const [campaignActiveMapId, setCampaignActiveMapId] = useState(null);
  const [campaignMap, setCampaignMap] = useState(null);
  const [campaignMapTokens, setCampaignMapTokens] = useState({});
  const [activeMapTokens, setActiveMapTokens] = useState({});
  const [showMapModal, setShowMapModal] = useState(false);
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
  const [showBackground, setShowBackground] = useState(false);
  const [spellPointsLeft, setSpellPointsLeft] = useState(0);
  const [longRestCount, setLongRestCount] = useState(0);
  const [shortRestCount, setShortRestCount] = useState(0);

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
  const [dockedModals, setDockedModals] = useState({ left: null, right: null });
  const [isWideScreen, setIsWideScreen] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(WIDE_SCREEN_QUERY).matches;
  });

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
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mediaQueryList = window.matchMedia(WIDE_SCREEN_QUERY);
      const listener = (event) => {
        setIsWideScreen(event.matches);
      };

      if (typeof mediaQueryList.addEventListener === 'function') {
        mediaQueryList.addEventListener('change', listener);
        return () => mediaQueryList.removeEventListener('change', listener);
      }

      if (typeof mediaQueryList.addListener === 'function') {
        mediaQueryList.addListener(listener);
        return () => mediaQueryList.removeListener(listener);
      }
    }

    return undefined;
  }, []);

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

        let normalizedCurrentHp = participantCurrentHp !== null
          ? participantCurrentHp
          : Number.isFinite(currentHp)
            ? currentHp
            : null;
        let normalizedMaxHp = participantMaxHp !== null
          ? participantMaxHp
          : Number.isFinite(maxHp)
            ? maxHp
            : null;

        if (normalizedMaxHp === null) {
          const fallbackMax = toFiniteNumberOrNull(char?.hitPoints ?? char?.health);
          if (fallbackMax !== null) {
            normalizedMaxHp = fallbackMax;
          }
        }

        if (normalizedCurrentHp === null && normalizedMaxHp !== null) {
          normalizedCurrentHp = normalizedMaxHp;
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
    handleHealthChange(0);
  }, [handleHealthChange, longRestCount, shortRestCount]);

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

  const adrenalineRushActive = useMemo(
    () => activeEffects.some((effect) => effect?.name === 'Adrenaline Rush'),
    [activeEffects]
  );

  const speedMultiplier = useMemo(
    () => (adrenalineRushActive ? 2 : 1),
    [adrenalineRushActive]
  );

  const temporarySize = form?.temporarySize;
  const temporarySpeedBonus = form?.temporarySpeedBonus;

  useEffect(() => {
    if (!form) {
      return;
    }

    const hasLargeForm = activeEffects.some(
      (effect) => effect && effect.name === 'Large Form'
    );

    if (hasLargeForm) {
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
  }, [activeEffects, form]);

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

    const nextIndex = (activeIndex + 1) % participants.length;

    const payload = {
      participants: participants.map((participant) => ({
        characterId: participant.characterId,
        initiative: participant.initiative,
      })),
      activeTurn: nextIndex,
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
      const updated = { ...prev, action: createCircleState(), bonus: createCircleState() };
      Object.keys(updated).forEach((key) => {
        if (key.startsWith('warlock-')) delete updated[key];
      });
      return updated;
    });
    setActionCount(baseActionCount);
  }, [shortRestCount, baseActionCount]);

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
    const computedMaxWidth = largestGutter > BUFFER ? largestGutter - BUFFER : 0;

    dockingScopeElement.style.setProperty('--docked-modal-top-offset', `${Math.round(topOffset)}px`);

    if (computedMaxWidth > 0) {
      dockingScopeElement.style.setProperty('--docked-modal-max-width', `${Math.round(computedMaxWidth)}px`);
    } else {
      dockingScopeElement.style.removeProperty('--docked-modal-max-width');
    }
  }, []);

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
      }
    };
  }, [updateDockedModalMetrics]);

  useEffect(() => {
    updateDockedModalMetrics();
  }, [updateDockedModalMetrics, headerHeight, isWideScreen]);

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

  const handleDockSelectionChange = useCallback((side, value) => {
    const normalizedValue = value || null;
    setDockedModals((prev) => {
      const next = { ...prev, [side]: normalizedValue };
      if (normalizedValue) {
        const otherSide = side === 'left' ? 'right' : 'left';
        if (prev[otherSide] === normalizedValue) {
          next[otherSide] = null;
        }
      }
      return next;
    });
  }, []);

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
  const handleShowMapModal = useCallback(() => setShowMapModal(true), []);
  const handleCloseMapModal = useCallback(() => {
    setShowMapModal(false);
    handleDockClose('map');
  }, [handleDockClose]);

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
  const shouldShowMapModal = showMapModal;

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
  }, []);

  const handleShortRest = useCallback(() => {
    setShortRestCount((c) => c + 1);
  }, []);

  const handleCastSpell = useCallback(
    (arg, lvl, idx) => {
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
        if (typeof damage === 'number') {
          result = { total: damage, breakdown };
        } else if (damage) {
          const calc = calculateDamage(
            damage,
            0,
            false,
            undefined,
            extraDice,
            levelsAbove
          );
          result =
            calc && typeof calc === 'object'
              ? calc
              : { total: calc };
          if (!result?.breakdown && breakdown) {
            result = { ...result, breakdown };
          }
        } else {
          const spellLabel = name || altName;
          result = { total: spellLabel || 'Spell Cast' };
        }
        playerTurnActionsRef.current?.updateDamageValueWithAnimation(
          result?.total,
          result?.breakdown,
          typeof result?.total === 'number' ? spellLabel : undefined
        );
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
    [form, consumeCircle]
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
      setForm((prev) => ({ ...prev, item: items }));
      try {
        await apiFetch(`/equipment/update-item/${characterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: items }),
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

  const { bonuses: itemBonus, overrides: itemOverrides } = aggregateStatEffects(
    form?.item
  );

  const accessorySource = Array.isArray(form?.accessories)
    ? form.accessories
    : Array.isArray(form?.accessory)
      ? form.accessory
      : [];

  const { bonuses: accessoryBonus, overrides: accessoryOverrides } =
    aggregateStatEffects(accessorySource);

  const featAbilityBonuses = collectFeatAbilityBonuses(form?.feat);

  const raceBonus = form?.race?.abilities || {};

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
    resolvedCharacterIdRef.current = resolvedCharacterId;
  }, [resolvedCharacterId]);

  const updateLocalDiceColor = useCallback(
    (incomingCharacterId, nextColor) => {
      const normalizedCharacterId =
        typeof incomingCharacterId === 'string' && incomingCharacterId.trim() !== ''
          ? incomingCharacterId.trim()
          : null;
      const normalizedColor =
        typeof nextColor === 'string' && nextColor.trim() !== '' ? nextColor.trim() : null;

      if (!normalizedCharacterId || !normalizedColor) {
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

          if (existingColor === normalizedColor) {
            return;
          }

          next[key] = { ...value, diceColor: normalizedColor };
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

        if (typeof prev.diceColor === 'string' && prev.diceColor.trim() === normalizedColor) {
          return prev;
        }

        return { ...prev, diceColor: normalizedColor };
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
      setShowMapModal(false);
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

      const rawCharacterId = update.characterId;
      const normalizedCharacterId =
        typeof rawCharacterId === 'string' && rawCharacterId.trim() !== ''
          ? rawCharacterId.trim()
          : null;

      if (!normalizedCharacterId) {
        return;
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

        const existing = prev[normalizedCharacterId];
        if (!existing) {
          return prev;
        }

        let didUpdate = false;
        const updatedCharacter = { ...existing };

        if (nextTempHealthValue !== undefined && existing.tempHealth !== nextTempHealthValue) {
          updatedCharacter.tempHealth = nextTempHealthValue;
          didUpdate = true;
        }

        if (nextHealthValue !== undefined && existing.health !== nextHealthValue) {
          updatedCharacter.health = nextHealthValue;
          didUpdate = true;
        }

        if (!didUpdate) {
          return prev;
        }

        return {
          ...prev,
          [normalizedCharacterId]: updatedCharacter,
        };
      });

      setForm((prev) => {
        if (!prev || typeof prev !== 'object') {
          return prev;
        }

        const candidateIds = [];
        if (typeof prev._id === 'string' && prev._id.trim() !== '') {
          candidateIds.push(prev._id.trim());
        }
        if (typeof prev.characterId === 'string' && prev.characterId.trim() !== '') {
          candidateIds.push(prev.characterId.trim());
        }

        if (!candidateIds.includes(normalizedCharacterId)) {
          return prev;
        }

        let didUpdate = false;
        const updatedForm = { ...prev };

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

      const normalizedDiceColor =
        typeof update.diceColor === 'string' && update.diceColor.trim() !== ''
          ? update.diceColor.trim()
          : null;

      if (!normalizedDiceColor) {
        return;
      }

      updateLocalDiceColor(normalizedCharacterId, normalizedDiceColor);
    };

    socket.on('combat:update', handleCombatUpdate);
    socket.on('character:health:update', handleCharacterHealthUpdate);
    socket.on('campaign:map:update', handleCampaignMapUpdate);
    socket.on('campaign:enemies:update', handleEnemiesUpdate);
    socket.on('campaign:characters:update', handleCharacterMetadataUpdate);
    socket.emit('campaign:join', campaignId);

    return () => {
      socket.off('combat:update', handleCombatUpdate);
      socket.off('character:health:update', handleCharacterHealthUpdate);
      socket.off('campaign:map:update', handleCampaignMapUpdate);
      socket.off('campaign:enemies:update', handleEnemiesUpdate);
      socket.off('campaign:characters:update', handleCharacterMetadataUpdate);
      socket.emit('campaign:leave', campaignId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [campaignId, applyMapPayload, updateLocalDiceColor]);

  const handleDiceColorChange = useCallback(
    (nextColor) => {
      const currentId = resolvedCharacterIdRef.current;
      if (!currentId) {
        return;
      }
      updateLocalDiceColor(currentId, nextColor);
    },
    [updateLocalDiceColor]
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

        lookup[trimmed] = {
          color,
          label,
          entityType,
          currentHp: Number.isFinite(currentHp) ? currentHp : null,
          maxHp: Number.isFinite(maxHp) ? maxHp : null,
          ...(recordSize ? { size: recordSize } : {}),
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

        lookup[enemyId] = {
          color: ENEMY_FIGURINE_COLOR,
          label,
          entityType: 'enemy',
          currentHp: enemyCurrentHp !== null ? enemyCurrentHp : null,
          maxHp: enemyMaxHp !== null ? enemyMaxHp : null,
          ...(enemySize ? { size: enemySize } : {}),
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

        lookup[resolvedCharacterId] = {
          color,
          label,
          entityType: 'character',
          currentHp: Number.isFinite(currentHp) ? currentHp : null,
          maxHp: Number.isFinite(maxHp) ? maxHp : null,
          ...(fallbackSize ? { size: fallbackSize } : {}),
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

        if (
          typeof nextEntry.entityType !== 'string' ||
          nextEntry.entityType.trim() === ''
        ) {
          nextEntry.entityType = 'character';
        }

        if (fallbackSize) {
          nextEntry.size = fallbackSize;
        }

        lookup[resolvedCharacterId] = nextEntry;
      }
    }

    return lookup;
  }, [campaignCharacters, enemies, form, resolvedCharacterId]);

  const modalTokensByMapId = useMemo(() => {
    const base = { ...(campaignMapTokens || {}) };
    const mapId =
      typeof campaignMap?.mapId === 'string' && campaignMap.mapId.trim() !== ''
        ? campaignMap.mapId.trim()
        : null;

    if (mapId) {
      const existing = { ...(base[mapId] || {}) };

      if (activeMapTokens && typeof activeMapTokens === 'object') {
        Object.entries(activeMapTokens).forEach(([key, value]) => {
          const sanitized = sanitizeToken(value, key);
          if (!sanitized) {
            return;
          }
          existing[sanitized.characterId] = {
            ...(existing[sanitized.characterId] || {}),
            ...sanitized,
          };
        });
      }

      base[mapId] = existing;
    }

    return base;
  }, [activeMapTokens, campaignMap, campaignMapTokens]);

  const handleTokenMove = useCallback(
    async ({ mapId, characterId: tokenCharacterId, x, y }) => {
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

      const nextToken = {
        ...(previousCampaignTokens?.[normalizedMapId]?.[normalizedCharacterId] || {}),
        characterId: normalizedCharacterId,
        x: clampedX,
        y: clampedY,
        updatedAt: new Date().toISOString(),
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
            body: JSON.stringify({ x: clampedX, y: clampedY }),
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
      itemBonus[key] +
      accessoryBonus[key] +
      featAbilityBonuses[key] +
      Number(raceBonus[key] || 0);
    const overrideCandidates = [itemOverrides[key], accessoryOverrides[key]];
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
        }),
      },
      stats: {
        ...DOCKABLE_MODAL_DEFINITIONS.stats,
        showProp: 'showStats',
        isEnabled: isFormReady,
        getBaseProps: () => ({
          form,
          handleCloseStats,
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
        }),
      },
      feats: {
        ...DOCKABLE_MODAL_DEFINITIONS.feats,
        showProp: 'showFeats',
        isEnabled: isFormReady,
        getBaseProps: () => ({
          form,
          handleCloseFeats,
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
          longRestCount,
          shortRestCount,
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
        }),
      },
      map: {
        ...DOCKABLE_MODAL_DEFINITIONS.map,
        showProp: 'show',
        isEnabled: true,
        getBaseProps: () => ({
          map: campaignMap,
          maps: campaignMaps,
          activeMapId: campaignActiveMapId,
          tokensByMapId: modalTokensByMapId,
          currentCharacterId: resolvedCharacterId,
          activeCharacterId: activeTurnParticipantId,
          characterLookup: tokenMetaById,
          onTokenMove: handleTokenMove,
          onHide: handleCloseMapModal,
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
      handleCloseMapModal,
      handleCloseShop,
      handleCloseSkill,
      handleCloseSpells,
      handleCloseStats,
      handleDiceColorChange,
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
          />
        );
      })
      .filter(Boolean);
  }, [DOCKABLE_MODAL_CONFIG, getDockedSide, handleDockClose]);

  return (
    <div
      ref={rootContainerRef}
      className="text-center"
      style={{
        fontFamily: 'Raleway, sans-serif',
        backgroundImage: `url(${loginbg})`,
        height: "100vh",
        overflow: "hidden",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        paddingTop: navHeight + HEADER_PADDING,
        display: 'flex',
        flexDirection: 'column',
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
        }}
      >
        {isWideScreen && (
        <>
          <div className="dock-selector dock-selector--left">
            <label
              className="dock-selector__label"
              htmlFor="dock-selector-left"
            >
              Dock left modal
            </label>
            <Form.Select
              id="dock-selector-left"
              size="sm"
              className="dock-selector__control"
              value={dockedModals.left ?? ''}
              onChange={(event) =>
                handleDockSelectionChange('left', event.target.value)
              }
            >
              {DOCKABLE_MODAL_OPTIONS.map(({ key, label }) => {
                const config = key ? DOCKABLE_MODAL_CONFIG[key] : null;
                const isDisabled = key ? config?.isEnabled === false : false;
                return (
                  <option
                    key={key ?? 'none'}
                    value={key ?? ''}
                    disabled={isDisabled}
                  >
                    {label}
                  </option>
                );
              })}
            </Form.Select>
          </div>
          <div className="dock-selector dock-selector--right">
            <label
              className="dock-selector__label"
              htmlFor="dock-selector-right"
            >
              Dock right modal
            </label>
            <Form.Select
              id="dock-selector-right"
              size="sm"
              className="dock-selector__control"
              value={dockedModals.right ?? ''}
              onChange={(event) =>
                handleDockSelectionChange('right', event.target.value)
              }
            >
              {DOCKABLE_MODAL_OPTIONS.map(({ key, label }) => {
                const config = key ? DOCKABLE_MODAL_CONFIG[key] : null;
                const isDisabled = key ? config?.isEnabled === false : false;
                return (
                  <option
                    key={key ?? 'none'}
                    value={key ?? ''}
                    disabled={isDisabled}
                  >
                    {label}
                  </option>
                );
              })}
            </Form.Select>
          </div>
        </>
      )}
      {isFormReady ? (
        <>
          <div ref={headerRef}>
            <div ref={combatHeaderRef}>
              <CombatTurnHeader participants={participantsWithDetails} />
            </div>
            <h1
              style={{
                fontSize: "28px",
                fontWeight: 600,
                color: "#FFFFFF",
                padding: "8px 0",
                textAlign: "center",
                letterSpacing: "1px",
                textShadow: "1px 1px 2px rgba(0, 0, 0, 0.4)",
                fontFamily: "'Merriweather', serif",
                textTransform: "capitalize",
                borderBottom: "2px solid #555", // Subtle underline for structure
                display: "inline-block",
              }}
              className="mx-auto"
            >
              {form?.characterName || 'Loading Character'}
            </h1>

            <HealthDefense
              form={form}
              totalLevel={totalLevel}
              dexMod={statMods.dex}
              conMod={statMods.con}
              initiative={featBonuses.initiative}
              speed={featBonuses.speed}
              ac={featBonuses.ac}
              hpMaxBonus={featBonuses.hpMaxBonus}
              hpMaxBonusPerLevel={featBonuses.hpMaxBonusPerLevel}
              onTempHealthChange={handleHealthChange}
              speedMultiplier={speedMultiplier}
              {...(spellAbilityMod !== null && { spellAbilityMod })}
            />
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
            <PlayerTurnActions
              form={form}
              dexMod={statMods.dex}
              strMod={statMods.str}
              conMod={statMods.con}
              ref={playerTurnActionsRef}
              onCastSpell={handleCastSpell}
              availableSlots={availableSlots}
              longRestCount={longRestCount}
              shortRestCount={shortRestCount}
              onPassTurn={handlePassTurn}
              canPassTurn={canPassTurn}
              isPassTurnInProgress={isPassingTurn}
            />
          </div>
          {form && (
            <SpellSlots
              form={form}
              used={usedSlots}
              onToggleSlot={handleCastSpell}
              actionCount={actionCount}
              longRestCount={longRestCount}
              shortRestCount={shortRestCount}
              onActionSurge={handleActionSurge}
            />
          )}
          <Navbar
            fixed="bottom"
            data-bs-theme="dark"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          >
            <Container style={{ backgroundColor: 'transparent' }}>
              <Nav
                className="w-100 align-items-center"
                style={{ backgroundColor: 'transparent' }}
              >
                <div
                  className="d-flex justify-content-center flex-wrap flex-grow-1"
                  style={{ backgroundColor: 'transparent' }}
                >
                  <Button
                    onClick={handleShowCharacterInfo}
                    style={{ color: "black" }}
                    className="footer-btn"
                    variant="secondary"
                  >
                    <i className="fas fa-image-portrait" aria-hidden="true"></i>
                  </Button>
                  <Button
                    onClick={handleShowStats}
                    style={{
                      color: "black",
                      backgroundColor: statPointsLeft > 0 ? "gold" : "#6C757D",
                    }}
                    className="footer-btn"
                    variant="secondary"
                  >
                    <i className="fas fa-scroll" aria-hidden="true"></i>
                  </Button>
                  <Button
                    onClick={handleShowSkill}
                    style={{
                      color: "black",
                      backgroundColor: skillsGold,
                    }}
                    className={`footer-btn ${
                      skillPointsLeft > 0 || expertisePointsLeft > 0
                        ? 'points-glow'
                        : ''
                    }`}
                    variant="secondary"
                  >
                    <i className="fas fa-book-open" aria-hidden="true"></i>
                  </Button>
                  <Button
                    onClick={handleShowFeats}
                    style={{
                      color: "black",
                      backgroundColor: featsGold,
                    }}
                    className={`footer-btn ${
                      featPointsLeft > 0 ? 'points-glow' : ''
                    }`}
                    variant="secondary"
                  >
                    <i className="fas fa-hand-fist" aria-hidden="true"></i>
                  </Button>
                  <Button
                    onClick={handleShowFeatures}
                    style={{
                      color: "black",
                      backgroundColor: "#6C757D",
                    }}
                    className="footer-btn"
                    variant="secondary"
                  >
                    <i className="fas fa-star" aria-hidden="true"></i>
                  </Button>
                  {hasSpellcasting && (
                    <Button
                      onClick={handleShowSpells}
                      style={{
                        color: 'black',
                        backgroundColor: spellsGold,
                      }}
                      className={`footer-btn ${
                        spellPointsLeft > 0 ? 'points-glow' : ''
                      }`}
                      variant="secondary"
                    >
                      <i className="fas fa-hat-wizard" aria-hidden="true"></i>
                    </Button>
                  )}
                  <Button
                    onClick={handleShowEquipment}
                    style={{
                      color: 'black',
                      backgroundColor: '#6C757D',
                    }}
                    className="footer-btn"
                    variant="secondary"
                  >
                    <i className="fas fa-toolbox" aria-hidden="true"></i>
                  </Button>
                  <Button
                    onClick={() => handleShowInventory()}
                    style={{
                      color: "black",
                      backgroundColor: "#6C757D",
                    }}
                    className="footer-btn"
                    variant="secondary"
                  >
                    <i className="fas fa-box-open" aria-hidden="true"></i>
                  </Button>
                  <Button
                    onClick={() => handleShowShop()}
                    style={{
                      color: "black",
                      backgroundColor: "#6C757D",
                    }}
                    className="footer-btn"
                    variant="secondary"
                  >
                    <i className="fas fa-store" aria-hidden="true"></i>
                  </Button>
                  <Button
                    onClick={handleShowMapModal}
                    style={{
                      color: "black",
                      backgroundColor: "#6C757D",
                    }}
                    className="footer-btn"
                    variant="secondary"
                    aria-label="Show campaign map"
                  >
                    <i className="fas fa-map" aria-hidden="true"></i>
                  </Button>
                  <Button
                    onClick={handleShowHelpModal}
                    style={{ color: "white" }}
                    className="footer-btn"
                    variant="primary"
                  >
                    <i className="fas fa-info" aria-hidden="true"></i>
                  </Button>
                </div>
              </Nav>
            </Container>
          </Navbar>
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
        />
        <Stats
          form={form}
          showStats={showStats}
          handleCloseStats={handleCloseStats}
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
        />
        <InventoryModal
          show={showInventory}
          activeTab={inventoryTab}
          onHide={handleCloseInventory}
          onTabChange={setInventoryTab}
          form={form}
          characterId={characterId}
        />
        <EquipmentModal
          show={showEquipment}
          onHide={handleCloseEquipment}
          form={form}
          onEquipmentChange={handleEquipmentChange}
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
        />
        {hasSpellcasting && (
          <SpellSelector
            form={form}
            show={showSpells}
            handleClose={handleCloseSpells}
            onSpellsChange={handleSpellsChange}
            onCastSpell={handleCastSpell}
            availableSlots={availableSlots}
          />
        )}
        <Help
          form={form}
          showHelpModal={showHelpModal}
          handleCloseHelpModal={handleCloseHelpModal}
          onDiceColorChange={handleDiceColorChange}
        />
      </>
    )}
    <MapModal
      show={shouldShowMapModal}
      onHide={handleCloseMapModal}
      map={campaignMap}
      maps={campaignMaps}
      activeMapId={campaignActiveMapId}
      tokensByMapId={modalTokensByMapId}
      currentCharacterId={resolvedCharacterId}
      activeCharacterId={activeTurnParticipantId}
      characterLookup={tokenMetaById}
      onTokenMove={handleTokenMove}
      onTokenRemove={handleTokenRemove}
    />
    {dockedModalElements}
  </div>
);
}
