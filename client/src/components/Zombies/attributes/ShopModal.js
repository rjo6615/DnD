import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Card, Tab, Button, Nav, Badge } from 'react-bootstrap';
import { FaShoppingCart } from 'react-icons/fa';
import WeaponList from '../../Weapons/WeaponList';
import ArmorList from '../../Armor/ArmorList';
import ItemList from '../../Items/ItemList';

const DEFAULT_TAB = 'weapons';

const COIN_VALUES = {
  cp: 1,
  sp: 10,
  ep: 50,
  gp: 100,
  pp: 1000,
};

const NUMERIC_PATTERN = /^[-+]?\d*\.?\d+$/;

const costToCp = (costString) => {
  if (costString == null) return 0;

  if (typeof costString === 'number' && Number.isFinite(costString)) {
    return Math.round(costString * COIN_VALUES.gp);
  }

  if (typeof costString !== 'string') return 0;

  const trimmed = costString.trim();
  if (!trimmed) return 0;

  const normalized = trimmed.toLowerCase();
  if (!/\d/.test(normalized)) return 0;

  const numericOnly = normalized.replace(/,/g, '');
  if (!/[a-z]/.test(numericOnly) && NUMERIC_PATTERN.test(numericOnly)) {
    const value = parseFloat(numericOnly);
    return Number.isNaN(value) ? 0 : Math.round(value * COIN_VALUES.gp);
  }

  let total = 0;
  const regex = /(-?\d*\.?\d+)\s*(pp|gp|ep|sp|cp)/g;
  let match;
  // eslint-disable-next-line no-cond-assign
  while ((match = regex.exec(normalized))) {
    const value = parseFloat(match[1]);
    const unit = match[2];
    if (Number.isNaN(value)) continue;
    const multiplier = COIN_VALUES[unit] || 0;
    if (!multiplier) continue;
    total += Math.round(value * multiplier);
  }

  return total;
};

const formatCp = (cp) => {
  const value = Number.isFinite(cp) ? cp : 0;
  const isNegative = value < 0;
  let remaining = Math.abs(Math.round(value));

  const pp = Math.floor(remaining / COIN_VALUES.pp);
  remaining -= pp * COIN_VALUES.pp;
  const gp = Math.floor(remaining / COIN_VALUES.gp);
  remaining -= gp * COIN_VALUES.gp;
  const sp = Math.floor(remaining / COIN_VALUES.sp);
  remaining -= sp * COIN_VALUES.sp;
  const cpValue = remaining;

  const prefix = isNegative ? '-' : '';

  return `${prefix}PP ${pp} • GP ${gp} • SP ${sp} • CP ${cpValue}`;
};

const parseProperties = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((prop) => prop.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeWeapons = (weapons) => {
  if (!Array.isArray(weapons)) return [];
  return weapons
    .map((weapon) => {
      if (!weapon) return null;
      if (Array.isArray(weapon)) {
        const [
          name,
          category,
          damage,
          properties,
          weight,
          cost,
          type,
          attackBonus,
        ] = weapon;
        if (!name) return null;
        const normalized = {
          name,
          category: category ?? '',
          damage: typeof damage === 'string' ? damage : String(damage || ''),
          properties: parseProperties(properties),
          weight: weight ?? '',
          cost: cost ?? '',
        };
        if (type !== undefined) normalized.type = type;
        if (attackBonus !== undefined) normalized.attackBonus = attackBonus;
        return normalized;
      }
      if (typeof weapon === 'string') {
        return {
          name: weapon,
          category: '',
          damage: '',
          properties: [],
          weight: '',
          cost: '',
        };
      }
      if (typeof weapon === 'object') {
        const {
          name,
          category = '',
          damage = '',
          properties,
          weight = '',
          cost = '',
          type,
          attackBonus,
          ...rest
        } = weapon;
        if (!name) return null;
        return {
          name,
          category,
          damage: typeof damage === 'string' ? damage : String(damage || ''),
          properties: parseProperties(properties),
          weight,
          cost,
          ...(type !== undefined ? { type } : {}),
          ...(attackBonus !== undefined ? { attackBonus } : {}),
          ...rest,
        };
      }
      return null;
    })
    .filter(Boolean);
};

const normalizeArmor = (armor) => {
  if (!Array.isArray(armor)) return [];
  return armor
    .map((piece) => {
      if (!piece) return null;
      if (Array.isArray(piece)) {
        const [
          name,
          acBonus,
          maxDex,
          strengthRequirement,
          stealth,
          weight,
          cost,
          type,
        ] = piece;
        if (!name) return null;
        const normalized = {
          name,
          acBonus: acBonus ?? '',
          maxDex: maxDex ?? null,
        };
        if (strengthRequirement !== undefined)
          normalized.strength = strengthRequirement;
        if (stealth !== undefined) normalized.stealth = stealth;
        if (weight !== undefined) normalized.weight = weight;
        if (cost !== undefined) normalized.cost = cost;
        if (type !== undefined) normalized.type = type;
        return normalized;
      }
      if (typeof piece === 'string') {
        return {
          name: piece,
          acBonus: '',
          maxDex: null,
          strength: null,
          stealth: null,
          weight: '',
          cost: '',
        };
      }
      if (typeof piece === 'object') {
        const {
          name,
          acBonus = '',
          maxDex = null,
          strength = null,
          stealth = null,
          weight = '',
          cost = '',
          type,
          ...rest
        } = piece;
        if (!name) return null;
        return {
          name,
          acBonus,
          maxDex,
          strength,
          stealth,
          weight,
          cost,
          ...(type !== undefined ? { type } : {}),
          ...rest,
        };
      }
      return null;
    })
    .filter(Boolean);
};

const normalizeItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item) return null;
      if (Array.isArray(item)) {
        const [
          name,
          category,
          weight,
          cost,
          notes,
          statBonuses,
          skillBonuses,
        ] = item;
        if (!name) return null;
        const normalized = {
          name,
          category: category ?? '',
          weight: weight ?? '',
          cost: cost ?? '',
          statBonuses:
            statBonuses && typeof statBonuses === 'object' ? statBonuses : {},
          skillBonuses:
            skillBonuses && typeof skillBonuses === 'object'
              ? skillBonuses
              : {},
        };
        if (notes) normalized.notes = notes;
        return normalized;
      }
      if (typeof item === 'string') {
        return {
          name: item,
          category: '',
          weight: '',
          cost: '',
          statBonuses: {},
          skillBonuses: {},
        };
      }
      if (typeof item === 'object') {
        const {
          name,
          itemName,
          displayName,
          category = '',
          weight = '',
          cost = '',
          statBonuses,
          skillBonuses,
          notes,
          ...rest
        } = item;
        const resolvedName = name || itemName || displayName;
        if (!resolvedName) return null;
        const normalized = {
          name: resolvedName,
          category,
          weight,
          cost,
          statBonuses:
            statBonuses && typeof statBonuses === 'object' ? statBonuses : {},
          skillBonuses:
            skillBonuses && typeof skillBonuses === 'object'
              ? skillBonuses
              : {},
          ...rest,
        };
        if (itemName !== undefined) normalized.itemName = itemName;
        if (displayName !== undefined) {
          normalized.displayName = displayName;
        } else if (!name && itemName) {
          normalized.displayName = itemName;
        }
        if (notes) normalized.notes = notes;
        return normalized;
      }
      return null;
    })
    .filter(Boolean);
};

export default function ShopModal({
  show,
  activeTab,
  onHide,
  form = {},
  characterId,
  strength,
  onWeaponsChange,
  onArmorChange,
  onItemsChange,
  onTabChange,
  currency = {},
  onPurchase = () => {},
}) {
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [insufficientFunds, setInsufficientFunds] = useState('');
  const [activeTabState, setActiveTabState] = useState(
    activeTab || DEFAULT_TAB
  );
  const currentTab =
    (typeof activeTab === 'string' && activeTab.length
      ? activeTab
      : activeTabState) || DEFAULT_TAB;

  const { cp = 0, sp = 0, gp = 0, pp = 0 } = currency || {};

  const availableCp = useMemo(
    () => pp * COIN_VALUES.pp + gp * COIN_VALUES.gp + sp * COIN_VALUES.sp + cp,
    [pp, gp, sp, cp]
  );

  const totalCostCp = useMemo(
    () => cart.reduce((sum, item) => sum + costToCp(item?.cost), 0),
    [cart]
  );
  const formattedTotalCost = useMemo(
    () => formatCp(totalCostCp),
    [totalCostCp]
  );

  const buildCartKey = useCallback((entry) => {
    if (!entry) return '';
    if (typeof entry === 'string') {
      const normalizedName = entry.toLowerCase();
      return normalizedName ? `::${normalizedName}` : '';
    }
    const normalizedType = String(entry.type || '').toLowerCase();
    const normalizedName = String(
      entry.displayName || entry.name || entry.itemName || ''
    ).toLowerCase();
    if (!normalizedName && !normalizedType) return '';
    return `${normalizedType}::${normalizedName}`;
  }, []);

  const cartCounts = useMemo(() => {
    return cart.reduce((acc, item) => {
      if (!item) return acc;
      const key = buildCartKey(item);
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, /** @type {Record<string, number>} */ ({}));
  }, [buildCartKey, cart]);

  const handleAddToCart = useCallback((item) => {
    setCart((prevCart) => [...prevCart, item]);
  }, []);

  const handleRemoveFromCart = useCallback((index) => {
    setCart((prevCart) => {
      if (index < 0 || index >= prevCart.length) return prevCart;
      const updatedCart = [...prevCart];
      updatedCart.splice(index, 1);
      return updatedCart;
    });
  }, []);

  const handlePurchase = useCallback(() => {
    if (totalCostCp > availableCp) {
      setInsufficientFunds('Insufficient funds to complete purchase.');
      return;
    }

    try {
      onPurchase(cart, totalCostCp);
    } finally {
      setCart([]);
      setShowCart(false);
    }
  }, [availableCp, cart, onPurchase, totalCostCp]);

  useEffect(() => {
    setInsufficientFunds('');
  }, [cart, cp, gp, sp, pp]);

  useEffect(() => {
    if (totalCostCp > availableCp) {
      setInsufficientFunds('Insufficient funds to complete purchase.');
    }
  }, [availableCp, totalCostCp]);

  useEffect(() => {
    if (activeTab && activeTab !== activeTabState) {
      setActiveTabState(activeTab);
    }
  }, [activeTab, activeTabState]);

  const normalizedWeapons = useMemo(
    () => normalizeWeapons(form.weapon || []),
    [form.weapon]
  );
  const normalizedArmor = useMemo(
    () => normalizeArmor(form.armor || []),
    [form.armor]
  );
  const normalizedItems = useMemo(
    () => normalizeItems(form.item || []),
    [form.item]
  );

  const handleSelectTab = (key) => {
    if (!key || key === currentTab) return;
    setActiveTabState(key);
    if (typeof onTabChange === 'function') {
      onTabChange(key);
    }
  };

  const tabConfigs = useMemo(
    () => [
      {
        key: 'weapons',
        title: 'Weapons',
        render: (isActive) =>
          isActive ? (
            <WeaponList
              campaign={form.campaign}
              initialWeapons={normalizedWeapons}
              onChange={onWeaponsChange}
              characterId={characterId}
              show={isActive}
              onAddToCart={handleAddToCart}
              cartCounts={cartCounts}
            />
          ) : null,
      },
      {
        key: 'armor',
        title: 'Armor',
        render: (isActive) =>
          isActive ? (
            <ArmorList
              campaign={form.campaign}
              initialArmor={normalizedArmor}
              onChange={onArmorChange}
              characterId={characterId}
              show={isActive}
              strength={strength}
              onAddToCart={handleAddToCart}
              cartCounts={cartCounts}
            />
          ) : null,
      },
      {
        key: 'items',
        title: 'Items',
        render: (isActive) =>
          isActive ? (
            <ItemList
              campaign={form.campaign}
              initialItems={normalizedItems}
              onChange={onItemsChange}
              characterId={characterId}
              show={isActive}
              onClose={onHide}
              onAddToCart={handleAddToCart}
              cartCounts={cartCounts}
            />
          ) : null,
      },
    ],
    [
      characterId,
      form.campaign,
      normalizedArmor,
      normalizedItems,
      normalizedWeapons,
      cartCounts,
      handleAddToCart,
      onArmorChange,
      onHide,
      onItemsChange,
      onWeaponsChange,
      strength,
    ]
  );

  return (
    <>
      <Modal
      className="dnd-modal modern-modal"
      show={show}
      onHide={onHide}
      size="lg"
      centered
      scrollable
      fullscreen="sm-down"
    >
      <Card className="modern-card">
        <Card.Header className="modal-header">
          <Card.Title className="modal-title">Shop</Card.Title>
        </Card.Header>
        <Card.Body
          className="modal-body"
          style={{ maxHeight: '80vh', overflowY: 'auto' }}
        >
          <Tab.Container activeKey={currentTab} onSelect={handleSelectTab}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <Nav variant="tabs" className="mb-0">
                {tabConfigs.map(({ key, title }) => (
                  <Nav.Item key={key}>
                    <Nav.Link eventKey={key}>{title}</Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>
              <div className="ms-auto d-flex align-items-center gap-3 text-nowrap">
                <span>PP {pp} • GP {gp} • SP {sp} • CP {cp}</span>
                <Button
                  variant="outline-secondary"
                  className="shop-cart-btn position-relative"
                  aria-label="View cart"
                  onClick={() => setShowCart(true)}
                >
                  <FaShoppingCart size={20} />
                  <Badge
                    bg="secondary"
                    pill
                    className="position-absolute top-0 start-100 translate-middle"
                  >
                    {cart.length}
                  </Badge>
                </Button>
              </div>
            </div>
            <Tab.Content>
              {tabConfigs.map(({ key, render }) => {
                const isActive = show && currentTab === key;
                return (
                  <Tab.Pane eventKey={key} key={key}>
                    {render(isActive)}
                  </Tab.Pane>
                );
              })}
            </Tab.Content>
          </Tab.Container>
        </Card.Body>
        <Card.Footer className="modal-footer">
          <Button className="action-btn close-btn" onClick={onHide}>
            Close
          </Button>
        </Card.Footer>
      </Card>
      </Modal>
      <Modal show={showCart} onHide={() => setShowCart(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Cart</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {cart.length === 0 ? (
            <p className="mb-0">Your cart is empty.</p>
          ) : (
            <>
              <div className="d-flex flex-column gap-2">
                {cart.map((item, index) => (
                  <div
                    key={`${item?.name || 'item'}-${index}`}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div className="me-3">
                      <div className="fw-semibold">{item?.name || 'Unknown Item'}</div>
                      <div className="text-muted small">
                        {item?.type ? `${item.type} • ` : ''}
                        Cost: {item?.cost ?? '—'}
                      </div>
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleRemoveFromCart(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-end fw-semibold">
                Total: {formattedTotalCost}
              </div>
              {insufficientFunds ? (
                <Alert variant="danger" className="mt-3 mb-0">
                  {insufficientFunds}
                </Alert>
              ) : null}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCart(false)}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handlePurchase}
            disabled={cart.length === 0 || totalCostCp > availableCp}
          >
            Purchase
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
