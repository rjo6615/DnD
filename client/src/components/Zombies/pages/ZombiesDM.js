import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import apiFetch from '../../../utils/apiFetch';
import { DEFAULT_MAP_TITLE, getMapDisplayTitle } from '../../../utils/mapTitle';
import { io } from "socket.io-client";
import { mergeTokenPayload } from "./utils/mergeTokenPayload";
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
  ListGroup,
  Badge,
} from "react-bootstrap";
import Modal from 'react-bootstrap/Modal';
import { useNavigate, useParams } from "react-router-dom";
import loginbg from "../../../images/loginbg.png";
import useUser from '../../../hooks/useUser';
import { STATS } from '../statSchema';
import { SKILLS } from '../skillSchema';
import { calculateCharacterInitiative } from '../utils/derivedStats';
import { calculateCharacterHitPoints } from '../utils/characterMetrics';
import CampaignMapBoard from '../attributes/CampaignMapBoard';
import MapModal from '../attributes/MapModal';
import { calculateDamage } from '../attributes/PlayerTurnActions';
import D20RollerModal, { DEFAULT_DICE_COLOR } from '../common/D20RollerModal';
import { ENEMY_FIGURINE_COLOR } from '../constants/tokenAppearance';
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
import { FiChevronDown, FiChevronRight, FiList, FiPlus } from "react-icons/fi";
import { groupMapsByFolder, UNGROUPED_FOLDER_KEY } from "../utils/mapGrouping";

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

const toFiniteNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const CREATURE_SIZE_KEYS = ['gargantuan', 'huge', 'large', 'medium', 'small', 'tiny'];
const NEW_FOLDER_OPTION_VALUE = '__create_new_folder__';

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

const normalizeMapId = (value) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

const sanitizeTestIdValue = (value, fallback = 'item') => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  return trimmed.replace(/[^0-9A-Za-z_-]/g, '-').toLowerCase();
};

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

const applyDerivedInitiativesToParticipants = (participants, initiativeMap) => {
  if (!Array.isArray(participants) || !initiativeMap || initiativeMap.size === 0) {
    return participants;
  }

  let changed = false;

  const updated = participants.map((participant) => {
    if (!participant || typeof participant !== 'object') {
      return participant;
    }

    const { characterId } = participant;
    if (typeof characterId !== 'string' || characterId.trim() === '') {
      return participant;
    }

    const numericInitiative = Number(participant.initiative);
    if (Number.isFinite(numericInitiative)) {
      return participant;
    }

    const derivedValue = initiativeMap.get(characterId);
    const numericDerived = Number(derivedValue);
    if (!Number.isFinite(numericDerived)) {
      return participant;
    }

    changed = true;
    return { ...participant, initiative: numericDerived };
  });

  return changed ? updated : participants;
};

const applyDerivedInitiativesToState = (state, initiativeMap) => {
  if (!state || typeof state !== 'object') {
    return state;
  }

  const participants = Array.isArray(state.participants)
    ? state.participants
    : [];
  const updatedParticipants = applyDerivedInitiativesToParticipants(
    participants,
    initiativeMap
  );

  if (updatedParticipants === participants) {
    return state;
  }

  return {
    ...state,
    participants: updatedParticipants,
  };
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

const getNormalizedIdentifiers = (entity) => {
  if (!entity || typeof entity !== 'object') {
    return [];
  }

  const identifiers = [];
  if (typeof entity._id === 'string' && entity._id.trim() !== '') {
    identifiers.push(entity._id.trim());
  }
  if (typeof entity.characterId === 'string' && entity.characterId.trim() !== '') {
    identifiers.push(entity.characterId.trim());
  }
  return Array.from(new Set(identifiers));
};

const sanitizeIdentifierForTestId = (value, fallback) => {
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim().replace(/[^0-9A-Za-z_-]/g, '-');
  }
  return fallback;
};

export const matchesCharacterIdentifier = (record, normalizedCharacterId) => {
  if (!record || typeof record !== 'object' || !normalizedCharacterId) {
    return false;
  }

  const identifiers = getNormalizedIdentifiers(record);
  if (identifiers.includes(normalizedCharacterId)) {
    return true;
  }

  if (
    typeof record.token === 'string' &&
    record.token.trim() !== '' &&
    record.token.trim() === normalizedCharacterId
  ) {
    return true;
  }

  return false;
};

const normalizeHealthValue = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
};

export const applyCharacterHealthUpdateToRecords = ({ records, update }) => {
  if (!Array.isArray(records) || records.length === 0) {
    return records;
  }

  if (!update || typeof update !== 'object') {
    return records;
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
      ...getNormalizedIdentifiers(update),
      ...(normalizedCharacterId ? [normalizedCharacterId] : []),
      ...(normalizedRecordId ? [normalizedRecordId] : []),
    ])
  );

  if (updateIdentifiers.length === 0) {
    return records;
  }

  const nextTempHealthValue = normalizeHealthValue(update.tempHealth);
  const nextHealthValue = normalizeHealthValue(update.health);

  let didUpdate = false;

  const nextRecords = records.map((record) => {
    if (
      !updateIdentifiers.some((identifier) =>
        matchesCharacterIdentifier(record, identifier)
      )
    ) {
      return record;
    }

    let recordUpdated = false;
    const updatedRecord = { ...record };

    if (
      normalizedRecordId &&
      (typeof updatedRecord._id !== 'string' ||
        updatedRecord._id.trim() !== normalizedRecordId)
    ) {
      updatedRecord._id = normalizedRecordId;
      recordUpdated = true;
    }

    if (
      normalizedCharacterId &&
      (typeof updatedRecord.characterId !== 'string' ||
        updatedRecord.characterId.trim() !== normalizedCharacterId)
    ) {
      updatedRecord.characterId = normalizedCharacterId;
      recordUpdated = true;
    }

    if (
      nextTempHealthValue !== undefined &&
      record?.tempHealth !== nextTempHealthValue
    ) {
      updatedRecord.tempHealth = nextTempHealthValue;
      recordUpdated = true;
    }

    if (nextHealthValue !== undefined && record?.health !== nextHealthValue) {
      updatedRecord.health = nextHealthValue;
      recordUpdated = true;
    }

    if (recordUpdated) {
      didUpdate = true;
      return updatedRecord;
    }

    return record;
  });

  return didUpdate ? nextRecords : records;
};

export const getCharacterCardMeta = (character, itemIndex = 0) => {
  const identifiers = getNormalizedIdentifiers(character);
  const primaryIdentifier = identifiers[0] || `character-${itemIndex}`;
  const sanitizedIdentifier = sanitizeIdentifierForTestId(
    primaryIdentifier,
    `character-${itemIndex}`
  );
  const testId = `character-card-${sanitizedIdentifier}`;

  const { currentHp: derivedCurrentHp, maxHp: derivedMaxHp } =
    calculateCharacterHitPoints(character);
  const fallbackCurrentHp = toFiniteNumberOrNull(
    character?.currentHp ??
      character?.hpCurrent ??
      character?.tempHealth ??
      character?.health
  );
  const fallbackMaxHp = toFiniteNumberOrNull(
    character?.maxHp ?? character?.hpMax ?? character?.health
  );
  const normalizedCurrentHp = Number.isFinite(derivedCurrentHp)
    ? derivedCurrentHp
    : fallbackCurrentHp;
  const normalizedMaxHp = Number.isFinite(derivedMaxHp)
    ? derivedMaxHp
    : fallbackMaxHp;
  const normalizedTempHp = toFiniteNumberOrNull(character?.tempHealth);

  return {
    testId,
    dataAttributes: {
      ...(typeof primaryIdentifier === 'string'
        ? { 'data-character-id': primaryIdentifier }
        : {}),
      ...(normalizedCurrentHp !== null
        ? { 'data-current-hp': normalizedCurrentHp }
        : {}),
      ...(normalizedMaxHp !== null ? { 'data-max-hp': normalizedMaxHp } : {}),
      ...(normalizedTempHp !== null ? { 'data-temp-hp': normalizedTempHp } : {}),
    },
  };
};

export const getCombatRowMeta = ({
  character,
  rowId,
  participantInfo,
  recordIndex = 0,
}) => {
  const sanitizedRowId = sanitizeIdentifierForTestId(
    rowId,
    `participant-${recordIndex}`
  );
  const testId = `combat-row-${sanitizedRowId}`;

  const rowCurrentHp = toFiniteNumberOrNull(
    character?.currentHp ??
      character?.hpCurrent ??
      character?.tempHealth ??
      character?.health ??
      participantInfo?.currentHp ??
      participantInfo?.hpCurrent ??
      participantInfo?.health
  );
  const rowMaxHp = toFiniteNumberOrNull(
    character?.maxHp ??
      character?.hpMax ??
      character?.health ??
      participantInfo?.maxHp ??
      participantInfo?.hpMax ??
      participantInfo?.health
  );
  const rowTempHp = toFiniteNumberOrNull(
    character?.tempHealth ?? participantInfo?.tempHealth
  );

  return {
    testId,
    dataAttributes: {
      ...(rowCurrentHp !== null ? { 'data-current-hp': rowCurrentHp } : {}),
      ...(rowMaxHp !== null ? { 'data-max-hp': rowMaxHp } : {}),
      ...(rowTempHp !== null ? { 'data-temp-hp': rowTempHp } : {}),
    },
  };
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

  const hasRowColsOverride =
    typeof rowClassName === 'string' && /\brow-cols[\w-]*/.test(rowClassName);

  const rowClasses = [
    'resource-grid',
    !hasRowColsOverride && 'row-cols-1',
    !hasRowColsOverride && 'row-cols-sm-2',
    !hasRowColsOverride && 'row-cols-xl-3',
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
    const [enemyHealthAdjustments, setEnemyHealthAdjustments] = useState({});
    const [enemyHealthSaving, setEnemyHealthSaving] = useState({});
    const [latestEnemyRoll, setLatestEnemyRoll] = useState(null);
    const [status, setStatus] = useState(null);
    const [combatState, setCombatState] = useState(createEmptyCombatState());
    const [campaignMap, setCampaignMap] = useState(null);
    const [maps, setMaps] = useState([]);
    const [activeMapId, setActiveMapId] = useState(null);
    const [selectedMapId, setSelectedMapId] = useState(null);
    const [mapEditorState, setMapEditorState] = useState({
      show: false,
      mode: 'create',
      map: null,
      title: '',
      folder: '',
      folderSelection: '',
      imageUrl: '',
      imageBase64: '',
      imageType: '',
      altText: '',
      activateOnSave: true,
      fileInputKey: 0,
    });
    const [mapEditorErrors, setMapEditorErrors] = useState({});
    const [mapEditorSaving, setMapEditorSaving] = useState(false);
    const [lastMapFolder, setLastMapFolder] = useState('');
    const [mapActionLoadingId, setMapActionLoadingId] = useState(null);
    const [mapPrompt, setMapPrompt] = useState('');
    const [generatedMap, setGeneratedMap] = useState(null);
    const [mapLoading, setMapLoading] = useState(false);
    const [mapGenerating, setMapGenerating] = useState(false);
    const [mapSaving, setMapSaving] = useState(false);
    const [mapSaveMode, setMapSaveMode] = useState(null);
    const [showMapManager, setShowMapManager] = useState(false);
    const [mapTokens, setMapTokens] = useState({});
    const [activeMapTokens, setActiveMapTokens] = useState({});
    const [mapFolderExpansion, setMapFolderExpansion] = useState({});
    const [mapPlacementState, setMapPlacementState] = useState({
      show: false,
      enemyId: null,
      enemyName: null,
    });
    const [showDiceRoller, setShowDiceRoller] = useState(false);
    const socketRef = useRef(null);
    const mapTokensRef = useRef(mapTokens);
    const activeMapTokensRef = useRef(activeMapTokens);
    const campaignMapRef = useRef(campaignMap);
    const activeMapIdRef = useRef(activeMapId);

    const campaignId = params.campaign ?? '';
    const encodedCampaign = useMemo(
      () => (campaignId ? encodeURIComponent(campaignId) : ''),
      [campaignId]
    );

    const normalizedMaps = useMemo(
      () => (Array.isArray(maps) ? maps.filter((map) => map && typeof map === 'object') : []),
      [maps]
    );

    const groupedMaps = useMemo(
      () => groupMapsByFolder(normalizedMaps),
      [normalizedMaps]
    );

    const normalizedActiveMapId = useMemo(
      () => normalizeMapId(activeMapId),
      [activeMapId]
    );

    const normalizedSelectedMapId = useMemo(
      () => normalizeMapId(selectedMapId),
      [selectedMapId]
    );

    useEffect(() => {
      setMapFolderExpansion((previous) => {
        const next = {};

        groupedMaps.forEach((group) => {
          const hasImportantMap = group.maps.some((mapItem) => {
            const mapIdValue = normalizeMapId(mapItem?.mapId);
            return (
              (normalizedActiveMapId && mapIdValue === normalizedActiveMapId) ||
              (normalizedSelectedMapId && mapIdValue === normalizedSelectedMapId)
            );
          });

          const hadValue = Object.prototype.hasOwnProperty.call(previous, group.key);
          const defaultExpanded = group.key === UNGROUPED_FOLDER_KEY;
          next[group.key] = hasImportantMap
            ? true
            : hadValue
            ? previous[group.key]
            : defaultExpanded;
        });

        return next;
      });
    }, [groupedMaps, normalizedActiveMapId, normalizedSelectedMapId]);

    const handleToggleMapFolder = useCallback((folderKey) => {
      if (typeof folderKey !== 'string') {
        return;
      }

      setMapFolderExpansion((previous) => ({
        ...previous,
        [folderKey]: !previous[folderKey],
      }));
    }, []);

    const availableMapFolders = useMemo(() => {
      const folderSet = new Set();
      normalizedMaps.forEach((map) => {
        const folderValue = typeof map.folder === 'string' ? map.folder.trim() : '';
        if (folderValue) {
          folderSet.add(folderValue);
        }
      });

      return Array.from(folderSet).sort((a, b) => a.localeCompare(b));
    }, [normalizedMaps]);

    useEffect(() => {
      mapTokensRef.current = mapTokens;
    }, [mapTokens]);

    useEffect(() => {
      activeMapTokensRef.current = activeMapTokens;
    }, [activeMapTokens]);

    useEffect(() => {
      campaignMapRef.current = campaignMap;
    }, [campaignMap]);

    useEffect(() => {
      activeMapIdRef.current = activeMapId;
    }, [activeMapId]);

    useEffect(() => {
      if (!mapEditorErrors.title) {
        return;
      }

      const hasTitle =
        typeof mapEditorState.title === 'string' && mapEditorState.title.trim() !== '';

      if (hasTitle) {
        setMapEditorErrors((prev) => {
          if (!prev.title) {
            return prev;
          }

          const { title, ...rest } = prev;
          return Object.keys(rest).length ? rest : {};
        });
      }
    }, [mapEditorErrors.title, mapEditorState.title]);

    useEffect(() => {
      if (!mapEditorErrors.imageSource) {
        return;
      }

      const hasImageUrl =
        typeof mapEditorState.imageUrl === 'string' && mapEditorState.imageUrl.trim() !== '';
      const hasImageFile =
        typeof mapEditorState.imageBase64 === 'string' &&
        mapEditorState.imageBase64.trim() !== '';

      if (hasImageUrl || hasImageFile) {
        setMapEditorErrors((prev) => {
          if (!prev.imageSource) {
            return prev;
          }

          const { imageSource, ...rest } = prev;
          return Object.keys(rest).length ? rest : {};
        });
      }
    }, [mapEditorErrors.imageSource, mapEditorState.imageUrl, mapEditorState.imageBase64]);

    useEffect(() => {
      if (!mapEditorErrors.altText || mapEditorState.mode !== 'create') {
        return;
      }

      const hasAltText =
        typeof mapEditorState.altText === 'string' &&
        mapEditorState.altText.trim() !== '';

      if (hasAltText) {
        setMapEditorErrors((prev) => {
          if (!prev.altText) {
            return prev;
          }

          const { altText, ...rest } = prev;
          return Object.keys(rest).length ? rest : {};
        });
      }
    }, [mapEditorErrors.altText, mapEditorState.altText, mapEditorState.mode]);

    const imageSourceDescribedBy = useMemo(() => {
      const ids = ['map-editor-image-requirement'];
      if (mapEditorErrors.imageSource) {
        ids.push('map-editor-image-error');
      }
      return ids.join(' ');
    }, [mapEditorErrors.imageSource]);

    const applyMapPayload = useCallback(
      (payload, options = {}) => {
        const normalizedMaps = Array.isArray(payload?.maps)
          ? payload.maps.filter((map) => map && typeof map === 'object')
          : [];
        setMaps(normalizedMaps);

        const normalizedActiveId =
          typeof payload?.activeMapId === 'string' && payload.activeMapId.trim() !== ''
            ? payload.activeMapId.trim()
            : null;
        setActiveMapId(normalizedActiveId);

        const payloadMap =
          payload && typeof payload.map === 'object' && !Array.isArray(payload.map)
            ? payload.map
            : null;

        const resolvedActiveMap =
          payloadMap ||
          (normalizedActiveId
            ? normalizedMaps.find((map) => map?.mapId === normalizedActiveId)
            : null) ||
          null;

        const hasTokensByMapIdProp =
          payload && Object.prototype.hasOwnProperty.call(payload, 'tokensByMapId');
        const hasActiveTokensProp =
          payload && Object.prototype.hasOwnProperty.call(payload, 'activeMapTokens');

        const activeTokensFromPayload = hasActiveTokensProp
          ? sanitizeTokenDictionary(payload.activeMapTokens)
          : null;
        const mapTokensFromPayload = hasTokensByMapIdProp
          ? sanitizeTokensByMapId(payload.tokensByMapId)
          : null;

        const resolvedActiveTokens =
          activeTokensFromPayload ||
          (resolvedActiveMap && resolvedActiveMap.tokens
            ? sanitizeTokenDictionary(resolvedActiveMap.tokens)
            : {});

        if (hasTokensByMapIdProp) {
          setMapTokens(mapTokensFromPayload || {});
        } else if (resolvedActiveMap && resolvedActiveMap.mapId) {
          setMapTokens((prev) => ({
            ...(prev || {}),
            [resolvedActiveMap.mapId]: resolvedActiveTokens,
          }));
        } else {
          setMapTokens({});
        }

        setActiveMapTokens(resolvedActiveTokens);

        const nextCampaignMap = resolvedActiveMap
          ? { ...resolvedActiveMap, tokens: resolvedActiveTokens }
          : null;
        setCampaignMap(nextCampaignMap);

        setSelectedMapId((prevSelected) => {
          const preferredId =
            options.preferredSelectedId &&
            normalizedMaps.some((map) => map?.mapId === options.preferredSelectedId)
              ? options.preferredSelectedId
              : null;

          if (preferredId) {
            return preferredId;
          }

          if (prevSelected && normalizedMaps.some((map) => map?.mapId === prevSelected)) {
            return prevSelected;
          }

          if (
            normalizedActiveId &&
            normalizedMaps.some((map) => map?.mapId === normalizedActiveId)
          ) {
            return normalizedActiveId;
          }

          if (
            payloadMap &&
            payloadMap.mapId &&
            normalizedMaps.some((map) => map?.mapId === payloadMap.mapId)
          ) {
            return payloadMap.mapId;
          }

          const firstMap = normalizedMaps.find((map) => map && map.mapId);
          return firstMap ? firstMap.mapId : null;
        });
      },
      [setMaps, setActiveMapId, setCampaignMap, setSelectedMapId]
    );

    const parseErrorMessage = useCallback(async (response, fallbackMessage) => {
      let message = (response && response.statusText) || fallbackMessage;
      if (response && typeof response.json === 'function') {
        try {
          const errorBody = await response.json();
          if (errorBody && typeof errorBody === 'object' && errorBody.message) {
            message = errorBody.message;
          }
        } catch (error) {
          // ignore JSON parsing errors when reading error responses
        }
      }
      return message;
    }, []);

    const fetchRecords = useCallback(async () => {
      if (!campaignId || !encodedCampaign) {
        setRecords([]);
        setEnemies([]);
        setCombatState(createEmptyCombatState());
        setCampaignMap(null);
        setMaps([]);
        setActiveMapId(null);
        setSelectedMapId(null);
        setGeneratedMap(null);
        setMapTokens({});
        setActiveMapTokens({});
        setMapLoading(false);
        return;
      }

      setMapLoading(true);

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

        let mapsPayload = null;
        let fallbackMap = null;

        try {
          const mapsResponse = await apiFetch(`/campaigns/${encodedCampaign}/maps`);
          if (mapsResponse.ok) {
            mapsPayload = await mapsResponse.json();
          } else if (mapsResponse.status === 404) {
            try {
              const legacyResponse = await apiFetch(`/campaigns/${encodedCampaign}/map`);
              if (legacyResponse.ok) {
                fallbackMap = await legacyResponse.json();
              } else if (legacyResponse.status !== 404) {
                const message = `An error occurred: ${legacyResponse.statusText}`;
                setStatus({ type: 'danger', message });
              }
            } catch (legacyError) {
              console.error(legacyError);
              setStatus({
                type: 'danger',
                message: legacyError.message || 'Failed to load legacy map.',
              });
            }
          } else {
            const message = `An error occurred: ${mapsResponse.statusText}`;
            setStatus({ type: 'danger', message });
          }
        } catch (mapError) {
          console.error(mapError);
          setStatus({
            type: 'danger',
            message: mapError.message || 'Failed to load maps.',
          });
        }

        if (mapsPayload) {
          applyMapPayload(mapsPayload);
          setGeneratedMap(null);
        } else if (fallbackMap) {
          const normalizedFallback =
            fallbackMap && typeof fallbackMap === 'object' ? fallbackMap : null;
          if (normalizedFallback && Object.keys(normalizedFallback).length > 0) {
            const fallbackActiveId =
              typeof normalizedFallback.mapId === 'string' &&
              normalizedFallback.mapId.trim() !== ''
                ? normalizedFallback.mapId.trim()
                : null;
            applyMapPayload({
              maps: fallbackActiveId ? [normalizedFallback] : [],
              activeMapId: fallbackActiveId,
              map: normalizedFallback,
            });
          } else {
            applyMapPayload({ maps: [], activeMapId: null, map: null });
          }
          setGeneratedMap(null);
        } else {
          applyMapPayload({ maps: [], activeMapId: null, map: null });
          setGeneratedMap(null);
        }
      } catch (error) {
        console.error(error);
        setStatus({ type: 'danger', message: error.message || 'Failed to fetch records.' });
        setEnemies([]);
        setCombatState(createEmptyCombatState());
        setCampaignMap(null);
        setMaps([]);
        setActiveMapId(null);
        setSelectedMapId(null);
        setGeneratedMap(null);
        setMapTokens({});
        setActiveMapTokens({});
      } finally {
        setMapLoading(false);
      }
    }, [campaignId, encodedCampaign, applyMapPayload]);

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

    const removeCharacterTokensFromMaps = useCallback(
      async (character) => {
        const normalizedCharacterId =
          typeof character === 'string'
            ? character.trim()
            : typeof character?.characterId === 'string' && character.characterId.trim() !== ''
            ? character.characterId.trim()
            : null;

        const normalizedMapHint =
          typeof character === 'object' &&
          typeof character?.mapId === 'string' &&
          character.mapId.trim() !== ''
            ? character.mapId.trim()
            : null;

        if (!normalizedCharacterId || !encodedCampaign) {
          return true;
        }

        const mapsWithToken = new Set();
        const currentTokensByMap = mapTokensRef.current || {};
        Object.entries(currentTokensByMap).forEach(([mapId, tokens]) => {
          if (
            typeof mapId === 'string' &&
            mapId.trim() !== '' &&
            tokens &&
            typeof tokens === 'object' &&
            Object.prototype.hasOwnProperty.call(tokens, normalizedCharacterId)
          ) {
            mapsWithToken.add(mapId);
          }
        });

        if (
          campaignMap &&
          typeof campaignMap === 'object' &&
          typeof campaignMap.mapId === 'string' &&
          campaignMap.mapId.trim() !== '' &&
          campaignMap.tokens &&
          Object.prototype.hasOwnProperty.call(
            campaignMap.tokens,
            normalizedCharacterId
          )
        ) {
          mapsWithToken.add(campaignMap.mapId);
        }

        if (
          typeof activeMapId === 'string' &&
          activeMapId.trim() !== '' &&
          activeMapTokensRef.current &&
          Object.prototype.hasOwnProperty.call(
            activeMapTokensRef.current,
            normalizedCharacterId
          )
        ) {
          mapsWithToken.add(activeMapId);
        }

        if (normalizedMapHint) {
          mapsWithToken.add(normalizedMapHint);
        }

        const shouldClosePlacement =
          mapPlacementState?.enemyId === normalizedCharacterId;

        if (mapsWithToken.size === 0 && !shouldClosePlacement) {
          return true;
        }

        const previousMapTokens = mapTokensRef.current || {};
        const previousActiveTokens = activeMapTokensRef.current || {};
        const previousCampaignMap = campaignMap;
        const previousMapPlacementState = mapPlacementState;

        if (mapsWithToken.size > 0) {
          setMapTokens((prev) => {
            const next = { ...(prev || {}) };
            mapsWithToken.forEach((mapId) => {
              if (typeof mapId !== 'string' || mapId.trim() === '') {
                return;
              }
              if (!next[mapId]) {
                return;
              }
              const updated = { ...next[mapId] };
              delete updated[normalizedCharacterId];
              if (Object.keys(updated).length === 0) {
                delete next[mapId];
              } else {
                next[mapId] = updated;
              }
            });
            return next;
          });

          setActiveMapTokens((prev) => {
            if (!prev || !prev[normalizedCharacterId]) {
              return prev;
            }
            const next = { ...prev };
            delete next[normalizedCharacterId];
            return next;
          });

          setCampaignMap((prev) => {
            if (!prev || !mapsWithToken.has(prev.mapId)) {
              return prev;
            }
            const nextTokens = { ...(prev.tokens || {}) };
            delete nextTokens[normalizedCharacterId];
            return { ...prev, tokens: nextTokens };
          });
        }

        if (shouldClosePlacement) {
          setMapPlacementState({ show: false, enemyId: null, enemyName: null });
        }

        const mapIds = Array.from(mapsWithToken).filter(
          (mapId) => typeof mapId === 'string' && mapId.trim() !== ''
        );

        if (mapIds.length === 0) {
          return true;
        }

        try {
          const encodedCharacterId = encodeURIComponent(normalizedCharacterId);
          for (const mapId of mapIds) {
            const encodedMapId = encodeURIComponent(mapId);
            const response = await apiFetch(
              `/campaigns/${encodedCampaign}/maps/${encodedMapId}/tokens/${encodedCharacterId}`,
              {
                method: 'DELETE',
              }
            );

            if (response && response.status === 404) {
              continue;
            }

            if (!response || !response.ok) {
              const message = await parseErrorMessage(
                response,
                'Failed to remove token from map.'
              );
              throw new Error(message);
            }
          }
        } catch (error) {
          console.error(error);
          setStatus({
            type: 'danger',
            message: error?.message || 'Failed to remove token from map.',
          });
          setMapTokens(previousMapTokens || {});
          setActiveMapTokens(previousActiveTokens || {});
          setCampaignMap(previousCampaignMap || null);
          setMapPlacementState(
            previousMapPlacementState || { show: false, enemyId: null, enemyName: null }
          );
          return false;
        }

        return true;
      },
      [
        activeMapId,
        campaignMap,
        encodedCampaign,
        mapPlacementState,
        parseErrorMessage,
        setStatus,
      ]
    );

    const handleMapTokenRemove = useCallback(
      async ({ characterId, mapId }) => {
        if (typeof characterId !== 'string' || characterId.trim() === '') {
          return false;
        }

        const payload = { characterId: characterId.trim() };
        if (typeof mapId === 'string' && mapId.trim() !== '') {
          payload.mapId = mapId.trim();
        }

        return removeCharacterTokensFromMaps(payload);
      },
      [removeCharacterTokensFromMaps]
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

          const tokensRemoved = await removeCharacterTokensFromMaps(enemyId);
          await fetchRecords();
          if (tokensRemoved) {
            setStatus({ type: 'success', message: 'Enemy removed.' });
          }
        } catch (error) {
          console.error(error);
          setStatus({ type: 'danger', message: error.message || 'Failed to remove enemy.' });
        } finally {
          setRemovingEnemyId(null);
        }
      },
      [encodedCampaign, fetchRecords, removeCharacterTokensFromMaps]
    );

    const handleEnemyAdjustmentInputChange = useCallback((enemyId, value) => {
      if (!enemyId) {
        return;
      }

      setEnemyHealthAdjustments((prev) => ({ ...prev, [enemyId]: value }));
    }, []);

    const updateEnemyHealth = useCallback(
      async (enemyId, nextHp) => {
        if (!enemyId || !encodedCampaign) {
          return;
        }

        const encodedEnemyId = encodeURIComponent(enemyId);
        setEnemyHealthSaving((prev) => ({ ...prev, [enemyId]: true }));

        try {
          const response = await apiFetch(
            `/campaigns/${encodedCampaign}/enemies/${encodedEnemyId}/health`,
            {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ currentHp: nextHp }),
            }
          );

          if (!response.ok) {
            throw new Error(response.statusText || 'Failed to update enemy health');
          }

          const result = await response.json();

          if (result?.enemy) {
            setEnemies((prev) => {
              if (!Array.isArray(prev)) {
                return prev;
              }

              const index = prev.findIndex((entry) => entry?.enemyId === enemyId);
              if (index === -1) {
                return prev;
              }

              const next = [...prev];
              next[index] = { ...next[index], ...result.enemy };
              return next;
            });
          }

          if (result?.combat) {
            setCombatState(normalizeCombatState(result.combat));
          }
        } catch (error) {
          console.error(error);
          setStatus({
            type: 'danger',
            message: error.message || 'Failed to update enemy health.',
          });
        } finally {
          setEnemyHealthSaving((prev) => {
            const next = { ...prev };
            delete next[enemyId];
            return next;
          });
        }
      },
      [encodedCampaign, normalizeCombatState, setCombatState, setEnemies, setStatus]
    );

    const handleApplyEnemyHealthAdjustment = useCallback(
      (enemyId, direction) => {
        if (!enemyId || !direction) {
          return;
        }

        const enemy = enemies.find((entry) => entry?.enemyId === enemyId);
        if (!enemy) {
          return;
        }

        const rawInput = enemyHealthAdjustments[enemyId];
        const parsedInput = Number(rawInput);
        const adjustment = Number.isFinite(parsedInput) && parsedInput !== 0
          ? Math.abs(parsedInput)
          : 1;

        const maxHp = toFiniteNumberOrNull(enemy.maxHp ?? enemy.hitPoints);
        const currentHpCandidate =
          enemy.currentHp !== undefined
            ? toFiniteNumberOrNull(enemy.currentHp)
            : null;
        const baseCurrent =
          currentHpCandidate !== null
            ? currentHpCandidate
            : maxHp !== null
              ? maxHp
              : 0;

        let nextValue = baseCurrent + direction * adjustment;
        if (Number.isFinite(nextValue)) {
          if (nextValue < 0) {
            nextValue = 0;
          }
          if (maxHp !== null && nextValue > maxHp) {
            nextValue = maxHp;
          }
        }

        updateEnemyHealth(enemyId, nextValue);
      },
      [enemyHealthAdjustments, enemies, updateEnemyHealth]
    );

    const handleResetEnemyHealth = useCallback(
      (enemyId) => {
        if (!enemyId) {
          return;
        }

        const enemy = enemies.find((entry) => entry?.enemyId === enemyId);
        if (!enemy) {
          return;
        }

        const maxHp = toFiniteNumberOrNull(enemy.maxHp ?? enemy.hitPoints);
        if (maxHp === null) {
          return;
        }

        updateEnemyHealth(enemyId, maxHp);
      },
      [enemies, updateEnemyHealth]
    );

    const formatAttackBonus = useCallback((bonus) => {
      if (bonus === null || bonus === undefined || bonus === '') {
        return null;
      }

      const parsed = Number(bonus);
      if (!Number.isFinite(parsed)) {
        return null;
      }

      return parsed >= 0 ? `+${parsed}` : `${parsed}`;
    }, []);

    const getEnemyActionDamageString = useCallback((action) => {
      if (!action) {
        return null;
      }

      if (Array.isArray(action.damage) && action.damage.length > 0) {
        const parts = action.damage
          .map((damageEntry) => {
            if (!damageEntry || !damageEntry.damage_dice) {
              return null;
            }

            const typeName = damageEntry.damage_type?.name
              ? String(damageEntry.damage_type.name).toLowerCase()
              : '';
            return [damageEntry.damage_dice, typeName].filter(Boolean).join(' ');
          })
          .filter(Boolean);

        if (parts.length > 0) {
          return parts.join(' + ');
        }
      }

      if (action.damage_dice) {
        const typeName = action.damage_type?.name
          ? String(action.damage_type.name).toLowerCase()
          : '';
        return [action.damage_dice, typeName].filter(Boolean).join(' ');
      }

      return null;
    }, []);

    const handleEnemyDamageRoll = useCallback(
      (enemy, action) => {
        if (!enemy || !action) {
          return;
        }

        const damageString = getEnemyActionDamageString(action);
        if (!damageString) {
          setStatus({
            type: 'warning',
            message: 'No damage dice available for this action.',
          });
          return;
        }

        const result = calculateDamage(damageString);
        if (!result) {
          setStatus({
            type: 'warning',
            message: 'Unable to roll damage for this action.',
          });
          return;
        }

        const enemyName = enemy.name || enemy.displayType || enemy.enemyId || 'Enemy';
        const actionName = action.name || 'Action';
        const message = `${enemyName} deals ${result.total} damage with ${actionName} (${result.breakdown}).`;

        setLatestEnemyRoll({
          enemyId: enemy.enemyId,
          enemyName,
          actionName,
          total: result.total,
          breakdown: result.breakdown,
          damageFormula: damageString,
        });

        setStatus({ type: 'info', message });
      },
      [getEnemyActionDamageString, setStatus]
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

        const normalizedCharacterId =
          typeof update.characterId === 'string' && update.characterId.trim() !== ''
            ? update.characterId.trim()
            : null;
        const normalizedRecordId =
          typeof update._id === 'string' && update._id.trim() !== ''
            ? update._id.trim()
            : null;

        if (!normalizedCharacterId && !normalizedRecordId) {
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

        setRecords((prev) =>
          applyCharacterHealthUpdateToRecords({
            records: prev,
            update: {
              ...(normalizedRecordId ? { _id: normalizedRecordId } : {}),
              ...(normalizedCharacterId ? { characterId: normalizedCharacterId } : {}),
              tempHealth: nextTempHealthValue,
              health: nextHealthValue,
            },
          })
        );
      };

      const handleMapUpdate = (mapData) => {
        if (mapData && typeof mapData === 'object') {
          const hasTokensByMapIdProp = Object.prototype.hasOwnProperty.call(
            mapData,
            'tokensByMapId'
          );
          const hasActiveTokensProp = Object.prototype.hasOwnProperty.call(
            mapData,
            'activeMapTokens'
          );
          const hasActiveIdProp = Object.prototype.hasOwnProperty.call(
            mapData,
            'activeMapId'
          );

          const sanitizedTokens = hasTokensByMapIdProp
            ? sanitizeTokensByMapId(mapData.tokensByMapId)
            : {};
          const sanitizedActiveTokens = hasActiveTokensProp
            ? sanitizeTokenDictionary(mapData.activeMapTokens)
            : {};
          const normalizedIncomingActiveId =
            hasActiveIdProp &&
            typeof mapData.activeMapId === 'string' &&
            mapData.activeMapId.trim() !== ''
              ? mapData.activeMapId.trim()
              : null;

          const tokenKeys = ['tokensByMapId', 'activeMapTokens', 'activeMapId'];
          const payloadKeys = Object.keys(mapData);
          const tokenOnlyUpdate =
            payloadKeys.length > 0 &&
            payloadKeys.every((key) => tokenKeys.includes(key)) &&
            (hasTokensByMapIdProp || hasActiveTokensProp || hasActiveIdProp);

          if (tokenOnlyUpdate) {
            const merged = mergeTokenPayload({
              incomingTokensByMapId: sanitizedTokens,
              incomingActiveMapTokens: sanitizedActiveTokens,
              incomingActiveMapId: normalizedIncomingActiveId,
              previousActiveMapId: activeMapIdRef.current,
              previousCampaignMap: campaignMapRef.current,
              previousMapTokens: mapTokensRef.current || {},
            });

            setActiveMapId(merged.activeMapId);
            setMapTokens(merged.mapTokens);
            setActiveMapTokens(merged.activeMapTokens);
            setCampaignMap(merged.campaignMap);
            setGeneratedMap(null);
            return;
          }

          let workingPayload = mapData;

          if (hasTokensByMapIdProp) {
            const incomingKeys = Object.keys(mapData.tokensByMapId || {}).reduce(
              (acc, key) => {
                if (typeof key !== 'string') {
                  return acc;
                }
                const trimmed = key.trim();
                if (trimmed) {
                  acc.push(trimmed);
                }
                return acc;
              },
              []
            );

            if (incomingKeys.length === 0) {
              workingPayload = { ...workingPayload, tokensByMapId: sanitizedTokens };
            } else {
              const mergedTokens = { ...(mapTokensRef.current || {}) };
              incomingKeys.forEach((mapId) => {
                if (Object.prototype.hasOwnProperty.call(sanitizedTokens, mapId)) {
                  mergedTokens[mapId] = sanitizedTokens[mapId];
                } else {
                  delete mergedTokens[mapId];
                }
              });
              workingPayload = { ...workingPayload, tokensByMapId: mergedTokens };
            }
          }

          if (hasActiveTokensProp) {
            workingPayload = { ...workingPayload, activeMapTokens: sanitizedActiveTokens };
            if (workingPayload.map && typeof workingPayload.map === 'object') {
              workingPayload = {
                ...workingPayload,
                map: { ...workingPayload.map, tokens: sanitizedActiveTokens },
              };
            }
          }

          if (
            Array.isArray(workingPayload.maps) ||
            workingPayload.activeMapId !== undefined ||
            (workingPayload.map && typeof workingPayload.map === 'object')
          ) {
            applyMapPayload(workingPayload);
          } else {
            const normalizedMap = workingPayload;
            const normalizedMapId =
              typeof normalizedMap?.mapId === 'string' && normalizedMap.mapId.trim() !== ''
                ? normalizedMap.mapId.trim()
                : null;
            applyMapPayload({
              maps: normalizedMapId ? [normalizedMap] : [],
              activeMapId: normalizedMapId,
              map: normalizedMap,
            });
          }
        } else {
          applyMapPayload({ maps: [], activeMapId: null, map: null });
        }
        setGeneratedMap(null);
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

        setRecords((prev) => {
          if (!Array.isArray(prev) || prev.length === 0) {
            return prev;
          }

          let didUpdate = false;
          const next = prev.map((record) => {
            if (!record || typeof record !== 'object') {
              return record;
            }

            const identifiers = [];
            if (typeof record._id === 'string' && record._id.trim() !== '') {
              identifiers.push(record._id.trim());
            }
            if (typeof record.characterId === 'string' && record.characterId.trim() !== '') {
              identifiers.push(record.characterId.trim());
            }

            if (!identifiers.includes(normalizedCharacterId)) {
              return record;
            }

            if (
              typeof record.diceColor === 'string' &&
              record.diceColor.trim() === normalizedDiceColor
            ) {
              return record;
            }

            didUpdate = true;
            return { ...record, diceColor: normalizedDiceColor };
          });

          return didUpdate ? next : prev;
        });
      };

      socket.on('combat:update', handleCombatUpdate);
      socket.on('character:health:update', handleCharacterHealthUpdate);
      socket.on('campaign:map:update', handleMapUpdate);
      socket.on('campaign:enemies:update', handleEnemiesUpdate);
      socket.on('campaign:characters:update', handleCharacterMetadataUpdate);
      socket.emit('campaign:join', campaignId);

      return () => {
        socket.off('combat:update', handleCombatUpdate);
        socket.off('character:health:update', handleCharacterHealthUpdate);
        socket.off('campaign:map:update', handleMapUpdate);
        socket.off('campaign:enemies:update', handleEnemiesUpdate);
        socket.off('campaign:characters:update', handleCharacterMetadataUpdate);
        socket.emit('campaign:leave', campaignId);
        socket.disconnect();
        socketRef.current = null;
      };
    }, [campaignId, applyMapPayload]);

    const persistTokenPosition = useCallback(
      async ({ mapId, characterId, x, y }) => {
        const normalizedMapId =
          typeof mapId === 'string' && mapId.trim() !== '' ? mapId.trim() : null;
        const normalizedCharacterId =
          typeof characterId === 'string' && characterId.trim() !== ''
            ? characterId.trim()
            : null;

        const clampedX = clamp01(x);
        const clampedY = clamp01(y);

        if (!normalizedMapId || !normalizedCharacterId || clampedX === null || clampedY === null) {
          return;
        }

        if (!encodedCampaign) {
          return;
        }

        const previousTokens = mapTokensRef.current || {};
        const previousActiveTokens = activeMapTokensRef.current || {};
        const previousCampaignMap = campaignMap;

        const optimisticToken = {
          ...(previousTokens?.[normalizedMapId]?.[normalizedCharacterId] || {}),
          characterId: normalizedCharacterId,
          x: clampedX,
          y: clampedY,
          updatedAt: new Date().toISOString(),
        };

        setMapTokens((prev) => {
          const next = { ...(prev || {}) };
          const existing = { ...(next[normalizedMapId] || {}) };
          existing[normalizedCharacterId] = optimisticToken;
          next[normalizedMapId] = existing;
          return next;
        });

        if (normalizedMapId === activeMapId) {
          setActiveMapTokens((prev) => ({
            ...(prev || {}),
            [normalizedCharacterId]: optimisticToken,
          }));
        }

        setCampaignMap((prev) => {
          if (!prev || prev.mapId !== normalizedMapId) {
            return prev;
          }
          return {
            ...prev,
            tokens: {
              ...(prev.tokens || {}),
              [normalizedCharacterId]: optimisticToken,
            },
          };
        });

        try {
          const encodedMapId = encodeURIComponent(normalizedMapId);
          const encodedCharacterId = encodeURIComponent(normalizedCharacterId);
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
              'Failed to update token position.'
            );
            throw new Error(message);
          }
        } catch (error) {
          console.error(error);
          setStatus({
            type: 'danger',
            message: error.message || 'Failed to update token position.',
          });
          setMapTokens(previousTokens || {});
          setActiveMapTokens(previousActiveTokens || {});
          setCampaignMap(previousCampaignMap || null);
        }
      },
      [activeMapId, campaignMap, encodedCampaign, parseErrorMessage, setStatus]
    );

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
        const maxHp = toFiniteNumberOrNull(enemy.hitPoints);
        const currentHpCandidate =
          enemy.currentHp !== undefined
            ? toFiniteNumberOrNull(enemy.currentHp)
            : null;
        const currentHp =
          currentHpCandidate !== null
            ? currentHpCandidate
            : maxHp !== null
              ? maxHp
              : null;
        return {
          ...enemy,
          entityType: 'enemy',
          _id: enemy.enemyId,
          characterName: enemy.name,
          token: typeLabel || 'Enemy',
          displayType: typeLabel,
          ...(currentHp !== null ? { currentHp } : {}),
          ...(maxHp !== null ? { maxHp } : {}),
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

    const resolveParticipantHealth = useCallback(
      (characterId) => {
        if (typeof characterId !== 'string' || characterId.trim() === '') {
          return {};
        }

        const entity = characterLookup.get(characterId);
        if (!entity || typeof entity !== 'object') {
          return {};
        }

        if (entity.entityType !== 'enemy') {
          return {};
        }

        const maxHp = toFiniteNumberOrNull(entity.maxHp ?? entity.hitPoints);
        const currentHpCandidate =
          entity.currentHp !== undefined
            ? toFiniteNumberOrNull(entity.currentHp)
            : null;
        const currentHp =
          currentHpCandidate !== null
            ? currentHpCandidate
            : maxHp !== null
              ? maxHp
              : null;

        return {
          ...(currentHp !== null ? { currentHp } : {}),
          ...(maxHp !== null ? { maxHp } : {}),
        };
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
            ...resolveParticipantHealth(characterId),
          };
          const stateWithDerived = applyDerivedInitiativesToState(
            {
              participants: [...participants, participant],
              activeTurn: combatState.activeTurn,
            },
            characterInitiativeMap
          );
          nextState = normalizeCombatState(stateWithDerived);
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
      [
        combatState,
        persistCombatState,
        characterInitiativeMap,
        resolveDisplayName,
        resolveParticipantHealth,
      ]
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

    const handleResetInitiative = useCallback(() => {
      if (!Array.isArray(combatState.participants) || combatState.participants.length === 0) {
        return;
      }

      const stateWithClearedInitiatives = {
        participants: combatState.participants.map((participant) => {
          if (!participant || typeof participant.characterId !== 'string') {
            return participant;
          }

          return { ...participant, initiative: undefined };
        }),
        activeTurn: combatState.activeTurn,
      };

      const stateWithDerived = applyDerivedInitiativesToState(
        stateWithClearedInitiatives,
        characterInitiativeMap
      );
      const nextState = normalizeCombatState(stateWithDerived);

      setCombatState(nextState);
      persistCombatState(nextState);
    }, [combatState, characterInitiativeMap, persistCombatState]);

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
            ...participant,
            initiative: numericBase + roll,
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

    const activeDiceColor = useMemo(() => {
      const normalizeColor = (value) => {
        if (typeof value !== 'string') {
          return null;
        }
        const trimmed = value.trim();
        return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : null;
      };

      if (activeParticipant) {
        const character = characterLookup.get(activeParticipant.characterId);
        const color = normalizeColor(character?.diceColor);
        if (color) {
          return color;
        }
      }

      if (Array.isArray(records)) {
        for (const record of records) {
          const color = normalizeColor(record?.diceColor);
          if (color) {
            return color;
          }
        }
      }

      return DEFAULT_DICE_COLOR;
    }, [activeParticipant, characterLookup, records]);

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

    const previewMap = useMemo(() => {
      if (generatedMap) {
        return generatedMap;
      }

      if (selectedMapId) {
        const selected = maps.find((map) => map && map.mapId === selectedMapId);
        if (selected) {
          return selected;
        }
      }

      return campaignMap;
    }, [generatedMap, selectedMapId, maps, campaignMap]);

    const tokenMetaById = useMemo(() => {
      const lookup = {};

      if (Array.isArray(records)) {
        records.forEach((record) => {
          if (!record || typeof record !== 'object') {
            return;
          }

          const color =
            typeof record.diceColor === 'string' && record.diceColor.trim() !== ''
              ? record.diceColor.trim()
              : null;
          const label =
            (typeof record.characterName === 'string' && record.characterName.trim()) ||
            (typeof record.name === 'string' && record.name.trim()) ||
            (typeof record.token === 'string' && record.token.trim()) ||
            (typeof record._id === 'string' && record._id.trim()) ||
            (typeof record.characterId === 'string' && record.characterId.trim()) ||
            null;

          const entityTypeRaw =
            typeof record.entityType === 'string' && record.entityType.trim() !== ''
              ? record.entityType.trim()
              : 'character';
          const entityType = entityTypeRaw.toLowerCase();

          const { currentHp: derivedCurrentHp, maxHp: derivedMaxHp } =
            calculateCharacterHitPoints(record);

          const fallbackCurrentHp = toFiniteNumberOrNull(
            record.currentHp ?? record.hpCurrent ?? record.tempHealth ?? record.health
          );
          const fallbackMaxHp = toFiniteNumberOrNull(
            record.maxHp ?? record.hpMax ?? record.health
          );

          const normalizedCurrentHp = Number.isFinite(derivedCurrentHp)
            ? derivedCurrentHp
            : fallbackCurrentHp;
          const normalizedMaxHp = Number.isFinite(derivedMaxHp)
            ? derivedMaxHp
            : fallbackMaxHp;

          const identifiers = [record.characterId, record._id, record.token].filter(
            (value) => typeof value === 'string' && value.trim() !== ''
          );

          const recordSize = normalizeCreatureSize(
            record.size ??
              record.characterSize ??
              record?.character?.size ??
              record?.creature?.size ??
              record?.profile?.size ??
              record?.race?.size ??
              record?.attributes?.size ??
              record?.displayType
          );

          identifiers.forEach((identifier) => {
            const trimmed = identifier.trim();
            if (!trimmed) {
              return;
            }

            lookup[trimmed] = {
              color,
              label,
              entityType,
              ...(normalizedCurrentHp !== null ? { currentHp: normalizedCurrentHp } : {}),
              ...(normalizedMaxHp !== null ? { maxHp: normalizedMaxHp } : {}),
              ...(recordSize ? { size: recordSize } : {}),
            };
          });
        });
      }

      if (Array.isArray(enemies)) {
        enemies.forEach((enemy) => {
          if (!enemy || typeof enemy !== 'object') {
            return;
          }

          const enemyId =
            typeof enemy.enemyId === 'string' && enemy.enemyId.trim() !== ''
              ? enemy.enemyId.trim()
              : null;
          if (!enemyId) {
            return;
          }

          const label =
            (typeof enemy.name === 'string' && enemy.name.trim()) ||
            (typeof enemy.enemyType === 'string' && enemy.enemyType.trim()) ||
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
            ...(enemyCurrentHp !== null ? { currentHp: enemyCurrentHp } : {}),
            ...(enemyMaxHp !== null ? { maxHp: enemyMaxHp } : {}),
            ...(enemySize ? { size: enemySize } : {}),
          };
        });
      }

      return lookup;
    }, [records, enemies]);

    const displayedMap = generatedMap || previewMap || campaignMap;

    const shouldShowCampaignTokens = useMemo(() => {
      const normalizedDisplayedMapId =
        typeof displayedMap?.mapId === 'string' && displayedMap.mapId.trim() !== ''
          ? displayedMap.mapId.trim()
          : null;
      const normalizedCampaignMapId =
        typeof campaignMap?.mapId === 'string' && campaignMap.mapId.trim() !== ''
          ? campaignMap.mapId.trim()
          : null;
      const normalizedActiveMapId =
        typeof activeMapId === 'string' && activeMapId.trim() !== ''
          ? activeMapId.trim()
          : null;

      if (!normalizedDisplayedMapId || !normalizedCampaignMapId) {
        return false;
      }

      if (generatedMap) {
        return false;
      }

      return (
        normalizedDisplayedMapId === normalizedCampaignMapId &&
        normalizedDisplayedMapId === normalizedActiveMapId
      );
    }, [activeMapId, campaignMap, displayedMap, generatedMap]);

    const modalTokensByMapId = useMemo(() => {
      const sanitizedMapTokens = sanitizeTokensByMapId(mapTokens);
      const merged = { ...sanitizedMapTokens };

      const campaignMapId =
        typeof campaignMap?.mapId === 'string' && campaignMap.mapId.trim() !== ''
          ? campaignMap.mapId.trim()
          : null;

      if (campaignMapId) {
        const campaignTokens = sanitizeTokenDictionary(campaignMap?.tokens);
        if (Object.keys(campaignTokens).length > 0) {
          merged[campaignMapId] = {
            ...(merged[campaignMapId] || {}),
            ...campaignTokens,
          };
        }
      }

      const normalizedActiveMapId =
        typeof activeMapId === 'string' && activeMapId.trim() !== ''
          ? activeMapId.trim()
          : null;

      if (normalizedActiveMapId) {
        const normalizedActiveTokens = sanitizeTokenDictionary(activeMapTokens);
        if (Object.keys(normalizedActiveTokens).length > 0) {
          merged[normalizedActiveMapId] = {
            ...(merged[normalizedActiveMapId] || {}),
            ...normalizedActiveTokens,
          };
        }
      }

      return merged;
    }, [activeMapId, activeMapTokens, campaignMap, mapTokens]);

    const boardTokens = useMemo(() => {
      const activeCharacterId =
        typeof activeParticipant?.characterId === 'string' &&
        activeParticipant.characterId.trim() !== ''
          ? activeParticipant.characterId.trim()
          : null;
      const normalizedDisplayedMapId =
        typeof displayedMap?.mapId === 'string' && displayedMap.mapId.trim() !== ''
          ? displayedMap.mapId.trim()
          : null;
      if (!normalizedDisplayedMapId) {
        return [];
      }

      const combinedTokens = {
        ...(mapTokens?.[normalizedDisplayedMapId] || {}),
      };

      const normalizedActiveMapId =
        typeof activeMapId === 'string' && activeMapId.trim() !== ''
          ? activeMapId.trim()
          : null;

      if (
        normalizedActiveMapId &&
        normalizedActiveMapId === normalizedDisplayedMapId &&
        activeMapTokens &&
        typeof activeMapTokens === 'object'
      ) {
        Object.entries(activeMapTokens).forEach(([key, value]) => {
          if (!value || typeof value !== 'object') {
            return;
          }
          const identifier = typeof key === 'string' && key.trim() !== '' ? key.trim() : value.characterId;
          if (identifier) {
            combinedTokens[identifier] = { ...combinedTokens[identifier], ...value };
          }
        });
      }

      const tokensList = Object.values(combinedTokens).filter(
        (token) => token && typeof token === 'object' && token.characterId
      );

      return tokensList
        .map((token) => {
          const meta = tokenMetaById[token.characterId] || {};
          const rawLabel = meta.label || token.label || token.characterId;
          const label = typeof rawLabel === 'string' ? rawLabel.trim() : '';
          const normalizedTokenCharacterId =
            typeof token.characterId === 'string' && token.characterId.trim() !== ''
              ? token.characterId.trim()
              : null;
          const isActiveTurn =
            normalizedTokenCharacterId &&
            activeCharacterId &&
            normalizedTokenCharacterId === activeCharacterId;
          const normalizedCurrentHp = toFiniteNumberOrNull(
            meta.currentHp ?? token.currentHp ?? token.hpCurrent ?? token.health
          );
          const normalizedMaxHp = toFiniteNumberOrNull(
            meta.maxHp ?? token.maxHp ?? token.hpMax ?? token.health
          );
          const metaVariant =
            typeof meta.variant === 'string' && meta.variant.trim() !== ''
              ? meta.variant.trim().toLowerCase()
              : null;
          const tokenVariant =
            typeof token.variant === 'string' && token.variant.trim() !== ''
              ? token.variant.trim().toLowerCase()
              : null;
          const metaEntityType =
            typeof meta.entityType === 'string' && meta.entityType.trim() !== ''
              ? meta.entityType.trim().toLowerCase()
              : null;
          const tokenEntityType =
            typeof token.entityType === 'string' && token.entityType.trim() !== ''
              ? token.entityType.trim().toLowerCase()
              : null;
          const entityType = metaEntityType || tokenEntityType || null;

          const metaSize =
            typeof meta.size === 'string' && meta.size.trim() !== ''
              ? meta.size.trim().toLowerCase()
              : null;
          const tokenSize =
            typeof token.size === 'string' && token.size.trim() !== ''
              ? token.size.trim().toLowerCase()
              : null;
          const size = metaSize || tokenSize || null;

          let variant = metaVariant || tokenVariant || null;
          if (!variant && entityType) {
            if (entityType === 'enemy') {
              variant = 'enemy';
            } else if (entityType === 'character') {
              variant = 'ally';
            }
          }

          const baseColor = meta.color || token.color || null;
          const normalizedColor =
            typeof baseColor === 'string' && baseColor.trim() !== '' ? baseColor.trim() : null;

          return {
            ...token,
            label,
            color: normalizedColor,
            isMovable: true,
            ...(entityType ? { entityType } : {}),
            ...(variant ? { variant } : {}),
            ...(isActiveTurn ? { isActiveTurn: true } : {}),
            ...(normalizedCurrentHp !== null ? { currentHp: normalizedCurrentHp } : {}),
            ...(normalizedMaxHp !== null ? { maxHp: normalizedMaxHp } : {}),
            ...(size ? { size } : {}),
          };
        })
        .sort((a, b) => {
          const labelA = (a.label || a.characterId || '').toLowerCase();
          const labelB = (b.label || b.characterId || '').toLowerCase();
          return labelA.localeCompare(labelB);
        });
    }, [
      activeMapId,
      activeMapTokens,
      activeParticipant,
      displayedMap,
      mapTokens,
      tokenMetaById,
    ]);

    const handleTokenPositionChange = useCallback(
      ({ characterId, x, y }) => {
        const normalizedDisplayedMapId =
          typeof displayedMap?.mapId === 'string' && displayedMap.mapId.trim() !== ''
            ? displayedMap.mapId.trim()
            : null;
        const normalizedCampaignMapId =
          typeof campaignMap?.mapId === 'string' && campaignMap.mapId.trim() !== ''
            ? campaignMap.mapId.trim()
            : null;

        if (
          !shouldShowCampaignTokens ||
          !normalizedDisplayedMapId ||
          !normalizedCampaignMapId ||
          normalizedDisplayedMapId !== normalizedCampaignMapId
        ) {
          return;
        }

        persistTokenPosition({
          mapId: normalizedDisplayedMapId,
          characterId,
          x,
          y,
        });
      },
      [campaignMap, displayedMap, persistTokenPosition, shouldShowCampaignTokens]
    );

    const handleOpenMapPlacement = useCallback((enemyId, enemyName) => {
      const normalizedId =
        typeof enemyId === 'string' && enemyId.trim() !== '' ? enemyId.trim() : null;

      if (!normalizedId) {
        return;
      }

      const normalizedName =
        typeof enemyName === 'string' && enemyName.trim() !== '' ? enemyName.trim() : null;

      setMapPlacementState({
        show: true,
        enemyId: normalizedId,
        enemyName: normalizedName,
      });
    }, []);

    const handleCloseMapPlacement = useCallback(() => {
      setMapPlacementState({ show: false, enemyId: null, enemyName: null });
    }, []);

    const handleMapModalTokenMove = useCallback(
      async ({ mapId, characterId, x, y }) => {
        const normalizedMapId =
          typeof mapId === 'string' && mapId.trim() !== '' ? mapId.trim() : null;
        const normalizedCharacterId =
          typeof characterId === 'string' && characterId.trim() !== ''
            ? characterId.trim()
            : mapPlacementState.enemyId;
        const clampedX = clamp01(x);
        const clampedY = clamp01(y);

        if (!normalizedMapId || !normalizedCharacterId || clampedX === null || clampedY === null) {
          return false;
        }

        await persistTokenPosition({
          mapId: normalizedMapId,
          characterId: normalizedCharacterId,
          x: clampedX,
          y: clampedY,
        });

        return true;
      },
      [mapPlacementState.enemyId, persistTokenPosition]
    );


    const RESOURCE_TABS = useMemo(
      () => [
        { key: 'characters', title: 'Characters' },
        { key: 'players', title: 'Players' },
        { key: 'map', title: 'Map' },
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

    const handleGenerateMap = useCallback(async () => {
      const prompt = mapPrompt.trim();
      setMapGenerating(true);
      try {
        const response = await apiFetch('/ai/map', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, campaign: campaignId }),
        });

        if (!response.ok) {
          let message = response.statusText || 'Failed to generate map.';
          try {
            const errorBody = await response.json();
            message = errorBody?.message || message;
          } catch (error) {
            // ignore json parsing errors
          }
          throw new Error(message);
        }

        const mapData = await response.json();
        setGeneratedMap(mapData || null);
        setStatus({ type: 'success', message: 'Map generated.' });
      } catch (error) {
        console.error(error);
        setStatus({
          type: 'danger',
          message: error.message || 'Failed to generate map.',
        });
      } finally {
        setMapGenerating(false);
      }
    }, [mapPrompt, campaignId]);

    const handleSaveMap = useCallback(
      async (mode = 'update', options = {}) => {
        if (!campaignId || !encodedCampaign) {
          return;
        }

        const trimmedPrompt = mapPrompt.trim();
        const isCreate = mode === 'create';

        const mapToSave = isCreate
          ? generatedMap || previewMap || campaignMap
          : generatedMap || campaignMap;

        const trimmedFolder =
          typeof mapToSave?.folder === 'string' ? mapToSave.folder.trim() : '';

        if (!mapToSave) {
          setStatus({ type: 'danger', message: 'No map available to save.' });
          return;
        }

        setMapSaveMode(mode);
        const shouldActivateNewMap =
          options.activate === undefined ? true : Boolean(options.activate);

        const saveViaLegacyEndpoint = async () => {
          const response = await apiFetch(`/campaigns/${encodedCampaign}/map`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              map: mapToSave,
              prompt: trimmedPrompt || undefined,
            }),
          });

          if (!response.ok) {
            const message = await parseErrorMessage(response, 'Failed to save map.');
            throw new Error(message);
          }

          let savedMap = null;
          try {
            savedMap = await response.json();
          } catch (error) {
            savedMap = null;
          }

          const normalizedMap =
            savedMap && typeof savedMap === 'object' && !Array.isArray(savedMap)
              ? savedMap
              : mapToSave;

          const normalizedMapId =
            typeof normalizedMap?.mapId === 'string' && normalizedMap.mapId.trim() !== ''
              ? normalizedMap.mapId.trim()
              : null;

          applyMapPayload(
            {
              maps: normalizedMapId ? [normalizedMap] : [],
              activeMapId: normalizedMapId,
              map: normalizedMap,
            },
            { preferredSelectedId: normalizedMapId }
          );
          setGeneratedMap(null);
          setStatus({ type: 'success', message: 'Map saved.' });
        };

        setMapSaving(true);
        try {
          if (isCreate) {
            const mapPayload = { ...mapToSave };
            delete mapPayload.mapId;
            delete mapPayload.createdAt;
            delete mapPayload.updatedAt;
            if (trimmedFolder) {
              mapPayload.folder = trimmedFolder;
            } else {
              delete mapPayload.folder;
            }

            const response = await apiFetch(`/campaigns/${encodedCampaign}/maps`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                map: mapPayload,
                prompt: trimmedPrompt || undefined,
                activate: shouldActivateNewMap,
              }),
            });

            if (!response.ok) {
              if (response.status === 404) {
                await saveViaLegacyEndpoint();
                return;
              }
              const message = await parseErrorMessage(response, 'Failed to save map.');
              throw new Error(message);
            }

            let payload = null;
            try {
              payload = await response.json();
            } catch (error) {
              payload = null;
            }

            if (payload && typeof payload === 'object') {
              let preferredId =
                (payload.map && payload.map.mapId) || payload.activeMapId || null;

              if (!preferredId && Array.isArray(payload.maps)) {
                const matchingMap = payload.maps.find((map) => {
                  if (!map || typeof map !== 'object') {
                    return false;
                  }
                  if (map.mapId && map.mapId === mapToSave.mapId) {
                    return true;
                  }
                  return (
                    map.title === mapToSave.title &&
                    map.imageUrl === mapToSave.imageUrl &&
                    map.imageBase64 === mapToSave.imageBase64
                  );
                });
                preferredId = matchingMap?.mapId || null;
              }

              applyMapPayload(payload, {
                preferredSelectedId: preferredId || null,
              });
            } else {
              applyMapPayload({ maps: [], activeMapId: null, map: null });
            }

            setGeneratedMap(null);
            setStatus({ type: 'success', message: 'Map saved.' });
            setLastMapFolder(trimmedFolder);
          } else {
            const activeId =
              activeMapId ||
              (typeof campaignMap?.mapId === 'string' && campaignMap.mapId.trim() !== ''
                ? campaignMap.mapId.trim()
                : null);

            if (!activeId) {
              setStatus({
                type: 'danger',
                message: 'No active map available to overwrite.',
              });
              return;
            }

            const mapPayload = { ...mapToSave };
            if (mapPayload.mapId && mapPayload.mapId !== activeId) {
              delete mapPayload.mapId;
            }
            if (trimmedFolder) {
              mapPayload.folder = trimmedFolder;
            } else {
              delete mapPayload.folder;
            }

            const response = await apiFetch(
              `/campaigns/${encodedCampaign}/maps/${encodeURIComponent(activeId)}`,
              {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  map: mapPayload,
                  prompt: trimmedPrompt || undefined,
                }),
              }
            );

            if (!response.ok) {
              if (response.status === 404) {
                await saveViaLegacyEndpoint();
                return;
              }
              const message = await parseErrorMessage(response, 'Failed to save map.');
              throw new Error(message);
            }

            let payload = null;
            try {
              payload = await response.json();
            } catch (error) {
              payload = null;
            }

            if (payload && typeof payload === 'object') {
              applyMapPayload(payload, { preferredSelectedId: activeId });
            }

            setGeneratedMap(null);
            setStatus({ type: 'success', message: 'Map saved.' });
          }
        } catch (error) {
          console.error(error);
          setStatus({
            type: 'danger',
            message: error.message || 'Failed to save map.',
          });
        } finally {
          setMapSaving(false);
          setMapSaveMode(null);
        }
      },
      [
        campaignId,
        encodedCampaign,
        generatedMap,
        previewMap,
        campaignMap,
        mapPrompt,
        applyMapPayload,
        activeMapId,
        parseErrorMessage,
      ]
    );

    const handleSelectMap = useCallback(
      (mapId) => {
        const normalizedId =
          typeof mapId === 'string' && mapId.trim() !== '' ? mapId.trim() : null;
        setSelectedMapId(normalizedId);
        setGeneratedMap(null);
      },
      []
    );

    const handleOpenMapManager = useCallback(() => {
      setShowMapManager(true);
    }, []);

    const handleCloseMapManager = useCallback(() => {
      setShowMapManager(false);
    }, []);

    const openCreateMapModal = useCallback(() => {
      setMapEditorSaving(false);
      setMapEditorErrors({});
      const sourceMap =
        generatedMap ||
        (selectedMapId
          ? maps.find((map) => map && map.mapId === selectedMapId)
          : campaignMap) ||
        {};

      const safeMap = sourceMap && typeof sourceMap === 'object' ? sourceMap : {};
      const defaultFolder =
        typeof safeMap.folder === 'string' && safeMap.folder.trim() !== ''
          ? safeMap.folder.trim()
          : typeof lastMapFolder === 'string'
          ? lastMapFolder
          : '';

      const shouldUseExistingOption =
        defaultFolder && availableMapFolders.includes(defaultFolder);

      setMapEditorState({
        show: true,
        mode: 'create',
        map: safeMap,
        title: '',
        folder: defaultFolder || '',
        folderSelection: shouldUseExistingOption
          ? defaultFolder
          : defaultFolder
          ? NEW_FOLDER_OPTION_VALUE
          : '',
        imageUrl: '',
        imageBase64: '',
        imageType: '',
        altText: '',
        activateOnSave: maps.length === 0,
        fileInputKey: Date.now(),
      });
    }, [
      generatedMap,
      selectedMapId,
      maps,
      campaignMap,
      lastMapFolder,
      availableMapFolders,
    ]);

    const openRenameMapModal = useCallback((map) => {
      if (!map || typeof map !== 'object') {
        return;
      }

      setMapEditorSaving(false);
      setMapEditorErrors({});
      const safeMap = map;

      setMapEditorState({
        show: true,
        mode: 'rename',
        map: safeMap,
        title: typeof safeMap.title === 'string' ? safeMap.title : '',
        folder:
          typeof safeMap.folder === 'string' && safeMap.folder.trim() !== ''
            ? safeMap.folder.trim()
            : '',
        folderSelection:
          typeof safeMap.folder === 'string' && safeMap.folder.trim() !== ''
            ? availableMapFolders.includes(safeMap.folder.trim())
              ? safeMap.folder.trim()
              : NEW_FOLDER_OPTION_VALUE
            : '',
        imageUrl: typeof safeMap.imageUrl === 'string' ? safeMap.imageUrl : '',
        imageBase64:
          typeof safeMap.imageBase64 === 'string' ? safeMap.imageBase64 : '',
        imageType:
          typeof safeMap.imageType === 'string' ? safeMap.imageType : '',
        altText: typeof safeMap.altText === 'string' ? safeMap.altText : '',
        activateOnSave: false,
        fileInputKey: Date.now(),
      });
    }, [availableMapFolders]);

    const handleCloseMapEditor = useCallback(() => {
      setMapEditorSaving(false);
      setMapEditorErrors({});
      setMapEditorState((prev) => ({ ...prev, show: false }));
    }, []);

    const handleMapEditorInputChange = useCallback(
      (field) => (event) => {
        const value = event?.target?.value ?? '';
        setMapEditorState((prev) => ({ ...prev, [field]: value }));
      },
      []
    );

    const handleMapEditorFolderSelectionChange = useCallback((event) => {
      const value = event?.target?.value ?? '';
      setMapEditorState((prev) => ({
        ...prev,
        folderSelection: value,
        folder: value && value !== NEW_FOLDER_OPTION_VALUE ? value : '',
      }));
    }, []);

    const handleMapEditorActivateChange = useCallback((event) => {
      const checked = Boolean(event?.target?.checked);
      setMapEditorState((prev) => ({ ...prev, activateOnSave: checked }));
    }, []);

    const handleMapEditorFileChange = useCallback((event) => {
      const file = event?.target?.files?.[0];
      if (!file) {
        setMapEditorState((prev) => ({
          ...prev,
          imageBase64: '',
          imageType: '',
        }));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        if (!result) {
          setMapEditorState((prev) => ({
            ...prev,
            imageBase64: '',
            imageType: '',
          }));
          return;
        }

        let nextImageType = file.type || '';
        let nextImageBase64 = result;

        const commaIndex = result.indexOf(',');
        if (result.startsWith('data:') && commaIndex !== -1) {
          const meta = result.substring(5, commaIndex);
          const semicolonIndex = meta.indexOf(';');
          nextImageType =
            semicolonIndex !== -1 ? meta.substring(0, semicolonIndex) : meta;
          nextImageBase64 = result.substring(commaIndex + 1);
        }

        setMapEditorState((prev) => ({
          ...prev,
          imageBase64: nextImageBase64,
          imageType: nextImageType,
          imageUrl: '',
        }));
      };

      reader.onerror = () => {
        setMapEditorState((prev) => ({
          ...prev,
          imageBase64: '',
          imageType: '',
        }));
      };

      reader.readAsDataURL(file);
    }, []);

    const handleSubmitMapEditor = useCallback(
      async (event) => {
        event.preventDefault();
        if (!campaignId || !encodedCampaign) {
          return;
        }

        const {
          mode,
          map: editorMap,
          title,
          folder,
          imageUrl,
          imageBase64,
          imageType,
          altText,
          activateOnSave,
        } = mapEditorState;

        const baseMap =
          mode === 'rename'
            ? editorMap || {}
            : editorMap || generatedMap || previewMap || {};

        const trimmedTitle = typeof title === 'string' ? title.trim() : '';
        const trimmedImageUrl = typeof imageUrl === 'string' ? imageUrl.trim() : '';
        const trimmedImageBase64 =
          typeof imageBase64 === 'string' ? imageBase64.trim() : '';
        const trimmedImageType =
          typeof imageType === 'string' ? imageType.trim() : '';
        const trimmedAltText = typeof altText === 'string' ? altText.trim() : '';
        const trimmedFolder = typeof folder === 'string' ? folder.trim() : '';

        const errors = {};

        if (!trimmedTitle) {
          errors.title = 'Title is required.';
        }

        if (!trimmedImageUrl && !trimmedImageBase64) {
          errors.imageSource = 'Provide an image URL or upload a file.';
        }

        if (mode === 'create' && !trimmedAltText) {
          errors.altText = 'Alt text is required.';
        }

        if (Object.keys(errors).length > 0) {
          setMapEditorErrors(errors);
          return;
        }

        setMapEditorErrors({});

        const normalizedTitle = trimmedTitle || getMapDisplayTitle(baseMap, DEFAULT_MAP_TITLE);

        const sanitizedBaseMap =
          baseMap && typeof baseMap === 'object' ? { ...baseMap } : {};
        delete sanitizedBaseMap.summary;
        delete sanitizedBaseMap.caption;
        delete sanitizedBaseMap.imageUrl;
        delete sanitizedBaseMap.imageBase64;
        delete sanitizedBaseMap.imageType;
        delete sanitizedBaseMap.folder;

        const payloadMap = {
          ...sanitizedBaseMap,
          title: normalizedTitle,
        };

        if (trimmedFolder) {
          payloadMap.folder = trimmedFolder;
        }

        if (trimmedAltText) {
          payloadMap.altText = trimmedAltText;
        } else {
          delete payloadMap.altText;
        }

        if (trimmedImageUrl) {
          payloadMap.imageUrl = trimmedImageUrl;
        } else if (trimmedImageBase64) {
          payloadMap.imageBase64 = trimmedImageBase64;
          if (trimmedImageType) {
            payloadMap.imageType = trimmedImageType;
          }
        }

        if (mode === 'create') {
          delete payloadMap.mapId;
          delete payloadMap.createdAt;
          delete payloadMap.updatedAt;
        }

        const trimmedPrompt = mapPrompt.trim();

        setMapEditorSaving(true);
        try {
          if (mode === 'create') {
            const response = await apiFetch(`/campaigns/${encodedCampaign}/maps`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                map: payloadMap,
                prompt: trimmedPrompt || undefined,
                activate: Boolean(activateOnSave),
              }),
            });

            if (!response.ok) {
              const message = await parseErrorMessage(response, 'Failed to save map.');
              throw new Error(message);
            }

            let payload = null;
            try {
              payload = await response.json();
            } catch (error) {
              payload = null;
            }

            if (payload && typeof payload === 'object') {
              let preferredId =
                (payload.map && payload.map.mapId) || payload.activeMapId || null;

              if (!preferredId && Array.isArray(payload.maps)) {
                const matchingMap = payload.maps.find((map) => {
                  if (!map || typeof map !== 'object') {
                    return false;
                  }
                  if (payloadMap.imageUrl && map.imageUrl === payloadMap.imageUrl) {
                    return true;
                  }
                  if (payloadMap.imageBase64 && map.imageBase64 === payloadMap.imageBase64) {
                    return true;
                  }
                  const normalizedPayloadTitle =
                    typeof payloadMap.title === 'string' ? payloadMap.title : '';
                  const normalizedMapTitle =
                    typeof map.title === 'string' ? map.title : '';
                  if (!normalizedPayloadTitle || normalizedMapTitle !== normalizedPayloadTitle) {
                    return false;
                  }

                  const normalizedPayloadPrompt =
                    typeof payloadMap.prompt === 'string' ? payloadMap.prompt : '';
                  const normalizedMapPrompt =
                    typeof map.prompt === 'string' ? map.prompt : '';
                  if (
                    normalizedPayloadPrompt &&
                    normalizedMapPrompt === normalizedPayloadPrompt
                  ) {
                    return true;
                  }

                  const normalizedPayloadAltText =
                    typeof payloadMap.altText === 'string' ? payloadMap.altText : '';
                  const normalizedMapAltText =
                    typeof map.altText === 'string' ? map.altText : '';
                  if (
                    normalizedPayloadAltText &&
                    normalizedMapAltText === normalizedPayloadAltText
                  ) {
                    return true;
                  }

                  return !normalizedPayloadPrompt && !normalizedPayloadAltText;
                });
                preferredId = matchingMap?.mapId || null;
              }

              applyMapPayload(payload, { preferredSelectedId: preferredId || null });
            } else {
              applyMapPayload({ maps: [], activeMapId: null, map: null });
            }

            setStatus({ type: 'success', message: 'Map saved.' });
          } else {
            const targetMapId =
              typeof editorMap?.mapId === 'string' && editorMap.mapId.trim() !== ''
                ? editorMap.mapId.trim()
                : null;

            if (!targetMapId) {
              throw new Error('Map identifier is missing.');
            }

            const response = await apiFetch(
              `/campaigns/${encodedCampaign}/maps/${encodeURIComponent(targetMapId)}`,
              {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  map: payloadMap,
                  prompt: trimmedPrompt || undefined,
                }),
              }
            );

            if (!response.ok) {
              const message = await parseErrorMessage(response, 'Failed to update map.');
              throw new Error(message);
            }

            let payload = null;
            try {
              payload = await response.json();
            } catch (error) {
              payload = null;
            }

            if (payload && typeof payload === 'object') {
              applyMapPayload(payload, { preferredSelectedId: targetMapId });
            }

            setStatus({ type: 'success', message: 'Map updated.' });
            setLastMapFolder(trimmedFolder);
          }

          setGeneratedMap(null);
          setMapEditorState((prev) => ({ ...prev, show: false }));
        } catch (error) {
          console.error(error);
          setStatus({
            type: 'danger',
            message: error.message || 'Failed to save map.',
          });
        } finally {
          setMapEditorSaving(false);
        }
      },
      [
        campaignId,
        encodedCampaign,
        mapEditorState,
        mapPrompt,
        generatedMap,
        previewMap,
        applyMapPayload,
        parseErrorMessage,
        setLastMapFolder,
      ]
    );

    const handleActivateMap = useCallback(
      async (mapId) => {
        const normalizedId =
          typeof mapId === 'string' && mapId.trim() !== '' ? mapId.trim() : null;
        if (!campaignId || !encodedCampaign || !normalizedId || normalizedId === activeMapId) {
          return;
        }

        setMapActionLoadingId(normalizedId);
        try {
          const response = await apiFetch(
            `/campaigns/${encodedCampaign}/maps/${encodeURIComponent(normalizedId)}`,
            {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ active: true }),
            }
          );

          if (!response.ok) {
            const message = await parseErrorMessage(response, 'Failed to activate map.');
            throw new Error(message);
          }

          let payload = null;
          try {
            payload = await response.json();
          } catch (error) {
            payload = null;
          }

          if (payload && typeof payload === 'object') {
            applyMapPayload(payload, { preferredSelectedId: normalizedId });
          }

          setStatus({ type: 'success', message: 'Active map updated.' });
        } catch (error) {
          console.error(error);
          setStatus({
            type: 'danger',
            message: error.message || 'Failed to activate map.',
          });
        } finally {
          setMapActionLoadingId(null);
        }
      },
      [campaignId, encodedCampaign, activeMapId, applyMapPayload, parseErrorMessage]
    );

    const handleDeleteMap = useCallback(
      async (mapId) => {
        const normalizedId =
          typeof mapId === 'string' && mapId.trim() !== '' ? mapId.trim() : null;
        if (!campaignId || !encodedCampaign || !normalizedId) {
          return;
        }

        const confirmed = window.confirm('Are you sure you want to delete this map?');
        if (!confirmed) {
          return;
        }

        setMapActionLoadingId(normalizedId);
        try {
          const response = await apiFetch(
            `/campaigns/${encodedCampaign}/maps/${encodeURIComponent(normalizedId)}`,
            {
              method: 'DELETE',
            }
          );

          if (!response.ok) {
            const message = await parseErrorMessage(response, 'Failed to delete map.');
            throw new Error(message);
          }

          let payload = null;
          try {
            payload = await response.json();
          } catch (error) {
            payload = null;
          }

          if (payload && typeof payload === 'object') {
            applyMapPayload(payload);
          } else {
            applyMapPayload({ maps: [], activeMapId: null, map: null });
          }

          setStatus({ type: 'success', message: 'Map deleted.' });
        } catch (error) {
          console.error(error);
          setStatus({
            type: 'danger',
            message: error.message || 'Failed to delete map.',
          });
        } finally {
          setMapActionLoadingId(null);
        }
      },
      [campaignId, encodedCampaign, applyMapPayload, parseErrorMessage]
    );
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
        case 'map':
          setGeneratedMap(null);
          setMapPrompt('');
          break;
        default:
          break;
      }
      setActiveResourceTab((current) => (current === key ? null : current));
    },
    [setActiveResourceTab, setPlayersSearch, setGeneratedMap, setMapPrompt]
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
            <Card.Body
              className="resource-tab-safe-area"
              style={{ overflowY: 'auto', maxHeight: '70vh' }}
            >
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
                      onClick={handleResetInitiative}
                      disabled={combatParticipantCount === 0}
                    >
                      Clear Initiative
                    </Button>
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
                            ({
                              character,
                              rowId,
                              participantInfo,
                              initiativeValue,
                              recordIndex,
                            }) => {
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

                              const sanitizeIdentifier = (value, fallbackIndex) =>
                                typeof value === 'string' && value.trim() !== ''
                                  ? value.trim().replace(/[^0-9A-Za-z_-]/g, '-')
                                  : `participant-${fallbackIndex}`;
                              const rowTestId = `combat-row-${sanitizeIdentifier(
                                resolvedRowId,
                                recordIndex
                              )}`;
                              const rowCurrentHp = toFiniteNumberOrNull(
                                character?.currentHp ??
                                  character?.hpCurrent ??
                                  character?.tempHealth ??
                                  character?.health ??
                                  participantInfo?.currentHp ??
                                  participantInfo?.hpCurrent ??
                                  participantInfo?.health
                              );
                              const rowMaxHp = toFiniteNumberOrNull(
                                character?.maxHp ??
                                  character?.hpMax ??
                                  character?.health ??
                                  participantInfo?.maxHp ??
                                  participantInfo?.hpMax ??
                                  participantInfo?.health
                              );
                              const rowTempHp = toFiniteNumberOrNull(
                                character?.tempHealth ?? participantInfo?.tempHealth
                              );

                              const rowDataAttributes = {
                                'data-testid': rowTestId,
                                ...(rowCurrentHp !== null
                                  ? { 'data-current-hp': rowCurrentHp }
                                  : {}),
                                ...(rowMaxHp !== null ? { 'data-max-hp': rowMaxHp } : {}),
                                ...(rowTempHp !== null ? { 'data-temp-hp': rowTempHp } : {}),
                              };

                              return (
                                <tr
                                  key={resolvedRowId || playerName}
                                  className={isActive ? 'table-success text-dark' : undefined}
                                  {...rowDataAttributes}
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
                renderItem={(character, itemIndex) => {
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

                  const identifierCandidates = [];
                  if (typeof character._id === 'string' && character._id.trim() !== '') {
                    identifierCandidates.push(character._id.trim());
                  }
                  if (
                    typeof character.characterId === 'string' &&
                    character.characterId.trim() !== ''
                  ) {
                    identifierCandidates.push(character.characterId.trim());
                  }
                  const primaryIdentifier = identifierCandidates[0] || `character-${itemIndex}`;
                  const sanitizeIdentifier = (value) =>
                    typeof value === 'string'
                      ? value.replace(/[^0-9A-Za-z_-]/g, '-')
                      : `character-${itemIndex}`;
                  const cardTestId = `character-card-${sanitizeIdentifier(primaryIdentifier)}`;

                  const { currentHp: derivedCurrentHp, maxHp: derivedMaxHp } =
                    calculateCharacterHitPoints(character);
                  const fallbackCurrentHp = toFiniteNumberOrNull(
                    character.currentHp ??
                      character.hpCurrent ??
                      character.tempHealth ??
                      character.health
                  );
                  const fallbackMaxHp = toFiniteNumberOrNull(
                    character.maxHp ?? character.hpMax ?? character.health
                  );
                  const normalizedCurrentHp = Number.isFinite(derivedCurrentHp)
                    ? derivedCurrentHp
                    : fallbackCurrentHp;
                  const normalizedMaxHp = Number.isFinite(derivedMaxHp)
                    ? derivedMaxHp
                    : fallbackMaxHp;
                  const normalizedTempHp = toFiniteNumberOrNull(character.tempHealth);

                  const cardDataAttributes = {
                    'data-testid': cardTestId,
                    ...(typeof primaryIdentifier === 'string'
                      ? { 'data-character-id': primaryIdentifier }
                      : {}),
                    ...(normalizedCurrentHp !== null
                      ? { 'data-current-hp': normalizedCurrentHp }
                      : {}),
                    ...(normalizedMaxHp !== null ? { 'data-max-hp': normalizedMaxHp } : {}),
                    ...(normalizedTempHp !== null ? { 'data-temp-hp': normalizedTempHp } : {}),
                  };

                  const detailRows = [
                    { label: 'Level', value: totalLevel },
                    { label: 'Classes', value: classSummary },
                  ];

                  return (
                    <Card
                      className="resource-card h-100 w-100 text-start"
                      {...cardDataAttributes}
                    >
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
            <Card.Body
              className="resource-tab-safe-area"
              style={{ overflowY: 'auto', maxHeight: '70vh' }}
            >
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
    <Tab.Pane eventKey="map">
      {activeResourceTab === 'map' && (
        <div className="text-center">
          <Card className="modern-card" data-testid="resource-map-card">
            <Card.Header className="modal-header">
              <div className="d-flex align-items-center justify-content-center w-100">
                <div className="d-flex flex-grow-1 justify-content-center">
                  <CloseButton
                    className="ms-auto"
                    variant="white"
                    onClick={() => handleCloseResourceTab('map')}
                    aria-label="Close map tab"
                  />
                </div>
              </div>
            </Card.Header>
            <Card.Body
              className="resource-tab-safe-area"
              style={{ overflowY: 'auto', maxHeight: '70vh' }}
            >
              <Card className="bg-dark bg-opacity-75 border border-secondary text-start mb-4">
                <Card.Header className="bg-transparent border-secondary text-light">
                  <h3 className="h5 mb-0">Campaign Maps</h3>
                </Card.Header>
                <Card.Body className="bg-transparent text-light">
                  {mapLoading ? (
                    <div className="d-flex justify-content-center py-4">
                      <Spinner animation="border" role="status" size="sm">
                        <span className="visually-hidden">Loading maps…</span>
                      </Spinner>
                    </div>
                  ) : (
                    <Row className="g-4 align-items-start">
                      <Col md={4} className="text-start">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h4 className="h6 mb-0">Saved Maps</h4>
                          <div className="d-flex flex-wrap gap-2">
                            <Button
                              variant="outline-light"
                              size="sm"
                              className="rounded-pill d-flex align-items-center"
                              onClick={handleOpenMapManager}
                              disabled={mapLoading}
                              data-testid="open-map-manager-button"
                            >
                              <FiList className="me-1" aria-hidden="true" />
                              Manage
                            </Button>
                            <Button
                              variant="outline-light"
                              size="sm"
                              className="rounded-pill d-flex align-items-center"
                              onClick={openCreateMapModal}
                              disabled={mapGenerating}
                              data-testid="create-map-button"
                            >
                              <FiPlus className="me-1" aria-hidden="true" />
                              New Map
                            </Button>
                          </div>
                        </div>
                        {groupedMaps.length > 0 ? (
                          <ListGroup
                            variant="flush"
                            className="bg-transparent map-list"
                            data-testid="map-list"
                          >
                            {groupedMaps.map((group) => {
                              const folderTestId = sanitizeTestIdValue(
                                group.key === UNGROUPED_FOLDER_KEY ? 'ungrouped' : group.key,
                                'folder'
                              );
                              const isExpanded =
                                typeof mapFolderExpansion[group.key] === 'boolean'
                                  ? mapFolderExpansion[group.key]
                                  : group.key === UNGROUPED_FOLDER_KEY;

                              return (
                                <React.Fragment key={group.key}>
                                  <ListGroup.Item
                                    className="bg-dark text-light border-secondary"
                                    data-testid={`map-folder-${folderTestId}-header`}
                                  >
                                    <div className="d-flex align-items-center justify-content-between gap-2">
                                      <button
                                        type="button"
                                        className="btn btn-link text-light text-decoration-none p-0 d-flex align-items-center gap-2"
                                        onClick={() => handleToggleMapFolder(group.key)}
                                        aria-expanded={isExpanded}
                                        data-testid={`map-folder-toggle-${folderTestId}`}
                                      >
                                        <span
                                          className="d-inline-flex align-items-center justify-content-center"
                                          aria-hidden="true"
                                        >
                                          {isExpanded ? (
                                            <FiChevronDown aria-hidden="true" />
                                          ) : (
                                            <FiChevronRight aria-hidden="true" />
                                          )}
                                        </span>
                                        <span className="fw-semibold text-start">
                                          {group.label}
                                        </span>
                                      </button>
                                      <Badge
                                        bg="secondary"
                                        pill
                                        data-testid={`map-folder-count-${folderTestId}`}
                                      >
                                        {group.maps.length}
                                        <span className="visually-hidden"> maps</span>
                                      </Badge>
                                    </div>
                                  </ListGroup.Item>
                                  {isExpanded &&
                                    group.maps.map((mapItem, index) => {
                                      const mapIdValue = normalizeMapId(mapItem?.mapId);
                                      const mapKey = mapIdValue || `map-${group.key}-${index}`;
                                      const isActive = Boolean(
                                        mapIdValue && mapIdValue === normalizedActiveMapId
                                      );
                                      const isSelected = Boolean(
                                        mapIdValue && normalizedSelectedMapId === mapIdValue
                                      );
                                      const isProcessing = Boolean(
                                        mapIdValue && mapActionLoadingId === mapIdValue
                                      );
                                      const title = getMapDisplayTitle(
                                        mapItem,
                                        DEFAULT_MAP_TITLE
                                      );
                                      const mapTestId = `map-list-item-${mapKey}`;

                                      return (
                                        <ListGroup.Item
                                          key={mapKey}
                                          action={Boolean(mapIdValue)}
                                          active={isSelected}
                                          onClick={() => mapIdValue && handleSelectMap(mapIdValue)}
                                          className="bg-dark text-light border-secondary ps-4"
                                          data-testid={mapTestId}
                                          data-folder-key={group.key}
                                        >
                                          <div className="d-flex justify-content-between align-items-start">
                                            <div className="fw-semibold">{title}</div>
                                            {isActive && (
                                              <Badge
                                                bg="success"
                                                className="ms-2"
                                                data-testid={`map-active-badge-${mapKey}`}
                                              >
                                                Active
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="d-flex flex-wrap gap-2 mt-3">
                                            <Button
                                              variant="outline-light"
                                              size="sm"
                                              disabled={!mapIdValue || isProcessing}
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                if (mapIdValue) {
                                                  openRenameMapModal(mapItem);
                                                }
                                              }}
                                              data-testid={`map-rename-button-${mapKey}`}
                                            >
                                              Rename
                                            </Button>
                                            <Button
                                              variant="outline-light"
                                              size="sm"
                                              disabled={!mapIdValue || isActive || isProcessing}
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                if (mapIdValue) {
                                                  handleActivateMap(mapIdValue);
                                                }
                                              }}
                                              data-testid={`map-activate-button-${mapKey}`}
                                            >
                                              {isActive ? 'Active' : 'Set Active'}
                                            </Button>
                                            <Button
                                              variant="outline-danger"
                                              size="sm"
                                              disabled={!mapIdValue || isProcessing}
                                              onClick={(event) => {
                                                event.stopPropagation();
                                                if (mapIdValue) {
                                                  handleDeleteMap(mapIdValue);
                                                }
                                              }}
                                              data-testid={`map-delete-button-${mapKey}`}
                                            >
                                              Delete
                                            </Button>
                                          </div>
                                        </ListGroup.Item>
                                      );
                                    })}
                                </React.Fragment>
                              );
                            })}
                          </ListGroup>
                        ) : (
                          <div className="text-muted small" data-testid="map-list-empty">
                            No maps saved yet.
                          </div>
                        )}
                      </Col>
                      <Col md={8} className="text-start">
                        <div className="mb-4 p-3 bg-dark rounded" data-testid="map-preview-card">
                          {displayedMap ? (
                            <CampaignMapBoard
                              map={displayedMap}
                              tokens={boardTokens}
                              disabled={!shouldShowCampaignTokens}
                              onTokenPositionChange={
                                shouldShowCampaignTokens ? handleTokenPositionChange : undefined
                              }
                              onTokenRemove={handleMapTokenRemove}
                            />
                          ) : (
                            <p className="text-muted mb-0">No map selected.</p>
                          )}
                        </div>
                        <Form.Group className="mb-3" controlId="map-generation-prompt">
                          <Form.Label className="text-light">Generation Prompt</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={4}
                            placeholder="Describe the map you want to generate"
                            value={mapPrompt}
                            onChange={(event) => setMapPrompt(event.target.value)}
                            disabled={mapGenerating}
                          />
                        </Form.Group>
                        <div className="d-flex flex-wrap gap-2 justify-content-end">
                          <Button
                            variant="outline-light"
                            className="rounded-pill"
                            onClick={handleGenerateMap}
                            disabled={mapGenerating || mapLoading}
                          >
                            {mapGenerating ? (
                              <>
                                <Spinner
                                  as="span"
                                  animation="border"
                                  size="sm"
                                  role="status"
                                  aria-hidden="true"
                                  className="me-2"
                                />
                                Generating…
                              </>
                            ) : (
                              'Generate Map'
                            )}
                          </Button>
                          <Button
                            variant="outline-light"
                            className="rounded-pill"
                            onClick={() => handleSaveMap('create')}
                            disabled={
                              mapSaving ||
                              mapLoading ||
                              !(generatedMap || previewMap || campaignMap)
                            }
                            data-testid="save-map-new-button"
                          >
                            {mapSaving && mapSaveMode === 'create' ? (
                              <>
                                <Spinner
                                  as="span"
                                  animation="border"
                                  size="sm"
                                  role="status"
                                  aria-hidden="true"
                                  className="me-2"
                                />
                                Saving…
                              </>
                            ) : (
                              'Save as New Map'
                            )}
                          </Button>
                          <Button
                            variant="primary"
                            className="rounded-pill"
                            onClick={() => handleSaveMap('update')}
                            disabled={
                              mapSaving ||
                              mapLoading ||
                              (!generatedMap && !campaignMap)
                            }
                            data-testid="save-map-update-button"
                          >
                            {mapSaving && mapSaveMode === 'update' ? (
                              <>
                                <Spinner
                                  as="span"
                                  animation="border"
                                  size="sm"
                                  role="status"
                                  aria-hidden="true"
                                  className="me-2"
                                />
                                Saving…
                              </>
                            ) : (
                              'Overwrite Active Map'
                            )}
                          </Button>
                        </div>
                      </Col>
                    </Row>
                  )}
                </Card.Body>
              </Card>
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
            <Card.Body
              className="resource-tab-safe-area"
              style={{ overflowY: 'auto', maxHeight: '70vh' }}
            >
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
                      <div className="d-flex flex-column flex-md-row gap-2 mt-3 mt-md-0">
                        <Button
                          type="submit"
                          variant="outline-light"
                          className="rounded-pill"
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
                        <Button
                          type="button"
                          variant="outline-light"
                          className="rounded-pill"
                          onClick={() => setShowDiceRoller(true)}
                        >
                          Roll
                        </Button>
                      </div>
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
                    <Card className="bg-dark border border-secondary text-start text-light mt-3">
                      <Card.Body>
                        <Card.Title className="h5 mb-1 text-light">{selectedMonster.name}</Card.Title>
                        <Card.Subtitle className="text-white-50 small mb-3">
                          {[selectedMonster.size, selectedMonster.type].filter(Boolean).join(' ') || '—'}
                          {selectedMonster.challengeRating !== null && selectedMonster.challengeRating !== undefined
                            ? ` • CR ${selectedMonster.challengeRating}`
                            : ''}
                        </Card.Subtitle>
                        <div className="d-grid gap-1">
                          <Card.Text className="small mb-1 text-light fw-semibold text-break">
                            <span
                              className="text-white-50 text-uppercase fw-semibold me-1"
                              aria-hidden="true"
                            >
                              Size:
                            </span>
                            <span aria-hidden="true">
                              {selectedMonster.size || selectedMonster.type || '—'}
                            </span>
                          </Card.Text>
                          <Card.Text className="small mb-1 text-light fw-semibold text-break">
                            <span className="text-white-50 text-uppercase fw-semibold me-1" aria-hidden="true">
                              AC:
                            </span>
                            <span aria-hidden="true">{formatArmorClass(selectedMonster.armorClass)}</span>
                          </Card.Text>
                          <Card.Text className="small mb-1 text-light fw-semibold text-break">
                            <span className="text-white-50 text-uppercase fw-semibold me-1" aria-hidden="true">
                              HP:
                            </span>
                            <span aria-hidden="true">{selectedMonster.hitPoints ?? '—'}</span>
                          </Card.Text>
                          <Card.Text className="small mb-1 text-light fw-semibold text-break">
                            <span className="text-white-50 text-uppercase fw-semibold me-1" aria-hidden="true">
                              Hit Dice:
                            </span>
                            <span aria-hidden="true">{selectedMonster.hitDice || '—'}</span>
                          </Card.Text>
                          <Card.Text className="small mb-1 text-light fw-semibold text-break">
                            <span className="text-white-50 text-uppercase fw-semibold me-1" aria-hidden="true">
                              Speed:
                            </span>
                            <span aria-hidden="true">{formatSpeed(selectedMonster.speed)}</span>
                          </Card.Text>
                          <Card.Text className="small mb-1 text-light fw-semibold text-break">
                            <span className="text-white-50 text-uppercase fw-semibold me-1" aria-hidden="true">
                              Alignment:
                            </span>
                            <span aria-hidden="true">{selectedMonster.alignment || '—'}</span>
                          </Card.Text>
                          <Card.Text className="small mb-1 text-light fw-semibold text-break">
                            <span className="text-white-50 text-uppercase fw-semibold me-1" aria-hidden="true">
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
                  const maxHpValue = toFiniteNumberOrNull(enemy.maxHp ?? enemy.hitPoints);
                  const currentHpCandidate =
                    enemy.currentHp !== undefined
                      ? toFiniteNumberOrNull(enemy.currentHp)
                      : null;
                  const resolvedCurrentHp =
                    currentHpCandidate !== null
                      ? currentHpCandidate
                      : maxHpValue !== null
                        ? maxHpValue
                        : null;
                  const sizeDisplay = enemy.size || enemy.displayType || '—';
                  const healthSummary =
                    maxHpValue !== null
                      ? `${resolvedCurrentHp !== null ? resolvedCurrentHp : '—'} / ${maxHpValue}`
                      : resolvedCurrentHp !== null
                        ? `${resolvedCurrentHp}`
                        : '—';
                  const adjustmentValue = enemyHealthAdjustments[enemy.enemyId] ?? '';
                  const isSavingHealth = Boolean(enemyHealthSaving[enemy.enemyId]);
                  const damagingActions = Array.isArray(enemy.actions)
                    ? enemy.actions.filter((action) => Boolean(getEnemyActionDamageString(action)))
                    : [];

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
                              Size:
                            </span>
                            <span aria-hidden="true">{sizeDisplay}</span>
                          </Card.Text>
                          <Card.Text className="small mb-1 text-body fw-semibold text-break">
                            <span className="text-muted text-uppercase fw-semibold me-1" aria-hidden="true">
                              AC:
                            </span>
                            <span aria-hidden="true">{formatArmorClass(enemy.armorClass)}</span>
                          </Card.Text>
                          <Card.Text className="small mb-1 text-body fw-semibold text-break">
                            <span className="text-muted text-uppercase fw-semibold me-1" aria-hidden="true">
                              Max HP:
                            </span>
                            <span aria-hidden="true">{maxHpValue !== null ? maxHpValue : '—'}</span>
                          </Card.Text>
                          <Card.Text className="small mb-1 text-body fw-semibold text-break">
                            <span className="text-muted text-uppercase fw-semibold me-1" aria-hidden="true">
                              Current HP:
                            </span>
                            <span aria-hidden="true">{healthSummary}</span>
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
                        {damagingActions.length > 0 && (
                          <div className="mt-2">
                            <h6 className="text-uppercase text-muted small fw-semibold mb-1">Actions</h6>
                            <div className="d-flex flex-column gap-2">
                              {damagingActions.map((action, actionIndex) => {
                                const attackBonusDisplay = formatAttackBonus(action?.attack_bonus);
                                const damageLine = getEnemyActionDamageString(action);
                                const actionLabel = action?.name || 'Action';
                                const actionKey = `${enemy.enemyId || 'enemy'}-${actionLabel}-${actionIndex}`;
                                const isLatestRoll =
                                  latestEnemyRoll?.enemyId === enemy.enemyId &&
                                  latestEnemyRoll?.actionName === actionLabel;

                                return (
                                  <div
                                    key={actionKey}
                                    className="border rounded p-2 bg-dark bg-opacity-10 text-body"
                                  >
                                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
                                      <div className="flex-grow-1">
                                        <div className="fw-semibold small text-body">{actionLabel}</div>
                                        <div className="small text-muted">
                                          Attack Bonus: {attackBonusDisplay ?? '—'}
                                        </div>
                                        <div className="small text-muted">Damage: {damageLine || '—'}</div>
                                      </div>
                                      <div className="d-flex justify-content-start justify-content-sm-end">
                                        <Button
                                          variant="outline-primary"
                                          size="sm"
                                          onClick={() => handleEnemyDamageRoll(enemy, action)}
                                        >
                                          Roll
                                        </Button>
                                      </div>
                                    </div>
                                    {isLatestRoll && latestEnemyRoll?.breakdown && (
                                      <div className="mt-2 small fw-semibold text-primary">
                                        {`Result: ${latestEnemyRoll.total} damage (${latestEnemyRoll.breakdown})`}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <div className="mt-2">
                          <h6 className="text-uppercase text-muted small fw-semibold mb-1">Health</h6>
                          <div className="d-flex flex-column gap-2">
                            <div className="d-flex justify-content-between small text-body fw-semibold">
                              <span>Current:</span>
                              <span>{healthSummary}</span>
                            </div>
                            <div className="health-adjustment-group d-flex flex-column flex-sm-row gap-2 gap-sm-0 w-100">
                              <Button
                                variant="outline-danger"
                                size="sm"
                                className="health-adjustment-button"
                                onClick={() => handleApplyEnemyHealthAdjustment(enemy.enemyId, -1)}
                                disabled={isSavingHealth}
                              >
                                Damage
                              </Button>
                              <Form.Control
                                value={adjustmentValue}
                                onChange={(e) =>
                                  handleEnemyAdjustmentInputChange(enemy.enemyId, e.target.value)
                                }
                                placeholder="Amount"
                                type="number"
                                min="0"
                                aria-label={`Adjust ${enemy.name || 'enemy'} health amount`}
                                disabled={isSavingHealth}
                                size="sm"
                                className="health-adjustment-input flex-sm-grow-1"
                              />
                              <Button
                                variant="outline-success"
                                size="sm"
                                className="health-adjustment-button"
                                onClick={() => handleApplyEnemyHealthAdjustment(enemy.enemyId, 1)}
                                disabled={isSavingHealth}
                              >
                                Heal
                              </Button>
                            </div>
                            <div className="d-flex justify-content-end">
                              <Button
                                variant="outline-light"
                                size="sm"
                                onClick={() => handleResetEnemyHealth(enemy.enemyId)}
                                disabled={isSavingHealth || maxHpValue === null}
                              >
                                Reset to Max
                              </Button>
                            </div>
                          </div>
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
                      <Card.Footer className="resource-card-footer-safe-area d-flex flex-wrap gap-2 justify-content-end">
                        <Button
                          variant={inCombat ? 'success' : 'outline-primary'}
                          size="sm"
                          onClick={() => handleToggleParticipant(enemy.enemyId)}
                        >
                          {inCombat ? 'Remove from Combat' : 'Add to Combat'}
                        </Button>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() =>
                            handleOpenMapPlacement(
                              enemy.enemyId,
                              enemy.name || enemy.displayType || enemy.enemyId
                            )
                          }
                        >
                          Place on Map
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
            <Card.Body
              className="resource-tab-safe-area"
              style={{ overflowY: 'auto', maxHeight: '70vh' }}
            >
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
            <Card.Body
              className="resource-tab-safe-area"
              style={{ maxHeight: '70vh', overflowY: 'auto' }}
            >
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
            <Card.Body
              className="resource-tab-safe-area"
              style={{ overflowY: 'auto', maxHeight: '70vh' }}
            >
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
            <Card.Body
              className="resource-tab-safe-area"
              style={{ overflowY: 'auto', maxHeight: '70vh' }}
            >
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
        <D20RollerModal
          show={showDiceRoller}
          onHide={() => setShowDiceRoller(false)}
          diceColor={activeDiceColor}
        />
      </Container>

      <Modal
        show={mapEditorState.show}
        onHide={handleCloseMapEditor}
        centered
        data-testid="map-editor-modal"
        contentClassName="bg-dark text-light"
      >
        <Form onSubmit={handleSubmitMapEditor}>
          <Modal.Header closeButton closeVariant="white">
            <Modal.Title>
              {mapEditorState.mode === 'rename' ? 'Rename Map' : 'Create Map'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3" controlId="map-editor-title">
              <Form.Label>
                Title <span className="text-danger" aria-hidden="true">*</span>
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter map title"
                value={mapEditorState.title}
                onChange={handleMapEditorInputChange('title')}
                disabled={mapEditorSaving}
                required
                aria-required="true"
                isInvalid={Boolean(mapEditorErrors.title)}
              />
              {mapEditorErrors.title && (
                <Form.Control.Feedback type="invalid" className="d-block">
                  {mapEditorErrors.title}
                </Form.Control.Feedback>
              )}
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label htmlFor="map-editor-folder-select">Folder</Form.Label>
              <Form.Select
                id="map-editor-folder-select"
                value={mapEditorState.folderSelection}
                onChange={handleMapEditorFolderSelectionChange}
                disabled={mapEditorSaving}
                aria-describedby="map-editor-folder-help"
                data-testid="map-editor-folder-select"
              >
                <option value="">No folder</option>
                {availableMapFolders.map((folderName) => (
                  <option value={folderName} key={folderName}>
                    {folderName}
                  </option>
                ))}
                <option value={NEW_FOLDER_OPTION_VALUE}>Create new folder…</option>
              </Form.Select>
              {mapEditorState.folderSelection === NEW_FOLDER_OPTION_VALUE ? (
                <div className="mt-2">
                  <Form.Label htmlFor="map-editor-folder-input">New folder name</Form.Label>
                  <Form.Control
                    id="map-editor-folder-input"
                    type="text"
                    placeholder="Enter folder name"
                    value={mapEditorState.folder}
                    onChange={handleMapEditorInputChange('folder')}
                    disabled={mapEditorSaving}
                    aria-describedby="map-editor-folder-help"
                    data-testid="map-editor-folder-input"
                  />
                </div>
              ) : null}
              <Form.Text id="map-editor-folder-help" className="text-muted">
                Choose an existing folder or create a new one.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3" controlId="map-editor-image-url">
              <Form.Label>
                Image URL <span className="text-danger" aria-hidden="true">*</span>
              </Form.Label>
              <Form.Control
                type="url"
                placeholder="https://example.com/map.png"
                value={mapEditorState.imageUrl}
                onChange={handleMapEditorInputChange('imageUrl')}
                disabled={mapEditorSaving}
                aria-describedby={imageSourceDescribedBy}
                isInvalid={Boolean(mapEditorErrors.imageSource)}
              />
            </Form.Group>
            <Form.Group className="mb-3" controlId="map-editor-image-file">
              <Form.Label>
                Image File <span className="text-danger" aria-hidden="true">*</span>
              </Form.Label>
              <Form.Control
                key={mapEditorState.fileInputKey}
                type="file"
                accept="image/*"
                onChange={handleMapEditorFileChange}
                disabled={mapEditorSaving}
                aria-describedby={imageSourceDescribedBy}
                isInvalid={Boolean(mapEditorErrors.imageSource)}
              />
            </Form.Group>
            <Form.Text
              id="map-editor-image-requirement"
              className="text-muted d-block mb-2"
            >
              Provide an image URL or upload a file. At least one source is required.
            </Form.Text>
            {mapEditorErrors.imageSource && (
              <div
                id="map-editor-image-error"
                className="text-danger small mb-3"
                role="alert"
              >
                {mapEditorErrors.imageSource}
              </div>
            )}
            <Form.Group className="mb-3" controlId="map-editor-alt-text">
              <Form.Label>
                Alt Text
                {mapEditorState.mode === 'create' && (
                  <span className="text-danger" aria-hidden="true">*</span>
                )}
              </Form.Label>
              <Form.Control
                type="text"
                placeholder="Describe the map image"
                value={mapEditorState.altText}
                onChange={handleMapEditorInputChange('altText')}
                disabled={mapEditorSaving}
                required={mapEditorState.mode === 'create'}
                aria-required={mapEditorState.mode === 'create'}
                isInvalid={Boolean(mapEditorErrors.altText)}
              />
              {mapEditorErrors.altText && (
                <Form.Control.Feedback type="invalid" className="d-block">
                  {mapEditorErrors.altText}
                </Form.Control.Feedback>
              )}
            </Form.Group>
            {mapEditorState.mode === 'create' && (
              <Form.Check
                type="switch"
                id="map-editor-activate"
                label="Activate after saving"
                checked={Boolean(mapEditorState.activateOnSave)}
                onChange={handleMapEditorActivateChange}
                disabled={mapEditorSaving}
              />
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline-light"
              onClick={handleCloseMapEditor}
              disabled={mapEditorSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={mapEditorSaving}
              data-testid="map-editor-submit-button"
            >
              {mapEditorSaving ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Saving…
                </>
              ) : mapEditorState.mode === 'rename' ? (
                'Save Changes'
              ) : (
                'Create Map'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <MapModal
        show={showMapManager}
        onHide={handleCloseMapManager}
        title="Campaign Map Manager"
        maps={maps}
        map={previewMap || campaignMap}
        activeMapId={activeMapId}
        selectedMapId={selectedMapId}
        onSelectMap={handleSelectMap}
        onActivateMap={handleActivateMap}
        onDeleteMap={handleDeleteMap}
        isLoading={mapLoading}
        actionInProgressId={mapActionLoadingId}
        activeCharacterId={activeParticipant?.characterId}
      />

      <MapModal
        show={mapPlacementState.show}
        onHide={handleCloseMapPlacement}
        title={
          mapPlacementState.enemyName
            ? `Place ${mapPlacementState.enemyName}`
            : 'Place Enemy on Map'
        }
        maps={maps}
        map={campaignMap}
        activeMapId={activeMapId}
        selectedMapId={selectedMapId}
        onSelectMap={handleSelectMap}
        tokensByMapId={modalTokensByMapId}
        currentCharacterId={mapPlacementState.enemyId}
        activeCharacterId={activeParticipant?.characterId}
        characterLookup={tokenMetaById}
        onTokenMove={handleMapModalTokenMove}
        onTokenRemove={handleMapTokenRemove}
        readOnly={false}
      />

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
