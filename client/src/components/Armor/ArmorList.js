import React, { useEffect, useState } from 'react';
import { Card, Form, Alert, Row, Col, Button } from 'react-bootstrap';
import apiFetch from '../../utils/apiFetch';

/** @typedef {import('../../../../types/armor').Armor} Armor */

/**
 * List of armor with ownership and proficiency toggles.
 * @param {{
 *   campaign?: string,
 *   onChange?: (armor: Armor[]) => void,
 *   initialArmor?: Armor[],
 *   characterId?: string,
 *   show?: boolean,
 *   strength?: number,
 * }} props
 */
function ArmorList({
  campaign,
  onChange,
  initialArmor = [],
  characterId,
  show = true,
  strength = Number.POSITIVE_INFINITY,
}) {
  const [armor, setArmor] =
    useState/** @type {Record<string, Armor & { owned?: boolean, proficient?: boolean, granted?: boolean, pending?: boolean, displayName?: string }> | null} */(null);
  const [error, setError] = useState(null);
  const [unknownArmor, setUnknownArmor] = useState([]);

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

        const initialArmorArray = Array.isArray(initialArmor) ? initialArmor : [];
        const invalidInitialArmor = initialArmorArray.filter(
          (a) => typeof a !== 'string' && typeof a?.name !== 'string'
        );
        if (invalidInitialArmor.length) {
          console.warn('Skipping invalid initial armor entries:', invalidInitialArmor);
        }
        const ownedSet = new Set(
          initialArmorArray
            .map((a) => (typeof a === 'string' ? a : a?.name))
            .filter((name) => typeof name === 'string')
            .map((name) => name.toLowerCase())
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
              console.warn('Unrecognized armor from server:', name);
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

  if (!armor) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <Card className="modern-card">
        <Card.Header className="modal-header">
          <Card.Title className="modal-title">Armor</Card.Title>
        </Card.Header>
        <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
          <div className="text-danger">{error}</div>
        </Card.Body>
      </Card>
    );
  }

  const handleOwnedToggle = (key) => () => {
    const piece = armor[key];
    const unmet = piece.strength && strength < piece.strength;
    if (unmet) return;
    const desired = !piece.owned;
    const nextArmor = {
      ...armor,
      [key]: { ...piece, owned: desired },
    };
    setArmor(nextArmor);
    if (typeof onChange === 'function') {
      const ownedArmor = Object.values(nextArmor)
        .filter((a) => a.owned)
        .map(
          ({
            name,
            category,
            acBonus,
            maxDex,
            strength,
            stealth,
            weight,
            cost,
            type,
          }) => ({
            name,
            category,
            acBonus,
            maxDex,
            strength,
            stealth,
            weight,
            cost,
            type,
          })
        );
      onChange(ownedArmor);
    }
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

  return (
    <Card className="modern-card">
      <Card.Header className="modal-header">
        <Card.Title className="modal-title">Armor</Card.Title>
      </Card.Header>
      <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
        {unknownArmor.length > 0 && (
          <Alert variant="warning">
            Unrecognized armor from server: {unknownArmor.join(', ')}
          </Alert>
        )}
        <Row className="g-2">
          {Object.entries(armor).map(([key, piece]) => {
            const unmet = piece.strength && strength < piece.strength;
            return (
              <Col xs={6} md={4} key={key}>
                <Card className="armor-card h-100">
                  <Card.Body>
                    <Card.Title as="h6">{piece.displayName || piece.name}</Card.Title>
                    <Form.Check
                      type="checkbox"
                      label="Owned"
                      className="weapon-checkbox"
                      checked={piece.owned}
                      disabled={unmet}
                      onChange={handleOwnedToggle(key)}
                      aria-label={piece.displayName || piece.name}
                      title={unmet ? `Requires STR ${piece.strength}` : undefined}
                    />
                    <Form.Check
                      type="checkbox"
                      label="Proficient"
                      className="weapon-checkbox"
                      checked={piece.proficient}
                      disabled={piece.granted || piece.pending}
                      onChange={handleToggle(key)}
                      aria-label={`${piece.displayName || piece.name} proficiency`}
                      style={
                        piece.granted || piece.pending
                          ? { opacity: 0.5 }
                          : undefined
                      }
                    />
                    <Card.Text>AC Bonus: {piece.acBonus !== '' && piece.acBonus !== null && piece.acBonus !== undefined ? piece.acBonus : ''}</Card.Text>
                    <Card.Text>
                      Max Dex:{' '}
                      {piece.maxDex === null || piece.maxDex === undefined
                        ? '—'
                        : piece.maxDex}
                    </Card.Text>
                    <Card.Text>
                      Strength:{' '}
                      {piece.strength === null || piece.strength === undefined
                        ? '—'
                        : piece.strength}
                    </Card.Text>
                    <Card.Text>
                      Stealth: {piece.stealth ? 'Disadvantage' : '—'}
                    </Card.Text>
                    <Card.Text>Weight: {piece.weight}</Card.Text>
                    <Card.Text>Cost: {piece.cost}</Card.Text>
                  </Card.Body>
                  <Card.Footer>
                    <Button
                      size="sm"
                      className="btn-danger action-btn fa-solid fa-trash"
                      hidden={!piece.owned}
                      onClick={handleOwnedToggle(key)}
                    ></Button>
                  </Card.Footer>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card.Body>
    </Card>
  );
}

export default ArmorList;

