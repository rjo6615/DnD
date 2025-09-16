import React, { useEffect, useMemo, useState } from 'react';
import { Card, Form, Alert, Row, Col, Button, Badge } from 'react-bootstrap';
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
 * }} props
 */
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
  initialArmor = [],
  characterId,
  show = true,
  strength = Number.POSITIVE_INFINITY,
  embedded = false,
  onAddToCart = () => {},
  ownedOnly = false,
  cartCounts = null,
}) {
  const [armor, setArmor] =
    useState/** @type {Record<string, Armor & { owned?: boolean, ownedCount?: number, proficient?: boolean, granted?: boolean, pending?: boolean, displayName?: string }> | null} */(null);
  const [error, setError] = useState(null);
  const [unknownArmor, setUnknownArmor] = useState([]);

  const initialArmorArray = Array.isArray(initialArmor) ? initialArmor : [];
  const ownershipMap = useMemo(
    () => buildArmorOwnershipMap(initialArmorArray),
    [initialArmorArray]
  );

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
              const key = (a.name || a.armorName || '').toLowerCase();
              if (!key) return acc;
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
              };
              return acc;
            }, {})
          : {};

        const invalidInitialArmor = initialArmorArray.filter(
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
    const key = `armor::${String(piece?.name || '').toLowerCase()}`;
    return cartCounts[key] ?? 0;
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

  const bodyStyle = { overflowY: 'auto', maxHeight: '70vh' };
  const filteredEntries = Object.entries(armor).filter(([, piece]) =>
    ownedOnly ? (piece.ownedCount ?? 0) > 0 : true
  );
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
                  {!ownedOnly && (
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

  if (embedded) {
    return <div style={bodyStyle}>{bodyContent}</div>;
  }

  return (
    <Card className="modern-card">
      <Card.Header className="modal-header">
        <Card.Title className="modal-title">Armor</Card.Title>
      </Card.Header>
      <Card.Body style={bodyStyle}>{bodyContent}</Card.Body>
    </Card>
  );
}

export default ArmorList;

