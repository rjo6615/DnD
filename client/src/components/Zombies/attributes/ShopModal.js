import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Card, Tab, Button, Nav } from 'react-bootstrap';
import WeaponList from '../../Weapons/WeaponList';
import ArmorList from '../../Armor/ArmorList';
import ItemList from '../../Items/ItemList';

const DEFAULT_TAB = 'weapons';

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
          category = '',
          weight = '',
          cost = '',
          statBonuses,
          skillBonuses,
          notes,
          ...rest
        } = item;
        if (!name) return null;
        const normalized = {
          name,
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
}) {
  const [activeTabState, setActiveTabState] = useState(
    activeTab || DEFAULT_TAB
  );
  const currentTab =
    (typeof activeTab === 'string' && activeTab.length
      ? activeTab
      : activeTabState) || DEFAULT_TAB;

  const { cp = 0, sp = 0, gp = 0, pp = 0 } = currency || {};

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
      onArmorChange,
      onHide,
      onItemsChange,
      onWeaponsChange,
      strength,
    ]
  );

  return (
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
              <div className="ms-auto text-nowrap">
                PP {pp} • GP {gp} • SP {sp} • CP {cp}
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
  );
}
