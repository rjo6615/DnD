import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Nav,
  Row,
  Spinner,
  Tab,
} from 'react-bootstrap';
import apiFetch from '../../../utils/apiFetch';

const SHOP_TABS = [
  { key: 'weapons', title: 'Weapons' },
  { key: 'armor', title: 'Armor' },
  { key: 'items', title: 'Items' },
  { key: 'accessories', title: 'Accessories' },
];

const createEmptyHiddenState = () => ({
  weapons: [],
  armor: [],
  items: [],
  accessories: [],
});

const normalizeKey = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
};

const toHtmlId = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(/[^a-z0-9_-]/g, '-');
};

const collectHiddenEntries = (value) => {
  const normalized = new Set();
  if (Array.isArray(value)) {
    value.forEach((entry) => {
      const key = normalizeKey(entry);
      if (key) {
        normalized.add(key);
      }
    });
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([entryKey, hidden]) => {
      if (hidden === true) {
        const key = normalizeKey(entryKey);
        if (key) {
          normalized.add(key);
        }
      }
    });
  }
  return Array.from(normalized).sort();
};

const normalizeHiddenState = (input) => {
  const state = createEmptyHiddenState();
  SHOP_TABS.forEach(({ key }) => {
    state[key] = collectHiddenEntries(input?.[key]);
  });
  return state;
};

const hiddenStatesEqual = (stateA, stateB) =>
  SHOP_TABS.every(({ key }) => {
    const setA = new Set(Array.isArray(stateA[key]) ? stateA[key] : []);
    const setB = new Set(Array.isArray(stateB[key]) ? stateB[key] : []);
    if (setA.size !== setB.size) {
      return false;
    }
    for (const entry of setA) {
      if (!setB.has(entry)) {
        return false;
      }
    }
    return true;
  });

const fetchJsonOrThrow = async (url, defaultMessage) => {
  const response = await apiFetch(url);
  if (response.ok) {
    return response.json();
  }
  let message = defaultMessage || response.statusText || 'Request failed';
  try {
    const errorBody = await response.json();
    if (errorBody && typeof errorBody.message === 'string') {
      message = errorBody.message;
    }
  } catch (error) {
    // ignore JSON parse errors
  }
  const error = new Error(message);
  error.status = response.status;
  throw error;
};

const fetchJsonWithFallback = async (url, fallbackValue = []) => {
  const response = await apiFetch(url);
  if (response.ok) {
    try {
      return await response.json();
    } catch (error) {
      if (response.status === 204 || response.headers.get('Content-Length') === '0') {
        return fallbackValue;
      }
      throw error;
    }
  }
  if (response.status === 404) {
    return fallbackValue;
  }
  let message = response.statusText || 'Request failed';
  try {
    const errorBody = await response.json();
    if (errorBody && typeof errorBody.message === 'string') {
      message = errorBody.message;
    }
  } catch (error) {
    // ignore JSON parse errors
  }
  const error = new Error(message);
  error.status = response.status;
  throw error;
};

const toTitleCase = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .split(/\s+|_/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const normalizeArrayField = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

const buildWeaponCatalog = (standard, custom) => {
  const map = new Map();
  if (standard && typeof standard === 'object') {
    Object.entries(standard).forEach(([key, weapon]) => {
      if (!weapon) {
        return;
      }
      const normalizedKey = normalizeKey(key || weapon.name);
      if (!normalizedKey) {
        return;
      }
      map.set(normalizedKey, {
        key: normalizedKey,
        name: weapon.displayName || weapon.name || key,
        category: weapon.category || '',
        cost: weapon.cost ?? '',
        damage: weapon.damage ?? '',
        properties: normalizeArrayField(weapon.properties),
        source: 'Standard',
      });
    });
  }
  if (Array.isArray(custom)) {
    custom.forEach((weapon) => {
      if (!weapon) {
        return;
      }
      const rawName = weapon.name || weapon.weaponName;
      const normalizedKey = normalizeKey(rawName);
      if (!normalizedKey) {
        return;
      }
      map.set(normalizedKey, {
        key: normalizedKey,
        name: weapon.displayName || weapon.name || weapon.weaponName || rawName,
        category: weapon.category || weapon.type || 'custom',
        cost: weapon.cost ?? '',
        damage: weapon.damage ?? '',
        properties: normalizeArrayField(weapon.properties),
        source: 'Custom',
      });
    });
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
};

const buildArmorCatalog = (standard, custom) => {
  const map = new Map();
  if (standard && typeof standard === 'object') {
    Object.entries(standard).forEach(([key, armor]) => {
      if (!armor) {
        return;
      }
      const normalizedKey = normalizeKey(key || armor.name);
      if (!normalizedKey) {
        return;
      }
      map.set(normalizedKey, {
        key: normalizedKey,
        name: armor.displayName || armor.name || key,
        category: armor.category || '',
        cost: armor.cost ?? '',
        armorClass: armor.acBonus ?? armor.ac ?? '',
        maxDex: armor.maxDex ?? null,
        strength: armor.strength ?? null,
        stealth: armor.stealth ?? false,
        source: 'Standard',
      });
    });
  }
  if (Array.isArray(custom)) {
    custom.forEach((armor) => {
      if (!armor) {
        return;
      }
      const rawName = armor.name || armor.armorName;
      const normalizedKey = normalizeKey(rawName);
      if (!normalizedKey) {
        return;
      }
      map.set(normalizedKey, {
        key: normalizedKey,
        name: armor.name || armor.armorName || rawName,
        category: armor.category || armor.type || 'custom',
        cost: armor.cost ?? '',
        armorClass: armor.acBonus ?? armor.armorBonus ?? armor.ac ?? '',
        maxDex: armor.maxDex ?? null,
        strength: armor.strength ?? null,
        stealth: armor.stealth ?? false,
        source: 'Custom',
      });
    });
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
};

const buildItemCatalog = (standard, custom) => {
  const map = new Map();
  if (standard && typeof standard === 'object') {
    Object.entries(standard).forEach(([key, item]) => {
      if (!item) {
        return;
      }
      const normalizedKey = normalizeKey(key || item.name);
      if (!normalizedKey) {
        return;
      }
      map.set(normalizedKey, {
        key: normalizedKey,
        name: item.displayName || item.name || key,
        category: item.category || '',
        cost: item.cost ?? '',
        weight: item.weight ?? '',
        notes: item.notes || '',
        source: 'Standard',
      });
    });
  }
  if (Array.isArray(custom)) {
    custom.forEach((item) => {
      if (!item) {
        return;
      }
      const normalizedKey = normalizeKey(item.name);
      if (!normalizedKey) {
        return;
      }
      map.set(normalizedKey, {
        key: normalizedKey,
        name: item.name,
        category: item.category || 'custom',
        cost: item.cost ?? '',
        weight: item.weight ?? '',
        notes: item.notes || '',
        source: 'Custom',
      });
    });
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
};

const buildAccessoryCatalog = (standard, custom) => {
  const map = new Map();
  if (standard && typeof standard === 'object') {
    Object.entries(standard).forEach(([key, accessory]) => {
      if (!accessory) {
        return;
      }
      const normalizedKey = normalizeKey(key || accessory.name);
      if (!normalizedKey) {
        return;
      }
      map.set(normalizedKey, {
        key: normalizedKey,
        name: accessory.displayName || accessory.name || key,
        category: accessory.category || '',
        cost: accessory.cost ?? '',
        targetSlots: normalizeArrayField(accessory.targetSlots),
        rarity: accessory.rarity || '',
        source: 'Standard',
      });
    });
  }
  if (Array.isArray(custom)) {
    custom.forEach((accessory) => {
      if (!accessory) {
        return;
      }
      const normalizedKey = normalizeKey(accessory.name);
      if (!normalizedKey) {
        return;
      }
      map.set(normalizedKey, {
        key: normalizedKey,
        name: accessory.name,
        category: accessory.category || 'custom',
        cost: accessory.cost ?? '',
        targetSlots: normalizeArrayField(accessory.targetSlots),
        rarity: accessory.rarity || '',
        source: 'Custom',
      });
    });
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
};

export default function ShopVisibilityManager({ campaign, active, onStatus }) {
  const [activeTabKey, setActiveTabKey] = useState('weapons');
  const [hiddenState, setHiddenState] = useState(() => createEmptyHiddenState());
  const [initialHiddenState, setInitialHiddenState] = useState(() =>
    createEmptyHiddenState()
  );
  const [inventory, setInventory] = useState({
    weapons: [],
    armor: [],
    items: [],
    accessories: [],
  });
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setHiddenState(createEmptyHiddenState());
    setInitialHiddenState(createEmptyHiddenState());
    setInventory({ weapons: [], armor: [], items: [], accessories: [] });
    setLoading(false);
    setInitialized(false);
    setError(null);
  }, [campaign]);

  useEffect(() => {
    if (!active || !campaign || initialized) {
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const encodedCampaign = encodeURIComponent(campaign);
        const [
          visibilityData,
          standardWeapons,
          customWeapons,
          standardArmor,
          customArmor,
          standardItems,
          customItems,
          standardAccessories,
          customAccessories,
        ] = await Promise.all([
          fetchJsonWithFallback(
            `/campaigns/${encodedCampaign}/shop-visibility`,
            createEmptyHiddenState()
          ),
          fetchJsonOrThrow('/weapons', 'Failed to load weapons.'),
          fetchJsonWithFallback(`/equipment/weapons/${encodedCampaign}`),
          fetchJsonOrThrow('/armor', 'Failed to load armor.'),
          fetchJsonWithFallback(`/equipment/armor/${encodedCampaign}`),
          fetchJsonOrThrow('/items', 'Failed to load items.'),
          fetchJsonWithFallback(`/equipment/items/${encodedCampaign}`),
          fetchJsonOrThrow('/accessories', 'Failed to load accessories.'),
          fetchJsonWithFallback(`/equipment/accessories/${encodedCampaign}`),
        ]);

        if (cancelled) {
          return;
        }

        setInventory({
          weapons: buildWeaponCatalog(standardWeapons, customWeapons),
          armor: buildArmorCatalog(standardArmor, customArmor),
          items: buildItemCatalog(standardItems, customItems),
          accessories: buildAccessoryCatalog(standardAccessories, customAccessories),
        });

        const normalizedHidden = normalizeHiddenState(visibilityData);
        setHiddenState(normalizedHidden);
        setInitialHiddenState(normalizedHidden);
        setError(null);
        setInitialized(true);
      } catch (err) {
        if (cancelled) {
          return;
        }
        // eslint-disable-next-line no-console
        console.error('Failed to load shop visibility', err);
        const message = err?.message || 'Failed to load shop inventory.';
        setError({ message });
        if (typeof onStatus === 'function') {
          onStatus({ type: 'danger', message });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [active, campaign, initialized, onStatus]);

  const hiddenSets = useMemo(() => {
    const sets = {};
    SHOP_TABS.forEach(({ key }) => {
      sets[key] = new Set(Array.isArray(hiddenState[key]) ? hiddenState[key] : []);
    });
    return sets;
  }, [hiddenState]);

  const hasChanges = useMemo(
    () => !hiddenStatesEqual(hiddenState, initialHiddenState),
    [hiddenState, initialHiddenState]
  );

  const handleToggleItem = useCallback((category, key, visible) => {
    const normalizedKey = normalizeKey(key);
    if (!normalizedKey) {
      return;
    }
    setHiddenState((prev) => {
      const current = Array.isArray(prev[category]) ? prev[category] : [];
      const set = new Set(current);
      if (visible) {
        set.delete(normalizedKey);
      } else {
        set.add(normalizedKey);
      }
      return { ...prev, [category]: Array.from(set).sort() };
    });
  }, []);

  const handleToggleAll = useCallback((category, shouldShowAll, keys) => {
    setHiddenState((prev) => ({
      ...prev,
      [category]: shouldShowAll
        ? []
        : keys
            .map((entry) => normalizeKey(entry))
            .filter(Boolean)
            .sort(),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!campaign) {
      return;
    }
    const encodedCampaign = encodeURIComponent(campaign);
    const payload = SHOP_TABS.reduce((acc, { key }) => {
      acc[key] = Array.isArray(hiddenState[key])
        ? Array.from(new Set(hiddenState[key])).filter(Boolean)
        : [];
      return acc;
    }, {});

    setSaving(true);
    try {
      const response = await apiFetch(
        `/campaigns/${encodedCampaign}/shop-visibility`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        let message = response.statusText || 'Failed to update shop visibility.';
        try {
          const errorBody = await response.json();
          if (errorBody && typeof errorBody.message === 'string') {
            message = errorBody.message;
          }
        } catch (error) {
          // ignore JSON parse errors
        }
        throw new Error(message);
      }
      const data = await response.json();
      const normalized = normalizeHiddenState(data);
      setHiddenState(normalized);
      setInitialHiddenState(normalized);
      setError(null);
      if (typeof onStatus === 'function') {
        onStatus({ type: 'success', message: 'Shop visibility updated.' });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to save shop visibility', err);
      const message = err?.message || 'Failed to update shop visibility.';
      setError({ message });
      if (typeof onStatus === 'function') {
        onStatus({ type: 'danger', message });
      }
    } finally {
      setSaving(false);
    }
  }, [campaign, hiddenState, onStatus]);

  const renderCategory = useCallback(
    (category) => {
    const entries = Array.isArray(inventory[category]) ? inventory[category] : [];
    const hiddenSet = hiddenSets[category] || new Set();
    const total = entries.length;
    const visibleCount = entries.reduce(
      (count, entry) => (hiddenSet.has(entry.key) ? count : count + 1),
      0
    );
    const allVisible = total > 0 && visibleCount === total;
    const noneVisible = total > 0 && visibleCount === 0;
    const allKeys = entries.map((entry) => entry.key);

      if (loading && total === 0) {
        return (
          <div className="d-flex justify-content-center py-4">
            <Spinner animation="border" role="status" />
            <span className="visually-hidden">Loading shop inventory…</span>
          </div>
        );
      }

      if (!loading && total === 0) {
        return <div className="text-center text-muted py-4">No items available.</div>;
      }

      return (
        <>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div className="d-flex align-items-center flex-wrap gap-3">
              <Form.Check
                type="checkbox"
                id={`${category}-select-all`}
                label="Select All"
                checked={allVisible}
                onChange={(event) =>
                  handleToggleAll(category, event.target.checked, allKeys)
                }
                disabled={loading || saving || total === 0}
              />
              <Form.Check
                type="checkbox"
                id={`${category}-deselect-all`}
                label="Deselect All"
                checked={noneVisible}
                onChange={(event) =>
                  handleToggleAll(category, !event.target.checked, allKeys)
                }
                disabled={loading || saving || total === 0}
              />
            </div>
            <div className="text-muted small">
              Showing {visibleCount} of {total}
            </div>
          </div>
          <Row className="row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
            {entries.map((item) => {
              const visible = !hiddenSet.has(item.key);
              return (
                <Col key={`${category}-${item.key}`} className="d-flex">
                  <Card className="flex-grow-1 h-100 bg-dark bg-opacity-75 border border-secondary text-light">
                    <Card.Body className="d-flex flex-column gap-2">
                      <div>
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div>
                            <Card.Title className="h5 mb-1">{item.name}</Card.Title>
                            <Card.Subtitle className="text-muted text-uppercase small">
                              {item.category ? toTitleCase(item.category) : '—'}
                            </Card.Subtitle>
                          </div>
                          <Badge bg={item.source === 'Custom' ? 'info' : 'secondary'}>
                            {item.source}
                          </Badge>
                        </div>
                        {item.damage !== undefined && (
                          <Card.Text className="mb-1">Damage: {item.damage || '—'}</Card.Text>
                        )}
                        {item.properties !== undefined && (
                          <Card.Text className="mb-1">
                            Properties:{' '}
                            {item.properties && item.properties.length > 0
                              ? item.properties.join(', ')
                              : '—'}
                          </Card.Text>
                        )}
                        {item.armorClass !== undefined && (
                          <Card.Text className="mb-1">
                            AC Bonus: {item.armorClass || '—'}
                          </Card.Text>
                        )}
                        {item.maxDex !== undefined && (
                          <Card.Text className="mb-1">
                            Max Dex: {item.maxDex === null ? '—' : item.maxDex}
                          </Card.Text>
                        )}
                        {item.strength !== undefined && (
                          <Card.Text className="mb-1">
                            Strength: {item.strength === null ? '—' : item.strength}
                          </Card.Text>
                        )}
                        {item.stealth !== undefined && (
                          <Card.Text className="mb-1">
                            Stealth: {item.stealth ? 'Disadvantage' : '—'}
                          </Card.Text>
                        )}
                        {item.weight !== undefined && (
                          <Card.Text className="mb-1">
                            Weight: {item.weight === '' || item.weight === null ? '—' : item.weight}
                          </Card.Text>
                        )}
                        {item.targetSlots !== undefined && (
                          <Card.Text className="mb-1">
                            Slots:{' '}
                            {item.targetSlots && item.targetSlots.length > 0
                              ? item.targetSlots.map(toTitleCase).join(', ')
                              : '—'}
                          </Card.Text>
                        )}
                        {item.rarity !== undefined && (
                          <Card.Text className="mb-1">
                            Rarity: {item.rarity ? toTitleCase(item.rarity) : '—'}
                          </Card.Text>
                        )}
                        <Card.Text className="mb-1">Cost: {item.cost || '—'}</Card.Text>
                        {item.notes ? (
                          <Card.Text className="small text-muted mb-0">
                            {item.notes}
                          </Card.Text>
                        ) : null}
                      </div>
                      <div className="mt-auto">
                        <Form.Check
                          type="checkbox"
                          id={`${category}-visibility-${toHtmlId(item.key)}`}
                          label="Visible in player shop"
                          checked={visible}
                          onChange={(event) =>
                            handleToggleItem(category, item.key, event.target.checked)
                          }
                          disabled={saving}
                        />
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </>
      );
    },
    [handleToggleAll, handleToggleItem, hiddenSets, inventory, loading, saving]
  );

  return (
    <div>
      {error ? <Alert variant="danger">{error.message}</Alert> : null}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div className="text-muted small">
          Choose which items are available to players in the shop.
        </div>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!initialized || saving || !hasChanges}
        >
          {saving ? (
            <span className="d-flex align-items-center gap-2">
              <Spinner animation="border" size="sm" role="status" />
              <span>Saving…</span>
            </span>
          ) : (
            'Save Visibility'
          )}
        </Button>
      </div>
      <Tab.Container activeKey={activeTabKey} onSelect={(key) => key && setActiveTabKey(key)}>
        <div className="d-flex justify-content-center mb-3">
          <Nav variant="tabs" className="flex-wrap">
            {SHOP_TABS.map(({ key, title }) => (
              <Nav.Item key={key}>
                <Nav.Link eventKey={key}>{title}</Nav.Link>
              </Nav.Item>
            ))}
          </Nav>
        </div>
        <Tab.Content>
          {SHOP_TABS.map(({ key }) => (
            <Tab.Pane eventKey={key} key={key}>
              {renderCategory(key)}
            </Tab.Pane>
          ))}
        </Tab.Content>
      </Tab.Container>
    </div>
  );
}

ShopVisibilityManager.defaultProps = {
  campaign: '',
  active: false,
  onStatus: () => {},
};
