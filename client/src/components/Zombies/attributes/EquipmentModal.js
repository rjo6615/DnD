import React, { useMemo, useCallback } from 'react';
import { Modal, Card, Button } from 'react-bootstrap';
import EquipmentRack from './EquipmentRack';
import { normalizeEquipmentMap } from './equipmentNormalization';
import {
  normalizeArmor,
  normalizeItems,
  normalizeWeapons,
  normalizeAccessories,
} from './inventoryNormalization';
import DockControls from '../components/DockControls';

export default function EquipmentModal({
  show,
  onHide,
  form = {},
  onEquipmentChange,
  onEquipmentSlotChange,
  isDocked = false,
  dockedSide = null,
  onDockClose,
  onDockChange,
}) {
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
  const normalizedEquipment = useMemo(
    () => normalizeEquipmentMap(form.equipment),
    [form.equipment]
  );

  const dialogClassName = useMemo(() => {
    if (!isDocked) {
      return undefined;
    }

    const classes = ['docked-modal'];
    if (dockedSide) {
      classes.push(`docked-modal--${dockedSide}`);
    }
    classes.push('docked-modal--equipment');
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
      size="xl"
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
          <Card.Title className="modal-title">Equipment</Card.Title>
        </Card.Header>
        <Card.Body
          className="modal-body"
          style={{ maxHeight: '80vh', overflowY: 'auto' }}
        >
          {show && (
            <EquipmentRack
              equipment={normalizedEquipment}
              inventory={{
                weapons: normalizedWeapons,
                armor: normalizedArmor,
                items: normalizedItems,
                accessories: normalizedAccessories,
              }}
              onEquipmentChange={onEquipmentChange}
              onSlotChange={onEquipmentSlotChange}
              character={form}
            />
          )}
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
