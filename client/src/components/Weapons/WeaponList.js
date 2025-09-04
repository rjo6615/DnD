import React, { useEffect, useState } from 'react';
import { Card, Table, Form } from 'react-bootstrap';
import apiFetch from '../../utils/apiFetch';

/** @typedef {import('../../../../types/weapon').Weapon} Weapon */

/**
 * List of weapons with proficiency toggles.
 * @param {{ characterId: string, campaign?: string }} props
 */
function WeaponList({ characterId, campaign }) {
  const [weapons, setWeapons] =
    useState/** @type {Record<string, Weapon & {disabled?: boolean}> | null} */(null);

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
                proficient: false,
              };
              return acc;
            }, {})
          : {};

        setWeapons({ ...phb, ...customMap });
      } catch {
        setWeapons({});
      }
    }

    fetchWeapons();
  }, [campaign]);

  if (!weapons) {
    return <div>Loading...</div>;
  }

  const handleToggle = (key) => async () => {
    const weapon = weapons[key];
    const desired = !weapon.proficient;
    try {
      const res = await apiFetch(`/weapon-proficiency/${characterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weapon: key, proficient: desired }),
      });
      if (res.ok) {
        const { proficient } = await res.json();
        setWeapons((prev) => ({
          ...prev,
          [key]: { ...prev[key], proficient, disabled: false },
        }));
      } else {
        setWeapons((prev) => ({
          ...prev,
          [key]: { ...prev[key], disabled: true },
        }));
      }
    } catch {
      setWeapons((prev) => ({
        ...prev,
        [key]: { ...prev[key], disabled: true },
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
              <th>Prof</th>
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
                    checked={weapon.proficient}
                    disabled={weapon.disabled}
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

