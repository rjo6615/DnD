import React, { useCallback } from 'react';
import { Modal } from 'react-bootstrap';
import ItemList from '../../Items/ItemList';
import apiFetch from '../../../utils/apiFetch';

export default function Items({ form, showItems, handleCloseItems }) {
  const { campaign, item: formItems = [], _id: characterId } = form;

  const normalized = formItems.map((it) =>
    Array.isArray(it)
      ? {
          name: it[0],
          category: it[1],
          weight: it[2],
          cost: it[3],
          notes: it[4],
          statBonuses: it[5] || {},
          skillBonuses: it[6] || {},
        }
      : it
  );

  const handleItemsChange = useCallback(
    async (items) => {
      const toStore = items.map((it) =>
        Array.isArray(it)
          ? {
              name: it[0],
              category: it[1],
              weight: it[2],
              cost: it[3],
              notes: it[4],
              statBonuses: it[5] || {},
              skillBonuses: it[6] || {},
            }
          : it
      );
      try {
        await apiFetch(`/equipment/update-item/${characterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item: toStore }),
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    },
    [characterId]
  );

  return (
    <Modal
      className="dnd-modal modern-modal"
      show={showItems}
      onHide={handleCloseItems}
      size="lg"
      centered
    >
      <div className="text-center">
        <ItemList
          campaign={campaign}
          initialItems={normalized}
          onChange={handleItemsChange}
          characterId={characterId}
          show={showItems}
          onClose={handleCloseItems}
        />
      </div>
    </Modal>
  );
}

