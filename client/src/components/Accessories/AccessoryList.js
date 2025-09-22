import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Row, Col, Alert, Button, Badge, Modal } from 'react-bootstrap';
import {
  GiNecklace,
  GiBelt,
  GiBracers,
  GiCape,
  GiSteampunkGoggles,
  GiCarnivalMask,
  GiRing,
  GiWrappedHeart,
  GiTreasureMap,
} from 'react-icons/gi';
import apiFetch from '../../utils/apiFetch';
import { STATS } from '../Zombies/statSchema';
import { SKILLS } from '../Zombies/skillSchema';
import { EQUIPMENT_SLOT_LAYOUT } from '../Zombies/attributes/equipmentSlots';

const STAT_LABELS = STATS.reduce((acc, { key, label }) => {
  acc[key] = label;
  return acc;
}, {});

const SKILL_LABELS = SKILLS.reduce((acc, { key, label }) => {
  acc[key] = label;
  return acc;
}, {});

const SLOT_LABELS = EQUIPMENT_SLOT_LAYOUT.flat().reduce((acc, slot) => {
  if (slot?.key) {
    acc[slot.key] = slot.label || slot.key;
  }
  return acc;
}, {});

const categoryIcons = {
  amulet: GiNecklace,
  belt: GiBelt,
  bracelet: GiBracers,
  brooch: GiTreasureMap,
  cape: GiCape,
  cloak: GiCape,
  goggles: GiSteampunkGoggles,
  mask: GiCarnivalMask,
  ring: GiRing,
  sash: GiBelt,
  wrap: GiWrappedHeart,
};

const renderBonuses = (bonuses, labels) =>
  Object.entries(bonuses || {})
    .map(([k, v]) => `${labels[k] || k}: ${v}`)
    .join(', ');

const formatSlots = (slots) => {
  if (!Array.isArray(slots) || slots.length === 0) return '—';
  return slots
    .map((slot) => SLOT_LABELS[slot] || slot)
    .filter(Boolean)
    .join(', ');
};

const buildAccessoryOwnershipMap = (initialAccessories) => {
  const map = new Map();
  if (!Array.isArray(initialAccessories)) return map;

  initialAccessories.forEach((entry) => {
    if (!entry) return;
    if (typeof entry === 'object' && entry.owned === false) return;

    let name = '';
    if (typeof entry === 'string') {
      name = entry;
    } else if (Array.isArray(entry)) {
      [name] = entry;
    } else if (typeof entry === 'object') {
      name =
        entry.name ||
        entry.displayName ||
        entry.itemName ||
        entry.accessoryName ||
        '';
    }

    if (typeof name !== 'string') return;

    const key = name.trim().toLowerCase();
    if (!key) return;

    const existing = map.get(key);
    const nextCount = (existing?.count ?? 0) + 1;
    const normalizedItem =
      existing?.item ||
      (typeof entry === 'object' && !Array.isArray(entry)
        ? entry
        : { name });

    map.set(key, { item: normalizedItem, count: nextCount });
  });

  return map;
};

function normalizeAccessorySlots(slots) {
  if (!Array.isArray(slots)) return [];
  return slots
    .map((slot) => (typeof slot === 'string' ? slot.trim() : ''))
    .filter(Boolean);
}

function normalizeAccessoryBonuses(bonuses) {
  return bonuses && typeof bonuses === 'object' ? bonuses : {};
}

/**
 * @param {{
 *   campaign?: string,
 *   onChange?: (accessories: any[]) => void,
 *   initialAccessories?: any[],
 *   show?: boolean,
 *   embedded?: boolean,
 *   onAddToCart?: (accessory: any) => void,
 *   ownedOnly?: boolean,
 *   cartCounts?: Record<string, number> | null,
 * }} props
 */
function AccessoryList({
  campaign,
  onChange,
  initialAccessories = [],
  show = true,
  embedded = false,
  onAddToCart = () => {},
  ownedOnly = false,
  cartCounts = null,
}) {
  const [accessories, setAccessories] =
    useState/** @type {Record<string, any & { owned?: boolean, ownedCount?: number, displayName?: string }> | null} */(null);
  const [error, setError] = useState(null);
  const [unknownAccessories, setUnknownAccessories] = useState([]);
  const [notesAccessory, setNotesAccessory] = useState(null);
  const requestIdRef = useRef(0);

  const initialAccessoriesArray = Array.isArray(initialAccessories)
    ? initialAccessories
    : [];

  const ownershipMap = useMemo(
    () => buildAccessoryOwnershipMap(initialAccessoriesArray),
    [initialAccessoriesArray]
  );

  useEffect(() => {
    if (!show) return undefined;

    requestIdRef.current += 1;
    const currentRequestId = requestIdRef.current;
    let cancelled = false;

    async function fetchAccessories() {
      try {
        const [srd, custom] = await Promise.all([
          apiFetch('/accessories').then((res) => {
            if (!res.ok) {
              const err = new Error(`${res.status} ${res.statusText}`);
              err.status = res.status;
              err.statusText = res.statusText;
              throw err;
            }
            return res.json();
          }),
          campaign
            ? apiFetch(`/equipment/accessories/${campaign}`).then((res) => {
                if (!res.ok) {
                  const err = new Error(`${res.status} ${res.statusText}`);
                  err.status = res.status;
                  err.statusText = res.statusText;
                  throw err;
                }
                return res.json();
              })
            : Promise.resolve([]),
        ]);

        const customMap = Array.isArray(custom)
          ? custom.reduce((acc, accessory) => {
              const key = (accessory?.name || '').toLowerCase();
              if (!key) return acc;
              acc[key] = {
                name: key,
                displayName: accessory.name,
                category: accessory.category || 'custom',
                targetSlots: normalizeAccessorySlots(accessory.targetSlots),
                rarity: accessory.rarity || '',
                weight: accessory.weight ?? null,
                cost: accessory.cost ?? '',
                statBonuses: normalizeAccessoryBonuses(accessory.statBonuses),
                skillBonuses: normalizeAccessoryBonuses(accessory.skillBonuses),
                ...(accessory.notes ? { notes: accessory.notes } : {}),
              };
              return acc;
            }, {})
          : {};

        const srdMap =
          srd && typeof srd === 'object' && !Array.isArray(srd) ? srd : {};

        const all = { ...srdMap, ...customMap };
        const keys = Object.keys(all);
        const unknown = [];

        const withOwnership = keys.reduce((acc, key) => {
          const base = all[key];
          const displayKey = (base.displayName || base.name || '').toLowerCase();
          const ownedEntry =
            ownershipMap.get(key) ||
            (displayKey && displayKey !== key
              ? ownershipMap.get(displayKey)
              : undefined);
          const ownedCount = ownedEntry?.count ?? 0;
          acc[key] = {
            ...base,
            name: key,
            displayName: base.displayName || base.name,
            targetSlots: normalizeAccessorySlots(base.targetSlots),
            statBonuses: normalizeAccessoryBonuses(base.statBonuses),
            skillBonuses: normalizeAccessoryBonuses(base.skillBonuses),
            ownedCount,
            owned: ownedCount > 0,
          };
          return acc;
        }, {});

        initialAccessoriesArray.forEach((entry) => {
          const rawName =
            typeof entry === 'string'
              ? entry
              : Array.isArray(entry)
              ? entry[0]
              : entry?.name ||
                entry?.displayName ||
                entry?.itemName ||
                entry?.accessoryName ||
                '';
          const key = String(rawName || '').trim().toLowerCase();
          if (!key) return;
          if (!withOwnership[key]) {
            const displayKey =
              typeof entry === 'object'
                ? String(entry.displayName || '').trim().toLowerCase()
                : '';
            if (!displayKey || !withOwnership[displayKey]) {
              unknown.push(rawName);
            }
          }
        });

        if (cancelled || requestIdRef.current !== currentRequestId) {
          return;
        }

        setAccessories(withOwnership);
        setUnknownAccessories(Array.from(new Set(unknown)));
        setError(null);
        if (typeof onChange === 'function') {
          onChange(Object.values(withOwnership));
        }
      } catch (err) {
        console.error('Failed to load accessories:', err?.message, err?.status);
        if (cancelled || requestIdRef.current !== currentRequestId) {
          return;
        }
        setAccessories({});
        const { status = 0, statusText = '', message = err?.message || 'Unknown error' } =
          err || {};
        setError({ status, statusText, message });
      }
    }

    fetchAccessories();
    return () => {
      cancelled = true;
    };
  }, [campaign, initialAccessories, onChange, ownershipMap, show]);

  useEffect(() => {
    setAccessories((prev) => {
      if (!prev) return prev;
      let changed = false;
      const next = Object.entries(prev).reduce((acc, [key, accessory]) => {
        const displayKey = (accessory.displayName || accessory.name || '').toLowerCase();
        const ownedEntry =
          ownershipMap.get(key) ||
          (displayKey && displayKey !== key
            ? ownershipMap.get(displayKey)
            : undefined);
        const ownedCount = ownedEntry?.count ?? 0;
        const owned = ownedCount > 0;
        if (accessory.owned !== owned || (accessory.ownedCount ?? 0) !== ownedCount) {
          changed = true;
          acc[key] = { ...accessory, owned, ownedCount };
        } else {
          acc[key] = accessory;
        }
        return acc;
      }, /** @type {Record<string, any & { owned?: boolean, ownedCount?: number }>} */ ({}));
      return changed ? next : prev;
    });
  }, [ownershipMap]);

  if (!accessories) {
    return null;
  }

  const handleAddToCart = (accessory) => () => {
    const payload = {
      ...accessory,
      type: 'accessory',
    };
    onAddToCart(payload);
  };

  const getCartCount = (accessory) => {
    if (!cartCounts) return 0;
    const key = `accessory::${String(accessory?.name || '').toLowerCase()}`;
    return cartCounts[key] ?? 0;
  };

  const handleShowNotes = (accessory) => () => setNotesAccessory(accessory);
  const handleCloseNotes = () => setNotesAccessory(null);

  const bodyStyle = embedded ? undefined : { overflowY: 'auto', maxHeight: '70vh' };

  const filteredEntries = Object.entries(accessories).filter(([, accessory]) =>
    ownedOnly ? (accessory.ownedCount ?? 0) > 0 : true
  );

  const expandedEntries = ownedOnly
    ? filteredEntries.flatMap(([key, accessory]) => {
        const count = accessory.ownedCount ?? 0;
        if (count <= 0) return [];
        if (count === 1) {
          return [
            {
              reactKey: key,
              dataKey: key,
              accessory,
              copyIndex: 0,
              copyCount: 1,
            },
          ];
        }
        return Array.from({ length: count }, (_, index) => ({
          reactKey: `${key}-${index}`,
          dataKey: key,
          accessory,
          copyIndex: index,
          copyCount: count,
        }));
      })
    : filteredEntries.map(([key, accessory]) => ({
        reactKey: key,
        dataKey: key,
        accessory,
        copyIndex: 0,
        copyCount: accessory.ownedCount ?? 0,
      }));

  const bodyContent = (
    <>
      {error && (
        <Alert variant="danger">
          {`Failed to load accessories: ${
            error.message || `${error.status} ${error.statusText}`
          }`}
        </Alert>
      )}
      {unknownAccessories.length > 0 && (
        <Alert variant="warning">
          Unrecognized accessories from server: {unknownAccessories.join(', ')}
        </Alert>
      )}
      {expandedEntries.length === 0 ? (
        <div className="text-center text-muted py-3">
          {ownedOnly
            ? 'No accessories in inventory.'
            : 'No accessories available.'}
        </div>
      ) : (
        <Row className="row-cols-2 row-cols-lg-3 g-3">
          {expandedEntries.map(({
            reactKey,
            accessory,
            copyIndex,
            copyCount,
          }) => {
            const categoryKey =
              typeof accessory.category === 'string'
                ? accessory.category.toLowerCase()
                : '';
            const Icon = categoryIcons[categoryKey] || GiTreasureMap;
            return (
              <Col key={reactKey}>
                <Card className="item-card h-100">
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex justify-content-center mb-2">
                      <Icon size={40} title={accessory.category} />
                    </div>
                    <Card.Title>
                      {accessory.displayName || accessory.name}
                    </Card.Title>
                    <Card.Text>Category: {accessory.category}</Card.Text>
                    <Card.Text>Slots: {formatSlots(accessory.targetSlots)}</Card.Text>
                    {accessory.rarity ? (
                      <Card.Text>Rarity: {accessory.rarity}</Card.Text>
                    ) : null}
                    <Card.Text>Weight: {accessory.weight ?? '—'}</Card.Text>
                    <Card.Text>Cost: {accessory.cost || '—'}</Card.Text>
                    {renderBonuses(accessory.statBonuses, STAT_LABELS) && (
                      <Card.Text>
                        Stat Bonuses: {renderBonuses(
                          accessory.statBonuses,
                          STAT_LABELS
                        )}
                      </Card.Text>
                    )}
                    {renderBonuses(accessory.skillBonuses, SKILL_LABELS) && (
                      <Card.Text>
                        Skill Bonuses: {renderBonuses(
                          accessory.skillBonuses,
                          SKILL_LABELS
                        )}
                      </Card.Text>
                    )}
                    {(accessory.notes || (ownedOnly && copyCount > 1)) && (
                      <div className="mt-auto d-flex flex-column align-items-start gap-1">
                        {accessory.notes && (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0"
                            onClick={handleShowNotes(accessory)}
                          >
                            Notes
                          </Button>
                        )}
                        {ownedOnly && copyCount > 1 && (
                          <span className="text-muted small">
                            Copy {copyIndex + 1} of {copyCount}
                          </span>
                        )}
                      </div>
                    )}
                  </Card.Body>
                  {!ownedOnly && (
                    <Card.Footer className="d-flex justify-content-center">
                      <div className="d-flex align-items-center gap-2">
                        <Button size="sm" onClick={handleAddToCart(accessory)}>
                          Add to Cart
                        </Button>
                        {cartCounts ? (
                          <Badge bg="secondary" pill>
                            {`In Cart: ${getCartCount(accessory)}`}
                          </Badge>
                        ) : null}
                      </div>
                    </Card.Footer>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </>
  );

  const body = embedded ? (
    bodyContent
  ) : (
    <Card.Body style={bodyStyle}>{bodyContent}</Card.Body>
  );

  const modal = (
    <Modal show={!!notesAccessory} onHide={handleCloseNotes} size="sm">
      <Modal.Header closeButton>
        <Modal.Title>
          {notesAccessory?.displayName || notesAccessory?.name}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>{notesAccessory?.notes}</Modal.Body>
    </Modal>
  );

  if (embedded) {
    return (
      <>
        {body}
        {modal}
      </>
    );
  }

  return (
    <Card className="item-card">
      {body}
      {modal}
    </Card>
  );
}

export default AccessoryList;
