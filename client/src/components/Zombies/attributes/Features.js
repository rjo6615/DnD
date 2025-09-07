import React, { useEffect, useState } from 'react';
import { Modal, Card, Table, Button } from 'react-bootstrap';
import apiFetch from '../../../utils/apiFetch';
import FeatureModal from './FeatureModal';

export default function Features({ form, showFeatures, handleCloseFeatures }) {
  const [features, setFeatures] = useState([]);
  const [modalFeature, setModalFeature] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!showFeatures) return;
    async function fetchFeatures() {
      const allFeatures = [];
      try {
        for (const occ of form.occupation || []) {
          const res = await apiFetch(
            `/classes/${occ.Name.toLowerCase()}/features/${occ.Level}`
          );
          if (!res.ok) continue;
          const data = await res.json();
          (data.features || []).forEach((f) =>
            allFeatures.push({ ...f, class: occ.Name })
          );
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
      setFeatures(allFeatures);
    }
    fetchFeatures();
  }, [form.occupation, showFeatures]);

  return (
    <>
      <Modal
        className="dnd-modal modern-modal"
        show={showFeatures}
        onHide={handleCloseFeatures}
        size="lg"
        centered
        animation={false}
      >
        <div className="text-center">
          <Card className="modern-card">
            <Card.Header className="modal-header">
              <Card.Title className="modal-title">Features</Card.Title>
            </Card.Header>
            <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
              <Table striped bordered hover size="sm" className="modern-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Feature</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((feat, idx) => (
                    <tr key={`${feat.class}-${idx}`}>
                      <td>{feat.class}</td>
                      <td>{feat.name}</td>
                      <td>
                        <Button
                          size="sm"
                          className="action-btn fa-regular fa-eye"
                          aria-label="view feature"
                          onClick={() => {
                            setModalFeature(feat);
                            setShowModal(true);
                          }}
                        ></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </div>
      </Modal>
      <FeatureModal
        show={showModal}
        onHide={() => setShowModal(false)}
        feature={modalFeature}
      />
    </>
  );
}
