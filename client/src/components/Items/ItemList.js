import React, { useEffect, useMemo, useState } from 'react';
import { Card, Row, Col, Alert, Button, Modal, Badge, Form } from 'react-bootstrap';
import {
  GiAmmoBox,
  GiBackpack,
  GiChariot,
  GiHammerNails,
  GiHorseHead,
  GiPotionBall,
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
  consumable: GiPotionBall,
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

const EMPTY_ARRAY = Object.freeze([]);

const normalizeItemName = (value) => {
  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }
  return '';
};

const extractEntryName = (entry) => {
  if (!entry) return '';
  if (typeof entry === 'string') {
    return normalizeItemName(entry);
  }
  if (Array.isArray(entry)) {
    return extractEntryName(entry[0]);
  }
  if (typeof entry === 'object') {
    return (
      normalizeItemName(entry.displayName) ||
      normalizeItemName(entry.itemName) ||
      normalizeItemName(entry.name)
    );
  }
  return '';
};

const buildMatchKeySet = (item, dataKey) => {
  const keys = new Set();
  const addKey = (value) => {
    const normalized = normalizeItemName(value);
    if (normalized) {
      keys.add(normalized);
    }
  };
  addKey(dataKey);
  if (item) {
    addKey(item.displayName);
    addKey(item.itemName);
    addKey(item.name);
  }
  return keys;
};

const removeFirstMatchingEntry = (entries, item, dataKey) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return entries;
  }
  const matchKeys = buildMatchKeySet(item, dataKey);
  if (matchKeys.size === 0) {
    return entries;
  }
  const index = entries.findIndex((entry) => matchKeys.has(extractEntryName(entry)));
  if (index === -1) {
    return entries;
  }
  const next = entries.slice();
  next.splice(index, 1);
  return next;
};

const isConsumableItem = (item) =>
  Array.isArray(item?.properties) &&
  item.properties.some(
    (prop) => typeof prop === 'string' && prop.trim().toLowerCase() === 'consumable'
  );

const isConsumablePotion = (item) => {
  if (!isConsumableItem(item)) {
    return false;
  }

  const label = `${item?.displayName || item?.name || ''}`.toLowerCase();
  return label.includes('potion');
};

const dispatchConsumablePotionUsed = (item) => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }

  if (!isConsumablePotion(item)) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('inventory:consumable-used', {
      detail: {
        type: 'potion',
        item,
      },
    })
  );
};

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

const HEALING_DICE_REGEX = /(\d+)d(\d+)/gi;
const HEALING_MODIFIER_REGEX = /([+-]\s*\d+)/gi;

const sanitizeHealingString = (healing) => {
  if (typeof healing !== 'string') {
    return '';
  }

  const withoutHpText = healing
    .replace(/hit points?.*$/i, '')
    .replace(/hp.*$/i, '')
    .trim();

  return withoutHpText.replace(/\s+/g, ' ').trim();
};

const rollHealingValue = (healing) => {
  const sanitized = sanitizeHealingString(healing);
  if (!sanitized) {
    return null;
  }

  HEALING_DICE_REGEX.lastIndex = 0;
  const diceMatches = Array.from(sanitized.matchAll(HEALING_DICE_REGEX));
  if (diceMatches.length === 0) {
    return null;
  }

  let total = 0;
  const diceSections = diceMatches
    .map((match) => {
      const count = parseInt(match[1], 10);
      const sides = parseInt(match[2], 10);
      if (!Number.isFinite(count) || !Number.isFinite(sides)) {
        return null;
      }

      const rolls = Array.from({ length: count }, () =>
        Math.floor(Math.random() * sides) + 1
      );
      const subtotal = rolls.reduce((sum, value) => sum + value, 0);
      total += subtotal;
      return { label: match[0], rolls };
    })
    .filter(Boolean);

  HEALING_MODIFIER_REGEX.lastIndex = 0;
  const modifierMatches = Array.from(
    sanitized.matchAll(HEALING_MODIFIER_REGEX)
  );
  const modifierValues = modifierMatches
    .map((match) => {
      const raw = (match[1] || match[0] || '').replace(/\s+/g, '');
      const value = parseInt(raw, 10);
      if (!Number.isFinite(value)) {
        return null;
      }
      total += value;
      return value;
    })
    .filter((value) => value !== null);

  const breakdownSections = [];
  if (diceSections.length > 0) {
    breakdownSections.push(
      diceSections
        .map(
          ({ label, rolls }) => `${rolls.join(' + ')} (${label.trim()})`
        )
        .join(' + ')
    );
  }
  if (modifierValues.length > 0) {
    breakdownSections.push(
      modifierValues
        .map(
          (value) => `${value >= 0 ? '+' : '-'}${Math.abs(value)} modifier`
        )
        .join(' + ')
    );
  }

  return {
    total,
    breakdown: breakdownSections.join('; '),
    expression: sanitized,
    diceSections,
    modifierValues,
  };
};

const triggerHealingRoll = (item) => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }

  const result = rollHealingValue(item?.healing);
  if (!result) {
    return;
  }

  const sourceLabel = item?.displayName || item?.name || 'Healing Potion';
  const expression = result.expression
    ? result.expression.replace(/([+-])/g, ' $1').trim()
    : undefined;
  const rollValues = Array.isArray(result.diceSections)
    ? result.diceSections.flatMap(({ rolls }) => rolls)
    : undefined;
  const modifierLabels = Array.isArray(result.modifierValues)
    ? result.modifierValues.map((value) =>
        `${value >= 0 ? '+' : '-'}${Math.abs(value)} modifier`
      )
    : undefined;

  const detail = {
    value: result.total,
    breakdown: result.breakdown || result.expression,
    source: `${sourceLabel} Healing`,
    sourceLabel,
    actionLabel: 'Healing',
    expression,
    rollValues,
    modifierValues: modifierLabels,
  };

  window.dispatchEvent(new CustomEvent('damage-roll', { detail }));
};

function ItemList({
  campaign,
  onChange,
  initialItems = EMPTY_ARRAY,
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
  const [ownedEntries, setOwnedEntries] = useState(() =>
    Array.isArray(initialItems) ? initialItems : EMPTY_ARRAY
  );
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categoryOptions = useMemo(() => {
    if (!items) {
      return [];
    }

    const categoryMap = new Map();
    Object.values(items).forEach((item) => {
      const label = typeof item?.category === 'string' ? item.category.trim() : '';
      if (!label) return;
      const value = label.toLowerCase();
      if (!categoryMap.has(value)) {
        categoryMap.set(value, label);
      }
    });

    return Array.from(categoryMap.entries())
      .sort(([, aLabel], [, bLabel]) => aLabel.localeCompare(bLabel))
      .map(([value, label]) => ({ value, label }));
  }, [items]);

  useEffect(() => {
    if (Array.isArray(initialItems)) {
      setOwnedEntries((prev) => (prev === initialItems ? prev : initialItems));
    } else {
      setOwnedEntries((prev) => (prev === EMPTY_ARRAY ? prev : EMPTY_ARRAY));
    }
  }, [initialItems]);

  useEffect(() => {
    if (selectedCategory === 'all') {
      return;
    }

    const hasSelected = categoryOptions.some(({ value }) => value === selectedCategory);
    if (!hasSelected) {
      setSelectedCategory('all');
    }
  }, [categoryOptions, selectedCategory]);

  const ownershipMap = useMemo(
    () => buildItemOwnershipMap(ownedEntries),
    [ownedEntries]
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

  const handleCategoryChange = (event) => {
    setSelectedCategory(event.target.value);
  };

  const handleUseItem = (dataKey, item) => () => {
    if (!ownedOnly || !isConsumableItem(item)) {
      return;
    }

    const nextEntries = removeFirstMatchingEntry(ownedEntries, item, dataKey);
    if (nextEntries === ownedEntries) {
      return;
    }

    setOwnedEntries(nextEntries);

    if (item?.healing) {
      triggerHealingRoll(item);
    }

    if (isConsumablePotion(item)) {
      dispatchConsumablePotionUsed(item);
      if (typeof onClose === 'function') {
        onClose();
      }
    }

    if (typeof onChange === 'function') {
      onChange(nextEntries);
    }
  };

  const getCartCount = (item) => {
    if (!cartCounts) return 0;
    const key = `item::${String(item?.name || '').toLowerCase()}`;
    return cartCounts[key] ?? 0;
  };

  const handleCloseNotes = () => setNotesItem(null);
  const handleShowNotes = (item) => () => setNotesItem(item);

  const bodyStyle = embedded ? undefined : { overflowY: 'auto', maxHeight: '70vh' };
  const filteredEntries = Object.entries(items).filter(([, item]) => {
    if (ownedOnly && (item.ownedCount ?? 0) <= 0) {
      return false;
    }

    if (selectedCategory !== 'all') {
      const normalizedCategory =
        typeof item.category === 'string' ? item.category.trim().toLowerCase() : '';
      return normalizedCategory === selectedCategory;
    }

    return true;
  });
  const displayEntries = filteredEntries.map(([key, item]) => ({
    reactKey: key,
    dataKey: key,
    item,
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
      {categoryOptions.length > 0 && (
        <div className="d-flex flex-wrap justify-content-end mb-3">
          <Form.Group className="d-flex align-items-center gap-2 mb-0">
            <Form.Label className="mb-0" htmlFor="item-category-filter">
              Category
            </Form.Label>
            <Form.Select
              id="item-category-filter"
              size="sm"
              value={selectedCategory}
              onChange={handleCategoryChange}
            >
              <option value="all">All</option>
              {categoryOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </div>
      )}
      {displayEntries.length === 0 ? (
        <div className="text-center text-muted py-3">
          {ownedOnly
            ? 'No items in inventory.'
            : 'No items available.'}
        </div>
      ) : (
        <Row className="row-cols-2 row-cols-lg-3 g-3">
          {displayEntries.map(({ reactKey, dataKey, item }) => {
            const categoryKey =
              typeof item.category === 'string'
                ? item.category.toLowerCase()
                : '';
            const Icon = categoryIcons[categoryKey] || GiTreasureMap;
            const canUseItem = ownedOnly && isConsumableItem(item);
            const quantity = ownedOnly ? item.ownedCount ?? 0 : 0;
            return (
              <Col key={reactKey}>
                <Card className="item-card h-100 position-relative">
                  {ownedOnly && quantity > 1 ? (
                    <span className="item-card__quantity badge bg-dark">
                      ×{quantity}
                    </span>
                  ) : null}
                  <Card.Body className="d-flex flex-column">
                    <div className="d-flex justify-content-center mb-2">
                      <Icon size={40} title={item.category} />
                    </div>
                    <Card.Title>{item.displayName || item.name}</Card.Title>
                    <Card.Text>Category: {item.category}</Card.Text>
                    <Card.Text>Weight: {item.weight}</Card.Text>
                    <Card.Text>Cost: {item.cost}</Card.Text>
                    {item.rarity ? (
                      <Card.Text>Rarity: {item.rarity}</Card.Text>
                    ) : null}
                    {item.healing ? (
                      <Card.Text>HP Regained: {item.healing}</Card.Text>
                    ) : null}
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
                      <div className="mt-auto d-flex flex-column align-items-start gap-1">
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0"
                          onClick={handleShowNotes(item)}
                        >
                          Notes
                        </Button>
                      </div>
                    )}
                  </Card.Body>
                  <Card.Footer className="d-flex justify-content-center">
                    {ownedOnly ? (
                      <Button
                        size="sm"
                        onClick={handleUseItem(dataKey, item)}
                        disabled={!canUseItem}
                        title={
                          canUseItem ? undefined : 'Only consumable items can be used.'
                        }
                      >
                        Use
                      </Button>
                    ) : (
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
