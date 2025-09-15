import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Card, Tabs, Tab, Button } from 'react-bootstrap';
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
}) {
  const [internalTab, setInternalTab] = useState(activeTab || DEFAULT_TAB);
  const currentTab = activeTab || internalTab;

  useEffect(() => {
    if (activeTab && activeTab !== internalTab) {
      setInternalTab(activeTab);
    }
  }, [activeTab, internalTab]);

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
    if (!key || key === internalTab) return;
    setInternalTab(key);
    if (typeof onTabChange === 'function') {
      onTabChange(key);
    }
  };

  const showWeapons = show && currentTab === 'weapons';
  const showArmor = show && currentTab === 'armor';
  const showItems = show && currentTab === 'items';

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
        <Card.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <Tabs
            activeKey={currentTab}
            onSelect={handleSelectTab}
            className="mb-3"
          >
            <Tab eventKey="weapons" title="Weapons">
              {showWeapons ? (
                <WeaponList
                  campaign={form.campaign}
                  initialWeapons={normalizedWeapons}
                  onChange={onWeaponsChange}
                  characterId={characterId}
                  show={showWeapons}
                />
              ) : null}
            </Tab>
            <Tab eventKey="armor" title="Armor">
              {showArmor ? (
                <ArmorList
                  campaign={form.campaign}
                  initialArmor={normalizedArmor}
                  onChange={onArmorChange}
                  characterId={characterId}
                  show={showArmor}
                  strength={strength}
                />
              ) : null}
            </Tab>
            <Tab eventKey="items" title="Items">
              {showItems ? (
                <ItemList
                  campaign={form.campaign}
                  initialItems={normalizedItems}
                  onChange={onItemsChange}
                  characterId={characterId}
                  show={showItems}
                  onClose={onHide}
                />
              ) : null}
            </Tab>
          </Tabs>
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
