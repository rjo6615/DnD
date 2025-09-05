import React, { useEffect, useState } from 'react';
import { Card, Table, Form, Alert } from 'react-bootstrap';
import apiFetch from '../../utils/apiFetch';

/** @typedef {import('../../../../types/armor').Armor} Armor */

/**
 * List of armor with ownership and proficiency toggles.
 * @param {{ campaign?: string, onChange?: (armor: Armor[]) => void, initialArmor?: Armor[], characterId?: string, show?: boolean }} props
 */
function ArmorList({
  campaign,
  onChange,
  initialArmor = [],
  characterId,
  show = true,
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
                ac: a.ac ?? a.armorBonus ?? '',
                maxDex: a.maxDex ?? null,
                strength: a.strength ?? null,
                stealth: a.stealth ?? false,
                weight: a.weight ?? '',
                cost: a.cost ?? '',
              };
              return acc;
            }, {})
          : {};

        const ownedSet = new Set(
          initialArmor.map((a) => (a.name || a).toLowerCase())
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
            ac,
            maxDex,
            strength,
            stealth,
            weight,
            cost,
            type,
          }) => ({
            name,
            category,
            ac,
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
        <Table striped bordered hover size="sm" className="modern-table">
          <thead>
            <tr>
              <th>Owned</th>
              <th>Proficient</th>
              <th>Name</th>
              <th>AC</th>
              <th>Max Dex</th>
              <th>Strength</th>
              <th>Stealth</th>
              <th>Weight</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(armor).map(([key, piece]) => (
              <tr key={key}>
                <td>
                  <Form.Check
                    type="checkbox"
                    className="weapon-checkbox"
                    checked={piece.owned}
                    onChange={handleOwnedToggle(key)}
                    aria-label={piece.displayName || piece.name}
                  />
                </td>
                <td>
                  <Form.Check
                    type="checkbox"
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
                </td>
                <td>{piece.displayName || piece.name}</td>
                <td>{piece.ac}</td>
                <td>
                  {piece.maxDex === null || piece.maxDex === undefined
                    ? '—'
                    : piece.maxDex}
                </td>
                <td>
                  {piece.strength === null || piece.strength === undefined
                    ? '—'
                    : piece.strength}
                </td>
                <td>{piece.stealth ? 'Disadvantage' : '—'}</td>
                <td>{piece.weight}</td>
                <td>{piece.cost}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}

export default ArmorList;

