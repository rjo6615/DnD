import React, { useEffect, useState } from 'react';
import { Card, Table, Form, Alert } from 'react-bootstrap';
import apiFetch from '../../utils/apiFetch';

/** @typedef {import('../../../../types/item').Item} Item */

/**
 * List of items with ownership toggles.
 * @param {{
 *   campaign?: string,
 *   onChange?: (items: Item[]) => void,
 *   initialItems?: Item[],
 *   characterId?: string,
 *   show?: boolean,
 * }} props
 */
function ItemList({ campaign, onChange, initialItems = [], characterId, show = true }) {
  const [items, setItems] =
    useState/** @type {Record<string, Item & { owned?: boolean, displayName?: string }> | null} */(null);
  const [error, setError] = useState(null);
  const [unknownItems, setUnknownItems] = useState([]);

  useEffect(() => {
    if (!show) return;

    async function fetchItems() {
      try {
        const [phb, custom] = await Promise.all([
          apiFetch('/items').then((res) => {
            if (!res.ok) {
              const err = new Error(`${res.status} ${res.statusText}`);
              err.status = res.status;
              err.statusText = res.statusText;
              throw err;
            }
            return res.json();
          }),
          campaign
            ? apiFetch(`/equipment/items/${campaign}`).then((res) => {
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
          ? custom.reduce((acc, it) => {
              const key = (it.name || '').toLowerCase();
              if (!key) return acc;
              acc[key] = {
                name: key,
                displayName: it.name,
                category: it.category || 'custom',
                weight: it.weight ?? '',
                cost: it.cost ?? '',
              };
              return acc;
            }, {})
          : {};

        const ownedSet = new Set(
          initialItems.map((i) => (i.name || i).toLowerCase())
        );
        const all = { ...phb, ...customMap };
        const keys = Object.keys(all);
        const unknown = [];
        const withOwnership = keys.reduce((acc, key) => {
          const base = all[key];
          acc[key] = {
            ...base,
            name: key,
            displayName: base.displayName || base.name,
            owned: ownedSet.has(key),
          };
          return acc;
        }, {});
        setItems(withOwnership);
        setUnknownItems(unknown);
        setError(null);
      } catch (err) {
        console.error('Failed to load items:', err?.message, err?.status);
        setItems({});
        setError(err);
      }
    }

    fetchItems();
  }, [campaign, initialItems, show]);

  if (!items) {
    return null;
  }

  const handleOwnedToggle = (key) => () => {
    const item = items[key];
    const desired = !item.owned;
    const nextItems = {
      ...items,
      [key]: { ...item, owned: desired },
    };
    setItems(nextItems);
    if (typeof onChange === 'function') {
      const ownedItems = Object.values(nextItems)
        .filter((i) => i.owned)
        .map(({ name, category, weight, cost }) => ({
          name,
          category,
          weight,
          cost,
        }));
      onChange(ownedItems);
    }
  };

  return (
    <Card className="modern-card">
      <Card.Header className="modal-header">
        <Card.Title className="modal-title">Items</Card.Title>
      </Card.Header>
      <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
        {error && (
          <Alert variant="danger">{`Failed to load items: ${error.status} ${error.statusText}`}</Alert>
        )}
        {unknownItems.length > 0 && (
          <Alert variant="warning">
            Unrecognized items from server: {unknownItems.join(', ')}
          </Alert>
        )}
        <Table striped bordered hover size="sm" className="modern-table">
          <thead>
            <tr>
              <th>Owned</th>
              <th>Name</th>
              <th>Weight</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(items).map(([key, item]) => (
              <tr key={key}>
                <td>
                  <Form.Check
                    type="checkbox"
                    className="weapon-checkbox"
                    checked={item.owned}
                    onChange={handleOwnedToggle(key)}
                    aria-label={item.displayName || item.name}
                  />
                </td>
                <td>{item.displayName || item.name}</td>
                <td>{item.weight}</td>
                <td>{item.cost}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}

export default ItemList;
