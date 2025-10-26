import React, { useEffect, useMemo, useState } from 'react';
import { Card, Form, Alert, Row, Col, Button, Badge, Modal } from 'react-bootstrap';
import {
  GiLeatherArmor,
  GiBreastplate,
  GiChainMail,
  GiShield,
  GiArmorVest,
} from 'react-icons/gi';
import apiFetch from '../../utils/apiFetch';

/** @typedef {import('../../../../types/armor').Armor} Armor */

/**
 * List of armor with proficiency toggles and cart actions.
 * @param {{
 *   campaign?: string,
 *   onChange?: (armor: Armor[]) => void,
 *   initialArmor?: Armor[],
 *   characterId?: string,
 *   show?: boolean,
 *   strength?: number,
 *   embedded?: boolean,
 *   onAddToCart?: (armor: Armor & { type?: string }) => void,
 *   ownedOnly?: boolean,
 *   cartCounts?: Record<string, number> | null,
 *   hiddenKeys?: Set<string> | string[] | Record<string, boolean> | null,
 * }} props
 */
const EMPTY_ARRAY = Object.freeze([]);

const normalizeArmorName = (value) => {
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }
  return '';
};

const extractArmorEntryName = (entry) => {
  if (!entry) return '';
  if (typeof entry === 'string') {
    return normalizeArmorName(entry);
  }
  if (Array.isArray(entry)) {
    return extractArmorEntryName(entry[0]);
  }
  if (typeof entry === 'object') {
    return (
      normalizeArmorName(entry.displayName) ||
      normalizeArmorName(entry.armorName) ||
      normalizeArmorName(entry.name)
    );
  }
  return '';
};

const buildMatchKeySet = (piece, dataKey) => {
  const keys = new Set();
  const addKey = (value) => {
    const normalized = normalizeArmorName(value);
    if (normalized) {
      keys.add(normalized);
    }
  };
  addKey(dataKey);
  if (piece) {
    addKey(piece.displayName);
    addKey(piece.armorName);
    addKey(piece.name);
  }
  return keys;
};

const removeFirstMatchingEntry = (entries, piece, dataKey) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return entries;
  }
  const matchKeys = buildMatchKeySet(piece, dataKey);
  if (matchKeys.size === 0) {
    return entries;
  }
  const index = entries.findIndex((entry) => matchKeys.has(extractArmorEntryName(entry)));
  if (index === -1) {
    return entries;
  }
  const next = entries.slice();
  next.splice(index, 1);
  return next;
};

const buildArmorOwnershipMap = (initialArmor) => {
  const map = new Map();
  if (!Array.isArray(initialArmor)) return map;

  initialArmor.forEach((entry) => {
    if (!entry) return;
    if (typeof entry === 'object' && entry.owned === false) return;

    let name = '';
    if (typeof entry === 'string') {
      name = entry;
    } else if (Array.isArray(entry)) {
      [name] = entry;
    } else if (typeof entry === 'object') {
      name = entry.name || entry.armorName || '';
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

function ArmorList({
  campaign,
  onChange,
  initialArmor = EMPTY_ARRAY,
  characterId,
  show = true,
  strength = Number.POSITIVE_INFINITY,
  embedded = false,
  onAddToCart = () => {},
  ownedOnly = false,
  cartCounts = null,
  hiddenKeys = null,
}) {
  const [armor, setArmor] =
    useState/** @type {Record<string, Armor & { owned?: boolean, ownedCount?: number, proficient?: boolean, granted?: boolean, pending?: boolean, displayName?: string }> | null} */(null);
  const [error, setError] = useState(null);
  const [unknownArmor, setUnknownArmor] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const normalizedInitialArmor = useMemo(
    () => (Array.isArray(initialArmor) ? initialArmor : EMPTY_ARRAY),
    [initialArmor]
  );
  const [ownedEntries, setOwnedEntries] = useState(normalizedInitialArmor);

  useEffect(() => {
    if (Array.isArray(initialArmor)) {
      setOwnedEntries((prev) => (prev === initialArmor ? prev : initialArmor));
    } else {
      setOwnedEntries((prev) => (prev === EMPTY_ARRAY ? prev : EMPTY_ARRAY));
    }
  }, [initialArmor]);

  const ownershipMap = useMemo(
    () => buildArmorOwnershipMap(ownedEntries),
    [ownedEntries]
  );

  const hiddenSet = useMemo(() => {
    if (!hiddenKeys) {
      return null;
    }
    if (hiddenKeys instanceof Set) {
      return new Set(Array.from(hiddenKeys, (value) => String(value).toLowerCase()));
    }
    if (Array.isArray(hiddenKeys)) {
      return new Set(hiddenKeys.map((value) => String(value).toLowerCase()));
    }
    if (hiddenKeys && typeof hiddenKeys === 'object') {
      return new Set(
        Object.entries(hiddenKeys)
          .filter(([, hidden]) => Boolean(hidden))
          .map(([key]) => String(key).toLowerCase())
      );
    }
    return null;
  }, [hiddenKeys]);

  useEffect(() => {
    if (!show) return;

    async function fetchArmor() {
      try {
        const [phb, custom, prof] = await Promise.all([
          apiFetch('/armor').then((res) => {
            if (!res.ok) {
              const error = new Error(`${res.status} ${res.statusText}`);
              error.status = res.status;
              error.statusText = res.statusText;
              throw error;
            }
            return res.json();
          }),
          campaign
            ? apiFetch(`/equipment/armor/${campaign}`).then((res) => {
                if (!res.ok) {
                  const error = new Error(`${res.status} ${res.statusText}`);
                  error.status = res.status;
                  error.statusText = res.statusText;
                  throw error;
                }
                return res.json();
              })
            : Promise.resolve([]),
          characterId
            ? apiFetch(`/armor-proficiency/${characterId}`).then((res) => {
                if (!res.ok) {
                  const error = new Error(`${res.status} ${res.statusText}`);
                  error.status = res.status;
                  error.statusText = res.statusText;
                  throw error;
                }
                return res.json();
              })
            : Promise.resolve({ allowed: null, granted: [], proficient: {} }),
        ]);

        const customMap = Array.isArray(custom)
          ? custom.reduce((acc, a) => {
              const key = (a?.name || a?.armorName || '').toLowerCase();
              if (!key) return acc;
              const slotFields = Object.entries(a || {}).reduce(
                (fields, [field, value]) => {
                  if (
                    typeof field === 'string' &&
                    field.toLowerCase().includes('slot') &&
                    value !== undefined
                  ) {
                    fields[field] = value;
                  }
                  return fields;
                },
                {}
              );
              acc[key] = {
                name: key,
                displayName: a.name || a.armorName,
                type: a.type,
                category: a.category || 'custom',
                acBonus: a.acBonus ?? a.armorBonus ?? a.ac ?? '',
                maxDex: a.maxDex ?? null,
                strength: a.strength ?? null,
                stealth: a.stealth ?? false,
                weight: a.weight ?? '',
                cost: a.cost ?? '',
                ...slotFields,
              };
              return acc;
            }, {})
          : {};

        const invalidInitialArmor = normalizedInitialArmor.filter(
          (a) => typeof a !== 'string' && typeof a?.name !== 'string'
        );
        if (invalidInitialArmor.length) {
          console.warn('Skipping invalid initial armor entries:', invalidInitialArmor);
        }
        const all = { ...phb, ...customMap };
        const proficientSet = new Set(Object.keys(prof.proficient || {}));
        const grantedSet = new Set(prof.granted || []);
        const keys = Object.keys(all);
        const unknown = [];

        [
          prof.allowed || [],
          prof.granted || [],
          Object.keys(prof.proficient || {}),
        ].forEach((arr) =>
          arr.forEach((name) => {
            if (!all[name]) {
              console.warn('Unrecognized armor from server:', name);
              unknown.push(name);
            }
          })
        );

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
            owned: ownedCount > 0,
            ownedCount,
            proficient: grantedSet.has(key) || proficientSet.has(key),
            granted: grantedSet.has(key),
            pending: false,
          };
          return acc;
        }, {});

        setArmor(withOwnership);
        setUnknownArmor(unknown);
        setError(null);
      } catch (err) {
        console.error('Failed to load armor:', err?.message, err?.response?.status);
        setArmor({});
        if (err && err.status) {
          setError(`Failed to load armor: ${err.status} ${err.statusText}`);
        } else {
          setError('Failed to load armor. Please check that the server is available.');
        }
      }
    }

    fetchArmor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign, characterId, show]);

  useEffect(() => {
    setArmor((prev) => {
      if (!prev) return prev;
      let changed = false;
      const next = Object.entries(prev).reduce((acc, [key, piece]) => {
        const displayKey = (piece.displayName || piece.name || '').toLowerCase();
        const ownedEntry =
          ownershipMap.get(key) ||
          (displayKey && displayKey !== key
            ? ownershipMap.get(displayKey)
            : undefined);
        const ownedCount = ownedEntry?.count ?? 0;
        const owned = ownedCount > 0;
        if (piece.owned !== owned || (piece.ownedCount ?? 0) !== ownedCount) {
          changed = true;
          acc[key] = { ...piece, owned, ownedCount };
        } else {
          acc[key] = piece;
        }
        return acc;
      }, /** @type {Record<string, Armor & { owned?: boolean, ownedCount?: number, proficient?: boolean, granted?: boolean, pending?: boolean, displayName?: string }>} */ ({}));
      return changed ? next : prev;
    });
  }, [ownershipMap]);

  if (!armor) {
    return <div>Loading...</div>;
  }

  const categoryIcons = {
    light: GiLeatherArmor,
    medium: GiBreastplate,
    heavy: GiChainMail,
    shield: GiShield,
  };

  const handleAddToCart = (piece) => () => {
    const payload = {
      ...piece,
      ...(piece.type ? { armorType: piece.type } : {}),
      type: 'armor',
    };
    onAddToCart(payload);
  };

  const getCartCount = (piece) => {
    if (!cartCounts) return 0;
    const primaryName = String(piece?.name || '').trim().toLowerCase();
    const fallbackName = String(
      piece?.displayName || piece?.itemName || ''
    )
      .trim()
      .toLowerCase();
    const names = primaryName
      ? [primaryName]
      : fallbackName
      ? [fallbackName]
      : [];
    if (fallbackName && fallbackName !== primaryName) {
      names.push(fallbackName);
    }

    for (const name of names) {
      const key = `armor::${name}`;
      if (Object.prototype.hasOwnProperty.call(cartCounts, key)) {
        return cartCounts[key];
      }
    }

    return 0;
  };

  const handleToggle = (key) => async () => {
    const piece = armor[key];
    if (piece.granted || piece.pending) return;
    const desired = !piece.proficient;
    const nextArmor = {
      ...armor,
      [key]: { ...piece, proficient: desired, pending: true },
    };
    setArmor(nextArmor);
    try {
      await apiFetch(`/armor-proficiency/${characterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ armor: piece.name, proficient: desired }),
      });
      setArmor((prev) => ({
        ...prev,
        [key]: { ...prev[key], pending: false },
      }));
    } catch {
      setArmor((prev) => ({
        ...prev,
        [key]: { ...piece, pending: false },
      }));
    }
  };

  const handleRequestDelete = (dataKey, piece) => () => {
    if (!ownedOnly) {
      return;
    }
    setDeleteTarget({ dataKey, piece });
  };

  const handleCancelDelete = () => setDeleteTarget(null);

  const handleConfirmDelete = () => {
    if (!deleteTarget) {
      return;
    }

    const { dataKey, piece } = deleteTarget;
    const nextEntries = removeFirstMatchingEntry(ownedEntries, piece, dataKey);

    setDeleteTarget(null);

    if (nextEntries === ownedEntries) {
      return;
    }

    setOwnedEntries(nextEntries);

    if (typeof onChange === 'function') {
      onChange(nextEntries);
    }
  };

  const bodyStyle = embedded ? undefined : { overflowY: 'auto', maxHeight: '70vh' };
  const filteredEntries = Object.entries(armor).filter(([key, piece]) => {
    if (hiddenSet) {
      const normalizedKey = String(key || '').toLowerCase();
      const displayKey = String(piece.displayName || piece.name || '').toLowerCase();
      if (hiddenSet.has(normalizedKey) || (displayKey && hiddenSet.has(displayKey))) {
        return false;
      }
    }
    return ownedOnly ? (piece.ownedCount ?? 0) > 0 : true;
  });
  const expandedEntries = ownedOnly
    ? filteredEntries.flatMap(([key, piece]) => {
        const count = piece.ownedCount ?? 0;
        if (count <= 0) return [];
        if (count === 1) {
          return [
            {
              reactKey: key,
              dataKey: key,
              piece,
              copyIndex: 0,
              copyCount: 1,
            },
          ];
        }
        return Array.from({ length: count }, (_, index) => ({
          reactKey: `${key}-${index}`,
          dataKey: key,
          piece,
          copyIndex: index,
          copyCount: count,
        }));
      })
    : filteredEntries.map(([key, piece]) => ({
        reactKey: key,
        dataKey: key,
        piece,
        copyIndex: 0,
        copyCount: piece.ownedCount ?? 0,
      }));

  const bodyContent = error ? (
    <div className="text-danger">{error}</div>
  ) : (
    <>
      {unknownArmor.length > 0 && (
        <Alert variant="warning">
          Unrecognized armor from server: {unknownArmor.join(', ')}
        </Alert>
      )}
      {expandedEntries.length === 0 ? (
        <div className="text-center text-muted py-3">
          {ownedOnly
            ? 'No armor in inventory.'
            : 'No armor available.'}
        </div>
      ) : (
        <Row className="g-2">
          {expandedEntries.map(({ reactKey, dataKey, piece, copyIndex, copyCount }) => {
            const Icon = categoryIcons[piece.category] || GiArmorVest;
            return (
              <Col xs={6} md={4} key={reactKey}>
                <Card className="armor-card h-100">
                  <Card.Body className="d-flex flex-column">
                  <div className="d-flex justify-content-center mb-2">
                    <Icon size={40} title={piece.category} />
                  </div>
                  <Card.Title as="h6">{piece.displayName || piece.name}</Card.Title>
                  <Card.Text>
                    AC Bonus:{' '}
                    {piece.acBonus !== '' &&
                    piece.acBonus !== null &&
                    piece.acBonus !== undefined
                      ? piece.acBonus
                      : ''}
                  </Card.Text>
                  <Card.Text>
                    Max Dex{' '}
                    {piece.maxDex === null || piece.maxDex === undefined
                      ? '—'
                      : piece.maxDex}
                  </Card.Text>
                  <Card.Text>
                    Strength{' '}
                    {piece.strength === null || piece.strength === undefined
                      ? '—'
                      : piece.strength}
                  </Card.Text>
                  <Card.Text>
                    Stealth: {piece.stealth ? 'Disadvantage' : '—'}
                  </Card.Text>
                  <Card.Text>Weight: {piece.weight}</Card.Text>
                  <Card.Text>Cost: {piece.cost}</Card.Text>
                  {ownedOnly && copyCount > 1 && (
                    <Card.Text className="mt-auto text-muted small">
                      Copy {copyIndex + 1} of {copyCount}
                    </Card.Text>
                  )}
                </Card.Body>
                <Card.Footer className="d-flex justify-content-center gap-2 flex-wrap">
                  <Form.Check
                    type="checkbox"
                    label="Proficient"
                    className="weapon-checkbox"
                    checked={piece.proficient}
                    disabled={piece.granted || piece.pending}
                    onChange={handleToggle(dataKey)}
                    aria-label={`${piece.displayName || piece.name} proficiency`}
                    style={
                      piece.granted || piece.pending
                        ? { opacity: 0.5 }
                        : undefined
                    }
                  />
                  {ownedOnly ? (
                    <Button
                      size="sm"
                      className="btn-danger action-btn fa-solid fa-trash"
                      onClick={handleRequestDelete(dataKey, piece)}
                      title={`Delete ${piece.displayName || piece.name || 'armor'}`}
                      aria-label={`Delete ${piece.displayName || piece.name || 'armor'}`}
                    />
                  ) : (
                    <>
                      <Button size="sm" onClick={handleAddToCart(piece)}>
                        Add to Cart
                      </Button>
                      {cartCounts ? (
                        <Badge bg="secondary" pill>
                          {`In Cart: ${getCartCount(piece)}`}
                        </Badge>
                      ) : null}
                    </>
                  )}
                </Card.Footer>
              </Card>
            </Col>
          );
          })}
        </Row>
      )}
    </>
  );

  const deleteArmorName = deleteTarget?.piece?.displayName || deleteTarget?.piece?.name;
  const deleteModal = (
    <Modal show={!!deleteTarget} onHide={handleCancelDelete} centered>
      <Modal.Header closeButton>
        <Modal.Title>Delete Armor</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {`Are you sure you want to remove ${
          deleteArmorName ? `${deleteArmorName}` : 'this armor'
        } from your inventory?`}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" className="action-btn close-btn" onClick={handleCancelDelete}>
          Cancel
        </Button>
        <Button variant="danger" className="action-btn" onClick={handleConfirmDelete}>
          Delete
        </Button>
      </Modal.Footer>
    </Modal>
  );

  if (embedded) {
    return (
      <>
        {bodyContent}
        {deleteModal}
      </>
    );
  }

  return (
    <>
      <Card className="modern-card">
        <Card.Header className="modal-header">
          <Card.Title className="modal-title">Armor</Card.Title>
        </Card.Header>
        <Card.Body style={bodyStyle}>{bodyContent}</Card.Body>
      </Card>
      {deleteModal}
    </>
  );
}

export default ArmorList;

