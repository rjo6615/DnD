import React, { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Alert, Button, Modal, Badge } from 'react-bootstrap';
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
 *   cartCounts?: Record<string, number> | null,
 * }} props
 */
const buildItemOwnershipMap = (initialItems) => {
  const map = new Map();
  if (!Array.isArray(initialItems)) return map;

  initialItems.forEach((entry) => {
    if (!entry) return;
    if (typeof entry === 'object' && entry.owned === false) return;

    let name = '';
    if (typeof entry === 'string') {
      name = entry;
    } else if (Array.isArray(entry)) {
      [name] = entry;
    } else if (typeof entry === 'object') {
      name = entry.name || entry.displayName || '';
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
  cartCounts = null,
}) {
  const [items, setItems] =
    useState/** @type {Record<string, Item & { owned?: boolean, ownedCount?: number, displayName?: string }> | null} */(null);
  const [error, setError] = useState(null);
  const [unknownItems, setUnknownItems] = useState([]);
  const [notesItem, setNotesItem] = useState(null);

  const ownershipMap = useMemo(
    () => buildItemOwnershipMap(initialItems),
    [initialItems]
  );

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

        const all = { ...phb, ...customMap };
        const keys = Object.keys(all);
        const unknown = [];
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
            ownedCount,
            owned: ownedCount > 0,
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

  useEffect(() => {
    setItems((prev) => {
      if (!prev) return prev;
      let changed = false;
      const next = Object.entries(prev).reduce((acc, [key, item]) => {
        const displayKey = (item.displayName || item.name || '').toLowerCase();
        const ownedEntry =
          ownershipMap.get(key) ||
          (displayKey && displayKey !== key
            ? ownershipMap.get(displayKey)
            : undefined);
        const ownedCount = ownedEntry?.count ?? 0;
        const owned = ownedCount > 0;
        if (item.owned !== owned || (item.ownedCount ?? 0) !== ownedCount) {
          changed = true;
          acc[key] = { ...item, owned, ownedCount };
        } else {
          acc[key] = item;
        }
        return acc;
      }, /** @type {Record<string, Item & { owned?: boolean, ownedCount?: number, displayName?: string }>} */ ({}));
      return changed ? next : prev;
    });
  }, [ownershipMap]);

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

  const getCartCount = (item) => {
    if (!cartCounts) return 0;
    const key = `item::${String(item?.name || '').toLowerCase()}`;
    return cartCounts[key] ?? 0;
  };

  const handleCloseNotes = () => setNotesItem(null);
  const handleShowNotes = (item) => () => setNotesItem(item);

  const bodyStyle = embedded ? undefined : { overflowY: 'auto', maxHeight: '70vh' };
  const filteredEntries = Object.entries(items).filter(([, item]) =>
    ownedOnly ? (item.ownedCount ?? 0) > 0 : true
  );
  const expandedEntries = ownedOnly
    ? filteredEntries.flatMap(([key, item]) => {
        const count = item.ownedCount ?? 0;
        if (count <= 0) return [];
        if (count === 1) {
          return [
            {
              reactKey: key,
              dataKey: key,
              item,
              copyIndex: 0,
              copyCount: 1,
            },
          ];
        }
        return Array.from({ length: count }, (_, index) => ({
          reactKey: `${key}-${index}`,
          dataKey: key,
          item,
          copyIndex: index,
          copyCount: count,
        }));
      })
    : filteredEntries.map(([key, item]) => ({
        reactKey: key,
        dataKey: key,
        item,
        copyIndex: 0,
        copyCount: item.ownedCount ?? 0,
      }));
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
      {expandedEntries.length === 0 ? (
        <div className="text-center text-muted py-3">
          {ownedOnly
            ? 'No items in inventory.'
            : 'No items available.'}
        </div>
      ) : (
        <Row className="row-cols-2 row-cols-lg-3 g-3">
          {expandedEntries.map(({ reactKey, dataKey, item, copyIndex, copyCount }) => {
            const categoryKey =
              typeof item.category === 'string'
                ? item.category.toLowerCase()
                : '';
            const Icon = categoryIcons[categoryKey] || GiTreasureMap;
            return (
              <Col key={reactKey}>
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
                    {(item.notes || (ownedOnly && copyCount > 1)) && (
                      <div className="mt-auto d-flex flex-column align-items-start gap-1">
                        {item.notes && (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0"
                            onClick={handleShowNotes(item)}
                          >
                            Notes
                          </Button>
                        )}
                        {ownedOnly && copyCount > 1 && (
                          <span className="text-muted small">
                            Copy {copyIndex + 1} of {copyCount}
                          </span>
                        )}
                      </div>
                    )}
                  </Card.Body>
                  {!ownedOnly && (
                    <Card.Footer className="d-flex justify-content-center">
                      <div className="d-flex align-items-center gap-2">
                        <Button size="sm" onClick={handleAddToCart(item)}>
                          Add to Cart
                        </Button>
                        {cartCounts ? (
                          <Badge bg="secondary" pill>
                            {`In Cart: ${getCartCount(item)}`}
                          </Badge>
                        ) : null}
                      </div>
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
    bodyContent
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
      {modal}
    </Card>
  );
}

export default ItemList;
