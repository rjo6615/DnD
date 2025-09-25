import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import apiFetch from '../../../utils/apiFetch';
import { io } from "socket.io-client";
import {
  Button,
  Col,
  Form,
  Row,
  Container,
  Card,
  Alert,
  Spinner,
  Nav,
  Tab,
  CloseButton,
} from "react-bootstrap";
import Modal from 'react-bootstrap/Modal';
import { useNavigate, useParams } from "react-router-dom";
import loginbg from "../../../images/loginbg.png";
import useUser from '../../../hooks/useUser';
import { STATS } from '../statSchema';
import { SKILLS } from '../skillSchema';
import { calculateCharacterInitiative } from '../utils/derivedStats';
import {
  GiCharacter,
  GiStoneAxe,
  GiBowArrow,
  GiBroadsword,
  GiCrossbow,
  GiCrossedSwords,
  GiLeatherArmor,
  GiBreastplate,
  GiChainMail,
  GiShield,
  GiArmorVest,
  GiBackpack,
  GiAmmoBox,
  GiHammerNails,
  GiHorseHead,
  GiSaddle,
  GiChariot,
  GiSailboat,
  GiTreasureMap,
  GiBattleAxe,
  GiLyre,
  GiHolyGrail,
  GiOakLeaf,
  GiMeditation,
  GiAngelWings,
  GiPineTree,
  GiSpy,
  GiFireball,
  GiPentagramRose,
  GiSpellBook,
} from "react-icons/gi";
import { FiList, FiPlus } from "react-icons/fi";

const STAT_LOOKUP = STATS.reduce((acc, { key, label }) => {
  acc[label.toLowerCase()] = key;
  acc[key.toLowerCase()] = key;
  return acc;
}, {});

const STAT_LABELS = STATS.reduce((acc, { key, label }) => {
  acc[key] = label;
  return acc;
}, {});

const STAT_KEYS_ORDER = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const SKILL_LOOKUP = SKILLS.reduce((acc, { key, label }) => {
  acc[label.toLowerCase()] = key;
  acc[key.toLowerCase()] = key;
  return acc;
}, {});

const SKILL_LABELS = SKILLS.reduce((acc, { key, label }) => {
  acc[key] = label;
  return acc;
}, {});

const createEmptyCombatState = () => ({ participants: [], activeTurn: null });

const sortParticipantsDescending = (participantsWithMeta) =>
  participantsWithMeta
    .slice()
    .sort((a, b) => {
      if (b.participant.initiative !== a.participant.initiative) {
        return b.participant.initiative - a.participant.initiative;
      }

      return a.index - b.index;
    })
    .map(({ participant }) => participant);

const normalizeCombatState = (state) => {
  if (!state || typeof state !== 'object') {
    return createEmptyCombatState();
  }

  const participants = Array.isArray(state.participants)
    ? state.participants
        .map((participant) => {
          if (
            !participant ||
            typeof participant.characterId !== 'string' ||
            participant.characterId.trim() === ''
          ) {
            return null;
          }

          const initiativeValue = Number(participant.initiative);
          const displayName =
            typeof participant.displayName === 'string' &&
            participant.displayName.trim() !== ''
              ? participant.displayName.trim()
              : null;

          return {
            characterId: participant.characterId.trim(),
            initiative: Number.isFinite(initiativeValue) ? initiativeValue : 0,
            ...(displayName ? { displayName } : {}),
          };
        })
        .filter(Boolean)
    : [];

  const participantsWithMeta = participants.map((participant, index) => ({
    participant,
    index,
  }));

  const sortedParticipants = sortParticipantsDescending(participantsWithMeta);

  const activeTurnCandidate =
    state.activeTurn === null || state.activeTurn === undefined
      ? null
      : Number(state.activeTurn);

  let activeTurn = null;
  if (
    Number.isInteger(activeTurnCandidate) &&
    activeTurnCandidate >= 0 &&
    activeTurnCandidate < participants.length
  ) {
    const activeParticipant = participants[activeTurnCandidate];
    if (activeParticipant) {
      const sortedIndex = sortedParticipants.findIndex(
        (participant) => participant.characterId === activeParticipant.characterId
      );
      if (sortedIndex !== -1) {
        activeTurn = sortedIndex;
      }
    }
  }

  return { participants: sortedParticipants, activeTurn };
};

const CLASS_ICON_MAP = {
  barbarian: { icon: GiBattleAxe, label: 'Barbarian' },
  bard: { icon: GiLyre, label: 'Bard' },
  cleric: { icon: GiHolyGrail, label: 'Cleric' },
  druid: { icon: GiOakLeaf, label: 'Druid' },
  fighter: { icon: GiBroadsword, label: 'Fighter' },
  monk: { icon: GiMeditation, label: 'Monk' },
  paladin: { icon: GiAngelWings, label: 'Paladin' },
  ranger: { icon: GiPineTree, label: 'Ranger' },
  rogue: { icon: GiSpy, label: 'Rogue' },
  sorcerer: { icon: GiFireball, label: 'Sorcerer' },
  warlock: { icon: GiPentagramRose, label: 'Warlock' },
  wizard: { icon: GiSpellBook, label: 'Wizard' },
  default: { icon: GiCrossedSwords, label: 'Adventurer' },
};

function ResourceGrid({
  items,
  renderItem,
  emptyMessage = 'No records available.',
  getKey,
  rowClassName = '',
  colClassName = '',
  dataTestId,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return <div className="text-center text-muted py-3">{emptyMessage}</div>;
  }

  const rowClasses = [
    'resource-grid',
    'row-cols-2',
    'row-cols-lg-3',
    'g-3',
    rowClassName,
  ]
    .filter(Boolean)
    .join(' ');
  const columnClasses = ['d-flex', colClassName].filter(Boolean).join(' ');

  return (
    <Row className={rowClasses} data-testid={dataTestId}>
      {items.map((item, index) => (
        <Col key={(getKey && getKey(item, index)) || index} className={columnClasses}>
          {renderItem(item, index)}
        </Col>
      ))}
    </Row>
  );
}

export default function ZombiesDM() {
  const user = useUser();

    const navigate = useNavigate();
    const params = useParams();
    const [records, setRecords] = useState([]);
    const [enemies, setEnemies] = useState([]);
    const [monsterCatalog, setMonsterCatalog] = useState([]);
    const [monsterCatalogLoading, setMonsterCatalogLoading] = useState(false);
    const [monsterCatalogLoaded, setMonsterCatalogLoaded] = useState(false);
    const [monsterCatalogError, setMonsterCatalogError] = useState(null);
    const [monsterSearch, setMonsterSearch] = useState('');
    const [selectedMonsterIndex, setSelectedMonsterIndex] = useState('');
    const [selectedMonster, setSelectedMonster] = useState(null);
    const [monsterDetailLoading, setMonsterDetailLoading] = useState(false);
    const [addingEnemy, setAddingEnemy] = useState(false);
    const [customEnemyName, setCustomEnemyName] = useState('');
    const [removingEnemyId, setRemovingEnemyId] = useState(null);
    const [status, setStatus] = useState(null);
    const [combatState, setCombatState] = useState(createEmptyCombatState());
    const socketRef = useRef(null);

    const campaignId = params.campaign ?? '';
    const encodedCampaign = useMemo(
      () => (campaignId ? encodeURIComponent(campaignId) : ''),
      [campaignId]
    );

    const fetchRecords = useCallback(async () => {
      if (!campaignId || !encodedCampaign) {
        setRecords([]);
        setEnemies([]);
        setCombatState(createEmptyCombatState());
        return;
      }

      try {
        const [charactersResponse, combatResponse, enemiesResponse] = await Promise.all([
          apiFetch(`/campaigns/${encodedCampaign}/characters`),
          apiFetch(`/campaigns/${encodedCampaign}/combat`),
          apiFetch(`/campaigns/${encodedCampaign}/enemies`),
        ]);

        if (!charactersResponse.ok) {
          const message = `An error occurred: ${charactersResponse.statusText}`;
          setStatus({ type: 'danger', message });
          setRecords([]);
          setEnemies([]);
          return;
        }

        const characters = await charactersResponse.json();
        setRecords(characters);

        if (enemiesResponse.ok) {
          const enemiesData = await enemiesResponse.json();
          setEnemies(Array.isArray(enemiesData) ? enemiesData : []);
        } else if (enemiesResponse.status === 404) {
          setEnemies([]);
        } else {
          setEnemies([]);
          const message = `An error occurred: ${enemiesResponse.statusText}`;
          setStatus({ type: 'danger', message });
        }

        if (combatResponse.ok) {
          const combatJson = await combatResponse.json();
          setCombatState(normalizeCombatState(combatJson));
        } else {
          setCombatState(createEmptyCombatState());
          if (combatResponse.status !== 404) {
            const message = `An error occurred: ${combatResponse.statusText}`;
            setStatus({ type: 'danger', message });
          }
        }
      } catch (error) {
        console.error(error);
        setStatus({ type: 'danger', message: error.message || 'Failed to fetch records.' });
        setEnemies([]);
        setCombatState(createEmptyCombatState());
      }
    }, [campaignId, encodedCampaign]);

    const fetchMonsterCatalog = useCallback(async () => {
      if (monsterCatalogLoading) {
        return;
      }

      setMonsterCatalogLoading(true);
      try {
        setMonsterCatalogError(null);
        const response = await apiFetch('/monsters');
        if (!response.ok) {
          throw new Error(response.statusText || 'Failed to load monsters.');
        }
        const data = await response.json();
        const catalog = Array.isArray(data)
          ? data
              .slice()
              .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''))
          : [];
        setMonsterCatalog(catalog);
      } catch (error) {
        console.error(error);
        setMonsterCatalog([]);
        setMonsterCatalogError(error.message || 'Failed to load monsters.');
        setStatus({ type: 'danger', message: error.message || 'Failed to load monsters.' });
      } finally {
        setMonsterCatalogLoaded(true);
        setMonsterCatalogLoading(false);
      }
    }, [monsterCatalogLoading]);

    const updateSelectedMonster = useCallback(
      async (index) => {
        const normalizedIndex = typeof index === 'string' ? index.trim() : '';
        setSelectedMonsterIndex(normalizedIndex);
        if (!normalizedIndex) {
          setSelectedMonster(null);
          return;
        }

        setMonsterDetailLoading(true);
        try {
          const response = await apiFetch(`/monsters/${normalizedIndex}`);
          if (!response.ok) {
            throw new Error(response.statusText || 'Failed to load monster.');
          }
          const detail = await response.json();
          setSelectedMonster(detail);
        } catch (error) {
          console.error(error);
          setSelectedMonster(null);
          setStatus({ type: 'danger', message: error.message || 'Failed to load monster.' });
        } finally {
          setMonsterDetailLoading(false);
        }
      },
      [setStatus]
    );

    const handleMonsterSelectChange = useCallback(
      (event) => {
        const { value } = event.target;
        setCustomEnemyName('');
        updateSelectedMonster(value);
      },
      [updateSelectedMonster]
    );

    const handleAddEnemy = useCallback(
      async (event) => {
        event.preventDefault();
        if (!selectedMonsterIndex || !encodedCampaign) {
          return;
        }

        setAddingEnemy(true);
        try {
          const payload = { index: selectedMonsterIndex };
          const trimmedName = customEnemyName.trim();
          if (trimmedName) {
            payload.name = trimmedName;
          }

          const response = await apiFetch(`/campaigns/${encodedCampaign}/enemies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            let message = response.statusText || 'Failed to add enemy.';
            try {
              const errorData = await response.json();
              message = errorData?.message || message;
            } catch (jsonError) {
              // Ignore JSON parsing errors
            }
            throw new Error(message);
          }

          const addedEnemy = await response.json();
          setStatus({ type: 'success', message: `${addedEnemy?.name || 'Enemy'} added to campaign.` });
          setCustomEnemyName('');
          await fetchRecords();
        } catch (error) {
          console.error(error);
          setStatus({ type: 'danger', message: error.message || 'Failed to add enemy.' });
        } finally {
          setAddingEnemy(false);
        }
      },
      [selectedMonsterIndex, encodedCampaign, customEnemyName, fetchRecords]
    );

    const handleRemoveEnemy = useCallback(
      async (enemyId) => {
        if (!enemyId || !encodedCampaign) {
          return;
        }

        setRemovingEnemyId(enemyId);
        try {
          const response = await apiFetch(`/campaigns/${encodedCampaign}/enemies/${enemyId}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            let message = response.statusText || 'Failed to remove enemy.';
            try {
              const errorData = await response.json();
              message = errorData?.message || message;
            } catch (jsonError) {
              // Ignore JSON parsing errors
            }
            throw new Error(message);
          }

          await fetchRecords();
          setStatus({ type: 'success', message: 'Enemy removed.' });
        } catch (error) {
          console.error(error);
          setStatus({ type: 'danger', message: error.message || 'Failed to remove enemy.' });
        } finally {
          setRemovingEnemyId(null);
        }
      },
      [encodedCampaign, fetchRecords]
    );

    const filteredMonsterCatalog = useMemo(() => {
      if (!Array.isArray(monsterCatalog) || monsterCatalog.length === 0) {
        return [];
      }
      const query = monsterSearch.trim().toLowerCase();
      if (!query) {
        return monsterCatalog;
      }
      return monsterCatalog.filter((monster) => monster?.name?.toLowerCase().includes(query));
    }, [monsterCatalog, monsterSearch]);

    useEffect(() => {
      fetchRecords();
      return;
    }, [fetchRecords]);

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

        setRecords((prev) => {
          if (!Array.isArray(prev) || prev.length === 0) {
            return prev;
          }

          let didUpdate = false;

          const nextRecords = prev.map((record) => {
            if (!record || typeof record !== 'object') {
              return record;
            }

            const recordId =
              (typeof record._id === 'string' && record._id.trim() !== '' && record._id.trim()) ||
              (typeof record.characterId === 'string' && record.characterId.trim() !== '' && record.characterId.trim()) ||
              (typeof record.token === 'string' && record.token.trim() !== '' && record.token.trim());

            if (recordId !== normalizedCharacterId) {
              return record;
            }

            const updatedRecord = { ...record };

            if (nextTempHealthValue !== undefined && record.tempHealth !== nextTempHealthValue) {
              updatedRecord.tempHealth = nextTempHealthValue;
              didUpdate = true;
            }

            if (nextHealthValue !== undefined && record.health !== nextHealthValue) {
              updatedRecord.health = nextHealthValue;
              didUpdate = true;
            }

            return updatedRecord;
          });

          return didUpdate ? nextRecords : prev;
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

    const persistCombatState = useCallback(
      async (nextState) => {
        if (!campaignId || !encodedCampaign) {
          return;
        }

        const normalizedState = normalizeCombatState(nextState);

        try {
          const response = await apiFetch(`/campaigns/${encodedCampaign}/combat`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(normalizedState),
          });

          if (!response.ok) {
            throw new Error(response.statusText || 'Failed to update combat state');
          }

          const updatedState = await response.json();
          setCombatState(normalizeCombatState(updatedState));
        } catch (error) {
          console.error(error);
          setStatus({
            type: 'danger',
            message: error.message || 'Failed to update combat state.',
          });
          await fetchRecords();
        }
      },
      [campaignId, encodedCampaign, fetchRecords]
    );

    const getEntityId = useCallback((entity) => {
      if (!entity || typeof entity !== 'object') {
        return null;
      }
      if (entity.entityType === 'enemy' && typeof entity.enemyId === 'string') {
        return entity.enemyId;
      }
      if (typeof entity._id === 'string' && entity._id) {
        return entity._id;
      }
      if (typeof entity.characterId === 'string' && entity.characterId) {
        return entity.characterId;
      }
      if (typeof entity.token === 'string' && entity.token) {
        return entity.token;
      }
      return null;
    }, []);

    const normalizedEnemies = useMemo(() => {
      if (!Array.isArray(enemies)) {
        return [];
      }

      return enemies.map((enemy) => {
        const typeLabel = [enemy?.size, enemy?.type].filter(Boolean).join(' ');
        return {
          ...enemy,
          entityType: 'enemy',
          _id: enemy.enemyId,
          characterName: enemy.name,
          token: typeLabel || 'Enemy',
          displayType: typeLabel,
        };
      });
    }, [enemies]);

    const combinedRecords = useMemo(() => {
      const characterRecords = Array.isArray(records)
        ? records.map((character) => ({ ...character, entityType: 'character' }))
        : [];
      return [...characterRecords, ...normalizedEnemies];
    }, [records, normalizedEnemies]);

    const characterLookup = useMemo(() => {
      const map = new Map();
      if (Array.isArray(combinedRecords)) {
        combinedRecords.forEach((entity) => {
          const id = getEntityId(entity);
          if (!id) {
            return;
          }
          map.set(id, entity);
        });
      }
      return map;
    }, [combinedRecords, getEntityId]);

    const resolveDisplayName = useCallback(
      (characterId) => {
        if (typeof characterId !== 'string' || characterId.trim() === '') {
          return null;
        }

        const entity = characterLookup.get(characterId);
        if (!entity || typeof entity !== 'object') {
          return null;
        }

        if (
          typeof entity.characterName === 'string' &&
          entity.characterName.trim() !== ''
        ) {
          return entity.characterName.trim();
        }

        if (typeof entity.name === 'string' && entity.name.trim() !== '') {
          return entity.name.trim();
        }

        return null;
      },
      [characterLookup]
    );

    const calculateEntityInitiative = useCallback(
      (entity) => {
        if (!entity || typeof entity !== 'object') {
          return 0;
        }

        if (entity.entityType === 'enemy') {
          const dexScore =
            Number(entity?.abilityScores?.dex) ||
            Number(entity?.dexterity) ||
            0;
          const modifier = Math.floor((dexScore - 10) / 2);
          return Number.isFinite(modifier) ? modifier : 0;
        }

        return calculateCharacterInitiative(entity);
      },
      [calculateCharacterInitiative]
    );

    const characterInitiativeMap = useMemo(() => {
      const map = new Map();
      if (Array.isArray(combinedRecords)) {
        combinedRecords.forEach((entity) => {
          const id = getEntityId(entity);
          if (!id) {
            return;
          }
          const initiative = calculateEntityInitiative(entity);
          map.set(id, initiative);
        });
      }
      return map;
    }, [combinedRecords, calculateEntityInitiative, getEntityId]);

    useEffect(() => {
      if (!characterInitiativeMap.size) {
        return;
      }

      let nextState = null;
      setCombatState((prevState) => {
        const normalized = normalizeCombatState(prevState);
        let changed = false;
        const updatedParticipants = normalized.participants.map((participant) => {
          const derived = characterInitiativeMap.get(participant.characterId);
          if (derived === undefined || derived === participant.initiative) {
            return participant;
          }
          changed = true;
          return { ...participant, initiative: derived };
        });

        if (!changed) {
          return prevState;
        }

        nextState = { participants: updatedParticipants, activeTurn: normalized.activeTurn };
        return nextState;
      });

      if (nextState) {
        persistCombatState(nextState);
      }
    }, [characterInitiativeMap, persistCombatState]);

    const handleToggleParticipant = useCallback(
      (characterId) => {
        if (!characterId) {
          return;
        }

        const participants = Array.isArray(combatState.participants)
          ? [...combatState.participants]
          : [];
        const existingIndex = participants.findIndex(
          (participant) => participant.characterId === characterId
        );

        let nextState;

        if (existingIndex === -1) {
          const derivedInitiative = characterInitiativeMap.get(characterId);
          const initiative =
            derivedInitiative !== undefined ? derivedInitiative : 0;
          const displayName = resolveDisplayName(characterId);
          const participant = {
            characterId,
            initiative,
            ...(displayName ? { displayName } : {}),
          };
          nextState = normalizeCombatState({
            participants: [...participants, participant],
            activeTurn: combatState.activeTurn,
          });
        } else {
          const updatedParticipants = participants.filter((_, index) => index !== existingIndex);
          let nextActiveTurn = combatState.activeTurn;

          if (typeof nextActiveTurn === 'number') {
            if (existingIndex === nextActiveTurn) {
              nextActiveTurn =
                updatedParticipants.length > 0
                  ? Math.min(nextActiveTurn, updatedParticipants.length - 1)
                  : null;
            } else if (existingIndex < nextActiveTurn) {
              nextActiveTurn -= 1;
            }
          }

          nextState = normalizeCombatState({
            participants: updatedParticipants,
            activeTurn: nextActiveTurn,
          });
        }

        setCombatState(nextState);
        persistCombatState(nextState);
      },
      [combatState, persistCombatState, characterInitiativeMap, resolveDisplayName]
    );

    const handleSetTurn = useCallback(
      (characterId) => {
        if (!characterId) {
          return;
        }

        const participants = Array.isArray(combatState.participants)
          ? [...combatState.participants]
          : [];
        const index = participants.findIndex((participant) => participant.characterId === characterId);

        if (index === -1 || combatState.activeTurn === index) {
          return;
        }

        const nextState = normalizeCombatState({
          participants,
          activeTurn: index,
        });

        setCombatState(nextState);
        persistCombatState(nextState);
      },
      [combatState, persistCombatState]
    );

    const handleRollInitiative = useCallback(() => {
      if (!Array.isArray(combatState.participants) || combatState.participants.length === 0) {
        return;
      }

      const rolledParticipants = combatState.participants
        .map((participant) => {
          if (!participant || typeof participant.characterId !== 'string') {
            return null;
          }

          const baseInitiative = characterInitiativeMap.get(participant.characterId) || 0;
          const numericBase = Number.isFinite(baseInitiative)
            ? baseInitiative
            : Number.isFinite(Number(baseInitiative))
              ? Number(baseInitiative)
              : 0;
          const roll = Math.floor(Math.random() * 20) + 1;

          return {
            characterId: participant.characterId,
            initiative: numericBase + roll,
            ...(participant.displayName ? { displayName: participant.displayName } : {}),
          };
        })
        .filter(Boolean);

      if (rolledParticipants.length === 0) {
        return;
      }

      let activeCharacterId = null;
      if (
        Number.isInteger(combatState.activeTurn) &&
        combatState.activeTurn >= 0 &&
        combatState.activeTurn < combatState.participants.length
      ) {
        const activeParticipant = combatState.participants[combatState.activeTurn];
        activeCharacterId = activeParticipant?.characterId || null;
      }

      let activeTurnIndex = null;
      if (activeCharacterId) {
        const foundIndex = rolledParticipants.findIndex(
          (participant) => participant.characterId === activeCharacterId
        );
        if (foundIndex !== -1) {
          activeTurnIndex = foundIndex;
        }
      }

      const nextState = normalizeCombatState({
        participants: rolledParticipants,
        activeTurn: activeTurnIndex,
      });

      setCombatState(nextState);
      persistCombatState(nextState);
    }, [combatState, characterInitiativeMap, persistCombatState]);

    const handleAdvanceTurn = useCallback(
      (direction) => {
        if (direction !== 1 && direction !== -1) {
          return;
        }

        const participants = Array.isArray(combatState.participants)
          ? [...combatState.participants]
          : [];
        const total = participants.length;

        if (total === 0) {
          if (combatState.activeTurn === null || combatState.activeTurn === undefined) {
            return;
          }

          const nextState = normalizeCombatState({
            participants,
            activeTurn: null,
          });

          setCombatState(nextState);
          persistCombatState(nextState);
          return;
        }

        let nextIndex;
        if (typeof combatState.activeTurn === 'number' && combatState.activeTurn >= 0) {
          nextIndex = (combatState.activeTurn + direction + total) % total;
        } else {
          nextIndex = direction > 0 ? 0 : total - 1;
        }

        const nextState = normalizeCombatState({
          participants,
          activeTurn: nextIndex,
        });

        setCombatState(nextState);
        persistCombatState(nextState);
      },
      [combatState, persistCombatState]
    );

    const participantLookup = useMemo(() => {
      const map = new Map();
      if (Array.isArray(combatState.participants)) {
        combatState.participants.forEach((participant, index) => {
          if (participant && typeof participant.characterId === 'string') {
            map.set(participant.characterId, { ...participant, index });
          }
        });
      }
      return map;
    }, [combatState.participants]);

    const orderedCombatRecords = useMemo(() => {
      if (!Array.isArray(combinedRecords) || combinedRecords.length === 0) {
        return [];
      }

      return combinedRecords
        .map((entity, recordIndex) => {
          if (!entity || typeof entity !== 'object') {
            return {
              character: entity,
              rowId: '',
              participantInfo: undefined,
              initiativeValue: undefined,
              sortInitiative: Number.NEGATIVE_INFINITY,
              recordIndex,
            };
          }

          const rowId = getEntityId(entity) || '';
          const participantInfo = rowId ? participantLookup.get(rowId) : undefined;
          const derivedInitiative = rowId ? characterInitiativeMap.get(rowId) : undefined;

          const initiativeValue =
            participantInfo && participantInfo.initiative !== undefined
              ? participantInfo.initiative
              : derivedInitiative;

          const numericInitiative =
            typeof initiativeValue === 'number' && Number.isFinite(initiativeValue)
              ? initiativeValue
              : Number.isFinite(Number(initiativeValue))
                ? Number(initiativeValue)
                : Number.NEGATIVE_INFINITY;

          return {
            character: entity,
            rowId,
            participantInfo,
            initiativeValue,
            sortInitiative: numericInitiative,
            recordIndex,
          };
        })
        .sort((a, b) => {
          if (b.sortInitiative !== a.sortInitiative) {
            return b.sortInitiative - a.sortInitiative;
          }

          const aIsParticipant = Boolean(a.participantInfo);
          const bIsParticipant = Boolean(b.participantInfo);
          if (aIsParticipant !== bIsParticipant) {
            return aIsParticipant ? -1 : 1;
          }

          if (
            a.participantInfo &&
            b.participantInfo &&
            a.participantInfo.index !== b.participantInfo.index
          ) {
            return a.participantInfo.index - b.participantInfo.index;
          }

          return a.recordIndex - b.recordIndex;
        });
    }, [combinedRecords, participantLookup, characterInitiativeMap, getEntityId]);

    const formatArmorClass = useCallback((armorClass) => {
      if (!Array.isArray(armorClass) || armorClass.length === 0) {
        return '—';
      }

      const parts = armorClass
        .map((entry) => {
          if (!entry || (entry.value === undefined && entry.value !== 0)) {
            return null;
          }
          const numeric = Number(entry.value);
          if (!Number.isFinite(numeric)) {
            return null;
          }
          const suffix = entry.type ? ` (${entry.type})` : '';
          return `${numeric}${suffix}`;
        })
        .filter(Boolean);

      return parts.length > 0 ? parts.join(', ') : '—';
    }, []);

    const formatSpeed = useCallback((speed) => {
      if (!speed) {
        return '—';
      }

      if (typeof speed === 'string') {
        return speed;
      }

      if (typeof speed === 'object') {
        const entries = Object.entries(speed)
          .map(([mode, value]) => {
            if (value === undefined || value === null || value === '') {
              return null;
            }
            return `${mode}: ${value}`;
          })
          .filter(Boolean);
        return entries.length > 0 ? entries.join(', ') : '—';
      }

      return '—';
    }, []);

    const formatAbilityScore = useCallback((key, value) => {
      const label = STAT_LABELS[key] || key.toUpperCase();
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return `${label}: —`;
      }
      const modifier = Math.floor((numeric - 10) / 2);
      const modifierText = modifier >= 0 ? `+${modifier}` : `${modifier}`;
      return `${label}: ${numeric} (${modifierText})`;
    }, []);

    const activeParticipant = useMemo(() => {
      if (!Array.isArray(combatState.participants)) {
        return null;
      }

      const { activeTurn } = combatState;

      if (
        !Number.isInteger(activeTurn) ||
        activeTurn < 0 ||
        activeTurn >= combatState.participants.length
      ) {
        return null;
      }

      return { ...combatState.participants[activeTurn], index: activeTurn };
    }, [combatState]);

    const activeTurnDisplayName = useMemo(() => {
      if (!activeParticipant) {
        return 'None';
      }

      const character = characterLookup.get(activeParticipant.characterId);
      if (character) {
        return (
          character.characterName ||
          character.name ||
          character.token ||
          activeParticipant.characterId
        );
      }

      return activeParticipant.characterId;
    }, [activeParticipant, characterLookup]);

    const combatParticipantCount = Array.isArray(combatState.participants)
      ? combatState.participants.length
      : 0;
  
    const navigateToCharacter = (id) => {
      navigate(`/zombies-character-sheet/${id}`);
    }

    const RESOURCE_TABS = useMemo(
      () => [
        { key: 'characters', title: 'Characters' },
        { key: 'players', title: 'Players' },
        { key: 'enemies', title: 'Enemies' },
        { key: 'weapons', title: 'Weapons' },
        { key: 'armor', title: 'Armor' },
        { key: 'items', title: 'Items' },
        { key: 'accessories', title: 'Accessories' },
      ],
      [calculateCharacterInitiative]
    );
    const [activeResourceTab, setActiveResourceTab] = useState('characters');

    const handleSelectResourceTab = useCallback(
      (key) => {
        if (!key || key === activeResourceTab) {
          return;
        }
        setActiveResourceTab(key);
      },
      [activeResourceTab]
    );

    useEffect(() => {
      if (
        activeResourceTab === 'enemies' &&
        !monsterCatalogLoaded &&
        !monsterCatalogLoading
      ) {
        fetchMonsterCatalog();
      }
    }, [activeResourceTab, monsterCatalogLoaded, monsterCatalogLoading, fetchMonsterCatalog]);
    //--------------------------------------------Currency Adjustments------------------------------
    const [currencyModalState, setCurrencyModalState] = useState({ show: false, character: null });
    const [currencyInputs, setCurrencyInputs] = useState({ cp: '0', sp: '0', gp: '0', pp: '0' });
    const [currencySubmitting, setCurrencySubmitting] = useState(false);

    const openCurrencyModal = (character) => {
      setCurrencyModalState({ show: true, character });
      setCurrencyInputs({ cp: '0', sp: '0', gp: '0', pp: '0' });
    };

    const closeCurrencyModal = () => {
      setCurrencyModalState({ show: false, character: null });
    };

    const updateCurrencyInput = (field, value) => {
      setCurrencyInputs((prev) => ({ ...prev, [field]: value }));
    };

    const convertCopperToCurrency = (totalCopper) => {
      const sign = totalCopper < 0 ? -1 : 1;
      let remaining = Math.abs(totalCopper);
      const pp = Math.floor(remaining / 1000);
      remaining %= 1000;
      const gp = Math.floor(remaining / 100);
      remaining %= 100;
      const sp = Math.floor(remaining / 10);
      remaining %= 10;
      const cp = remaining;

      return {
        pp: pp * sign,
        gp: gp * sign,
        sp: sp * sign,
        cp: cp * sign,
      };
    };

    const handleCurrencySubmit = async (event) => {
      event.preventDefault();
      if (!currencyModalState.character) {
        return;
      }
      setCurrencySubmitting(true);
      try {
        const parseField = (value) => {
          const parsed = parseInt(value, 10);
          return Number.isNaN(parsed) ? 0 : parsed;
        };

        const copper = parseField(currencyInputs.cp);
        const silver = parseField(currencyInputs.sp);
        const gold = parseField(currencyInputs.gp);
        const platinum = parseField(currencyInputs.pp);

        const totalCopper = copper + silver * 10 + gold * 100 + platinum * 1000;
        const normalized = convertCopperToCurrency(totalCopper);

        const response = await apiFetch(`/characters/${currencyModalState.character._id}/currency`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(normalized),
        });

        if (!response.ok) {
          throw new Error(response.statusText || 'Failed to update currency');
        }

        await fetchRecords();
        setStatus({ type: 'success', message: 'Currency updated.' });
        closeCurrencyModal();
      } catch (error) {
        setStatus({ type: 'danger', message: error.message || 'Failed to update currency' });
      } finally {
        setCurrencySubmitting(false);
      }
    };
//--------------------------------------------Campaign Section------------------------------
const [campaignDM, setCampaignDM] = useState({ players: [] });

// Fetch CampaignsDM
useEffect(() => {
  if (!user) {
    return;
  }
  async function fetchCampaignsDM() {
    const response = await apiFetch(`/campaigns/dm/${user.username}/${params.campaign}`);

    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      setStatus({ type: 'danger', message });
      return;
    }

    const record = await response.json();
    if (!record) {
      setStatus({ type: 'danger', message: 'Record not found' });
      navigate("/");
      return;
    }
    setCampaignDM( record );
  }
  fetchCampaignsDM();   
  return;
  
}, [ navigate, user, params.campaign ]);

//---------------------------------------Add Player-------------------------------------------
const [players, setPlayers] = useState({ 
  players: [] 
});

const [playersSearch, setPlayersSearch] = useState("");

 useEffect(() => {
    if (!user) {
      return;
    }

    async function fetchUsers() {
      const response = await apiFetch(`/users`);

      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        setStatus({ type: 'danger', message });
        return;
      }

      const record = await response.json();
      if (!record) {
        setStatus({ type: 'danger', message: 'Record not found' });
        navigate("/");
        return;
      }
      setPlayers({players: record});
    }

    fetchUsers();
  }, [navigate, user]);

async function newPlayerSubmit(e) {
  e.preventDefault();   
   sendNewPlayersToDb();
}

const currentCampaign = params.campaign.toString();
async function sendNewPlayersToDb() {
  const newPlayers = [playersSearch];
  await apiFetch(`/campaigns/players/add/${currentCampaign}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newPlayers),
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(response.status === 400 ? "Player already exists!" : "Failed to add player");
    }
    return response.text(); // Change to text() instead of json()
  })
  .then(data => {
    setStatus({ type: 'success', message: 'Player Successfully Added!' });
    setPlayersSearch(""); // Clear input after successful submission
    navigate(0);
  })
  .catch(error => {
    console.error('Error:', error);
    setStatus({ type: 'danger', message: error.message });
  });
}

//---------------------------------------Weapons----------------------------------------------

const [form2, setForm2] = useState({
    campaign: currentCampaign,
    name: "",
    type: "",
    category: "",
    damage: "",
    properties: [],
    weight: "",
    cost: "",
  });

  const [weaponPrompt, setWeaponPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const [armorPrompt, setArmorPrompt] = useState("");
  const [armorLoading, setArmorLoading] = useState(false);

  const [isCreatingWeapon, setIsCreatingWeapon] = useState(false);

  const [weapons, setWeapons] = useState([]);
  const [weaponOptions, setWeaponOptions] = useState({
    types: [],
    categories: [],
    properties: [],
  });

    const fetchWeapons = useCallback(async () => {
      const response = await apiFetch(`/equipment/weapons/${currentCampaign}`);
      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        setStatus({ type: 'danger', message });
        return;
      }
      const data = await response.json();
      setWeapons(data);
    }, [currentCampaign]);

    const fetchWeaponOptions = useCallback(async () => {
      const response = await apiFetch('/weapons/options');
      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        setStatus({ type: 'danger', message });
        return;
      }
      const data = await response.json();
      setWeaponOptions(data);
    }, []);

    useEffect(() => {
      if (activeResourceTab === 'weapons') {
        fetchWeapons();
        fetchWeaponOptions();
      }
    }, [activeResourceTab, fetchWeapons, fetchWeaponOptions]);
  
  function updateForm2(value) {
    return setForm2((prev) => {
      return { ...prev, ...value };
    });
  }

  async function generateWeapon() {
    setLoading(true);
    try {
      if (!weaponOptions.types.length || !weaponOptions.categories.length) {
        setStatus({ type: 'danger', message: 'Weapon options not loaded' });
        return;
      }
      const response = await apiFetch('/ai/weapon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: weaponPrompt }),
      });
      if (!response.ok) {
        let message;
        try {
          const errorData = await response.json();
          message = errorData?.message || response.statusText;
        } catch {
          message = response.statusText;
        }
        setStatus({ type: 'danger', message });
        return;
      }
      const weapon = await response.json();
      updateForm2({
        name: weapon.name || '',
        type: weapon.type || '',
        category: weapon.category || '',
        damage: weapon.damage || '',
        properties: weapon.properties || [],
        weight: weapon.weight ?? '',
        cost: weapon.cost ?? '',
      });
    } catch (err) {
      setStatus({ type: 'danger', message: err.message || 'Failed to generate weapon' });
    } finally {
      setLoading(false);
    }
  }
  
  async function onSubmit2(e) {
    e.preventDefault();   
     sendToDb2();
  }
  
  async function sendToDb2(){
    const weightNumber = form2.weight === "" ? undefined : Number(form2.weight);
    const costNumber = form2.cost === "" ? undefined : Number(form2.cost);
    const newWeapon = {
      campaign: currentCampaign,
      name: form2.name,
      type: form2.type,
      category: form2.category,
      damage: form2.damage,
      properties: form2.properties,
      weight: weightNumber,
      cost: costNumber,
    };
    Object.keys(newWeapon).forEach((key) => {
      if (newWeapon[key] === "" || newWeapon[key] === undefined) {
        delete newWeapon[key];
      }
    });
    try {
      const response = await apiFetch("/equipment/weapon/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newWeapon),
      });

      if (!response.ok) {
        let message;
        try {
          const errorData = await response.json();
          message = errorData?.message || errorData?.error || response.statusText;
        } catch {
          message = response.statusText;
        }
        setStatus({ type: 'danger', message });
        return;
      }

      setForm2({
        campaign: currentCampaign,
        name: "",
        type: "",
        category: "",
        damage: "",
        properties: [],
        weight: "",
        cost: "",
      });
      setIsCreatingWeapon(false);
      fetchWeapons();
    } catch (error) {
      setStatus({ type: 'danger', message: error.toString() });
    }
  }

  async function deleteWeapon(id) {
    try {
      const response = await apiFetch(`/equipment/weapon/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        setStatus({ type: 'danger', message });
        return;
      }
      setWeapons((prev) => prev.filter((w) => w._id !== id));
    } catch (error) {
      setStatus({ type: 'danger', message: error.toString() });
    }
  }
   //  ------------------------------------Armor-----------------------------------
  
  const [isCreatingArmor, setIsCreatingArmor] = useState(false);

  const [armor, setArmor] = useState([]);
  const [armorOptions, setArmorOptions] = useState({
    types: [],
    categories: [],
    slots: [],
  });

  const [form3, setForm3] = useState({
    campaign: currentCampaign,
    armorName: "",
    type: "",
    category: "",
    slot: "",
    armorBonus: "",
    maxDex: "",
    strength: "",
    stealth: "",
    weight: "",
    cost: "",
  });
  
  function updateForm3(value) {
    return setForm3((prev) => {
      return { ...prev, ...value };
    });
  }

  const fetchArmor = useCallback(async () => {
    const response = await apiFetch(`/equipment/armor/${currentCampaign}`);
    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      setStatus({ type: 'danger', message });
      return;
    }
    const data = await response.json();
    setArmor(data);
  }, [currentCampaign]);

  const fetchArmorOptions = useCallback(async () => {
    const response = await apiFetch('/armor/options');
    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      setStatus({ type: 'danger', message });
      return;
    }
    const data = await response.json();
    const { types = [], categories = [], slots = [] } = data || {};
    setArmorOptions({ types, categories, slots });
  }, []);

  const armorSlotLabels = useMemo(() => {
    const labels = {};
    (armorOptions.slots || []).forEach((slot) => {
      if (!slot || !slot.key) {
        return;
      }
      labels[slot.key] = slot.label || slot.key;
    });
    return labels;
  }, [armorOptions.slots]);

  const getArmorSlotLabel = useCallback(
    (armorEntry) => {
      const slotKey = armorEntry?.slot || armorEntry?.equipmentSlot;
      if (!slotKey) {
        return '—';
      }
      return armorSlotLabels[slotKey] || slotKey;
    },
    [armorSlotLabels]
  );

  useEffect(() => {
    if (activeResourceTab === 'armor') {
      fetchArmor();
      fetchArmorOptions();
    }
  }, [activeResourceTab, fetchArmor, fetchArmorOptions]);

  async function generateArmor() {
    setArmorLoading(true);
    try {
      if (!armorOptions.types.length || !armorOptions.categories.length) {
        setStatus({ type: 'danger', message: 'Armor options not loaded' });
        return;
      }
      const response = await apiFetch('/ai/armor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: armorPrompt }),
      });
      if (!response.ok) {
        let message;
        try {
          const errorData = await response.json();
          message = errorData?.message || response.statusText;
        } catch {
          message = response.statusText;
        }
        setStatus({ type: 'danger', message });
        return;
      }
      const armor = await response.json();
      updateForm3({
        armorName: armor.name || '',
        type: armor.type || '',
        category: armor.category || '',
        slot: armor.slot || armor.equipmentSlot || '',
        armorBonus: armor.armorBonus ?? armor.acBonus ?? '',
        maxDex: armor.maxDex !== undefined ? String(armor.maxDex) : '',
        strength: armor.strength ?? '',
        stealth: armor.stealth !== undefined ? String(armor.stealth) : '',
        weight: armor.weight ?? '',
        cost: armor.cost !== undefined ? String(armor.cost) : '',
      });
    } catch (err) {
      setStatus({ type: 'danger', message: err.message || 'Failed to generate armor' });
    } finally {
      setArmorLoading(false);
    }
  }
  
  async function onSubmit3(e) {
    e.preventDefault();   
     sendToDb3();
  }
  
  async function sendToDb3(){
    const numericFields = ['armorBonus', 'maxDex', 'strength', 'weight'];
    const newArmor = Object.fromEntries(
      Object.entries(form3)
        .filter(([_, v]) => v !== "")
        .map(([key, value]) => [
          key,
          numericFields.includes(key) ? Number(value) : key === "cost" ? String(value) : value,
        ])
    );
    if (newArmor.slot && !newArmor.equipmentSlot) {
      newArmor.equipmentSlot = newArmor.slot;
    } else if (newArmor.equipmentSlot && !newArmor.slot) {
      newArmor.slot = newArmor.equipmentSlot;
    }
    await apiFetch("/equipment/armor/add", {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
       },
       body: JSON.stringify(newArmor),
     })
   .catch(error => {
     setStatus({ type: 'danger', message: error.toString() });
     return;
   });

   setForm3({
    campaign: currentCampaign,
    armorName: "",
    type: "",
    category: "",
    slot: "",
    armorBonus: "",
    maxDex: "",
    strength: "",
    stealth: "",
    weight: "",
    cost: "",
  });
   fetchArmor();
   setIsCreatingArmor(false);
  }

  async function deleteArmor(id) {
    try {
      const response = await apiFetch(`/equipment/armor/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        setStatus({ type: 'danger', message });
        return;
      }
      await response.json();
      setArmor((prev) => prev.filter((a) => a._id !== id));
    } catch (error) {
      setStatus({ type: 'danger', message: error.toString() });
    }
  }
  
//------------------------------------Items------------------------------------------------------------
  const [isCreatingItem, setIsCreatingItem] = useState(false);

  const [items, setItems] = useState([]);
  const [itemOptions, setItemOptions] = useState({
    categories: [],
  });

  const [form4, setForm4] = useState({
    campaign: currentCampaign,
    name: "",
    category: "",
    weight: "",
    cost: "",
    notes: "",
    statBonuses: {},
    skillBonuses: {},
  });

  const [itemPrompt, setItemPrompt] = useState("");
  const [itemLoading, setItemLoading] = useState(false);
  const [showItemNotes, setShowItemNotes] = useState(false);
  const [currentItemNote, setCurrentItemNote] = useState('');

  const openItemNote = (note) => {
    setCurrentItemNote(note);
    setShowItemNotes(true);
  };

  const closeItemNote = () => setShowItemNotes(false);

  function updateForm4(value) {
    return setForm4((prev) => {
      return { ...prev, ...value };
    });
  }

  const fetchItems = useCallback(async () => {
    const response = await apiFetch(`/equipment/items/${currentCampaign}`);
    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      setStatus({ type: 'danger', message });
      return;
    }
    const data = await response.json();
    setItems(data);
  }, [currentCampaign]);

  const fetchItemOptions = useCallback(async () => {
    const response = await apiFetch('/items/options');
    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      setStatus({ type: 'danger', message });
      return;
    }
    const data = await response.json();
    setItemOptions(data);
  }, []);

  useEffect(() => {
    if (activeResourceTab === 'items') {
      fetchItems();
      fetchItemOptions();
    }
  }, [activeResourceTab, fetchItems, fetchItemOptions]);

  async function generateItem() {
    setItemLoading(true);
    try {
      if (!itemOptions.categories.length) {
        setStatus({ type: 'danger', message: 'Item options not loaded' });
        return;
      }
      const response = await apiFetch('/ai/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: itemPrompt }),
      });
      if (!response.ok) {
        let message;
        try {
          const errorData = await response.json();
          message = errorData?.message || response.statusText;
        } catch {
          message = response.statusText;
        }
        setStatus({ type: 'danger', message });
        return;
      }
      const item = await response.json();
      const normalizeBonuses = (bonuses, lookup) => {
        const result = {};
        for (const [k, v] of Object.entries(bonuses || {})) {
          const key = lookup[k.toLowerCase()] || k;
          result[key] = v;
        }
        return result;
      };
      const updates = {
        name: item.name || '',
        category: item.category || '',
        weight: item.weight ?? '',
        cost: item.cost ?? '',
      };
      if (item.statBonuses) {
        updates.statBonuses = normalizeBonuses(item.statBonuses, STAT_LOOKUP);
      }
      if (item.skillBonuses) {
        updates.skillBonuses = normalizeBonuses(item.skillBonuses, SKILL_LOOKUP);
      }
      updateForm4(updates);
    } catch (err) {
      setStatus({ type: 'danger', message: err.message || 'Failed to generate item' });
    } finally {
      setItemLoading(false);
    }
  }

  async function onSubmit4(e) {
    e.preventDefault();
    sendToDb4();
  }

  async function sendToDb4() {
    const weightNumber = form4.weight === "" ? undefined : Number(form4.weight);
    const normalizeBonuses = (obj) => {
      const entries = Object.entries(obj || {}).filter(([, v]) => v !== '' && v !== undefined);
      if (!entries.length) return undefined;
      return Object.fromEntries(entries.map(([k, v]) => [k, Number(v)]));
    };
    const statBonuses = normalizeBonuses(form4.statBonuses);
    const skillBonuses = normalizeBonuses(form4.skillBonuses);
    const newItem = {
      campaign: currentCampaign,
      name: form4.name,
      category: form4.category,
      weight: weightNumber,
      cost: form4.cost,
      ...(form4.notes && { notes: form4.notes }),
      ...(statBonuses && { statBonuses }),
      ...(skillBonuses && { skillBonuses }),
    };
    try {
      const response = await apiFetch('/equipment/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newItem),
      });
      if (!response.ok) {
        let message;
        try {
          const errorData = await response.json();
          message = errorData?.message || errorData?.error || response.statusText;
        } catch {
          message = response.statusText;
        }
        setStatus({ type: 'danger', message });
        return;
      }
      setForm4({
        campaign: currentCampaign,
        name: "",
        category: "",
        weight: "",
        cost: "",
        notes: "",
        statBonuses: {},
        skillBonuses: {},
      });
      setIsCreatingItem(false);
      fetchItems();
    } catch (error) {
      setStatus({ type: 'danger', message: error.toString() });
    }
  }

  async function deleteItem(id) {
    try {
      const response = await apiFetch(`/equipment/items/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        setStatus({ type: 'danger', message });
        return;
      }
      setItems((prev) => prev.filter((i) => i._id !== id));
    } catch (error) {
      setStatus({ type: 'danger', message: error.toString() });
    }
  }

  //------------------------------------Accessories------------------------------------------------------------
  const [isCreatingAccessory, setIsCreatingAccessory] = useState(false);

  const [accessories, setAccessories] = useState([]);
  const [accessoryOptions, setAccessoryOptions] = useState({
    categories: [],
    slots: [],
  });

  const [accessoryForm, setAccessoryForm] = useState({
    campaign: currentCampaign,
    name: '',
    category: '',
    targetSlots: [],
    rarity: '',
    weight: null,
    cost: '',
    notes: '',
    statBonuses: {},
    skillBonuses: {},
  });

  const [accessoryPrompt, setAccessoryPrompt] = useState('');
  const [accessoryLoading, setAccessoryLoading] = useState(false);

  const handleCloseResourceTab = useCallback(
    (key) => {
      switch (key) {
        case 'weapons':
          setIsCreatingWeapon(false);
          break;
        case 'armor':
          setIsCreatingArmor(false);
          break;
        case 'items':
          setIsCreatingItem(false);
          break;
        case 'accessories':
          setIsCreatingAccessory(false);
          break;
        case 'players':
          setPlayersSearch('');
          break;
        default:
          break;
      }
      setActiveResourceTab((current) => (current === key ? null : current));
    },
    [setActiveResourceTab, setPlayersSearch]
  );

  const updateAccessoryForm = (value) => {
    setAccessoryForm((prev) => ({ ...prev, ...value }));
  };

  const toggleAccessorySlot = (slotKey) => {
    setAccessoryForm((prev) => {
      const currentSlots = new Set(prev.targetSlots || []);
      if (currentSlots.has(slotKey)) {
        currentSlots.delete(slotKey);
      } else {
        currentSlots.add(slotKey);
      }
      return { ...prev, targetSlots: Array.from(currentSlots) };
    });
  };

  const fetchAccessories = useCallback(async () => {
    const response = await apiFetch(`/equipment/accessories/${currentCampaign}`);
    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      setStatus({ type: 'danger', message });
      return;
    }
    const data = await response.json();
    setAccessories(data);
  }, [currentCampaign]);

  const fetchAccessoryOptions = useCallback(async () => {
    const response = await apiFetch('/accessories/options');
    if (!response.ok) {
      const message = `An error has occurred: ${response.statusText}`;
      setStatus({ type: 'danger', message });
      return;
    }
    const data = await response.json();
    setAccessoryOptions({
      categories: data?.categories || [],
      slots: data?.slots || [],
    });
  }, []);

  const accessorySlotLabels = useMemo(() => {
    const labels = {};
    (accessoryOptions.slots || []).forEach((slot) => {
      if (!slot || !slot.key) {
        return;
      }
      labels[slot.key] = slot.label || slot.key;
    });
    return labels;
  }, [accessoryOptions.slots]);

  useEffect(() => {
    if (activeResourceTab === 'accessories') {
      fetchAccessories();
      fetchAccessoryOptions();
    }
  }, [activeResourceTab, fetchAccessories, fetchAccessoryOptions]);

  async function generateAccessory() {
    setAccessoryLoading(true);
    try {
      if (!accessoryOptions.categories.length || !accessoryOptions.slots.length) {
        setStatus({ type: 'danger', message: 'Accessory options not loaded' });
        return;
      }
      const response = await apiFetch('/ai/accessory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: accessoryPrompt }),
      });
      if (!response.ok) {
        let message;
        try {
          const errorData = await response.json();
          message = errorData?.message || response.statusText;
        } catch {
          message = response.statusText;
        }
        setStatus({ type: 'danger', message });
        return;
      }
      const accessory = await response.json();
      const normalizeBonuses = (bonuses, lookup) => {
        const result = {};
        for (const [k, v] of Object.entries(bonuses || {})) {
          const key = lookup[k.toLowerCase()] || k;
          result[key] = v;
        }
        return result;
      };
      const updates = {
        name: accessory.name || '',
        category: accessory.category || '',
        targetSlots: Array.isArray(accessory.targetSlots) ? accessory.targetSlots : [],
        rarity: accessory.rarity || '',
        weight: accessory.weight ?? null,
        cost: accessory.cost ?? '',
        notes: accessory.notes || '',
      };
      if (accessory.statBonuses) {
        updates.statBonuses = normalizeBonuses(accessory.statBonuses, STAT_LOOKUP);
      }
      if (accessory.skillBonuses) {
        updates.skillBonuses = normalizeBonuses(accessory.skillBonuses, SKILL_LOOKUP);
      }
      updateAccessoryForm(updates);
    } catch (err) {
      setStatus({ type: 'danger', message: err.message || 'Failed to generate accessory' });
    } finally {
      setAccessoryLoading(false);
    }
  }

  const normalizeAccessoryBonuses = (obj) => {
    const entries = Object.entries(obj || {}).filter(([, v]) => v !== '' && v !== undefined);
    if (!entries.length) return undefined;
    return Object.fromEntries(entries.map(([k, v]) => [k, Number(v)]));
  };

  async function sendAccessoryToDb() {
    if (!accessoryForm.targetSlots || accessoryForm.targetSlots.length === 0) {
      setStatus({ type: 'danger', message: 'Select at least one target slot' });
      return;
    }
    const weightNumber =
      accessoryForm.weight === '' || accessoryForm.weight === null
        ? undefined
        : Number(accessoryForm.weight);
    if (weightNumber !== undefined && Number.isNaN(weightNumber)) {
      setStatus({ type: 'danger', message: 'Weight must be a number' });
      return;
    }
    const statBonuses = normalizeAccessoryBonuses(accessoryForm.statBonuses);
    const skillBonuses = normalizeAccessoryBonuses(accessoryForm.skillBonuses);
    const newAccessory = {
      campaign: currentCampaign,
      name: accessoryForm.name,
      category: accessoryForm.category,
      targetSlots: accessoryForm.targetSlots,
      ...(accessoryForm.rarity && { rarity: accessoryForm.rarity }),
      ...(weightNumber !== undefined ? { weight: weightNumber } : {}),
      ...(accessoryForm.cost && { cost: accessoryForm.cost }),
      ...(accessoryForm.notes && { notes: accessoryForm.notes }),
      ...(statBonuses && { statBonuses }),
      ...(skillBonuses && { skillBonuses }),
    };

    try {
      const response = await apiFetch('/equipment/accessories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAccessory),
      });
      if (!response.ok) {
        let message;
        try {
          const errorData = await response.json();
          message = errorData?.message || errorData?.error || response.statusText;
        } catch {
          message = response.statusText;
        }
        setStatus({ type: 'danger', message });
        return;
      }
      await fetchAccessories();
      setAccessoryForm({
        campaign: currentCampaign,
        name: '',
        category: '',
        targetSlots: [],
        rarity: '',
        weight: null,
        cost: '',
        notes: '',
        statBonuses: {},
        skillBonuses: {},
      });
      setAccessoryPrompt('');
      setIsCreatingAccessory(false);
    } catch (error) {
      setStatus({ type: 'danger', message: error.toString() });
    }
  }

  async function onSubmitAccessory(e) {
    e.preventDefault();
    await sendAccessoryToDb();
  }

  async function deleteAccessory(id) {
    try {
      const response = await apiFetch(`/equipment/accessories/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const message = `An error has occurred: ${response.statusText}`;
        setStatus({ type: 'danger', message });
        return;
      }
      setAccessories((prev) => prev.filter((acc) => acc._id !== id));
    } catch (error) {
      setStatus({ type: 'danger', message: error.toString() });
    }
  }

  const getAccessorySlotLabel = useCallback(
    (slots) => {
      if (!Array.isArray(slots) || slots.length === 0) {
        return '—';
      }
      return slots
        .map((slot) => accessorySlotLabels[slot] || slot)
        .join(', ');
    },
    [accessorySlotLabels]
  );

const renderBonuses = (bonuses, labels) =>
  Object.entries(bonuses || {})
    .map(([k, v]) => `${labels[k] || k}: ${v}`)
    .join(', ');

const weaponCategoryIcons = {
  'simple melee': GiStoneAxe,
  'simple ranged': GiBowArrow,
  'martial melee': GiBroadsword,
  'martial ranged': GiCrossbow,
};

const armorCategoryIcons = {
  light: GiLeatherArmor,
  medium: GiBreastplate,
  heavy: GiChainMail,
  shield: GiShield,
};

const itemCategoryIcons = {
  'adventuring gear': GiBackpack,
  ammunition: GiAmmoBox,
  tool: GiHammerNails,
  mount: GiHorseHead,
  'tack and harness': GiSaddle,
  vehicle: GiChariot,
  'water vehicle': GiSailboat,
  custom: GiTreasureMap,
};

const accessoryCategoryIcons = {
  belt: GiBackpack,
  cloak: GiBackpack,
  ring: GiTreasureMap,
  amulet: GiTreasureMap,
  necklace: GiTreasureMap,
  trinket: GiTreasureMap,
};

const resolveIcon = (category, iconMap, fallback) => {
  const normalized = String(category || '').toLowerCase();
  if (iconMap[normalized]) {
    return iconMap[normalized];
  }
  const matchKey = Object.keys(iconMap).find((key) => normalized.includes(key));
  return matchKey ? iconMap[matchKey] : fallback;
};


// -----------------------------------Display-----------------------------------------------------------------------------
  return (
    <div
      className="pt-2 text-center"
      style={{
        fontFamily: 'Raleway, sans-serif',
        backgroundImage: `url(${loginbg})`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        minHeight: '100vh',
        paddingBottom: '5rem',
      }}
    >
      <div style={{ paddingTop: '5rem' }}></div>
      {status && (
        <Alert variant={status.type} dismissible onClose={() => setStatus(null)}>
          {status.message}
        </Alert>
      )}

      <Container className="zombies-dm-container zombies-dm-container--spaced">
        <Tab.Container activeKey={activeResourceTab || null} onSelect={handleSelectResourceTab}>
          <div
            className="d-flex justify-content-center mb-2"
            style={{ position: 'relative', zIndex: '4' }}
          >
            <h2 className="text-white text-center mb-0">
              {campaignDM.campaignName ?? params.campaign}
            </h2>
          </div>
          <div
            className="d-flex justify-content-center mb-3"
            style={{ position: 'relative', zIndex: '4' }}
          >
            <Nav variant="tabs" className="flex-wrap">
              {RESOURCE_TABS.map(({ key, title }) => (
                <Nav.Item key={key}>
                  <Nav.Link eventKey={key}>{title}</Nav.Link>
                </Nav.Item>
              ))}
            </Nav>
          </div>
          <Tab.Content>
    <Tab.Pane eventKey="characters">
      {activeResourceTab === 'characters' && (
        <div className="text-center">
          <Card className="modern-card" data-testid="resource-characters-card">
            <Card.Header className="modal-header">
              <div className="d-flex align-items-center justify-content-center w-100">
                <div className="d-flex flex-grow-1 justify-content-center">
                  <CloseButton
                    className="ms-auto"
                    variant="white"
                    onClick={() => handleCloseResourceTab('characters')}
                    aria-label="Close characters tab"
                  />
                </div>
              </div>
            </Card.Header>
            <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
              <Card className="mb-4 bg-dark bg-opacity-75 border border-secondary text-start">
                <Card.Header className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 bg-transparent border-secondary text-light">
                  <h3 className="h5 mb-0">Combat Tracker</h3>
                  <div className="small">
                    <strong>Active Turn: {activeTurnDisplayName}</strong>
                  </div>
                </Card.Header>
                <Card.Body className="bg-transparent text-light">
                  <div className="d-flex flex-wrap justify-content-end gap-2 mb-3">
                    <Button
                      variant="outline-light"
                      size="sm"
                      onClick={handleRollInitiative}
                      disabled={combatParticipantCount === 0}
                    >
                      Roll Initiative
                    </Button>
                    <Button
                      variant="outline-light"
                      size="sm"
                      onClick={() => handleAdvanceTurn(-1)}
                      disabled={combatParticipantCount === 0}
                    >
                      Previous Turn
                    </Button>
                    <Button
                      variant="outline-light"
                      size="sm"
                      onClick={() => handleAdvanceTurn(1)}
                      disabled={combatParticipantCount === 0}
                    >
                      Next Turn
                    </Button>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-dark table-striped table-hover align-middle mb-0">
                      <thead>
                        <tr>
                          <th scope="col">Character</th>
                          <th scope="col">Player</th>
                          <th scope="col" className="text-center">In Combat</th>
                          <th scope="col" className="text-center">Initiative</th>
                          <th scope="col" className="text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orderedCombatRecords.length > 0 ? (
                          orderedCombatRecords.map(
                            ({ character, rowId, participantInfo, initiativeValue }) => {
                              const resolvedRowId = rowId || '';
                              const isParticipant = Boolean(participantInfo);
                              const displayInitiative =
                                initiativeValue !== undefined && initiativeValue !== null
                                  ? initiativeValue
                                  : '—';
                              const isActive =
                                isParticipant &&
                                Number.isInteger(combatState.activeTurn) &&
                                participantInfo.index === combatState.activeTurn;
                              const displayName = character?.characterName || character?.name || '—';
                              const playerName = character?.token || '—';
                              const checkboxLabel =
                                character?.characterName ||
                                character?.name ||
                                character?.token ||
                                participantInfo?.characterId ||
                                'this character';

                              return (
                                <tr
                                  key={resolvedRowId || playerName}
                                  className={isActive ? 'table-success text-dark' : undefined}
                                >
                                  <td className="fw-semibold">{displayName}</td>
                                  <td>{playerName}</td>
                                  <td className="text-center">
                                    <Form.Check
                                      type="checkbox"
                                      id={`combat-toggle-${resolvedRowId}`}
                                      checked={isParticipant}
                                      onChange={() =>
                                        resolvedRowId && handleToggleParticipant(resolvedRowId)
                                      }
                                      aria-label={`Toggle ${checkboxLabel} in combat`}
                                    />
                                  </td>
                                  <td className="text-center" style={{ width: '120px' }}>
                                    {displayInitiative}
                                  </td>
                                  <td className="text-center">
                                    <div className="d-flex justify-content-center gap-2">
                                      <Button
                                        variant={isActive ? 'success' : 'outline-light'}
                                        size="sm"
                                        onClick={() =>
                                          resolvedRowId && handleSetTurn(resolvedRowId)
                                        }
                                        disabled={!isParticipant}
                                      >
                                        Set Turn
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                          )
                        ) : (
                          <tr>
                            <td colSpan={5} className="text-center text-muted py-3">
                              No characters available.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card.Body>
              </Card>
              <ResourceGrid
                dataTestId="characters-resource-grid"
                items={Array.isArray(records) ? records : []}
                emptyMessage="No characters found."
                getKey={(character) => character._id}
                renderItem={(character) => {
                  const occupation = Array.isArray(character.occupation)
                    ? character.occupation
                    : [];
                  const totalLevel = occupation.reduce(
                    (total, role) => total + (Number(role.Level) || 0),
                    0
                  );
                  const classSummary =
                    occupation.length > 0
                      ? occupation
                          .map((role) => `${role.Level} ${role.Occupation}`)
                          .join(', ')
                      : '—';

                  const uniqueClasses = [];
                  const seenClasses = new Set();
                  occupation.forEach((role) => {
                    const rawOccupation =
                      role?.Occupation ?? role?.occupation ?? '';
                    const trimmedOccupation = String(rawOccupation || '').trim();
                    if (!trimmedOccupation) {
                      return;
                    }

                    const normalizedKey = trimmedOccupation.toLowerCase();
                    if (seenClasses.has(normalizedKey)) {
                      return;
                    }

                    seenClasses.add(normalizedKey);
                    uniqueClasses.push({
                      original: trimmedOccupation,
                      normalizedKey,
                    });
                  });

                  const classIcons = (uniqueClasses.length > 0
                    ? uniqueClasses
                    : [{ original: null, normalizedKey: null }]
                  ).map(({ original, normalizedKey }, index) => {
                    const iconEntry =
                      (normalizedKey && CLASS_ICON_MAP[normalizedKey]) ||
                      CLASS_ICON_MAP.default;
                    const IconComponent = iconEntry.icon;
                    const displayLabel = original || iconEntry.label;
                    const accessibleLabel = `${displayLabel} class`;

                    return {
                      IconComponent,
                      accessibleLabel,
                      key: `${normalizedKey || 'default'}-${index}`,
                    };
                  });

                  const detailRows = [
                    { label: 'Level', value: totalLevel },
                    { label: 'Classes', value: classSummary },
                  ];

                  return (
                    <Card className="resource-card h-100 w-100 text-start">
                      <Card.Body className="d-flex flex-column">
                        <div className="d-flex justify-content-center mb-2">
                          <div className="d-flex flex-wrap justify-content-center align-items-center gap-2">
                            {classIcons.map(({ IconComponent, accessibleLabel, key }) => (
                              <span
                                key={key}
                                className="d-inline-flex align-items-center text-primary"
                                role="img"
                                aria-label={accessibleLabel}
                                title={accessibleLabel}
                              >
                                <IconComponent aria-hidden="true" focusable="false" size={26} />
                              </span>
                            ))}
                          </div>
                        </div>
                        <Card.Title className="mb-1">
                          {character.characterName || 'Unnamed Character'}
                        </Card.Title>
                        <Card.Subtitle className="text-muted small mb-2">
                          Player: {character.token || '—'}
                        </Card.Subtitle>
                          <div className="d-grid gap-1">
                            {detailRows.map(({ label, value }) => {
                              const displayValue =
                                value || value === 0 ? value : '—';
                              return (
                                <Card.Text
                                  key={label}
                                  className="small mb-1 text-body fw-semibold text-break"
                                >
                                  <span className="visually-hidden">{`${label}: ${displayValue}`}</span>
                                  <span
                                    className="text-muted text-uppercase fw-semibold me-1"
                                    aria-hidden="true"
                                  >
                                    {`${label}:`}
                                  </span>
                                  <span aria-hidden="true" className="text-break">
                                    {displayValue}
                                  </span>
                                </Card.Text>
                              );
                            })}
                          </div>
                      </Card.Body>
                      <Card.Footer className="d-flex flex-wrap gap-2 justify-content-end">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-pill"
                          onClick={() => openCurrencyModal(character)}
                          aria-label={`Adjust currency for ${
                            character.characterName || character.token || 'this character'
                          }`}
                        >
                          Adjust Currency
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          className="rounded-pill"
                          onClick={() => navigateToCharacter(character._id)}
                        >
                          View Sheet
                        </Button>
                      </Card.Footer>
                    </Card>
                  );
                }}
              />
            </Card.Body>
          </Card>
        </div>
      )}
    </Tab.Pane>
    <Tab.Pane eventKey="players">
      {activeResourceTab === 'players' && (
        <div className="text-center">
          <Card className="modern-card" data-testid="resource-players-card">
            <Card.Header className="modal-header">
              <div className="d-flex align-items-center justify-content-center w-100">
                <div className="d-flex flex-grow-1 justify-content-center">
                  <CloseButton
                    className="ms-auto"
                    variant="white"
                    onClick={() => handleCloseResourceTab('players')}
                    aria-label="Close players tab"
                  />
                </div>
              </div>
            </Card.Header>
            <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
              <Container className="mt-3">
                <Row className="justify-content-center">
                  <Col md={8} lg={6}>
                    <Form onSubmit={newPlayerSubmit}>
                      <Form.Group className="mb-3">
                        <Form.Label className="text-light">Select New Player</Form.Label>
                        <Form.Select
                          onChange={(e) => setPlayersSearch(e.target.value)}
                          value={playersSearch}
                          type="text"
                        >
                          <option value="" disabled>
                            Select Player
                          </option>
                          {players.players && players.players.length > 0 ? (
                            players.players.map((el) => (
                              <option key={el.username} value={el.username}>
                                {el.username}
                              </option>
                            ))
                          ) : (
                            <option>No players available</option>
                          )}
                        </Form.Select>
                      </Form.Group>
                      <div className="text-center pb-2">
                        <Button
                          disabled={!playersSearch}
                          className="rounded-pill"
                          variant="outline-light"
                          type="submit"
                        >
                          Add Player
                        </Button>
                      </div>
                    </Form>
                  </Col>
                </Row>
              </Container>
              <ResourceGrid
                dataTestId="players-resource-grid"
                items={Array.isArray(campaignDM.players) ? campaignDM.players : []}
                emptyMessage="No players added yet."
                getKey={(player, index) => player || index}
                renderItem={(playerName) => (
                  <Card className="resource-card h-100 w-100 text-center">
                    <Card.Body className="d-flex flex-column align-items-center justify-content-center py-4">
                      <div className="d-flex justify-content-center mb-2 w-100">
                        <GiCharacter size={40} title="Player" />
                      </div>
                      <Card.Title className="mb-1">{playerName}</Card.Title>
                      <Card.Text className="text-muted small mb-0">
                        Campaign Member
                      </Card.Text>
                    </Card.Body>
                  </Card>
                )}
              />
            </Card.Body>
          </Card>
        </div>
      )}
    </Tab.Pane>
    <Tab.Pane eventKey="enemies">
      {activeResourceTab === 'enemies' && (
        <div className="text-center">
          <Card className="modern-card" data-testid="resource-enemies-card">
            <Card.Header className="modal-header">
              <div className="d-flex align-items-center justify-content-center w-100">
                <div className="d-flex flex-grow-1 justify-content-center">
                  <CloseButton
                    className="ms-auto"
                    variant="white"
                    onClick={() => handleCloseResourceTab('enemies')}
                    aria-label="Close enemies tab"
                  />
                </div>
              </div>
            </Card.Header>
            <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
              <Container className="mt-3">
                <Form onSubmit={handleAddEnemy}>
                  <Row className="g-3 align-items-end">
                    <Col md={6}>
                      <Form.Group className="mb-3 mb-md-0">
                        <Form.Label className="text-light">Search Monsters</Form.Label>
                        <Form.Control
                          type="text"
                          value={monsterSearch}
                          onChange={(e) => setMonsterSearch(e.target.value)}
                          placeholder="Search by name"
                          disabled={monsterCatalogLoading && !monsterCatalogLoaded}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="text-light">Select Monster</Form.Label>
                        <Form.Select
                          value={selectedMonsterIndex}
                          onChange={handleMonsterSelectChange}
                          disabled={monsterCatalogLoading && !monsterCatalogLoaded}
                        >
                          <option value="" disabled>
                            {monsterCatalogLoading && !monsterCatalogLoaded
                              ? 'Loading monsters...'
                              : 'Select Monster'}
                          </option>
                          {filteredMonsterCatalog.length > 0 ? (
                            filteredMonsterCatalog.map((monster) => (
                              <option key={monster.index} value={monster.index}>
                                {monster.name}
                              </option>
                            ))
                          ) : (
                            monsterCatalogLoaded && (
                              <option value="" disabled>
                                No monsters match your search
                              </option>
                            )
                          )}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                  <Row className="g-3 align-items-end mt-0">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="text-light">Custom Name (optional)</Form.Label>
                        <Form.Control
                          type="text"
                          value={customEnemyName}
                          onChange={(e) => setCustomEnemyName(e.target.value)}
                          placeholder="Override monster name"
                          disabled={!selectedMonsterIndex}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6} className="d-flex justify-content-center justify-content-md-end">
                      <Button
                        type="submit"
                        variant="outline-light"
                        className="rounded-pill mt-3 mt-md-0"
                        disabled={!selectedMonsterIndex || addingEnemy}
                      >
                        {addingEnemy && (
                          <Spinner
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                          />
                        )}
                        Add Enemy
                      </Button>
                    </Col>
                  </Row>
                </Form>
                {monsterCatalogError && (
                  <div className="text-warning small mt-3">
                    {monsterCatalogError}{' '}
                    <Button
                      variant="outline-light"
                      size="sm"
                      onClick={() => fetchMonsterCatalog()}
                      disabled={monsterCatalogLoading}
                    >
                      Retry
                    </Button>
                  </div>
                )}
                <div className="mt-3">
                  {monsterDetailLoading ? (
                    <div className="text-light text-center">
                      <Spinner animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                      Loading monster details...
                    </div>
                  ) : selectedMonster ? (
                    <Card className="bg-dark bg-opacity-75 border border-secondary text-start text-light mt-3">
                      <Card.Body>
                        <Card.Title className="h5 mb-1">{selectedMonster.name}</Card.Title>
                        <Card.Subtitle className="text-muted small mb-3">
                          {[selectedMonster.size, selectedMonster.type].filter(Boolean).join(' ') || '—'}
                          {selectedMonster.challengeRating !== null && selectedMonster.challengeRating !== undefined
                            ? ` • CR ${selectedMonster.challengeRating}`
                            : ''}
                        </Card.Subtitle>
                        <div className="d-grid gap-1">
                          <Card.Text className="small mb-1 text-body fw-semibold text-break">
                            <span className="text-muted text-uppercase fw-semibold me-1" aria-hidden="true">
                              AC:
                            </span>
                            <span aria-hidden="true">{formatArmorClass(selectedMonster.armorClass)}</span>
                          </Card.Text>
                          <Card.Text className="small mb-1 text-body fw-semibold text-break">
                            <span className="text-muted text-uppercase fw-semibold me-1" aria-hidden="true">
                              HP:
                            </span>
                            <span aria-hidden="true">{selectedMonster.hitPoints ?? '—'}</span>
                          </Card.Text>
                          <Card.Text className="small mb-1 text-body fw-semibold text-break">
                            <span className="text-muted text-uppercase fw-semibold me-1" aria-hidden="true">
                              Hit Dice:
                            </span>
                            <span aria-hidden="true">{selectedMonster.hitDice || '—'}</span>
                          </Card.Text>
                          <Card.Text className="small mb-1 text-body fw-semibold text-break">
                            <span className="text-muted text-uppercase fw-semibold me-1" aria-hidden="true">
                              Speed:
                            </span>
                            <span aria-hidden="true">{formatSpeed(selectedMonster.speed)}</span>
                          </Card.Text>
                          <Card.Text className="small mb-1 text-body fw-semibold text-break">
                            <span className="text-muted text-uppercase fw-semibold me-1" aria-hidden="true">
                              Alignment:
                            </span>
                            <span aria-hidden="true">{selectedMonster.alignment || '—'}</span>
                          </Card.Text>
                          <Card.Text className="small mb-1 text-body fw-semibold text-break">
                            <span className="text-muted text-uppercase fw-semibold me-1" aria-hidden="true">
                              Languages:
                            </span>
                            <span aria-hidden="true">
                              {Array.isArray(selectedMonster.languages)
                                ? selectedMonster.languages.join(', ')
                                : selectedMonster.languages || '—'}
                            </span>
                          </Card.Text>
                        </div>
                        <div className="mt-3">
                          <h6 className="text-uppercase text-muted small fw-semibold mb-1">Abilities</h6>
                          <div className="d-flex flex-wrap gap-2">
                            {STAT_KEYS_ORDER.map((key) => (
                              <span key={`preview-${key}`} className="badge bg-secondary">
                                {formatAbilityScore(key, selectedMonster?.abilityScores?.[key])}
                              </span>
                            ))}
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  ) : null}
                </div>
              </Container>
              <ResourceGrid
                dataTestId="enemies-resource-grid"
                items={Array.isArray(normalizedEnemies) ? normalizedEnemies : []}
                emptyMessage="No enemies added yet."
                getKey={(enemy) => enemy.enemyId}
                renderItem={(enemy) => {
                  const participantInfo = enemy.enemyId ? participantLookup.get(enemy.enemyId) : undefined;
                  const inCombat = Boolean(participantInfo);
                  const challengeText =
                    enemy.challengeRating !== null && enemy.challengeRating !== undefined
                      ? `CR ${enemy.challengeRating}`
                      : null;
                  const languagesDisplay = Array.isArray(enemy.languages)
                    ? enemy.languages.join(', ')
                    : enemy.languages || '—';

                  return (
                    <Card className="resource-card h-100 w-100 text-start">
                      <Card.Body className="d-flex flex-column">
                        <Card.Title className="mb-1">{enemy.name || 'Unnamed Enemy'}</Card.Title>
                        <Card.Subtitle className="text-muted small mb-2">
                          {[enemy.displayType, challengeText].filter(Boolean).join(' • ') || '—'}
                        </Card.Subtitle>
                        <div className="d-grid gap-1">
                          <Card.Text className="small mb-1 text-body fw-semibold text-break">
                            <span className="text-muted text-uppercase fw-semibold me-1" aria-hidden="true">
                              AC:
                            </span>
                            <span aria-hidden="true">{formatArmorClass(enemy.armorClass)}</span>
                          </Card.Text>
                          <Card.Text className="small mb-1 text-body fw-semibold text-break">
                            <span className="text-muted text-uppercase fw-semibold me-1" aria-hidden="true">
                              HP:
                            </span>
                            <span aria-hidden="true">{enemy.hitPoints ?? '—'}</span>
                          </Card.Text>
                          <Card.Text className="small mb-1 text-body fw-semibold text-break">
                            <span className="text-muted text-uppercase fw-semibold me-1" aria-hidden="true">
                              Speed:
                            </span>
                            <span aria-hidden="true">{formatSpeed(enemy.speed)}</span>
                          </Card.Text>
                          <Card.Text className="small mb-1 text-body fw-semibold text-break">
                            <span className="text-muted text-uppercase fw-semibold me-1" aria-hidden="true">
                              Alignment:
                            </span>
                            <span aria-hidden="true">{enemy.alignment || '—'}</span>
                          </Card.Text>
                          <Card.Text className="small mb-1 text-body fw-semibold text-break">
                            <span className="text-muted text-uppercase fw-semibold me-1" aria-hidden="true">
                              Languages:
                            </span>
                            <span aria-hidden="true">{languagesDisplay}</span>
                          </Card.Text>
                        </div>
                        <div className="mt-2">
                          <h6 className="text-uppercase text-muted small fw-semibold mb-1">Abilities</h6>
                          <div className="d-flex flex-wrap gap-2">
                            {STAT_KEYS_ORDER.map((key) => (
                              <span key={`${enemy.enemyId}-${key}`} className="badge bg-secondary">
                                {formatAbilityScore(key, enemy?.abilityScores?.[key])}
                              </span>
                            ))}
                          </div>
                        </div>
                      </Card.Body>
                      <Card.Footer className="d-flex flex-wrap gap-2 justify-content-end">
                        <Button
                          variant={inCombat ? 'success' : 'outline-light'}
                          size="sm"
                          onClick={() => handleToggleParticipant(enemy.enemyId)}
                        >
                          {inCombat ? 'Remove from Combat' : 'Add to Combat'}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveEnemy(enemy.enemyId)}
                          disabled={removingEnemyId === enemy.enemyId}
                        >
                          {removingEnemyId === enemy.enemyId ? (
                            <>
                              <Spinner
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                              />
                              Removing
                            </>
                          ) : (
                            'Remove'
                          )}
                        </Button>
                      </Card.Footer>
                    </Card>
                  );
                }}
              />
            </Card.Body>
          </Card>
        </div>
      )}
    </Tab.Pane>
    <Tab.Pane eventKey="weapons">
      {activeResourceTab === 'weapons' && (
        <div className="text-center">
          <Card className="modern-card" data-testid="resource-weapons-card">
            <Card.Header className="modal-header">
              <div className="d-flex align-items-center justify-content-center w-100">
                <div className="d-flex flex-grow-1 justify-content-center">
                  <Button
                    className="action-btn create-btn"
                    onClick={() => setIsCreatingWeapon((prev) => !prev)}
                    aria-label={
                      isCreatingWeapon ? 'View weapons list' : 'Create a new weapon'
                    }
                  >
                    {isCreatingWeapon ? (
                      <>
                        <FiList aria-hidden="true" />
                        View Weapons
                      </>
                    ) : (
                      <>
                        <FiPlus aria-hidden="true" />
                        <span>Create</span>
                        <span aria-hidden="true"> Weapon</span>
                      </>
                    )}
                  </Button>
                </div>
                <CloseButton
                  className="ms-auto"
                  variant="white"
                  onClick={() => handleCloseResourceTab('weapons')}
                  aria-label="Close weapons tab"
                />
              </div>
            </Card.Header>
            <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
              <div className="text-center">
                {isCreatingWeapon ? (
                  <Form onSubmit={onSubmit2} className="px-5">
                    <Form.Group className="mb-3 pt-3">
                      <Form.Label className="text-light">Weapon Prompt</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={weaponPrompt}
                        onChange={(e) => setWeaponPrompt(e.target.value)}
                        type="text"
                        placeholder="Describe a weapon"
                      />
                      <Button
                        className="mb-3"
                        variant="outline-primary"
                        onClick={(e) => {
                          e.preventDefault();
                          generateWeapon();
                        }}
                        disabled={loading}
                      >
                        {loading ? (
                          <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                        ) : (
                          'Generate with AI'
                        )}
                      </Button>
                      <br></br>
                      <Form.Label className="text-light">Name</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={form2.name}
                        onChange={(e) => updateForm2({ name: e.target.value })}
                        type="text"
                        placeholder="Enter weapon name"
                      />

                      <Form.Label className="text-light">Type</Form.Label>
                      <Form.Select
                        className="mb-2"
                        value={form2.type}
                        onChange={(e) => updateForm2({ type: e.target.value })}
                      >
                        <option value="">Select type</option>
                        {weaponOptions.types.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Form.Select>

                      <Form.Label className="text-light">Category</Form.Label>
                      <Form.Select
                        className="mb-2"
                        value={form2.category}
                        onChange={(e) => updateForm2({ category: e.target.value })}
                      >
                        <option value="">Select category</option>
                        {weaponOptions.categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Form.Select>

                      <Form.Label className="text-light">Damage</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={form2.damage}
                        onChange={(e) => updateForm2({ damage: e.target.value })}
                        type="text"
                        placeholder="Enter damage"
                      />

                      <Form.Label className="text-light">Properties</Form.Label>
                      <Form.Select
                        multiple
                        className="mb-2"
                        value={form2.properties}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
                          updateForm2({ properties: selected });
                        }}
                      >
                        {weaponOptions.properties.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </Form.Select>

                      <Form.Label className="text-light">Weight</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={form2.weight}
                        onChange={(e) =>
                          updateForm2({ weight: e.target.value === '' ? '' : Number(e.target.value) })
                        }
                        type="number"
                        placeholder="Enter weight"
                      />

                      <Form.Label className="text-light">Cost</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={form2.cost}
                        onChange={(e) =>
                          updateForm2({ cost: e.target.value === '' ? '' : Number(e.target.value) })
                        }
                        type="number"
                        placeholder="Enter cost"
                      />
                    </Form.Group>
                    <div className="text-center">
                      <Button variant="primary" type="submit">
                        Create
                      </Button>
                      <Button className="ms-4" variant="secondary" onClick={() => setIsCreatingWeapon(false)}>
                        Cancel
                      </Button>
                    </div>
                  </Form>
                ) : (
                  <ResourceGrid
                    dataTestId="weapons-resource-grid"
                    items={Array.isArray(weapons) ? weapons : []}
                    emptyMessage="No weapons created yet."
                    getKey={(weapon) => weapon._id}
                    renderItem={(weapon) => {
                      const Icon = resolveIcon(
                        weapon.category,
                        weaponCategoryIcons,
                        GiCrossedSwords
                      );
                      const detailRows = [
                        { label: 'Type', value: weapon.type || '—' },
                        { label: 'Category', value: weapon.category || '—' },
                        { label: 'Damage', value: weapon.damage || '—' },
                        {
                          label: 'Properties',
                          value: weapon.properties?.length
                            ? weapon.properties.join(', ')
                            : '—',
                        },
                        { label: 'Weight', value: weapon.weight ?? '—' },
                        { label: 'Cost', value: weapon.cost ?? '—' },
                      ];

                      return (
                        <Card className="weapon-card h-100 w-100 text-start">
                          <Card.Body className="d-flex flex-column">
                            <div className="d-flex justify-content-center mb-2">
                              <Icon size={40} title={weapon.category || 'Weapon'} />
                            </div>
                            <Card.Title className="mb-2">{weapon.name}</Card.Title>
                            <div className="d-grid gap-1">
                              {detailRows.map(({ label, value }) => {
                                const displayValue =
                                  value || value === 0 ? value : '—';
                                return (
                                  <Card.Text
                                    key={label}
                                    className="small mb-1 text-body fw-semibold text-break"
                                  >
                                    <span className="visually-hidden">{`${label}: ${displayValue}`}</span>
                                    <span
                                      className="text-muted text-uppercase fw-semibold me-1"
                                      aria-hidden="true"
                                    >
                                      {`${label}:`}
                                    </span>
                                    <span aria-hidden="true" className="text-break">
                                      {displayValue}
                                    </span>
                                  </Card.Text>
                                );
                              })}
                            </div>
                          </Card.Body>
                          <Card.Footer className="d-flex justify-content-end">
                            <Button
                              className="btn-danger action-btn fa-solid fa-trash"
                              onClick={() => deleteWeapon(weapon._id)}
                              aria-label={`Delete ${weapon.name || 'weapon'}`}
                              title="Delete weapon"
                            />
                          </Card.Footer>
                        </Card>
                      );
                    }}
                  />
                )}
              </div>
            </Card.Body>
          </Card>
        </div>
      )}
    </Tab.Pane>
    <Tab.Pane eventKey="armor">
      {activeResourceTab === 'armor' && (
        <div className="text-center">
          <Card className="modern-card" data-testid="resource-armor-card">
            <Card.Header className="modal-header">
              <div className="d-flex align-items-center justify-content-center w-100">
                <div className="d-flex flex-grow-1 justify-content-center">
                  <Button
                    className="action-btn create-btn"
                    onClick={() => setIsCreatingArmor((prev) => !prev)}
                    aria-label={
                      isCreatingArmor ? 'View armor list' : 'Create new armor'
                    }
                  >
                    {isCreatingArmor ? (
                      <>
                        <FiList aria-hidden="true" />
                        View Armor
                      </>
                    ) : (
                      <>
                        <FiPlus aria-hidden="true" />
                        <span>Create</span>
                        <span aria-hidden="true"> Armor</span>
                      </>
                    )}
                  </Button>
                </div>
                <CloseButton
                  className="ms-auto"
                  variant="white"
                  onClick={() => handleCloseResourceTab('armor')}
                  aria-label="Close armor tab"
                />
              </div>
            </Card.Header>
            <Card.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="text-center">
                {isCreatingArmor ? (
                  <Form onSubmit={onSubmit3} className="px-5">
                    <Form.Group className="mb-3 pt-3">
                      <Form.Label className="text-light">Armor Prompt</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={armorPrompt}
                        onChange={(e) => setArmorPrompt(e.target.value)}
                        type="text"
                        placeholder="Describe armor"
                      />
                      <Button
                        className="mb-3"
                        variant="outline-primary"
                        onClick={(e) => {
                          e.preventDefault();
                          generateArmor();
                        }}
                        disabled={armorLoading}
                      >
                        {armorLoading ? (
                          <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                        ) : (
                          'Generate Armor'
                        )}
                      </Button>
                      <br></br>
                      <Form.Label className="text-light">Name</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={form3.armorName}
                        onChange={(e) => updateForm3({ armorName: e.target.value })}
                        type="text"
                        placeholder="Enter armor name"
                      />

                      <Form.Label className="text-light">Type</Form.Label>
                      <Form.Select
                        className="mb-2"
                        value={form3.type}
                        onChange={(e) => updateForm3({ type: e.target.value })}
                      >
                        <option value="">Select type</option>
                        {armorOptions.types.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Form.Select>

                      <Form.Label className="text-light">Category</Form.Label>
                      <Form.Select
                        className="mb-2"
                        value={form3.category}
                        onChange={(e) => updateForm3({ category: e.target.value })}
                      >
                        <option value="">Select category</option>
                        {armorOptions.categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Form.Select>

                      <Form.Label className="text-light">Slot</Form.Label>
                      <Form.Select
                        className="mb-2"
                        value={form3.slot}
                        onChange={(e) => updateForm3({ slot: e.target.value })}
                      >
                        <option value="">Select slot</option>
                        {armorOptions.slots.map((slot) => (
                          <option key={slot.key} value={slot.key}>
                            {slot.label}
                          </option>
                        ))}
                      </Form.Select>

                      <Form.Label className="text-light">AC Bonus</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={form3.armorBonus}
                        onChange={(e) => updateForm3({ armorBonus: e.target.value })}
                        type="text"
                        placeholder="Enter AC Bonus"
                      />

                      <Form.Label className="text-light">Max Dex Bonus</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={form3.maxDex}
                        onChange={(e) => updateForm3({ maxDex: e.target.value })}
                        type="text"
                        placeholder="Enter Max Dex Bonus"
                      />

                      <Form.Label className="text-light">Strength Requirement</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={form3.strength}
                        onChange={(e) => updateForm3({ strength: e.target.value })}
                        type="text"
                        placeholder="Enter Strength Requirement"
                      />

                      <Form.Label className="text-light">Stealth</Form.Label>
                      <Form.Select
                        className="mb-2"
                        value={form3.stealth}
                        onChange={(e) => updateForm3({ stealth: e.target.value })}
                      >
                        <option value="">Select option</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </Form.Select>

                      <Form.Label className="text-light">Weight</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={form3.weight}
                        onChange={(e) => updateForm3({ weight: e.target.value })}
                        type="text"
                        placeholder="Enter Weight"
                      />

                      <Form.Label className="text-light">Cost</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={form3.cost}
                        onChange={(e) => updateForm3({ cost: e.target.value })}
                        type="text"
                        placeholder="Enter Cost"
                      />
                    </Form.Group>
                    <div className="text-center">
                      <Button variant="primary" type="submit">
                        Create
                      </Button>
                      <Button className="ms-4" variant="secondary" onClick={() => setIsCreatingArmor(false)}>
                        Cancel
                      </Button>
                    </div>
                  </Form>
                ) : (
                  <ResourceGrid
                    dataTestId="armor-resource-grid"
                    items={Array.isArray(armor) ? armor : []}
                    emptyMessage="No armor created yet."
                    getKey={(piece) => piece._id}
                    renderItem={(piece) => {
                      const acBonus = piece.armorBonus ?? piece.acBonus ?? piece.ac ?? '—';
                      const maxDex = piece.maxDex ?? '—';
                      const slotLabel = getArmorSlotLabel(piece);
                      const Icon = resolveIcon(
                        piece.category,
                        armorCategoryIcons,
                        GiArmorVest
                      );
                      const detailRows = [
                        { label: 'Type', value: piece.type || '—' },
                        { label: 'Category', value: piece.category || '—' },
                        { label: 'AC Bonus', value: acBonus },
                        { label: 'Max Dex', value: maxDex },
                        { label: 'Slot', value: slotLabel },
                        {
                          label: 'Strength',
                          value: piece.strength ?? piece.strRequirement ?? '—',
                        },
                        {
                          label: 'Stealth',
                          value: piece.stealth ? 'Disadvantage' : '—',
                        },
                        { label: 'Weight', value: piece.weight ?? '—' },
                        { label: 'Cost', value: piece.cost ?? '—' },
                      ];

                      return (
                        <Card className="armor-card h-100 w-100 text-start">
                          <Card.Body className="d-flex flex-column">
                            <div className="d-flex justify-content-center mb-2">
                              <Icon size={40} title={piece.category || 'Armor'} />
                            </div>
                            <Card.Title className="mb-2">
                              {piece.armorName ?? piece.name}
                            </Card.Title>
                            <div className="d-grid gap-1">
                              {detailRows.map(({ label, value }) => {
                                const displayValue =
                                  value || value === 0 ? value : '—';
                                return (
                                  <Card.Text
                                    key={label}
                                    className="small mb-1 text-body fw-semibold text-break"
                                  >
                                    <span className="visually-hidden">{`${label}: ${displayValue}`}</span>
                                    <span
                                      className="text-muted text-uppercase fw-semibold me-1"
                                      aria-hidden="true"
                                    >
                                      {`${label}:`}
                                    </span>
                                    <span aria-hidden="true" className="text-break">
                                      {displayValue}
                                    </span>
                                  </Card.Text>
                                );
                              })}
                            </div>
                          </Card.Body>
                          <Card.Footer className="d-flex justify-content-end">
                            <Button
                              className="btn-danger action-btn fa-solid fa-trash"
                              onClick={() => deleteArmor(piece._id)}
                              aria-label={`Delete ${piece.armorName ?? piece.name ?? 'armor'}`}
                              title="Delete armor"
                            />
                          </Card.Footer>
                        </Card>
                      );
                    }}
                  />
                )}
              </div>
            </Card.Body>
          </Card>
        </div>
      )}
    </Tab.Pane>
    <Tab.Pane eventKey="accessories">
      {activeResourceTab === 'accessories' && (
        <div className="text-center">
          <Card className="modern-card" data-testid="resource-accessories-card">
            <Card.Header className="modal-header">
              <div className="d-flex align-items-center justify-content-center w-100">
                <div className="d-flex flex-grow-1 justify-content-center">
                  <Button
                    className="action-btn create-btn"
                    onClick={() => setIsCreatingAccessory((prev) => !prev)}
                    aria-label={
                      isCreatingAccessory
                        ? 'View accessories list'
                        : 'Create new accessory'
                    }
                  >
                    {isCreatingAccessory ? (
                      <>
                        <FiList aria-hidden="true" />
                        View Accessories
                      </>
                    ) : (
                      <>
                        <FiPlus aria-hidden="true" />
                        <span>Create</span>
                        <span aria-hidden="true"> Accessory</span>
                      </>
                    )}
                  </Button>
                </div>
                <CloseButton
                  className="ms-auto"
                  variant="white"
                  onClick={() => handleCloseResourceTab('accessories')}
                  aria-label="Close accessories tab"
                />
              </div>
            </Card.Header>
            <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
              <div className="text-center">
                {isCreatingAccessory ? (
                  <Form onSubmit={onSubmitAccessory} className="px-5">
                    <Form.Group className="mb-3 pt-3">
                      <Form.Label className="text-light">Accessory Prompt</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={accessoryPrompt}
                        onChange={(e) => setAccessoryPrompt(e.target.value)}
                        type="text"
                        placeholder="Describe an accessory"
                      />
                      <Button
                        className="mb-3"
                        variant="outline-primary"
                        onClick={(e) => {
                          e.preventDefault();
                          generateAccessory();
                        }}
                        disabled={accessoryLoading}
                      >
                        {accessoryLoading ? (
                          <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                        ) : (
                          'Generate Accessory'
                        )}
                      </Button>
                      <br></br>
                      <Form.Label className="text-light">Name</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={accessoryForm.name}
                        onChange={(e) => updateAccessoryForm({ name: e.target.value })}
                        type="text"
                        placeholder="Enter accessory name"
                      />

                      <Form.Label className="text-light">Category</Form.Label>
                      <Form.Select
                        className="mb-2"
                        value={accessoryForm.category}
                        onChange={(e) => updateAccessoryForm({ category: e.target.value })}
                      >
                        <option value="">Select category</option>
                        {accessoryOptions.categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Form.Select>

                      <Form.Label className="text-light">Target Slots</Form.Label>
                      <Form.Select
                        multiple
                        className="mb-2"
                        value={accessoryForm.targetSlots}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
                          updateAccessoryForm({ targetSlots: selected });
                        }}
                      >
                        {accessoryOptions.slots.map((slot) => (
                          <option key={slot.key} value={slot.key}>
                            {slot.label}
                          </option>
                        ))}
                      </Form.Select>

                      <Form.Label className="text-light">Rarity</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={accessoryForm.rarity}
                        onChange={(e) => updateAccessoryForm({ rarity: e.target.value })}
                        type="text"
                        placeholder="Enter rarity"
                      />

                      <Form.Label className="text-light">Weight</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={accessoryForm.weight === null ? '' : accessoryForm.weight}
                        onChange={(e) => updateAccessoryForm({ weight: e.target.value === '' ? null : Number(e.target.value) })}
                        type="number"
                        placeholder="Enter weight"
                      />

                      <Form.Label className="text-light">Cost</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={accessoryForm.cost}
                        onChange={(e) => updateAccessoryForm({ cost: e.target.value })}
                        type="text"
                        placeholder="Enter cost"
                      />

                      <Form.Label className="text-light">Notes</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={accessoryForm.notes}
                        onChange={(e) => updateAccessoryForm({ notes: e.target.value })}
                        type="text"
                        placeholder="Enter notes"
                      />

                      <Form.Label className="text-light">Stat Bonuses</Form.Label>
                      {STATS.map(({ key, label }) => (
                        <Form.Control
                          key={key}
                          className="mb-2"
                          type="number"
                          placeholder={label}
                          value={accessoryForm.statBonuses?.[key] ?? ''}
                          onChange={(e) =>
                            updateAccessoryForm({
                              statBonuses: {
                                ...accessoryForm.statBonuses,
                                [key]: e.target.value === '' ? '' : Number(e.target.value),
                              },
                            })
                          }
                        />
                      ))}

                      <Form.Label className="text-light">Skill Bonuses</Form.Label>
                      {SKILLS.map(({ key, label }) => (
                        <Form.Control
                          key={key}
                          className="mb-2"
                          type="number"
                          placeholder={label}
                          value={accessoryForm.skillBonuses?.[key] ?? ''}
                          onChange={(e) =>
                            updateAccessoryForm({
                              skillBonuses: {
                                ...accessoryForm.skillBonuses,
                                [key]: e.target.value === '' ? '' : Number(e.target.value),
                              },
                            })
                          }
                        />
                      ))}
                    </Form.Group>
                    <div className="text-center">
                      <Button variant="primary" type="submit">
                        Create
                      </Button>
                      <Button className="ms-4" variant="secondary" onClick={() => setIsCreatingAccessory(false)}>
                        Cancel
                      </Button>
                    </div>
                  </Form>
                ) : (
                  <ResourceGrid
                    dataTestId="accessories-resource-grid"
                    items={Array.isArray(accessories) ? accessories : []}
                    emptyMessage="No accessories created yet."
                    getKey={(accessory) => accessory._id}
                    renderItem={(accessory) => {
                      const slotLabel = getAccessorySlotLabel(accessory.targetSlots || accessory.slots);
                      const statBonuses = renderBonuses(accessory.statBonuses, STAT_LABELS);
                      const skillBonuses = renderBonuses(accessory.skillBonuses, SKILL_LABELS);
                      const Icon = resolveIcon(
                        accessory.category,
                        accessoryCategoryIcons,
                        GiTreasureMap
                      );
                      const detailRows = [
                        { label: 'Category', value: accessory.category || '—' },
                        { label: 'Slots', value: slotLabel || '—' },
                        { label: 'Rarity', value: accessory.rarity || '—' },
                        { label: 'Weight', value: accessory.weight ?? '—' },
                        { label: 'Cost', value: accessory.cost ?? '—' },
                      ];
                      if (accessory.notes) {
                        detailRows.push({ label: 'Notes', value: accessory.notes });
                      }
                      if (statBonuses) {
                        detailRows.push({ label: 'Stats', value: statBonuses });
                      }
                      if (skillBonuses) {
                        detailRows.push({ label: 'Skills', value: skillBonuses });
                      }

                      return (
                        <Card className="item-card h-100 w-100 text-start">
                          <Card.Body className="d-flex flex-column">
                            <div className="d-flex justify-content-center mb-2">
                              <Icon size={40} title={accessory.category || 'Accessory'} />
                            </div>
                            <Card.Title className="mb-2">{accessory.name}</Card.Title>
                            <div className="d-grid gap-1">
                              {detailRows.map(({ label, value }) => {
                                const displayValue =
                                  value || value === 0 ? value : '—';
                                return (
                                  <Card.Text
                                    key={label}
                                    className="small mb-1 text-body fw-semibold text-break"
                                  >
                                    <span className="visually-hidden">{`${label}: ${displayValue}`}</span>
                                    <span
                                      className="text-muted text-uppercase fw-semibold me-1"
                                      aria-hidden="true"
                                    >
                                      {`${label}:`}
                                    </span>
                                    <span aria-hidden="true" className="text-break">
                                      {displayValue}
                                    </span>
                                  </Card.Text>
                                );
                              })}
                            </div>
                          </Card.Body>
                          <Card.Footer className="d-flex justify-content-end">
                            <Button
                              className="btn-danger action-btn fa-solid fa-trash"
                              onClick={() => deleteAccessory(accessory._id)}
                              aria-label={`Delete ${accessory.name || 'accessory'}`}
                              title="Delete accessory"
                            />
                          </Card.Footer>
                        </Card>
                      );
                    }}
                  />
                )}
              </div>
            </Card.Body>
          </Card>
        </div>
      )}
    </Tab.Pane>
    <Tab.Pane eventKey="items">
      {activeResourceTab === 'items' && (
        <div className="text-center">
          <Card className="modern-card" data-testid="resource-items-card">
            <Card.Header className="modal-header">
              <div className="d-flex align-items-center justify-content-center w-100">
                <div className="d-flex flex-grow-1 justify-content-center">
                  <Button
                    className="action-btn create-btn"
                    onClick={() => setIsCreatingItem((prev) => !prev)}
                    aria-label={
                      isCreatingItem ? 'View items list' : 'Create new item'
                    }
                  >
                    {isCreatingItem ? (
                      <>
                        <FiList aria-hidden="true" />
                        View Items
                      </>
                    ) : (
                      <>
                        <FiPlus aria-hidden="true" />
                        <span>Create</span>
                        <span aria-hidden="true"> Item</span>
                      </>
                    )}
                  </Button>
                </div>
                <CloseButton
                  className="ms-auto"
                  variant="white"
                  onClick={() => handleCloseResourceTab('items')}
                  aria-label="Close items tab"
                />
              </div>
            </Card.Header>
            <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
              <div className="text-center">
                {isCreatingItem ? (
                  <Form onSubmit={onSubmit4} className="px-5">
                    <Form.Group className="mb-3 pt-3">
                      <Form.Label className="text-light">Item Prompt</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={itemPrompt}
                        onChange={(e) => setItemPrompt(e.target.value)}
                        type="text"
                        placeholder="Describe an item"
                      />
                      <Button
                        className="mb-3"
                        variant="outline-primary"
                        onClick={(e) => {
                          e.preventDefault();
                          generateItem();
                        }}
                        disabled={itemLoading}
                      >
                        {itemLoading ? (
                          <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                        ) : (
                          'Generate Item'
                        )}
                      </Button>
                      <br></br>
                      <Form.Label className="text-light">Name</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={form4.name}
                        onChange={(e) => updateForm4({ name: e.target.value })}
                        type="text"
                        placeholder="Enter item name"
                      />

                      <Form.Label className="text-light">Category</Form.Label>
                      <Form.Select
                        className="mb-2"
                        value={form4.category}
                        onChange={(e) => updateForm4({ category: e.target.value })}
                      >
                        <option value="">Select category</option>
                        {itemOptions.categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Form.Select>

                      <Form.Label className="text-light">Weight</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={form4.weight}
                        onChange={(e) => updateForm4({ weight: e.target.value })}
                        type="text"
                        placeholder="Enter weight"
                      />

                      <Form.Label className="text-light">Cost</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={form4.cost}
                        onChange={(e) => updateForm4({ cost: e.target.value })}
                        type="text"
                        placeholder="Enter cost"
                      />

                      <Form.Label className="text-light">Notes</Form.Label>
                      <Form.Control
                        className="mb-2"
                        value={form4.notes}
                        onChange={(e) => updateForm4({ notes: e.target.value })}
                        type="text"
                        placeholder="Enter notes"
                      />

                      <Form.Label className="text-light">Stat Bonuses</Form.Label>
                      {STATS.map(({ key, label }) => (
                        <Form.Control
                          key={key}
                          className="mb-2"
                          type="number"
                          placeholder={label}
                          value={form4.statBonuses[key] ?? ''}
                          onChange={(e) =>
                            updateForm4({
                              statBonuses: {
                                ...form4.statBonuses,
                                [key]: e.target.value === '' ? '' : Number(e.target.value),
                              },
                            })
                          }
                        />
                      ))}

                      <Form.Label className="text-light">Skill Bonuses</Form.Label>
                      {SKILLS.map(({ key, label }) => (
                        <Form.Control
                          key={key}
                          className="mb-2"
                          type="number"
                          placeholder={label}
                          value={form4.skillBonuses[key] ?? ''}
                          onChange={(e) =>
                            updateForm4({
                              skillBonuses: {
                                ...form4.skillBonuses,
                                [key]: e.target.value === '' ? '' : Number(e.target.value),
                              },
                            })
                          }
                        />
                      ))}
                    </Form.Group>
                    <div className="text-center">
                      <Button variant="primary" type="submit">
                        Create
                      </Button>
                      <Button className="ms-4" variant="secondary" onClick={() => setIsCreatingItem(false)}>
                        Cancel
                      </Button>
                    </div>
                  </Form>
                ) : (
                  <ResourceGrid
                    dataTestId="items-resource-grid"
                    items={Array.isArray(items) ? items : []}
                    emptyMessage="No items created yet."
                    getKey={(item) => item._id}
                    renderItem={(item) => {
                      const statBonuses = renderBonuses(item.statBonuses, STAT_LABELS);
                      const skillBonuses = renderBonuses(item.skillBonuses, SKILL_LABELS);
                      const Icon = resolveIcon(item.category, itemCategoryIcons, GiTreasureMap);
                      const detailRows = [
                        { label: 'Category', value: item.category || '—' },
                        { label: 'Weight', value: item.weight ?? '—' },
                        { label: 'Cost', value: item.cost ?? '—' },
                      ];
                      if (statBonuses) {
                        detailRows.push({ label: 'Stats', value: statBonuses });
                      }
                      if (skillBonuses) {
                        detailRows.push({ label: 'Skills', value: skillBonuses });
                      }

                      return (
                        <Card className="item-card h-100 w-100 text-start">
                          <Card.Body className="d-flex flex-column">
                            <div className="d-flex justify-content-center mb-2">
                              <Icon size={40} title={item.category || 'Item'} />
                            </div>
                            <Card.Title className="mb-2">{item.name}</Card.Title>
                            <div className="d-grid gap-1">
                              {detailRows.map(({ label, value }) => {
                                const displayValue =
                                  value || value === 0 ? value : '—';
                                return (
                                  <Card.Text
                                    key={label}
                                    className="small mb-1 text-body fw-semibold text-break"
                                  >
                                    <span className="visually-hidden">{`${label}: ${displayValue}`}</span>
                                    <span
                                      className="text-muted text-uppercase fw-semibold me-1"
                                      aria-hidden="true"
                                    >
                                      {`${label}:`}
                                    </span>
                                    <span aria-hidden="true" className="text-break">
                                      {displayValue}
                                    </span>
                                  </Card.Text>
                                );
                              })}
                            </div>
                            {item.notes ? (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 align-self-start mt-2"
                                onClick={() => openItemNote(item.notes)}
                              >
                                View Notes
                              </Button>
                            ) : null}
                          </Card.Body>
                          <Card.Footer className="d-flex justify-content-end">
                            <Button
                              className="btn-danger action-btn fa-solid fa-trash"
                              onClick={() => deleteItem(item._id)}
                              aria-label={`Delete ${item.name || 'item'}`}
                              title="Delete item"
                            />
                          </Card.Footer>
                        </Card>
                      );
                    }}
                  />
                )}
              </div>
            </Card.Body>
          </Card>
        </div>
      )}
    </Tab.Pane>
  </Tab.Content>
        </Tab.Container>
      </Container>

      <Modal
      className="dnd-modal"
      size="sm"
      centered
      show={currencyModalState.show}
      onHide={closeCurrencyModal}
    >
      <Form onSubmit={handleCurrencySubmit}>
        <Modal.Header closeButton>
          <Modal.Title>
            Adjust Currency{currencyModalState.character ? ` - ${currencyModalState.character.characterName}` : ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3" controlId="currencyCopper">
            <Form.Label>Copper</Form.Label>
            <Form.Control
              type="number"
              step="1"
              value={currencyInputs.cp}
              onChange={(event) => updateCurrencyInput('cp', event.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="currencySilver">
            <Form.Label>Silver</Form.Label>
            <Form.Control
              type="number"
              step="1"
              value={currencyInputs.sp}
              onChange={(event) => updateCurrencyInput('sp', event.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="currencyGold">
            <Form.Label>Gold</Form.Label>
            <Form.Control
              type="number"
              step="1"
              value={currencyInputs.gp}
              onChange={(event) => updateCurrencyInput('gp', event.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-0" controlId="currencyPlatinum">
            <Form.Label>Platinum</Form.Label>
            <Form.Control
              type="number"
              step="1"
              value={currencyInputs.pp}
              onChange={(event) => updateCurrencyInput('pp', event.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeCurrencyModal} disabled={currencySubmitting}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={currencySubmitting}>
            Update Currency
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  <Modal className="dnd-modal" centered show={showItemNotes} onHide={closeItemNote}>
    <Card className="dnd-background">
      <Card.Header>
        <Card.Title>Notes</Card.Title>
      </Card.Header>
      <Card.Body>{currentItemNote}</Card.Body>
    </Card>
  </Modal>
      </div>
    )
}
