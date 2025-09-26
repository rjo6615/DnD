
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import apiFetch from '../../../utils/apiFetch';
import { useParams } from "react-router-dom";
import { Nav, Navbar, Container, Button } from 'react-bootstrap';
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
import ShopModal from "../attributes/ShopModal";
import InventoryModal from "../attributes/InventoryModal";
import EquipmentModal from "../attributes/EquipmentModal";
import {
  normalizeItems as normalizeInventoryItems,
  normalizeAccessories as normalizeInventoryAccessories,
} from "../attributes/inventoryNormalization";
import { normalizeEquipmentMap } from "../attributes/equipmentNormalization";

const HEADER_PADDING = 16;
const createEmptyCombatState = () => ({ participants: [], activeTurn: null });

const toFiniteNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

    return classes.join(' ');
  }, [isDragging, canScrollLeft, canScrollRight]);

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

  if (!participantsCount) {
    return null;
  }

  return (
    <div
      ref={headerRef}
      className={headerClassName}
      role="group"
      aria-label="Combat turn order"
      touchAction="pan-x"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerCancel}
      onScroll={handleScroll}
    >
      {participants.map((participant, index) => {
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
      })}
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
  const [activeEffects, setActiveEffects] = useState([]);
  const baseActionCount = form?.features?.actionCount ?? 1;
  const [actionCount, setActionCount] = useState(baseActionCount);
  const initCircleState = () => ({
    0: 'active',
    1: 'active',
    2: 'active',
    3: 'active',
  });
  const [usedSlots, setUsedSlots] = useState({
    action: initCircleState(),
    bonus: initCircleState(),
  });
  const [isPassingTurn, setIsPassingTurn] = useState(false);

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
  }, [campaignId]);

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
    // Clear effects on rest
    setActiveEffects([]);
  }, [longRestCount, shortRestCount]);

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

  const consumeCircle = useCallback(
    (type, index) => {
      setUsedSlots((prev) => {
        const currentState = prev[type] || initCircleState();
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
    [initCircleState]
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
  const socketRef = useRef(null);

  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [navHeight, setNavHeight] = useState(0);

  useEffect(() => {
    setUsedSlots({ action: initCircleState(), bonus: initCircleState() });
    setActionCount(baseActionCount);
  }, [longRestCount, baseActionCount]);

  useEffect(() => {
    setUsedSlots((prev) => {
      const updated = { ...prev, action: initCircleState(), bonus: initCircleState() };
      Object.keys(updated).forEach((key) => {
        if (key.startsWith('warlock-')) delete updated[key];
      });
      return updated;
    });
    setActionCount(baseActionCount);
  }, [shortRestCount, baseActionCount]);

  useEffect(() => {
    const handler = () => {
      setUsedSlots((prev) => ({
        ...prev,
        action: initCircleState(),
        bonus: initCircleState(),
      }));
      const hasteActive = activeEffects.some((e) => e.name === 'Haste');
      setActionCount(baseActionCount + (hasteActive ? 1 : 0));
    };
    window.addEventListener('pass-turn', handler);
    return () => window.removeEventListener('pass-turn', handler);
  }, [baseActionCount, activeEffects]);

  useEffect(() => {
    const nav = document.querySelector('.navbar.fixed-top');
    if (nav) {
      setNavHeight(nav.offsetHeight);
    }
  }, []);

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight + navHeight + HEADER_PADDING);
    }
  }, [form, navHeight, participantsWithDetails]);

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

        if (!normalizedCampaign) {
          setCombatState(createEmptyCombatState());
          setCampaignCharacters({});
          return;
        }

        try {
          const encodedCampaign = encodeURIComponent(normalizedCampaign);
          const [combatRes, charactersRes] = await Promise.all([
            apiFetch(`/campaigns/${encodedCampaign}/combat`),
            apiFetch(`/campaigns/${encodedCampaign}/characters`),
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

          if (!isCancelled) {
            setCombatState(combatData);
            setCampaignCharacters(characterMap);
          }
        } catch (err) {
          console.error(err);
          if (!isCancelled) {
            setCombatState(createEmptyCombatState());
            setCampaignCharacters({});
          }
        }
      } catch (error) {
        console.error(error);
        if (!isCancelled) {
          setCampaignId(null);
          setCombatState(createEmptyCombatState());
          setCampaignCharacters({});
        }
      }
    }

    fetchCharacterData(characterId);

    return () => {
      isCancelled = true;
    };
  }, [characterId]);

  useEffect(() => {
    if (!campaignId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
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

    socket.on('combat:update', handleCombatUpdate);
    socket.on('character:health:update', handleCharacterHealthUpdate);
    socket.emit('campaign:join', campaignId);

    return () => {
      socket.off('combat:update', handleCombatUpdate);
      socket.off('character:health:update', handleCharacterHealthUpdate);
      socket.emit('campaign:leave', campaignId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [campaignId]);

  const handleShowCharacterInfo = () => setShowCharacterInfo(true);
  const handleCloseCharacterInfo = () => setShowCharacterInfo(false);
  const handleShowStats = () => setShowStats(true);
  const handleCloseStats = () => setShowStats(false);
  const handleShowSkill = () => setShowSkill(true); // Handler to show skills modal
  const handleCloseSkill = () => setShowSkill(false); // Handler to close skills modal
  const handleShowFeats = () => setShowFeats(true);
  const handleCloseFeats = () => setShowFeats(false);
  const handleShowFeatures = () => setShowFeatures(true);
  const handleCloseFeatures = () => setShowFeatures(false);
  const handleShowShop = (tab) => {
    setShopTab((prevTab) => tab ?? prevTab ?? 'weapons');
    setShowShop(true);
  };
  const handleCloseShop = () => setShowShop(false);
  const handleShowInventory = (tab) => {
    setInventoryTab((prevTab) => tab ?? prevTab ?? 'weapons');
    setShowInventory(true);
  };
  const handleCloseInventory = () => setShowInventory(false);
  const handleShowEquipment = () => setShowEquipment(true);
  const handleCloseEquipment = () => setShowEquipment(false);
  const handleShowSpells = () => setShowSpells(true);
  const handleCloseSpells = () => setShowSpells(false);
  const handleShowHelpModal = () => setShowHelpModal(true);
  const handleCloseHelpModal = () => setShowHelpModal(false);
  const handleShowBackground = () => setShowBackground(true);
  const handleCloseBackground = () => setShowBackground(false);

  const handleRollResult = (result, breakdown, source) => {
    playerTurnActionsRef.current?.updateDamageValueWithAnimation(
      result,
      breakdown,
      source
    );
  };

  const handleLongRest = () => {
    setLongRestCount((c) => c + 1);
  };

  const handleShortRest = () => {
    setShortRestCount((c) => c + 1);
  };

  const handleCastSpell = useCallback(
    (arg, lvl, idx) => {
      if (arg === 'action' || arg === 'bonus') {
        consumeCircle(arg, lvl);
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
        } = arg;
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
        const spellLabel = name || altName;
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
    const occupations = form.occupation || [];
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
      if (!form) return;
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

  if (!form) {
    return <div style={{ fontFamily: 'Raleway, sans-serif', backgroundImage: `url(${loginbg})`, backgroundSize: "cover", backgroundRepeat: "no-repeat", minHeight: "100vh"}}>Loading...</div>;
  }

  const statNames = [...STAT_KEYS];
  const totalLevel = form.occupation.reduce((total, el) => total + Number(el.Level), 0);
  const statTotal = statNames.reduce((sum, stat) => sum + form[stat], 0);
  // Characters no longer receive stat points from leveling
  const statPointsLeft = form.startStatTotal - statTotal;

  const skillPointsLeft =
    (form.proficiencyPoints || 0) -
    Object.entries(form.skills || {}).filter(
      ([key, s]) => s.proficient && !form.race?.skills?.[key]?.proficient
    ).length;
  const expertisePointsLeft =
    (form.expertisePoints || 0) -
    Object.entries(form.skills || {}).filter(
      ([key, s]) =>
        s.expertise &&
        !form.race?.skills?.[key]?.expertise &&
        !form.background?.skills?.[key]?.expertise
    ).length;
  const skillsGold =
    skillPointsLeft > 0 || expertisePointsLeft > 0 ? 'gold' : '#6C757D';

// ---------------------------------------Feats and bonuses----------------------------------------------
const featBonuses = collectFeatNumericBonuses(form?.feat);

const featPointsLeft = calculateFeatPointsLeft(form.occupation, form.feat);
const featsGold = featPointsLeft > 0 ? "gold" : "#6C757D";
const spellsGold =
  hasSpellcasting && spellPointsLeft > 0 ? 'gold' : '#6C757D';
  return (
    <div
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
    <div ref={headerRef}>
      <CombatTurnHeader participants={participantsWithDetails} />
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
        {form.characterName}
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
        <StatusEffectBar effects={activeEffects} />
      </div>
      <PlayerTurnActions
        form={form}
        dexMod={statMods.dex}
        strMod={statMods.str}
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
      showSkill={showSkill}
      handleCloseSkill={handleCloseSkill}
      totalLevel={totalLevel}
      strMod={statMods.str}
      dexMod={statMods.dex}
      conMod={statMods.con}
      intMod={statMods.int}
      chaMod={statMods.cha}
      wisMod={statMods.wis}
      onSkillsChange={(skills) => setForm((prev) => ({ ...prev, skills }))}
      onRollResult={handleRollResult}
    />
    <Stats form={form} showStats={showStats} handleCloseStats={handleCloseStats} />
    <BackgroundModal
      show={showBackground}
      onHide={handleCloseBackground}
      background={form.background}
    />
    <Feats form={form} showFeats={showFeats} handleCloseFeats={handleCloseFeats} />
    <Features
      form={form}
      showFeatures={showFeatures}
      handleCloseFeatures={handleCloseFeatures}
      onActionSurge={handleActionSurge}
      longRestCount={longRestCount}
      shortRestCount={shortRestCount}
      actionCount={actionCount}
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
        onSpellsChange={(spells, spellPoints) =>
          setForm((prev) => ({ ...prev, spells, spellPoints }))
        }
        onCastSpell={handleCastSpell}
        availableSlots={availableSlots}
      />
    )}
    <Help
      form={form}
      showHelpModal={showHelpModal}
      handleCloseHelpModal={handleCloseHelpModal}
    />
  </div>
);
}