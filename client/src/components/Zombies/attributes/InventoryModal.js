import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Card, Tab, Nav, Button } from 'react-bootstrap';
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
      if (!weapon || weapon.owned === false) return null;
      if (Array.isArray(weapon)) {
        if (weapon.owned === false) return null;
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
          owned,
          ...rest
        } = weapon;
        if (!name || owned === false) return null;
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
      if (!piece || piece.owned === false) return null;
      if (Array.isArray(piece)) {
        if (piece.owned === false) return null;
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
          owned,
          ...rest
        } = piece;
        if (!name || owned === false) return null;
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
      if (!item || item.owned === false) return null;
      if (Array.isArray(item)) {
        if (item.owned === false) return null;
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
          owned,
          ...rest
        } = item;
        if (!name || owned === false) return null;
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

export default function InventoryModal({
  show,
  activeTab,
  onHide,
  onTabChange,
  form = {},
  characterId,
}) {
  const [activeTabState, setActiveTabState] = useState(
    activeTab || DEFAULT_TAB
  );

  useEffect(() => {
    if (activeTab && activeTab !== activeTabState) {
      setActiveTabState(activeTab);
    }
  }, [activeTab, activeTabState]);

  const currentTab =
    (typeof activeTab === 'string' && activeTab.length
      ? activeTab
      : activeTabState) || DEFAULT_TAB;

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
          !isActive ? null : normalizedWeapons.length === 0 ? (
            <div className="text-center text-muted py-3">
              No weapons in inventory.
            </div>
          ) : (
            <WeaponList
              campaign={form.campaign}
              initialWeapons={normalizedWeapons}
              characterId={characterId}
              show={isActive}
              embedded
              ownedOnly
            />
          ),
      },
      {
        key: 'armor',
        title: 'Armor',
        render: (isActive) =>
          !isActive ? null : normalizedArmor.length === 0 ? (
            <div className="text-center text-muted py-3">
              No armor in inventory.
            </div>
          ) : (
            <ArmorList
              campaign={form.campaign}
              initialArmor={normalizedArmor}
              characterId={characterId}
              show={isActive}
              embedded
              ownedOnly
            />
          ),
      },
      {
        key: 'items',
        title: 'Items',
        render: (isActive) =>
          !isActive ? null : normalizedItems.length === 0 ? (
            <div className="text-center text-muted py-3">
              No items in inventory.
            </div>
          ) : (
            <ItemList
              campaign={form.campaign}
              initialItems={normalizedItems}
              characterId={characterId}
              show={isActive}
              embedded
              ownedOnly
            />
          ),
      },
    ],
    [
      characterId,
      form.campaign,
      normalizedArmor,
      normalizedItems,
      normalizedWeapons,
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
          <Card.Title className="modal-title">Inventory</Card.Title>
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
