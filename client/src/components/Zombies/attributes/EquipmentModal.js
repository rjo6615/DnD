import React, { useMemo } from 'react';
import { Modal, Card, Button } from 'react-bootstrap';
import EquipmentRack from './EquipmentRack';
import { normalizeEquipmentMap } from './equipmentNormalization';
import {
  normalizeArmor,
  normalizeItems,
  normalizeWeapons,
  normalizeAccessories,
} from './inventoryNormalization';

export default function EquipmentModal({
  show,
  onHide,
  form = {},
  onEquipmentChange,
  onEquipmentSlotChange,
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
            />
          )}
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
