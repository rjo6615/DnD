import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Modal, Card, Tab, Nav, Button } from 'react-bootstrap';
import WeaponList from '../../Weapons/WeaponList';
import ArmorList from '../../Armor/ArmorList';
import ItemList from '../../Items/ItemList';
import AccessoryList from '../../Accessories/AccessoryList';
import {
  normalizeArmor,
  normalizeItems,
  normalizeWeapons,
  normalizeAccessories,
} from './inventoryNormalization';
import DockControls from '../components/DockControls';

const DEFAULT_TAB = 'weapons';

export default function InventoryModal({
  show,
  activeTab,
  onHide,
  onTabChange,
  form = {},
  characterId,
  isDocked = false,
  dockedSide = null,
  onDockClose,
  onDockChange,
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
  const normalizedAccessories = useMemo(
    () =>
      normalizeAccessories(form.accessories || form.accessory || []),
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
      {
        key: 'accessories',
        title: 'Accessories',
        render: (isActive) =>
          !isActive ? null : normalizedAccessories.length === 0 ? (
            <div className="text-center text-muted py-3">
              No accessories in inventory.
            </div>
          ) : (
            <AccessoryList
              campaign={form.campaign}
              initialAccessories={normalizedAccessories}
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
      normalizedAccessories,
      normalizedWeapons,
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
    classes.push('docked-modal--inventory');
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
          <Card.Title className="modal-title">Inventory</Card.Title>
        </Card.Header>
        <Card.Body
          className="modal-body"
          style={{ maxHeight: '80vh', overflowY: 'auto' }}
        >
          <Tab.Container activeKey={currentTab} onSelect={handleSelectTab}>
            <div className="modal-tab-header d-flex justify-content-between align-items-center mb-3">
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
  );
}
