import React, { useEffect, useState } from 'react';
import { Card, Table, Form } from 'react-bootstrap';
import apiFetch from '../../utils/apiFetch';

/** @typedef {import('../../../../types/weapon').Weapon} Weapon */

/**
 * List of weapons with ownership toggles.
 * @param {{ campaign?: string, onChange?: (weapons: Weapon[]) => void, initialWeapons?: Weapon[], characterId?: string }} props
 */
function WeaponList({ campaign, onChange, initialWeapons = [], characterId }) {
  const [weapons, setWeapons] =
    useState/** @type {Record<string, Weapon & { owned?: boolean, proficient?: boolean, granted?: boolean, pending?: boolean }> | null} */(null);
  const [error, setError] = useState(null);

  useEffect(() => {
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
              const key = w.name;
              if (!key) return acc;
              acc[key] = {
                name: w.name,
                category: w.category || 'custom',
                damage: w.damage || '',
                properties: w.properties || [],
                weight: w.weight || '',
                cost: w.cost || '',
              };
              return acc;
            }, {})
          : {};

        const ownedSet = new Set(initialWeapons.map((w) => w.name || w));
        const all = { ...phb, ...customMap };
        const allowedSet =
          Array.isArray(prof.allowed) && prof.allowed.length > 0
            ? new Set(prof.allowed)
            : null;
        const proficientSet = new Set(Object.keys(prof.proficient || {}));
        const grantedSet = new Set(prof.granted || []);
        const keys = allowedSet
          ? Object.keys(all).filter((k) => allowedSet.has(k))
          : Object.keys(all);
        const withOwnership = keys.reduce((acc, key) => {
          acc[key] = {
            ...all[key],
            owned: ownedSet.has(all[key].name),
            proficient: grantedSet.has(key) || proficientSet.has(key),
            granted: grantedSet.has(key),
            pending: false,
          };
          return acc;
        }, {});

        setWeapons(withOwnership);
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
  }, [campaign, characterId]);

  if (!weapons) {
    return <div>Loading...</div>;
  }

  if (error) {
    return (
      <Card className="modern-card">
        <Card.Header className="modal-header">
          <Card.Title className="modal-title">Weapons</Card.Title>
        </Card.Header>
        <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
          <div className="text-danger">{error}</div>
        </Card.Body>
      </Card>
    );
  }

  const handleOwnedToggle = (key) => () => {
    const weapon = weapons[key];
    const desired = !weapon.owned;
    const nextWeapons = {
      ...weapons,
      [key]: { ...weapon, owned: desired },
    };
    setWeapons(nextWeapons);
    if (typeof onChange === 'function') {
      const ownedWeapons = Object.values(nextWeapons)
        .filter((w) => w.owned)
        .map(({ name, category, damage, properties, weight, cost }) => ({
          name,
          category,
          damage,
          properties,
          weight,
          cost,
        }));
      onChange(ownedWeapons);
    }
  };

  const handleToggle = (key) => async () => {
    const weapon = weapons[key];
    if (weapon.granted || weapon.proficient) return;
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

  return (
    <Card className="modern-card">
      <Card.Header className="modal-header">
        <Card.Title className="modal-title">Weapons</Card.Title>
      </Card.Header>
      <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
        <Table striped bordered hover size="sm" className="modern-table">
          <thead>
            <tr>
              <th>Owned</th>
              <th>Proficient</th>
              <th>Name</th>
              <th>Damage</th>
              <th>Category</th>
              <th>Properties</th>
              <th>Weight</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(weapons).map(([key, weapon]) => (
              <tr key={key}>
                <td>
                  <Form.Check
                    type="checkbox"
                    className="weapon-checkbox"
                    checked={weapon.owned}
                    onChange={handleOwnedToggle(key)}
                    aria-label={weapon.name}
                  />
                </td>
                <td>
                  <Form.Check
                    type="checkbox"
                    className="weapon-checkbox"
                    checked={weapon.proficient}
                    disabled={
                      weapon.proficient || weapon.granted || weapon.pending
                    }
                    onChange={handleToggle(key)}
                    aria-label={`${weapon.name} proficiency`}
                    style={
                      weapon.proficient || weapon.granted || weapon.pending
                        ? { opacity: 0.5 }
                        : undefined
                    }
                  />
                </td>
                <td>{weapon.name}</td>
                <td>{weapon.damage}</td>
                <td>{weapon.category}</td>
                <td>{weapon.properties.join(', ') || 'No properties'}</td>
                <td>{weapon.weight}</td>
                <td>{weapon.cost}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}

export default WeaponList;

