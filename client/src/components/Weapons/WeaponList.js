import React, { useEffect, useState } from 'react';
import { Card, Table, Form } from 'react-bootstrap';
import apiFetch from '../../utils/apiFetch';

/** @typedef {import('../../../../types/weapon').Weapon} Weapon */

/**
 * List of weapons with ownership toggles.
 * @param {{ campaign?: string, onChange?: (weapons: Weapon[]) => void, initialWeapons?: Weapon[] }} props
 */
function WeaponList({ campaign, onChange, initialWeapons = [] }) {
  const [weapons, setWeapons] =
    useState/** @type {Record<string, Weapon & { owned?: boolean }> | null} */(null);

  useEffect(() => {
    async function fetchWeapons() {
      try {
        const [phb, custom] = await Promise.all([
          apiFetch('/weapons').then((res) => res.json()),
          campaign
            ? apiFetch(`/equipment/weapons/${campaign}`).then((res) => res.json())
            : Promise.resolve([]),
        ]);

        const customMap = Array.isArray(custom)
          ? custom.reduce((acc, w) => {
              const key = w.weaponName;
              if (!key) return acc;
              acc[key] = {
                name: w.weaponName,
                category: w.weaponStyle || 'custom',
                damage: w.damage || '',
                properties: [],
                weight: w.weight || '',
                cost: w.cost || '',
              };
              return acc;
            }, {})
          : {};

        const ownedSet = new Set(initialWeapons.map((w) => w.name || w));
        const all = { ...phb, ...customMap };
        const withOwnership = Object.keys(all).reduce((acc, key) => {
          acc[key] = { ...all[key], owned: ownedSet.has(all[key].name) };
          return acc;
        }, {});

        setWeapons(withOwnership);
      } catch {
        setWeapons({});
      }
    }

    fetchWeapons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign]);

  if (!weapons) {
    return <div>Loading...</div>;
  }

  const handleToggle = (key) => () => {
    const weapon = weapons[key];
    const desired = !weapon.owned;
    const nextWeapons = {
      ...weapons,
      [key]: { ...weapon, owned: desired },
    };
    setWeapons(nextWeapons);
    if (typeof onChange === 'function') {
      onChange(Object.values(nextWeapons).filter((w) => w.owned));
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
                    onChange={handleToggle(key)}
                    aria-label={weapon.name}
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

