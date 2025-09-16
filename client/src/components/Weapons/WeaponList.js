import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Form, Alert, Button, Badge } from 'react-bootstrap';
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
 *   cartCounts?: Record<string, number> | null,
 * }} props
 */
function WeaponList({
  campaign,
  onChange,
  initialWeapons = [],
  characterId,
  show = true,
  embedded = false,
  onAddToCart = () => {},
  ownedOnly = false,
  cartCounts = null,
}) {
  const [weapons, setWeapons] =
    useState/** @type {Record<string, Weapon & { owned?: boolean, proficient?: boolean, granted?: boolean, pending?: boolean, displayName?: string }> | null} */(null);
  const [error, setError] = useState(null);
  const [unknownWeapons, setUnknownWeapons] = useState([]);

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

        const ownedSet = new Set(
          initialWeapons.map((w) => (w.name || w).toLowerCase())
        );
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
          acc[key] = {
            ...base,
            name: key,
            displayName: base.displayName || base.name,
            owned: ownedSet.has(key),
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

  const getCartCount = (weapon) => {
    if (!cartCounts) return 0;
    const key = `weapon::${String(weapon?.name || '').toLowerCase()}`;
    return cartCounts[key] ?? 0;
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
  const entries = Object.entries(weapons).filter(([, weapon]) =>
    ownedOnly ? weapon.owned : true
  );

  const bodyContent = error ? (
    <div className="text-danger">{error}</div>
  ) : (
    <>
      {unknownWeapons.length > 0 && (
        <Alert variant="warning">
          Unrecognized weapons from server: {unknownWeapons.join(', ')}
        </Alert>
      )}
      {entries.length === 0 ? (
        <div className="text-center text-muted py-3">
          {ownedOnly
            ? 'No weapons in inventory.'
            : 'No weapons available.'}
        </div>
      ) : (
        <Row className="row-cols-2 row-cols-lg-3 g-3">
          {entries.map(([key, weapon]) => {
            const Icon = categoryIcons[weapon.category] || GiCrossedSwords;
            return (
              <Col key={key}>
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
                </Card.Body>
                <Card.Footer className="d-flex justify-content-center gap-2 flex-wrap">
                  <Form.Check
                    type="checkbox"
                    className="weapon-checkbox"
                    label="Proficient"
                    checked={weapon.proficient}
                    disabled={weapon.granted || weapon.pending}
                    onChange={handleToggle(key)}
                    aria-label={`${weapon.displayName || weapon.name} proficiency`}
                    style={
                      weapon.granted || weapon.pending
                        ? { opacity: 0.5 }
                        : undefined
                    }
                  />
                  {!ownedOnly && (
                    <>
                      <Button size="sm" onClick={handleAddToCart(weapon)}>
                        Add to Cart
                      </Button>
                      {cartCounts ? (
                        <Badge bg="secondary" pill>
                          {`In Cart: ${getCartCount(weapon)}`}
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
        <Card.Title className="modal-title">Weapons</Card.Title>
      </Card.Header>
      <Card.Body style={bodyStyle}>{bodyContent}</Card.Body>
    </Card>
  );
}

export default WeaponList;

