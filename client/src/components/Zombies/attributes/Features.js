import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Modal, Card, Button, Spinner } from 'react-bootstrap';
import apiFetch from '../../../utils/apiFetch';
import FeatureModal from './FeatureModal';
import actionSurgeIcon from '../../../images/action-surge-icon.png';
import largeFormIcon from '../../../images/large-form-icon.png';
import dragonWingsIcon from '../../../images/dragon-wings-icon.png';

export default function Features({
  form,
  showFeatures,
  handleCloseFeatures,
  onActionSurge,
  onLargeForm,
  onDraconicFlight,
  longRestCount,
  shortRestCount,
  isDocked = false,
  dockedSide = null,
  onDockClose,
}) {
  const [features, setFeatures] = useState([]);
  const [modalFeature, setModalFeature] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [surgeUsed, setSurgeUsed] = useState(false);
  const [largeFormUsed, setLargeFormUsed] = useState(false);
  const [draconicFlightUsed, setDraconicFlightUsed] = useState(false);

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
    const race = form?.race;
    if (!race) return [];

    const raceName =
      typeof race?.name === 'string' ? race.name.toLowerCase() : '';
    const raceDisplayName =
      typeof race?.name === 'string' && race.name.trim()
        ? race.name.trim()
        : raceName
        ? raceName.charAt(0).toUpperCase() + raceName.slice(1)
        : 'Race';

    const darkvisionRange =
      Number.isFinite(race?.darkvisionRange) && race.darkvisionRange > 0
        ? race.darkvisionRange
        : raceName === 'dwarf'
        ? 60
        : null;

    const raceFeatures = [];

    if (raceName === 'dwarf') {
      const darkvisionDescription =
        `Accustomed to life underground, you can see in dim light within ${darkvisionRange ?? 60} ` +
        'feet of you as if it were bright light, and in darkness as if it were dim light. You cannot discern color in darkness, only shades of gray.';

      const resilienceDescription =
        'You have resistance to poison damage, and you have advantage on saving throws you make to avoid or end the Poisoned condition.';

      const toughnessDescription =
        'Your hit point maximum increases by 1, and it increases by 1 again whenever you gain a level.';

      const stonecunningUsage = 'Bonus action • Proficiency bonus per long rest';
      const stonecunningDescription =
        'As a bonus action, you gain tremorsense with a range of 60 feet for 10 minutes. You can use this bonus action a number of times equal to your proficiency bonus, and you regain all expended uses when you finish a long rest.';
      const stonecunningFullDescription = `${stonecunningDescription} ${stonecunningUsage}`;

      raceFeatures.push(
        {
          id: 'dwarf-darkvision',
          name: 'Darkvision',
          meta: 'Dwarf',
          description: darkvisionDescription,
          desc: darkvisionDescription,
          hideUseButton: true,
        },
        {
          id: 'dwarf-resilience',
          name: 'Dwarven Resilience',
          meta: 'Dwarf',
          description: resilienceDescription,
          desc: resilienceDescription,
          hideUseButton: true,
        },
        {
          id: 'dwarf-toughness',
          name: 'Dwarven Toughness',
          meta: 'Dwarf',
          description: toughnessDescription,
          desc: toughnessDescription,
          hideUseButton: true,
        },
        {
          id: 'dwarf-stonecunning',
          name: 'Stonecunning',
          meta: 'Dwarf',
          description: stonecunningFullDescription,
          desc: stonecunningFullDescription,
          hideUseButton: true,
        }
      );
    } else if (darkvisionRange) {
      const darkvisionDescription =
        `You can see in dim light within ${darkvisionRange} ` +
        'feet of you as if it were bright light, and in darkness as if it were dim light. You cannot discern color in darkness, only shades of gray.';

      raceFeatures.push({
        id: raceName ? `${raceName}-darkvision` : 'darkvision',
        name: 'Darkvision',
        meta: raceDisplayName,
        description: darkvisionDescription,
        desc: darkvisionDescription,
        hideUseButton: true,
      });
    }

    if (raceName === 'dragonborn') {
      const ancestry =
        race.selectedAncestry ||
        (race.selectedAncestryKey && race.dragonAncestries
          ? race.dragonAncestries[race.selectedAncestryKey]
          : null) ||
        form?.dragonAncestry ||
        (form?.dragonAncestryKey && race.dragonAncestries
          ? race.dragonAncestries[form.dragonAncestryKey]
          : null);

      if (ancestry) {
        const ancestryLabel = ancestry.label || ancestry.name || 'Dragonborn';
        const damageType = ancestry.damageType || '';
        const damageTypeLower = damageType.toLowerCase();
        const resistanceDescription = damageTypeLower
          ? `You have resistance to ${damageTypeLower} damage.`
          : 'You have resistance to the damage type associated with your draconic ancestry.';

        raceFeatures.push({
          id: 'dragonborn-damage-resistance',
          name: 'Damage Resistance',
          meta: `Dragon Subrace (${ancestryLabel})`,
          description: resistanceDescription,
          desc: resistanceDescription,
          hideUseButton: true,
        });

        if (totalCharacterLevel >= 5) {
          const draconicFlightDescription =
            'When you reach character level 5, you can use a bonus action to manifest spectral wings on your back. The wings last for 1 minute or until you dismiss them as a bonus action. During this time, you gain a flying speed equal to your walking speed.';
          raceFeatures.push({
            id: 'dragonborn-draconic-flight',
            name: 'Draconic Flight',
            meta: `Dragon Subrace (${ancestryLabel})`,
            description: draconicFlightDescription,
            desc: draconicFlightDescription,
            hideUseButton: true,
          });
        }
      }
    }

    if (raceName === 'goliath') {
      const ancestry =
        race.selectedAncestry ||
        (race.selectedAncestryKey && race.giantAncestries
          ? race.giantAncestries[race.selectedAncestryKey]
          : null) ||
        form?.giantAncestry ||
        (form?.giantAncestryKey && race.giantAncestries
          ? race.giantAncestries[form.giantAncestryKey]
          : null);

      if (ancestry) {
        const ancestryLabel = ancestry.label || ancestry.name || 'Giant Boon';
        const ancestryDescription = ancestry.description || '';
        const usageText = ancestry.usage ? ` ${ancestry.usage}` : '';
        const combinedDescription = `${ancestryDescription}${usageText}`.trim();

        raceFeatures.push(
          {
            id: `goliath-ancestry-${
              race.selectedAncestryKey || form?.giantAncestryKey || 'boon'
            }`,
            name: ancestryLabel,
            meta: 'Giant Ancestry',
            description: combinedDescription || ancestryDescription,
            desc: combinedDescription || ancestryDescription,
            hideUseButton: true,
          },
          {
            id: 'goliath-powerful-build',
            name: 'Powerful Build',
            meta: 'Goliath',
            description:
              'You count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift.',
            desc:
              'You count as one size larger when determining your carrying capacity and the weight you can push, drag, or lift.',
            hideUseButton: true,
          }
        );

        if (totalCharacterLevel >= 5) {
          const largeFormDescription =
            "Starting at 5th level, you can use a bonus action to magically grow to Large size for 10 minutes. While Large, your speed increases by 10 feet, and you have advantage on Strength checks. Once you use this trait, you can't use it again until you finish a long rest.";
          raceFeatures.push({
            id: 'goliath-large-form',
            name: 'Large Form',
            meta: 'Goliath (Level 5)',
            description: largeFormDescription,
            desc: largeFormDescription,
            hideUseButton: true,
          });
        }
      }
    }

    return raceFeatures;
  }, [
    form?.race,
    form?.dragonAncestry,
    form?.dragonAncestryKey,
    form?.giantAncestry,
    form?.giantAncestryKey,
    totalCharacterLevel,
  ]);

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
    setLargeFormUsed(false);
    setDraconicFlightUsed(false);
  }, [longRestCount, shortRestCount]);

  const dialogClassName = useMemo(() => {
    if (!isDocked) {
      return undefined;
    }

    const classes = ['docked-modal'];
    if (dockedSide) {
      classes.push(`docked-modal--${dockedSide}`);
    }
    classes.push('docked-modal--features');
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

    handleCloseFeatures?.();
  }, [handleCloseFeatures, isDocked, onDockClose]);

  return (
    <>
      <Modal
        className={modalClassName}
        show={showFeatures}
        onHide={handleModalHide}
        size="lg"
        centered={!isDocked}
        backdrop={isDocked ? false : true}
        enforceFocus={!isDocked}
        restoreFocus={!isDocked}
        dialogClassName={dialogClassName}
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
                    const isLargeForm = feat.id === 'goliath-large-form';
                    const isDraconicFlight =
                      feat.id === 'dragonborn-draconic-flight';
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
                            ) : isLargeForm ? (
                              <Button
                                aria-label="use feature"
                                variant="link"
                                className={`p-0 border-0 ${largeFormUsed ? 'opacity-50' : ''}`}
                                onClick={() => {
                                  if (!largeFormUsed) {
                                    onLargeForm?.();
                                    setLargeFormUsed(true);
                                  }
                                }}
                                disabled={largeFormUsed}
                              >
                                <img
                                  src={largeFormIcon}
                                  alt="Large Form"
                                  width={36}
                                  height={36}
                                />
                              </Button>
                            ) : isDraconicFlight ? (
                              <Button
                                aria-label="use feature"
                                variant="link"
                                className={`p-0 border-0 ${
                                  draconicFlightUsed ? 'opacity-50' : ''
                                }`}
                                onClick={() => {
                                  if (!draconicFlightUsed) {
                                    onDraconicFlight?.();
                                    setDraconicFlightUsed(true);
                                  }
                                }}
                                disabled={draconicFlightUsed}
                              >
                                <img
                                  src={dragonWingsIcon}
                                  alt="Draconic Flight"
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
                onClick={handleModalHide}
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
