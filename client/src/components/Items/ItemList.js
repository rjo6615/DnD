import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Alert, Button, Modal } from 'react-bootstrap';
import {
  GiAmmoBox,
  GiBackpack,
  GiChariot,
  GiHammerNails,
  GiHorseHead,
  GiSaddle,
  GiSailboat,
  GiTreasureMap,
} from 'react-icons/gi';
import apiFetch from '../../utils/apiFetch';
import { STATS } from '../Zombies/statSchema';
import { SKILLS } from '../Zombies/skillSchema';

const STAT_LABELS = STATS.reduce((acc, { key, label }) => {
  acc[key] = label;
  return acc;
}, {});

const SKILL_LABELS = SKILLS.reduce((acc, { key, label }) => {
  acc[key] = label;
  return acc;
}, {});

const categoryIcons = {
  'adventuring gear': GiBackpack,
  ammunition: GiAmmoBox,
  tool: GiHammerNails,
  mount: GiHorseHead,
  'tack and harness': GiSaddle,
  vehicle: GiChariot,
  'water vehicle': GiSailboat,
  custom: GiTreasureMap,
};

const renderBonuses = (bonuses, labels) =>
  Object.entries(bonuses || {})
    .map(([k, v]) => `${labels[k] || k}: ${v}`)
    .join(', ');

/** @typedef {import('../../../../types/item').Item} Item */

/**
 * List of items with cart actions and notes display.
 * @param {{
 *   campaign?: string,
 *   onChange?: (items: Item[]) => void,
 *   initialItems?: Item[],
 *   characterId?: string,
 *   show?: boolean,
 *   onClose?: () => void,
 *   embedded?: boolean,
 *   onAddToCart?: (item: Item & { type?: string }) => void,
 *   ownedOnly?: boolean,
 * }} props
 */
function ItemList({
  campaign,
  onChange,
  initialItems = [],
  characterId,
  show = true,
  onClose,
  embedded = false,
  onAddToCart = () => {},
  ownedOnly = false,
}) {
  const [items, setItems] =
    useState/** @type {Record<string, Item & { owned?: boolean, displayName?: string }> | null} */(null);
  const [error, setError] = useState(null);
  const [unknownItems, setUnknownItems] = useState([]);
  const [notesItem, setNotesItem] = useState(null);

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
                statBonuses: it.statBonuses || {},
                skillBonuses: it.skillBonuses || {},
                ...(it.notes ? { notes: it.notes } : {}),
              };
              return acc;
            }, {})
          : {};

        const ownedSet = new Set(
          initialItems
            .map((i) => {
              if (typeof i === 'string') return i;
              if (Array.isArray(i)) return i[0];
              return i.name || '';
            })
            .map((n) => n.toLowerCase())
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
        const { status = 0, statusText = '', message = err?.message || 'Unknown error' } =
          err || {};
        setError({ status, statusText, message });
      }
    }

    fetchItems();
  }, [campaign, initialItems, show]);

  if (!items) {
    return null;
  }

  const handleAddToCart = (item) => () => {
    const payload = {
      ...item,
      ...(item.type ? { itemType: item.type } : {}),
      type: 'item',
    };
    onAddToCart(payload);
  };

  const handleCloseNotes = () => setNotesItem(null);
  const handleShowNotes = (item) => () => setNotesItem(item);

  const bodyStyle = { overflowY: 'auto', maxHeight: '70vh' };
  const entries = Object.entries(items).filter(([, item]) =>
    ownedOnly ? item.owned : true
  );
  const bodyContent = (
    <>
      {error && (
        <Alert variant="danger">
          {`Failed to load items: ${
            error.message || `${error.status} ${error.statusText}`
          }`}
        </Alert>
      )}
      {unknownItems.length > 0 && (
        <Alert variant="warning">
          Unrecognized items from server: {unknownItems.join(', ')}
        </Alert>
      )}
      {entries.length === 0 ? (
        <div className="text-center text-muted py-3">
          {ownedOnly
            ? 'No items in inventory.'
            : 'No items available.'}
        </div>
      ) : (
        <Row className="row-cols-2 row-cols-lg-3 g-3">
          {entries.map(([key, item]) => {
            const categoryKey =
              typeof item.category === 'string'
                ? item.category.toLowerCase()
                : '';
            const Icon = categoryIcons[categoryKey] || GiTreasureMap;
            return (
              <Col key={key}>
                <Card className="item-card h-100">
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex justify-content-center mb-2">
                      <Icon size={40} title={item.category} />
                    </div>
                    <Card.Title>{item.displayName || item.name}</Card.Title>
                    <Card.Text>Category: {item.category}</Card.Text>
                    <Card.Text>Weight: {item.weight}</Card.Text>
                    <Card.Text>Cost: {item.cost}</Card.Text>
                    {renderBonuses(item.statBonuses, STAT_LABELS) && (
                      <Card.Text>
                        Stat Bonuses: {renderBonuses(
                          item.statBonuses,
                          STAT_LABELS
                        )}
                      </Card.Text>
                    )}
                    {renderBonuses(item.skillBonuses, SKILL_LABELS) && (
                      <Card.Text>
                        Skill Bonuses: {renderBonuses(
                          item.skillBonuses,
                          SKILL_LABELS
                        )}
                      </Card.Text>
                    )}
                    {item.notes && (
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-auto align-self-start p-0"
                        onClick={handleShowNotes(item)}
                      >
                        Notes
                      </Button>
                    )}
                  </Card.Body>
                  {!ownedOnly && (
                    <Card.Footer className="d-flex justify-content-center">
                      <Button size="sm" onClick={handleAddToCart(item)}>
                        Add to Cart
                      </Button>
                    </Card.Footer>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </>
  );

  const body = embedded ? (
    <div style={bodyStyle}>{bodyContent}</div>
  ) : (
    <Card.Body style={bodyStyle}>{bodyContent}</Card.Body>
  );

  const modal = (
    <Modal show={!!notesItem} onHide={handleCloseNotes} size="sm">
      <Modal.Header closeButton>
        <Modal.Title>{notesItem?.displayName || notesItem?.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{notesItem?.notes}</Modal.Body>
    </Modal>
  );

  if (embedded) {
    return (
      <>
        {body}
        {modal}
      </>
    );
  }

  return (
    <Card className="modern-card">
      <Card.Header className="modal-header">
        <Card.Title className="modal-title">Items</Card.Title>
      </Card.Header>
      {body}
      {typeof onClose === 'function' && (
        <Card.Footer className="modal-footer">
          <Button className="action-btn close-btn" onClick={onClose}>
            Close
          </Button>
        </Card.Footer>
      )}
      {modal}
    </Card>
  );
}

export default ItemList;
