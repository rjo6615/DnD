import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Card, Tab, Button, Nav, Badge } from 'react-bootstrap';
import { FaCoins, FaShoppingCart } from 'react-icons/fa';
import WeaponList from '../../Weapons/WeaponList';
import ArmorList from '../../Armor/ArmorList';
import ItemList from '../../Items/ItemList';
import AccessoryList from '../../Accessories/AccessoryList';
import DockControls from '../components/DockControls';
import apiFetch from '../../../utils/apiFetch';

const DEFAULT_TAB = 'weapons';

const SHOP_VISIBILITY_KEYS = ['weapons', 'armor', 'items', 'accessories'];

const formatCurrencyAmount = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return value ?? 0;
  }
  return new Intl.NumberFormat('en-US').format(numeric);
};

const buildHiddenSet = (value) => {
  const set = new Set();
  if (Array.isArray(value)) {
    value.forEach((entry) => {
      if (typeof entry !== 'string') {
        return;
      }
      const normalized = entry.trim().toLowerCase();
      if (normalized) {
        set.add(normalized);
      }
    });
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, hidden]) => {
      if (!hidden || typeof key !== 'string') {
        return;
      }
      const normalized = key.trim().toLowerCase();
      if (normalized) {
        set.add(normalized);
      }
    });
  }
  return set;
};

const createEmptyVisibilitySets = () =>
  SHOP_VISIBILITY_KEYS.reduce((acc, key) => {
    acc[key] = new Set();
    return acc;
  }, {});

const convertVisibilityResponse = (data) => {
  const result = createEmptyVisibilitySets();
  SHOP_VISIBILITY_KEYS.forEach((key) => {
    result[key] = buildHiddenSet(data?.[key]);
  });
  return result;
};

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

const normalizeAccessorySlots = (slots) => {
  if (!Array.isArray(slots)) return [];
  return slots
    .map((slot) => (typeof slot === 'string' ? slot.trim() : ''))
    .filter(Boolean);
};

const normalizeAccessoryBonuses = (bonuses) =>
  bonuses && typeof bonuses === 'object' ? bonuses : {};

const normalizeAccessories = (accessories) => {
  if (!Array.isArray(accessories)) return [];
  return accessories
    .map((accessory) => {
      if (!accessory) return null;
      if (Array.isArray(accessory)) {
        const [
          name,
          category,
          targetSlots,
          rarity,
          weight,
          cost,
          notes,
          statBonuses,
          skillBonuses,
        ] = accessory;
        if (!name) return null;
        const normalized = {
          name,
          category: category ?? '',
          targetSlots: normalizeAccessorySlots(targetSlots),
          rarity: rarity ?? '',
          weight: weight ?? null,
          cost: cost ?? '',
          statBonuses: normalizeAccessoryBonuses(statBonuses),
          skillBonuses: normalizeAccessoryBonuses(skillBonuses),
        };
        if (notes) normalized.notes = notes;
        return normalized;
      }
      if (typeof accessory === 'string') {
        return {
          name: accessory,
          category: '',
          targetSlots: [],
          rarity: '',
          weight: null,
          cost: '',
          statBonuses: {},
          skillBonuses: {},
        };
      }
      if (typeof accessory === 'object') {
        const {
          name,
          accessoryName,
          displayName,
          category = '',
          targetSlots,
          rarity = '',
          weight = null,
          cost = '',
          statBonuses,
          skillBonuses,
          notes,
          ...rest
        } = accessory;
        const resolvedName = name || accessoryName || displayName;
        if (!resolvedName) return null;
        const normalized = {
          name: resolvedName,
          category,
          targetSlots: normalizeAccessorySlots(targetSlots),
          rarity,
          weight,
          cost,
          statBonuses: normalizeAccessoryBonuses(statBonuses),
          skillBonuses: normalizeAccessoryBonuses(skillBonuses),
          ...rest,
        };
        if (!name && accessoryName && normalized.displayName === undefined) {
          normalized.displayName = accessoryName;
        }
        if (displayName !== undefined) {
          normalized.displayName = displayName;
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
  onAccessoriesChange = () => {},
  onTabChange,
  currency = {},
  onPurchase = () => {},
  isDocked = false,
  dockedSide = null,
  onDockClose,
  onDockChange,
}) {
  const [shopVisibility, setShopVisibility] = useState(() =>
    createEmptyVisibilitySets()
  );
  const visibilityCampaignRef = useRef(null);
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
  const formattedCurrency = useMemo(
    () => ({
      pp: formatCurrencyAmount(pp),
      gp: formatCurrencyAmount(gp),
      sp: formatCurrencyAmount(sp),
      cp: formatCurrencyAmount(cp),
    }),
    [pp, gp, sp, cp]
  );

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
    const slugSource =
      entry.name || entry.displayName || entry.itemName || '';
    const normalizedName = String(slugSource).trim().toLowerCase();
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

  const handleAddToCart = useCallback((item, typeOverride) => {
    if (!item) return;
    const payload =
      typeof typeOverride === 'string' && typeOverride.length
        ? { ...item, type: typeOverride }
        : item;
    setCart((prevCart) => [...prevCart, payload]);
  }, []);

  const handleAddAccessoryToCart = useCallback(
    (accessory) => {
      if (!accessory) return;
      handleAddToCart(accessory, 'accessory');
    },
    [handleAddToCart]
  );

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
    const campaignName =
      typeof form?.campaign === 'string' ? form.campaign.trim() : '';
    if (!campaignName) {
      setShopVisibility(createEmptyVisibilitySets());
      visibilityCampaignRef.current = null;
    }
  }, [form?.campaign]);

  useEffect(() => {
    const campaignName =
      typeof form?.campaign === 'string' ? form.campaign.trim() : '';
    if (!show || !campaignName) {
      return;
    }

    if (visibilityCampaignRef.current === campaignName) {
      return;
    }

    let isMounted = true;

    const loadVisibility = async () => {
      try {
        const response = await apiFetch(
          `/campaigns/${encodeURIComponent(campaignName)}/shop-visibility`
        );
        if (!response.ok) {
          throw new Error('Failed to load shop visibility');
        }
        const data = await response.json();
        if (isMounted) {
          setShopVisibility(convertVisibilityResponse(data));
          visibilityCampaignRef.current = campaignName;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load shop visibility', error);
        if (isMounted) {
          setShopVisibility(createEmptyVisibilitySets());
          visibilityCampaignRef.current = null;
        }
      }
    };

    loadVisibility();

    return () => {
      isMounted = false;
    };
  }, [form?.campaign, show]);

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
  const normalizedAccessories = useMemo(
    () => normalizeAccessories(form.accessories || form.accessory || []),
    [form.accessories, form.accessory]
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
              embedded
              onAddToCart={handleAddToCart}
              cartCounts={cartCounts}
              hiddenKeys={shopVisibility.weapons}
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
              embedded
              onAddToCart={handleAddToCart}
              cartCounts={cartCounts}
              hiddenKeys={shopVisibility.armor}
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
              embedded
              onAddToCart={handleAddToCart}
              cartCounts={cartCounts}
              diceColor={form?.diceColor}
              hiddenKeys={shopVisibility.items}
            />
          ) : null,
      },
      {
        key: 'accessories',
        title: 'Accessories',
        render: (isActive) =>
          isActive ? (
            <AccessoryList
              campaign={form.campaign}
              initialAccessories={normalizedAccessories}
              onChange={onAccessoriesChange}
              show={isActive}
              embedded
              onAddToCart={handleAddAccessoryToCart}
              cartCounts={cartCounts}
              hiddenKeys={shopVisibility.accessories}
            />
        ) : null,
      },
    ],
    [
      characterId,
      form.campaign,
      normalizedArmor,
      normalizedItems,
      normalizedAccessories,
      normalizedWeapons,
      cartCounts,
      handleAddToCart,
      handleAddAccessoryToCart,
      onArmorChange,
      onHide,
      onItemsChange,
      onAccessoriesChange,
      onWeaponsChange,
      strength,
      shopVisibility,
    ]
  );

  const dialogClassName = useMemo(() => {
    if (!isDocked) {
      return undefined;
    }

    const classes = ['docked-modal'];
    if (dockedSide) {
      classes.push(`docked-modal--${dockedSide}`);
    }
    classes.push('docked-modal--shop');
    return classes.join(' ');
  }, [isDocked, dockedSide]);

  const modalClassName = useMemo(() => {
    const classes = ['dnd-modal', 'modern-modal'];
    if (isDocked) {
      classes.push('docked-modal-container');
    }
    return classes.join(' ');
  }, [isDocked]);

  const handleModalHide = useCallback(() => {
    if (isDocked) {
      if (typeof onDockClose === 'function') {
        onDockClose();
      }
      return;
    }

    onHide?.();
  }, [isDocked, onDockClose, onHide]);

  return (
    <>
      <Modal
        className={modalClassName}
        show={show}
        onHide={handleModalHide}
        size="lg"
        centered={!isDocked}
        scrollable
        fullscreen="sm-down"
        backdrop={isDocked ? false : true}
        enforceFocus={!isDocked}
        restoreFocus={!isDocked}
        dialogClassName={dialogClassName}
      >
      <Card className="modern-card">
        <Card.Header className="modal-header">
          <DockControls
            dockedSide={dockedSide}
            onDockChange={onDockChange}
            isDocked={isDocked}
          />
          <Card.Title className="modal-title">Shop</Card.Title>
        </Card.Header>
        <Card.Body
          className="modal-body"
          style={{ maxHeight: '80vh', overflowY: 'auto' }}
        >
          <Tab.Container activeKey={currentTab} onSelect={handleSelectTab}>
            <div className="shop-modal-toolbar">
              <div className="shop-modal-currency" aria-label="Available currency">
                <span className="shop-modal-currency__label">Purse</span>
                <span className="visually-hidden">{`PP ${formattedCurrency.pp} • GP ${formattedCurrency.gp} • SP ${formattedCurrency.sp} • CP ${formattedCurrency.cp}`}</span>
                {[
                  ['PP', formattedCurrency.pp, 'platinum'],
                  ['GP', formattedCurrency.gp, 'gold'],
                  ['SP', formattedCurrency.sp, 'silver'],
                  ['CP', formattedCurrency.cp, 'copper'],
                ].map(([label, value, coin]) => (
                  <span className={`shop-modal-currency__coin shop-modal-currency__coin--${coin}`} key={label}>
                    <FaCoins aria-hidden="true" />
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </span>
                ))}
              </div>
              <Button
                variant={cart.length > 0 ? 'primary' : 'outline-secondary'}
                className={`shop-cart-btn shop-cart-btn--toolbar ${
                  cart.length > 0 ? 'shop-cart-btn--active' : ''
                }`}
                aria-label={`View cart, ${cart.length} item${cart.length === 1 ? '' : 's'}`}
                onClick={() => setShowCart(true)}
              >
                <span className="shop-cart-btn__icon-wrap">
                  <FaShoppingCart size={20} />
                  <Badge
                    bg={cart.length > 0 ? 'warning' : 'secondary'}
                    text={cart.length > 0 ? 'dark' : undefined}
                    pill
                    className="shop-cart-btn__badge"
                  >
                    {cart.length}
                  </Badge>
                </span>
                <span className="shop-cart-btn__content">
                  <span className="shop-cart-btn__label">Cart</span>
                  <span className="shop-cart-btn__meta">
                    {cart.length > 0
                      ? `${cart.length} item${cart.length === 1 ? '' : 's'} • ${formattedTotalCost}`
                      : 'Empty'}
                  </span>
                </span>
              </Button>
            </div>

            <div className="modal-tab-header shop-modal-tabs">
              <Nav variant="tabs" className="mb-0">
                {tabConfigs.map(({ key, title }) => (
                  <Nav.Item key={key}>
                    <Nav.Link eventKey={key}>{title}</Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>
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
          <Button className="action-btn close-btn" onClick={handleModalHide}>
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
