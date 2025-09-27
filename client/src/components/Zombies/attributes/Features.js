import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Card, Button, Spinner } from 'react-bootstrap';
import apiFetch from '../../../utils/apiFetch';
import FeatureModal from './FeatureModal';
import actionSurgeIcon from '../../../images/action-surge-icon.png';

export default function Features({
  form,
  showFeatures,
  handleCloseFeatures,
  onActionSurge,
  longRestCount,
  shortRestCount,
}) {
  const [features, setFeatures] = useState([]);
  const [modalFeature, setModalFeature] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [surgeUsed, setSurgeUsed] = useState(false);

  const dragonbornAncestry = useMemo(() => {
    const race = form?.race;
    if (!race) return null;

    const raceName =
      typeof race?.name === 'string' ? race.name.toLowerCase() : '';
    if (raceName !== 'dragonborn') return null;

    if (race.selectedAncestry) return race.selectedAncestry;

    if (race.selectedAncestryKey && race.dragonAncestries) {
      const selected = race.dragonAncestries[race.selectedAncestryKey];
      if (selected) return selected;
    }

    if (form?.dragonAncestry) return form.dragonAncestry;

    if (form?.dragonAncestryKey && race.dragonAncestries) {
      return race.dragonAncestries[form.dragonAncestryKey] || null;
    }

    return null;
  }, [form?.race, form?.dragonAncestry, form?.dragonAncestryKey]);

  const totalCharacterLevel = useMemo(() => {
    if (!Array.isArray(form?.occupation)) return 0;
    return form.occupation.reduce((sum, occ) => {
      if (typeof occ !== 'object' || occ === null) return sum;
      const levelValue =
        Number(occ.Level ?? occ.level ?? occ.Levels ?? occ.levels ?? 0) || 0;
      return sum + levelValue;
    }, 0);
  }, [form?.occupation]);

  const ancestryFeatures = useMemo(() => {
    if (!dragonbornAncestry) return [];

    const ancestryLabel =
      dragonbornAncestry.label || dragonbornAncestry.name || 'Dragonborn';
    const damageType = dragonbornAncestry.damageType || '';
    const damageTypeLower = damageType.toLowerCase();
    const resistanceDescription = damageTypeLower
      ? `You have resistance to ${damageTypeLower} damage.`
      : 'You have resistance to the damage type associated with your draconic ancestry.';

    const resistanceFeature = {
      id: 'dragonborn-damage-resistance',
      name: 'Damage Resistance',
      meta: `Dragon Subrace (${ancestryLabel})`,
      desc: resistanceDescription,
      description: resistanceDescription,
      hideUseButton: true,
    };

    const flightFeatures = [];

    if (totalCharacterLevel >= 5) {
      const draconicFlightDescription =
        'When you reach character level 5, you can use a bonus action to manifest spectral wings on your back. The wings last for 1 minute or until you dismiss them as a bonus action. During this time, you gain a flying speed equal to your walking speed.';
      flightFeatures.push({
        id: 'dragonborn-draconic-flight',
        name: 'Draconic Flight',
        meta: `Dragon Subrace (${ancestryLabel})`,
        desc: draconicFlightDescription,
        description: draconicFlightDescription,
        hideUseButton: true,
      });
    }

    return [resistanceFeature, ...flightFeatures];
  }, [dragonbornAncestry, totalCharacterLevel]);

  const displayFeatures = useMemo(() => {
    if (ancestryFeatures.length === 0) return features;
    return [...ancestryFeatures, ...features];
  }, [ancestryFeatures, features]);

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
        allFeatures.sort(
          (a, b) =>
            (a.class || '').localeCompare(b.class || '') ||
            (a.level || 0) - (b.level || 0)
        );
        setFeatures(allFeatures);
        setLoading(false);
      }
    }
    fetchFeatures();
  }, [form.occupation, showFeatures]);

  useEffect(() => {
    setSurgeUsed(false);
  }, [longRestCount, shortRestCount]);

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
              {loading ? (
                <div className="d-flex justify-content-center py-4">
                  <Spinner animation="border" role="status" />
                </div>
              ) : displayFeatures.length > 0 ? (
                <div className="feature-card-grid">
                  {displayFeatures.map((feat, idx) => {
                    const featKey = feat.id || `${feat.name}-${idx}`;
                    const isActionSurge = feat.name?.includes('Action Surge');
                    return (
                      <div className="feature-card" key={featKey}>
                        <div className="feature-card-header">
                          <div>
                            <div className="feature-card-name">{feat.name}</div>
                            <div className="feature-card-meta">
                              {feat.meta ? (
                                <span>{feat.meta}</span>
                              ) : (
                                <>
                                  {feat.class && <span>{feat.class}</span>}
                                  {feat.level != null && (
                                    <span>Level {feat.level}</span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="feature-card-actions">
                            {isActionSurge ? (
                              <Button
                                aria-label="use feature"
                                variant="link"
                                className={`p-0 border-0 ${surgeUsed ? 'opacity-50' : ''}`}
                                onClick={() => {
                                  if (!surgeUsed) {
                                    onActionSurge?.();
                                    setSurgeUsed(true);
                                  }
                                }}
                                disabled={surgeUsed}
                              >
                                <img
                                  src={actionSurgeIcon}
                                  alt="Action Surge"
                                  width={36}
                                  height={36}
                                />
                              </Button>
                            ) : !feat.hideUseButton ? (
                              <Button aria-label="use feature" variant="outline-light" size="sm">
                                Use
                              </Button>
                            ) : null}
                            <Button
                              aria-label="view feature"
                              variant="link"
                              size="sm"
                              className="view-link-btn"
                              onClick={() => {
                                setModalFeature(feat);
                                setShowModal(true);
                              }}
                            >
                              <i className="fa-solid fa-eye"></i>
                            </Button>
                          </div>
                        </div>
                        {feat.desc && (
                          <div className="feature-card-body">
                            {Array.isArray(feat.desc)
                              ? feat.desc.join(' ')
                              : feat.desc}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : !error ? (
                <div className="text-center text-muted">No features found</div>
              ) : null}
            </Card.Body>
            <Card.Footer className="modal-footer">
              <Button
                className="action-btn close-btn"
                onClick={handleCloseFeatures}
              >
                Close
              </Button>
            </Card.Footer>
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
