import React, { useEffect, useState } from 'react';
import { Modal, Card, Table, Button, Spinner } from 'react-bootstrap';
import apiFetch from '../../../utils/apiFetch';
import FeatureModal from './FeatureModal';

export default function Features({ form, showFeatures, handleCloseFeatures }) {
  const [features, setFeatures] = useState([]);
  const [modalFeature, setModalFeature] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usedFeatures, setUsedFeatures] = useState({});

  useEffect(() => {
    if (!showFeatures) return;
    async function fetchFeatures() {
      setLoading(true);
      setError(null);
      const allFeatures = [];
      try {
        for (const occ of Array.isArray(form.occupation) ? form.occupation : []) {
          if (typeof occ !== 'object' || occ === null) continue;
          const displayName = occ.Name || occ.Occupation || occ.name || '';
          const className = displayName.toLowerCase();
          if (!className) continue;
          for (let lvl = 1; lvl <= (occ.Level || 1); lvl++) {
            const res = await apiFetch(`/classes/${className}/features/${lvl}`);
            if (!res.ok) continue;
            const data = await res.json();
            (data.features || []).forEach((f) =>
              allFeatures.push({ ...f, class: displayName, level: lvl })
            );
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        setError('Unable to load class features');
      } finally {
        allFeatures.sort((a, b) => (a.level || 0) - (b.level || 0));
        setFeatures(allFeatures);
        setLoading(false);
      }
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
      >
        <div className="text-center">
          <Card className="modern-card">
            <Card.Header className="modal-header">
              <Card.Title className="modal-title">Features</Card.Title>
            </Card.Header>
            <Card.Body style={{ overflowY: 'auto', maxHeight: '70vh' }}>
              {error && (
                <div className="text-danger mb-2">{error}</div>
              )}
              <Table striped bordered hover size="sm" className="modern-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Level</th>
                    <th>Feature</th>
                    <th>Use</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center">
                        <Spinner animation="border" size="sm" role="status" />
                      </td>
                    </tr>
                  ) : features.length > 0 ? (
                    features.map((feat, idx) => {
                      const featKey = `${feat.class}-${feat.level}-${idx}`;
                      const used = usedFeatures[featKey];
                      return (
                        <tr key={featKey}>
                          <td>{feat.class}</td>
                          <td>{feat.level}</td>
                          <td>{feat.name}</td>
                          <td>
                            <Button
                              aria-label="use feature"
                              onClick={() =>
                                setUsedFeatures((prev) => ({
                                  ...prev,
                                  [featKey]: true
                                }))
                              }
                              disabled={used}
                            >
                              {used ? 'Used' : 'Use'}
                            </Button>
                          </td>
                          <td>
                            <Button
                              aria-label="view feature"
                              variant="link"
                              onClick={() => {
                                setModalFeature(feat);
                                setShowModal(true);
                              }}
                            >
                              <i className="fa-solid fa-eye"></i>
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : !error ? (
                    <tr>
                      <td colSpan={5} className="text-center">
                        No features found
                      </td>
                    </tr>
                  ) : null}
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
