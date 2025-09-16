import React, { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Form, Alert, Button } from 'react-bootstrap';
import {
  GiStoneAxe,
  GiBowArrow,
  GiBroadsword,
  GiCrossbow,
  GiCrossedSwords,
} from 'react-icons/gi';
import apiFetch from '../../utils/apiFetch';

/** @typedef {import('../../../../types/weapon').Weapon} Weapon */

/**
 * List of weapons with proficiency toggles and cart actions.
 * @param {{
 *   campaign?: string,
 *   onChange?: (weapons: Weapon[]) => void,
 *   initialWeapons?: Weapon[],
 *   characterId?: string,
 *   show?: boolean,
 *   embedded?: boolean,
 *   onAddToCart?: (weapon: Weapon & { type?: string }) => void,
 *   ownedOnly?: boolean,
 * }} props
 */
const buildWeaponOwnershipMap = (initialWeapons) => {
  const map = new Map();
  if (!Array.isArray(initialWeapons)) return map;

  initialWeapons.forEach((entry) => {
    if (!entry) return;
    if (typeof entry === 'object' && entry.owned === false) return;

    let name = '';
    if (typeof entry === 'string') {
      name = entry;
    } else if (Array.isArray(entry)) {
      [name] = entry;
    } else if (typeof entry === 'object') {
      name = entry.name || entry.weaponName || entry.displayName || '';
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

function WeaponList({
  campaign,
  onChange,
  initialWeapons = [],
  characterId,
  show = true,
  embedded = false,
  onAddToCart = () => {},
  ownedOnly = false,
}) {
  const [weapons, setWeapons] =
    useState/** @type {Record<string, Weapon & { owned?: boolean, ownedCount?: number, proficient?: boolean, granted?: boolean, pending?: boolean, displayName?: string }> | null} */(null);
  const [error, setError] = useState(null);
  const [unknownWeapons, setUnknownWeapons] = useState([]);

  const ownershipMap = useMemo(
    () => buildWeaponOwnershipMap(initialWeapons),
    [initialWeapons]
  );

  useEffect(() => {
    if (!show) return;

    async function fetchWeapons() {
      try {
        const [phb, custom, prof] = await Promise.all([
          apiFetch('/weapons').then((res) => {
            if (!res.ok) {
              const error = new Error(`${res.status} ${res.statusText}`);
              error.status = res.status;
              error.statusText = res.statusText;
              throw error;
            }
            return res.json();
          }),
          campaign
            ? apiFetch(`/equipment/weapons/${campaign}`).then((res) => {
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
            ? apiFetch(`/weapon-proficiency/${characterId}`).then((res) => {
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
          ? custom.reduce((acc, w) => {
              const key = (w.name || '').toLowerCase();
              if (!key) return acc;
              acc[key] = {
                name: key,
                displayName: w.name,
                type: w.type,
                category: w.category || 'custom',
                damage: w.damage || '',
                properties: w.properties || [],
                weight: w.weight || '',
                cost: w.cost || '',
              };
              return acc;
            }, {})
          : {};

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
              console.warn('Unrecognized weapon from server:', name);
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

        setWeapons(withOwnership);
        setUnknownWeapons(unknown);
        setError(null);
      } catch (err) {
        console.error('Failed to load weapons:', err?.message, err?.response?.status);
        setWeapons({});
        if (err && err.status) {
          setError(`Failed to load weapons: ${err.status} ${err.statusText}`);
        } else {
          setError('Failed to load weapons. Please check that the server is available.');
        }
      }
    }

    fetchWeapons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign, characterId, show]);

  useEffect(() => {
    setWeapons((prev) => {
      if (!prev) return prev;
      let changed = false;
      const next = Object.entries(prev).reduce((acc, [key, weapon]) => {
        const displayKey = (weapon.displayName || weapon.name || '').toLowerCase();
        const ownedEntry =
          ownershipMap.get(key) ||
          (displayKey && displayKey !== key
            ? ownershipMap.get(displayKey)
            : undefined);
        const ownedCount = ownedEntry?.count ?? 0;
        const owned = ownedCount > 0;
        if (
          weapon.owned !== owned ||
          (weapon.ownedCount ?? 0) !== ownedCount
        ) {
          changed = true;
          acc[key] = { ...weapon, owned, ownedCount };
        } else {
          acc[key] = weapon;
        }
        return acc;
      }, /** @type {Record<string, Weapon & { owned?: boolean, ownedCount?: number, proficient?: boolean, granted?: boolean, pending?: boolean, displayName?: string }>} */ ({}));
      return changed ? next : prev;
    });
  }, [ownershipMap]);

  if (!weapons) {
    return <div>Loading...</div>;
  }

  const categoryIcons = {
    'simple melee': GiStoneAxe,
    'simple ranged': GiBowArrow,
    'martial melee': GiBroadsword,
    'martial ranged': GiCrossbow,
  };

  const handleAddToCart = (weapon) => () => {
    const payload = {
      ...weapon,
      ...(weapon.type ? { weaponType: weapon.type } : {}),
      type: 'weapon',
    };
    onAddToCart(payload);
  };

  const handleToggle = (key) => async () => {
    const weapon = weapons[key];
    if (weapon.granted || weapon.pending) return;
    const desired = !weapon.proficient;
    const nextWeapons = {
      ...weapons,
      [key]: { ...weapon, proficient: desired, pending: true },
    };
    setWeapons(nextWeapons);
    try {
      await apiFetch(`/weapon-proficiency/${characterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weapon: weapon.name,
          category: weapon.category,
          proficient: desired,
        }),
      });
      setWeapons((prev) => ({
        ...prev,
        [key]: { ...prev[key], pending: false },
      }));
    } catch {
      setWeapons((prev) => ({
        ...prev,
        [key]: { ...weapon, pending: false },
      }));
    }
  };

  const bodyStyle = { overflowY: 'auto', maxHeight: '70vh' };
  const filteredEntries = Object.entries(weapons).filter(([, weapon]) =>
    ownedOnly ? (weapon.ownedCount ?? 0) > 0 : true
  );
  const expandedEntries = ownedOnly
    ? filteredEntries.flatMap(([key, weapon]) => {
        const count = weapon.ownedCount ?? 0;
        if (count <= 0) return [];
        if (count === 1) {
          return [
            {
              reactKey: key,
              dataKey: key,
              weapon,
              copyIndex: 0,
              copyCount: 1,
            },
          ];
        }
        return Array.from({ length: count }, (_, index) => ({
          reactKey: `${key}-${index}`,
          dataKey: key,
          weapon,
          copyIndex: index,
          copyCount: count,
        }));
      })
    : filteredEntries.map(([key, weapon]) => ({
        reactKey: key,
        dataKey: key,
        weapon,
        copyIndex: 0,
        copyCount: weapon.ownedCount ?? 0,
      }));

  const bodyContent = error ? (
    <div className="text-danger">{error}</div>
  ) : (
    <>
      {unknownWeapons.length > 0 && (
        <Alert variant="warning">
          Unrecognized weapons from server: {unknownWeapons.join(', ')}
        </Alert>
      )}
      {expandedEntries.length === 0 ? (
        <div className="text-center text-muted py-3">
          {ownedOnly
            ? 'No weapons in inventory.'
            : 'No weapons available.'}
        </div>
      ) : (
        <Row className="row-cols-2 row-cols-lg-3 g-3">
          {expandedEntries.map(({
            reactKey,
            dataKey,
            weapon,
            copyIndex,
            copyCount,
          }) => {
            const Icon = categoryIcons[weapon.category] || GiCrossedSwords;
            return (
              <Col key={reactKey}>
                <Card className="weapon-card h-100">
                  <Card.Body className="d-flex flex-column">
                  <div className="d-flex justify-content-center mb-2">
                    <Icon size={40} title={weapon.category} />
                  </div>
                  <Card.Title>{weapon.displayName || weapon.name}</Card.Title>
                  <Card.Text>Damage: {weapon.damage}</Card.Text>
                  <Card.Text>Category: {weapon.category}</Card.Text>
                  <Card.Text>
                    Properties: {weapon.properties.join(', ') || 'No properties'}
                  </Card.Text>
                  <Card.Text>Weight: {weapon.weight}</Card.Text>
                  <Card.Text>Cost: {weapon.cost}</Card.Text>
                  {ownedOnly && copyCount > 1 && (
                    <Card.Text className="mt-auto text-muted small">
                      Copy {copyIndex + 1} of {copyCount}
                    </Card.Text>
                  )}
                </Card.Body>
                <Card.Footer className="d-flex justify-content-center gap-2 flex-wrap">
                  <Form.Check
                    type="checkbox"
                    className="weapon-checkbox"
                    label="Proficient"
                    checked={weapon.proficient}
                    disabled={weapon.granted || weapon.pending}
                    onChange={handleToggle(dataKey)}
                    aria-label={`${weapon.displayName || weapon.name} proficiency`}
                    style={
                      weapon.granted || weapon.pending
                        ? { opacity: 0.5 }
                        : undefined
                    }
                  />
                  {!ownedOnly && (
                    <Button size="sm" onClick={handleAddToCart(weapon)}>
                      Add to Cart
                    </Button>
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
        <Card.Title className="modal-title">Weapons</Card.Title>
      </Card.Header>
      <Card.Body style={bodyStyle}>{bodyContent}</Card.Body>
    </Card>
  );
}

export default WeaponList;

